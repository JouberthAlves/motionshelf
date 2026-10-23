"use client";

import { useEffect, useRef } from "react";
import { BACK_SVG, DATA, FIGURE_CSS, FRAGMENT, FRONT_SVG } from "./langendorff-heart-figure";

export type LangendorffHeartProps = {
  /** Resting heart rate in beats per minute; the idle tour swings around it. */
  bpm?: number;
  /** Extra classes for the outer element. */
  className?: string;
};

type Point = [number, number, number];

// ---------- fisiologia: coração humano isolado, Langendorff de pressão constante ----------
const PERFUSION = 70; // mmHg na cânula
const EDP = 8; // pressão diastólica final do VE (balão), mmHg
const DEV0 = 102; // pressão desenvolvida a 72 bpm, mmHg
const CF0 = 250; // fluxo coronário a 72 bpm, mL/min
const ML_PER_REV = 2.5; // mangueira de 6,4 mm num rotor de 50 mm
const BPM_RANGE: [number, number] = [50, 150];
const PR = 0.16; // a sístole atrial começa 0,16 s antes da ventricular
const TAU = 0.045; // relaxamento isovolumétrico, s

const developedOf = (bpm: number) => DEV0 * (1 + 0.12 * ((bpm - 72) / 78)); // efeito Bowditch
const systoleOf = (bpm: number) => 0.3 * Math.sqrt(60 / bpm);
const flowOf = (bpm: number) => CF0 * ((bpm * developedOf(bpm)) / (72 * DEV0)) ** 0.7;
const pumpRpmOf = (bpm: number) => flowOf(bpm) / ML_PER_REV;

function activation(phase: number, ts: number) {
  const rise = Math.min(0.12, ts * 0.42);
  if (phase < 0) return 0;
  if (phase < rise) return Math.sin((Math.PI / 2) * (phase / rise)) ** 2;
  if (phase < ts) return 1 - 0.18 * ((phase - rise) / (ts - rise)) ** 2;
  return 0.82 * Math.exp(-(phase - ts) / TAU);
}
function stateAt(t: number, bpm: number) {
  const period = 60 / bpm;
  const ts = systoleOf(bpm);
  const phase = ((t % period) + period) % period;
  const act = Math.max(activation(phase, ts), activation(phase + period, ts));
  const lvp = EDP + developedOf(bpm) * act;
  const atrialAt = (((phase + PR) % period) + period) % period;
  const atrium = atrialAt < 0.11 ? Math.sin((Math.PI * atrialAt) / 0.11) : 0;
  const venous = flowOf(bpm) * (0.78 + 0.5 * act);
  return { phase, period, act, lvp, atrium, venous };
}

// ---------- câmera do kit anatomy ----------
const RAD = Math.PI / 180;
const P = DATA.P;
const CAM = (() => {
  const a = P.azimuth * RAD;
  const e = P.elevation * RAD;
  return { sinA: Math.sin(a), cosA: Math.cos(a), sinE: Math.sin(e), cosE: Math.cos(e), k: P.scale * Math.sqrt(1.6) };
})();
function iso([x, y, z]: Point): [number, number] {
  const { sinA, cosA, sinE, cosE, k } = CAM;
  return [P.origin[0] + (x * sinA - y * cosA) * k, P.origin[1] + ((x * cosA + y * sinA) * sinE - z * cosE) * k];
}
const path = (pts: [number, number][]) => "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L");

// Deformação da batida (a mesma do shader, no sentido direto), para o filete sair do ápice.
function deform(q: readonly number[], def: number[]): Point {
  const b = Math.min(1, Math.max(0, (6 - q[2]) / 32));
  const bs = b * b * (3 - 2 * b);
  const z = q[2] * (1 - def[0] * bs);
  const ang = def[1] * bs * Math.min(1, Math.max(0, -z / 96));
  const dx = (q[0] - 8) * (1 + def[2] * bs);
  const dy = q[1] * (1 + def[2] * bs);
  return [8 + Math.cos(ang) * dx - Math.sin(ang) * dy, Math.sin(ang) * dx + Math.cos(ang) * dy, z];
}
const toWorld = (l: Point): Point => [0, 1, 2].map((i) => DATA.HO[i] + l[0] * DATA.HU[i] + l[1] * DATA.HV[i] + l[2] * DATA.HW[i]) as Point;

// ---------- camada WebGL (porte do glLayer do kit anatomy, MIT) ----------
type Layer = {
  /** true quando o shader terminou de compilar e o coração em WebGL pode desenhar. */
  ready: () => boolean;
  failed: () => boolean;
  /** quality: fração da resolução (0–1); o canvas é esticado pelo CSS até o tamanho da figura. */
  draw: (values: Record<string, number | number[]>, quality: number) => void;
  dispose: () => void;
};
function softwareRenderer(gl: WebGLRenderingContext) {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
}
function glLayer(canvas: HTMLCanvasElement, fixed: Record<string, number | number[]>): Layer | null {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return null;
  // O coração é um ray-march pesado: sem GPU de verdade fica o coração em SVG.
  if (softwareRenderer(gl)) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }
  const derivatives = gl.getExtension("OES_standard_derivatives") ? "#extension GL_OES_standard_derivatives : enable\n" : "";
  // O shader do coração é grande (ray-march de 230 passos) e, no Windows, compilar leva segundos. Com
  // KHR_parallel_shader_compile ele compila em segundo plano: nada aqui pergunta o resultado antes de
  // ficar pronto, porque perguntar trava a página até o fim da compilação (era o que congelava o site).
  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };
  const vs = compile(gl.VERTEX_SHADER, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}");
  const fs = compile(gl.FRAGMENT_SHADER, derivatives + FRAGMENT);
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  let state: "pending" | "ok" | "failed" = "pending";
  const types: Record<string, number> = {};
  const finish = () => {
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(program));
      state = "failed";
      return;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const at = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info) types[info.name.replace(/\[0\]$/, "")] = info.type;
    }
    for (const [name, value] of Object.entries(fixed)) set(name, value);
    state = "ok";
  };
  const set = (name: string, value: number | number[]) => {
    const where = gl.getUniformLocation(program, name);
    if (!where) return;
    if (typeof value === "number") gl.uniform1f(where, value);
    else if (value.length > 4) {
      const data = new Float32Array(value);
      if (types[name] === gl.FLOAT_VEC3) gl.uniform3fv(where, data);
      else gl.uniform1fv(where, data);
    } else if (value.length === 2) gl.uniform2f(where, value[0], value[1]);
    else if (value.length === 3) gl.uniform3f(where, value[0], value[1], value[2]);
    else if (value.length === 4) gl.uniform4f(where, value[0], value[1], value[2], value[3]);
  };
  return {
    ready() {
      // Sem a extensão (navegador antigo), compila na hora, como antes.
      if (state === "pending" && (!parallel || gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR))) finish();
      return state === "ok";
    },
    failed: () => state === "failed",
    draw(values, quality) {
      const box = canvas.getBoundingClientRect();
      // No máximo densidade 1 (não a da tela): o ray-march custa por pixel, e 1,5× é mais que o dobro.
      const w = Math.max(1, Math.round(box.width * quality));
      const h = Math.max(1, Math.round(box.height * quality));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      set("uCanvas", [w, h]);
      set("uView", [DATA.W, DATA.H]);
      set("uOrigin", [...DATA.camera.origin]);
      set("uK", DATA.camera.k);
      set("uCam", [...DATA.camera.cam]);
      for (const [name, value] of Object.entries(values)) set(name, value);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

// Objetos constantes: o React 19 troca o HTML inteiro se o objeto mudar a cada render.
const BACK_HTML = { __html: BACK_SVG };
const FRONT_HTML = { __html: FRONT_SVG };

/**
 * An isolated human heart beating on a Langendorff rig, drawn with the anatomy skill. The heart is
 * ray-marched in WebGL in the kit's own tones; everything else is static SVG. Pointer or arrow keys
 * set the heart rate, and every number on the rig comes from one physiological model.
 */
export default function LangendorffHeart({ bpm: rest = 72, className = "" }: LangendorffHeartProps) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const readout = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = stage.current!;
    const back = root.querySelector<SVGSVGElement>(".back svg")!;
    const front = root.querySelector<SVGSVGElement>(".front svg")!;
    const text = readout.current!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const $ = <T extends Element>(name: string, scope: Element = back) => scope.querySelector<T>(`[data-part="${name}"]`)!;

    // As cores do coração saem das mesmas variáveis CSS do resto da figura.
    const css = getComputedStyle(root);
    const rgb = (hex: string) => {
      const h = hex.trim().replace("#", "");
      return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    };
    const tones = (...names: string[]) => names.flatMap((name) => rgb(css.getPropertyValue("--anatomy-" + name)));
    const palette = (name: string) => css.getPropertyValue(name).split(",").flatMap(rgb);
    let layer = glLayer(canvas.current!, {
      uO: [...DATA.HO], uU: [...DATA.HU], uV: [...DATA.HV], uW: [...DATA.HW], uLight: 0, uStyle: 0,
      uMyo: tones("shade-0", "shade-1", "shade-2", "shade-3", "lit-top"),
      uFat: tones("shade-1", "shade-2", "shade-3", "top", "lit-top"),
      uWall: tones("shade-0", "shade-1", "shade-2", "shade-3", "top"),
      uArt: palette("--h-art"), uVein: palette("--h-vein"), uLum: rgb(css.getPropertyValue("--h-lum")),
      uLit: tones("lit"), uHi: tones("hi"), uMid: tones("mid"), uLo: tones("lo"), uFaint: tones("faint"),
    });
    // O coração em SVG fica na tela até o shader compilar; se o aparelho não der conta, ele volta.
    // O WebGL começa em 25% da resolução e sobe enquanto os quadros forem rápidos: um quadro inteiro
    // de uma vez, numa GPU fraca, levava segundos, e o navegador derrubava o contexto (o "crash").
    let quality = 0.25;
    const dropGl = () => {
      layer?.dispose();
      layer = null;
      root.removeAttribute("data-gl");
    };
    const glReady = () => {
      if (!layer) return false;
      if (layer.failed()) {
        dropGl();
        return false;
      }
      if (!layer.ready()) return false;
      if (!root.hasAttribute("data-gl")) root.setAttribute("data-gl", "");
      return true;
    };

    const needle = $<SVGPathElement>("needle");
    const led = $<SVGCircleElement>("led");
    const rpm = $<SVGTextElement>("rpm");
    const trace = $<SVGPathElement>("trace");
    const penarm = $<SVGPathElement>("penarm");
    const pentip = $<SVGCircleElement>("pentip");
    const stimknob = $<SVGPathElement>("stimknob");
    const timegrid = $<SVGGElement>("timegrid");
    const drip = $<SVGCircleElement>("drip");
    const stream = $<SVGPathElement>("stream", front);
    const shine = $<SVGPathElement>("streamshine", front);
    const rollers = [...back.querySelectorAll<SVGGElement>("[data-roller]")];
    const bubbles = [...$<SVGGElement>("bubbles").children] as SVGCircleElement[];
    const bubbleState = bubbles.map((_, i) => ({ t: -i * 0.17, x: 0, y: 0 }));
    if (!timegrid.firstChild) timegrid.innerHTML = '<path class="iso-line grid" data-tone="faint" data-free=""/>';
    const timeline = timegrid.firstChild as SVGPathElement;

    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    const base = clamp(rest, BPM_RANGE[0], BPM_RANGE[1]);
    const TOUR = [base, base, clamp(base + 38, 50, 150), clamp(base + 38, 50, 150), clamp(base - 12, 50, 150), clamp(base - 12, 50, 150)];
    const history: [number, number][] = [];
    let bpm = base, target = base, beats = 0.24, clock = 0.2, time = 0;
    let rotor = 0, gaugeP = PERFUSION, gaugeV = 0, dripAt = 0;
    let frame = 0, last = 0, visible = false, running = false, active = true, touring = true, tour = 0, idle = 0, startTimer = 0;
    const dialAngle = (p: number) => DATA.DIAL_FROM + DATA.DIAL_SWEEP * (p / 160);
    const onDial = (r: number, a: number, lift: number): Point =>
      [0, 1, 2].map((i) => DATA.GAUGE_C[i] + DATA.GN[i] * (3.2 + lift) + r * (Math.cos(a) * DATA.GR[i] + Math.sin(a) * [0, 0, 1][i])) as Point;

    const draw = (dt: number, gl = true) => {
      const s = stateAt(clock, bpm);
      // Encurtamento de 8%, torção de 10°, abaulamento leve; o átrio contrai 9%.
      const def = [0.08 * s.act, 0.17 * s.act, 0.02 * s.act, 0.09 * s.atrium];
      if (gl && glReady()) layer!.draw({ uDef: def, uTime: clock }, quality);
      // Manômetro: perfusão constante, com a ondulação dos roletes e o aperto sistólico das coronárias.
      const want = PERFUSION + 0.7 * Math.sin(rotor * 3) + 2.4 * s.act;
      for (let i = 0; i < 4; i++) {
        gaugeV += (((want - gaugeP) * 700 - gaugeV * 38) * dt) / 4;
        gaugeP += (gaugeV * dt) / 4;
      }
      const a = dialAngle(gaugeP);
      needle.setAttribute("d", path([iso(onDial(2.4, a + Math.PI, 0.3)), iso(onDial(DATA.GAUGE_R - 4, a, 0.3))]));
      // Bomba: os três roletes giram na velocidade que entrega o fluxo coronário.
      const revs = pumpRpmOf(bpm);
      rotor += (revs / 60) * Math.PI * 2 * dt;
      const o = iso([DATA.ROTOR[0] + DATA.ROLL_AT, DATA.ROTOR[1], 0]);
      rollers
        .map((el, i) => {
          const ang = rotor + (i * Math.PI * 2) / 3;
          const q = iso([DATA.ROTOR[0] + Math.cos(ang) * DATA.ROLL_AT, DATA.ROTOR[1] + Math.sin(ang) * DATA.ROLL_AT, 0]);
          el.setAttribute("transform", `translate(${(q[0] - o[0]).toFixed(2)} ${(q[1] - o[1]).toFixed(2)})`);
          return { el, d: Math.cos(ang) + Math.sin(ang) };
        })
        .sort((x, y) => x.d - y.d)
        .forEach(({ el }) => el.parentNode!.appendChild(el));
      const shown = String(Math.round(revs));
      if (rpm.textContent !== shown) rpm.textContent = shown;
      // Registrador: a pena segue a pressão do VE e o papel corre a 10 mm/s.
      history.push([time, s.lvp]);
      const span = (DATA.PAPER.y + DATA.PAPER.d - DATA.PEN_Y) / DATA.SPEED + 0.2;
      while (history.length && time - history[0][0] > span) history.shift();
      const z = DATA.REC_H + 0.35;
      const xOf = (p: number) => DATA.PAPER.x + 3 + (p / 150) * (DATA.PAPER.w - 6);
      trace.setAttribute("d", history.length > 1 ? path(history.map(([t, p]) => iso([xOf(p), Math.min(DATA.PAPER.y + DATA.PAPER.d, DATA.PEN_Y + (time - t) * DATA.SPEED), z]))) : "");
      const tip: Point = [xOf(s.lvp), DATA.PEN_Y, z];
      penarm.setAttribute("d", path([iso([DATA.PEN_PIVOT[0], DATA.PEN_PIVOT[1], DATA.REC_H + 6]), iso([tip[0], tip[1], DATA.REC_H + 1.4])]));
      const tp = iso(tip);
      pentip.setAttribute("cx", tp[0].toFixed(1));
      pentip.setAttribute("cy", tp[1].toFixed(1));
      let grid = "";
      for (let n = Math.floor(time) - 8; n <= Math.floor(time); n++) {
        const y = DATA.PEN_Y + (time - n) * DATA.SPEED;
        if (y < DATA.PAPER.y + 1 || y > DATA.PAPER.y + DATA.PAPER.d - 0.5) continue;
        grid += path([iso([DATA.PAPER.x, y, z]), iso([DATA.PAPER.x + DATA.PAPER.w, y, z])]);
      }
      timeline.setAttribute("d", grid);
      // Estimulador: o LED pisca a cada pulso e o botão mostra a frequência.
      if (s.phase < 0.05 || s.phase > s.period - 0.02) led.setAttribute("data-on", "");
      else led.removeAttribute("data-on");
      const ka = Math.PI * 0.75 + Math.PI * 1.5 * ((bpm - BPM_RANGE[0]) / (BPM_RANGE[1] - BPM_RANGE[0]));
      const kc = [DATA.STIM.x + 28, DATA.STIM.y + 13];
      stimknob.setAttribute("d", path([iso([kc[0] + Math.cos(ka) * 1.4, kc[1] + Math.sin(ka) * 1.4, DATA.STIM_H + 5]), iso([kc[0] + Math.cos(ka) * 5, kc[1] + Math.sin(ka) * 5, DATA.STIM_H + 5])]));
      // Efluente: filete que sai do ápice e afina na queda (continuidade com a gravidade).
      const apex = toWorld(deform(DATA.APEX_L, def));
      const g = 8175; // mm/s² em unidades de 1,2 mm
      const v0 = 120;
      const r0 = Math.sqrt((((s.venous / 60) * 1000) / 1.728 / v0) / Math.PI);
      const end: Point = [DATA.FUNNEL[0], DATA.FUNNEL[1], DATA.FUN_LIQUID];
      const left: [number, number][] = [];
      const right: [number, number][] = [];
      const mid: [number, number][] = [];
      for (let i = 0; i <= 16; i++) {
        const u = i / 16;
        const p: Point = [apex[0] + (end[0] - apex[0]) * u * u, apex[1] + (end[1] - apex[1]) * u * u, apex[2] - (apex[2] - end[2]) * u];
        const r = Math.max(0.35, r0 * Math.pow(v0 / Math.sqrt(v0 * v0 + 2 * g * (apex[2] - p[2])), 0.5)) * (1 + 0.6 * (1 - u) * (1 - u));
        const c = iso(p);
        left.push([c[0] - r * 0.9, c[1]]);
        right.push([c[0] + r * 0.9, c[1]]);
        mid.push([c[0] + 0.2, c[1]]);
      }
      stream.setAttribute("d", path(left.concat(right.reverse())) + "Z");
      shine.setAttribute("d", path(mid));
      shine.style.strokeDashoffset = String(-(time * 60) % 10);
      // Borbulhador: carbogênio subindo pelo frasco.
      bubbleState.forEach((b, i) => {
        b.t += dt;
        if (b.t > 1.1) {
          b.t -= 1.1;
          b.x = (Math.random() - 0.5) * 8;
          b.y = (Math.random() - 0.5) * 8;
        }
        const u = Math.max(0, b.t) / 1.1;
        const c = iso([DATA.RES[0] - 8 + b.x + Math.sin(b.t * 9 + i) * 1.2, DATA.RES[1] - 6 + b.y, 6 + (DATA.RES_LEVEL - 7) * u]);
        bubbles[i].setAttribute("cx", c[0].toFixed(1));
        bubbles[i].setAttribute("cy", c[1].toFixed(1));
        bubbles[i].setAttribute("r", (0.7 + u * 0.9).toFixed(2));
        bubbles[i].setAttribute("opacity", b.t < 0 ? "0" : u > 0.92 ? ((1 - u) / 0.08).toFixed(2) : "0.9");
      });
      // Gotejamento no coletor de bolhas.
      const dAge = time - dripAt;
      if (dAge > (60 / (pumpRpmOf(bpm) * 3)) * 4) dripAt = time;
      const du = Math.min(1, dAge / 0.12);
      const dp = iso([DATA.INLET[0], DATA.INLET[1], DATA.TRAP_TOP - 2 - (DATA.TRAP_TOP - 2 - DATA.TRAP_LEVEL) * du * du]);
      drip.setAttribute("cx", dp[0].toFixed(1));
      drip.setAttribute("cy", dp[1].toFixed(1));
      drip.setAttribute("opacity", dAge < 0.12 ? "1" : "0");
      const summary = `${Math.round(bpm)} bpm · LV ${Math.round(EDP + developedOf(bpm))}/${EDP} mmHg · coronary flow ${Math.round(flowOf(bpm))} mL/min`;
      if (text.textContent !== summary) text.textContent = summary;
      root.setAttribute("aria-valuenow", String(Math.round(bpm)));
      root.setAttribute("aria-valuetext", `${Math.round(bpm)} beats per minute`);
    };

    // rAF com rede de segurança: com a janela atrás de outra, o rAF para e a figura congelaria. A rede
    // (o setTimeout) só anima o SVG: desenhar WebGL fora do rAF empilha trabalho numa GPU que já está
    // atrasada, e a fila cresce até travar o navegador.
    const schedule = (fn: (now: number, viaTimer: boolean) => void) => {
      let fired = false;
      const go = (now: number, viaTimer: boolean) => {
        if (fired) return;
        fired = true;
        fn(now || performance.now(), viaTimer);
      };
      frame = requestAnimationFrame((now) => go(now, false));
      window.setTimeout(() => go(performance.now(), true), 60);
    };
    // Vigia do rAF com o WebGL ligado: quadro lento baixa a resolução; 5 lentos seguidos já na mínima e o
    // coração volta para o SVG. Dez quadros rápidos seguidos sobem a resolução de novo, até 100%.
    let slow = 0;
    let fast = 0;
    let lastRaf = 0;
    const watch = (now: number) => {
      const gap = lastRaf ? now - lastRaf : 0;
      lastRaf = now;
      if (!layer || !root.hasAttribute("data-gl") || !gap) return;
      if (gap > 120) {
        fast = 0;
        if (quality > 0.2) quality = Math.max(0.2, quality * 0.6);
        else if (++slow >= 5) dropGl();
      } else {
        slow = 0;
        if (gap < 40 && ++fast >= 10 && quality < 1) {
          fast = 0;
          quality = Math.min(1, quality + 0.15);
        }
      }
    };
    // Contexto derrubado pelo navegador (GPU sem resposta): fica o SVG.
    const onLost = () => dropGl();
    const glCanvas = canvas.current!;
    glCanvas.addEventListener("webglcontextlost", onLost);
    const tick = (now: number, viaTimer = false) => {
      if (!active) return;
      if (!viaTimer) watch(now);
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      if (touring) {
        tour += dt;
        target = TOUR[Math.floor(tour / 3.6) % TOUR.length];
      }
      // O relógio conta batidas: mudar a frequência acelera o ciclo sem pular a fase.
      bpm += (target - bpm) * (1 - Math.exp(-dt / 0.8));
      beats += (dt * bpm) / 60;
      clock = (beats * 60) / bpm;
      time += dt;
      draw(dt, !viaTimer);
      if (visible && !reduced.matches) schedule(tick);
      else running = false;
    };
    const run = () => {
      if (running || !visible || reduced.matches || !active) return;
      running = true;
      last = 0;
      lastRaf = 0;
      schedule(tick);
    };
    const steer = (to: number) => {
      touring = false;
      target = clamp(Math.round(to), BPM_RANGE[0], BPM_RANGE[1]);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        touring = true;
        tour = 0;
        run();
      }, 4500);
      if (reduced.matches) {
        bpm = target;
        draw(1 / 60);
      }
      run();
    };
    const onPointer = (event: PointerEvent) => {
      const box = root.getBoundingClientRect();
      steer(BPM_RANGE[0] + clamp(((event.clientX - box.left) / box.width - 0.15) / 0.7, 0, 1) * (BPM_RANGE[1] - BPM_RANGE[0]));
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "ArrowUp") steer(target + 5);
      else if (event.key === "ArrowLeft" || event.key === "ArrowDown") steer(target - 5);
      else return;
      event.preventDefault();
    };
    root.addEventListener("pointermove", onPointer);
    root.addEventListener("keydown", onKey);
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[entries.length - 1].isIntersecting;
        if (visible) run();
      },
      { rootMargin: "120px 0px" },
    );
    io.observe(root);
    startTimer = window.setTimeout(() => {
      if (!running && !visible) {
        const b = root.getBoundingClientRect();
        visible = b.bottom > 0 && b.top < window.innerHeight;
        run();
      }
    }, 800);

    // Papel já com alguns segundos de traçado; com movimento reduzido, um quadro parado no meio da sístole.
    for (let i = 0; i < 360; i++) {
      beats += bpm / 3600;
      clock = (beats * 60) / bpm;
      time += 1 / 60;
      history.push([time, stateAt(clock, bpm).lvp]);
    }
    if (reduced.matches) clock = 0.12;
    draw(1 / 60);
    // O shader compila em segundo plano: confere a cada 100 ms e, quando ficar pronto com a figura
    // parada (fora da tela ou movimento reduzido), desenha um quadro para o coração em WebGL aparecer.
    let compileTimer = 0;
    const waitCompile = () => {
      if (!active || !layer) return;
      if (glReady()) {
        if (!running) draw(0);
        return;
      }
      compileTimer = window.setTimeout(waitCompile, 100);
    };
    waitCompile();

    return () => {
      active = false;
      running = false;
      cancelAnimationFrame(frame);
      window.clearTimeout(idle);
      window.clearTimeout(startTimer);
      window.clearTimeout(compileTimer);
      glCanvas.removeEventListener("webglcontextlost", onLost);
      io.disconnect();
      root.removeEventListener("pointermove", onPointer);
      root.removeEventListener("keydown", onKey);
      layer?.dispose();
    };
  }, [rest]);

  return (
    <div className={`iso mx-auto w-full max-w-[640px] ${className}`} data-theme="dark">
      <style>{FIGURE_CSS}</style>
      <div
        ref={stage}
        role="slider"
        tabIndex={0}
        aria-label="Langendorff heart. Arrow keys or the pointer change the heart rate."
        aria-valuemin={BPM_RANGE[0]}
        aria-valuemax={BPM_RANGE[1]}
        aria-valuenow={rest}
        className="fx-stage rounded-md outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
      >
        <div className="back" dangerouslySetInnerHTML={BACK_HTML} />
        <canvas ref={canvas} className="fx-layer fx-gl" aria-hidden="true" />
        <div className="front fx-layer" aria-hidden="true" dangerouslySetInnerHTML={FRONT_HTML} />
      </div>
      <p ref={readout} className="mt-2 text-center font-mono text-xs text-neutral-400" />
    </div>
  );
}
