"use client";

import { forwardRef, useEffect, useId, useRef, type HTMLAttributes } from "react";

export type HourglassLoaderProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  /** 0–1. When set, the sand follows real progress and the hourglass never flips; at 1 the top is empty. */
  progress?: number;
  /** Seconds the sand takes to run through in the looping mode. */
  duration?: number;
  /** Called when the hourglass starts a flip (looping mode only). */
  onFlip?: () => void;
  /** Height in px; the width follows (100:160). */
  size?: number;
  /** Accessible name. */
  label?: string;
};

// A areia é uma simulação no referencial do vidro: duas pilhas analíticas (funil em cima, cone embaixo)
// mais grãos soltos. Unidades locais do viewBox 0 0 100 160, y para baixo; segundos.
const CX = 50; // eixo do vidro
const NECK = 80; // y do gargalo
const D_MAX = 69; // distância do gargalo até a tampa
const REPOSE = 0.67; // tan 34°: inclinação das encostas
const L0 = 50; // nível da areia cheia no bulbo de cima
const CRATER = 0.14; // fração de L0 em que a cratera nasce
const AX_STEP = 0.25; // coluna das tabelas e do desenho
const AX_MAX = 33; // um pouco além do vidro: o clip corta o excesso
const FLOW = 480; // grãos/s no fio: denso o bastante para ler como um fio contínuo
const SLIDE_RATE = 25; // escorregadores/s na cratera
const G = 1400; // u/s²
const FALL_V0 = 25; // u/s: velocidade inicial do fio
const GRAIN = 0.9; // lado do grão
const MAX_P = 640; // partículas simultâneas
const FLIP = 0.6; // s do giro
const SETTLE = 0.35; // s da areia caindo no lugar depois do giro
const WAIT_AIR = 0.25; // s no máximo esperando os grãos do ar
const EASE_PROGRESS = 0.25; // s: constante de tempo do modo progress
const SAND = ["#e6c487", "#c0914c", "#d4a960"]; // tons dos grãos soltos

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smoothstep = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
// Giro feito à mão: acelera e freia até passar ~7° (70% do tempo), depois um tranco curto que assenta.
const flipEase = (t: number) => {
  if (t < 0.7) {
    const u = t / 0.7;
    return 1.04 * (u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2);
  }
  const v = (t - 0.7) / 0.3;
  return 1 + 0.04 * (1 - v) ** 2 * Math.cos(3 * Math.PI * v);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Semente fixa: a textura da areia é a mesma em toda montagem.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Perfil do vidro: meia largura interna a d unidades do gargalo. Usado no SVG, no recorte e na simulação.
function hw(d: number) {
  if (d <= 62) return 2.6 + 29.4 * Math.pow(Math.sin(((Math.PI / 2) * d) / 62), 1.5);
  if (d <= 66) return 32;
  return 32 - 4 * ((d - 66) / 3) ** 2; // ombro arredondado entrando na tampa
}

// Inversa do perfil: o menor d em que a meia largura chega a ax. Tabela pelo ax (inversa exata até 62).
const AX_N = Math.round(32 / AX_STEP);
const WALL = (() => {
  const t = new Float32Array(AX_N + 1);
  for (let i = 0; i <= AX_N; i++) {
    const ax = i * AX_STEP;
    t[i] = ax <= 2.6 ? 0 : ((2 * 62) / Math.PI) * Math.asin(Math.pow(Math.min(1, (ax - 2.6) / 29.4), 1 / 1.5));
  }
  return t;
})();
function wall(ax: number) {
  if (ax >= 32) return WALL[AX_N];
  const f = ax / AX_STEP;
  const i = Math.floor(f);
  return lerp(WALL[i], WALL[i + 1], f - i);
}

// Bulbo fonte: cratera nasce nos primeiros 14% e logo chega ao gargalo (funil nas encostas de 34°).
const crater = (L: number) => L * smoothstep((L0 - L) / (CRATER * L0));
// Máximo suave (raio ~1.5) na borda da cratera: canto vivo parece recortado. Some para longe da borda.
const ROUND = 2.25;
const surface = (ax: number, L: number, dip: number) => {
  const a = dip - REPOSE * ax;
  return L - Math.max(0, (a + Math.sqrt(a * a + ROUND) - Math.sqrt(ROUND)) / 2);
};

function topVolume(L: number) {
  const dip = Math.min(L, crater(L));
  let sum = 0;
  for (let i = 0; i < AX_N; i++) {
    const ax = (i + 0.5) * AX_STEP;
    const v = surface(ax, L, dip) - wall(ax);
    if (v > 0) sum += v;
  }
  return sum * AX_STEP * 2;
}
// Bulbo destino: cone com o pico em d = Pk, limitado pela parede e pela tampa.
function bottomVolume(Pk: number) {
  let sum = 0;
  for (let i = 0; i < AX_N; i++) {
    const ax = (i + 0.5) * AX_STEP;
    const v = D_MAX - Math.max(Pk + REPOSE * ax, wall(ax));
    if (v > 0) sum += v;
  }
  return sum * AX_STEP * 2;
}

// Tabelas monótonas, calculadas uma vez: volume da fonte por nível L (0 a 69) e do destino por pico Pk (69 a -20).
const TOP_N = Math.round(D_MAX / AX_STEP) + 1;
const BOT_N = Math.round((D_MAX + 20) / AX_STEP) + 1;
const VOL_TOP = (() => {
  const t = new Float32Array(TOP_N);
  for (let i = 0; i < TOP_N; i++) t[i] = Math.max(i ? t[i - 1] : 0, topVolume(i * AX_STEP));
  return t;
})();
const VOL_BOT = (() => {
  const t = new Float32Array(BOT_N);
  for (let i = 0; i < BOT_N; i++) t[i] = Math.max(i ? t[i - 1] : 0, bottomVolume(D_MAX - i * AX_STEP));
  return t;
})();
const V = VOL_TOP[Math.round(L0 / AX_STEP)]; // volume total de areia
const PK_FULL = invert(VOL_BOT, V, (i) => D_MAX - i * AX_STEP); // pico do cone com toda a areia embaixo

// Busca binária + interpolação linear numa tabela crescente; at(i) devolve o parâmetro do índice i.
function invert(tab: Float32Array, vol: number, at: (i: number) => number) {
  if (vol <= tab[0]) return at(0);
  if (vol >= tab[tab.length - 1]) return at(tab.length - 1);
  let lo = 0;
  let hi = tab.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (tab[mid] >= vol) hi = mid;
    else lo = mid;
  }
  const f = (vol - tab[lo]) / (tab[hi] - tab[lo] || 1);
  return lerp(at(lo), at(hi), f);
}
const levelOf = (vol: number) => (vol >= V ? L0 : invert(VOL_TOP, vol, (i) => i * AX_STEP));
const peakOf = (vol: number) => invert(VOL_BOT, vol, (i) => D_MAX - i * AX_STEP);

// Contorno fechado do vidro, com folga para dentro (inset) quando é recorte da areia.
function glassPath(inset = 0) {
  const pt = (side: number, d: number, up: boolean) =>
    `${(CX + side * (hw(d) - inset)).toFixed(2)} ${(up ? NECK - d : NECK + d).toFixed(2)}`;
  const out: string[] = [];
  for (let d = D_MAX; d >= 0; d--) out.push(pt(-1, d, true));
  for (let d = 1; d <= D_MAX; d++) out.push(pt(-1, d, false));
  for (let d = D_MAX; d >= 1; d--) out.push(pt(1, d, false));
  for (let d = 0; d <= D_MAX; d++) out.push(pt(1, d, true));
  return `M${out.join("L")}Z`;
}
// Reflexo: curva a 5 unidades da parede, de d0 a d1, nos dois bulbos.
function glint(side: number, d0: number, d1: number) {
  const seg = (up: boolean) => {
    const pts: string[] = [];
    for (let d = d0; d <= d1; d += 2) pts.push(`${(CX + side * (hw(d) - 5)).toFixed(2)} ${(up ? NECK - d : NECK + d).toFixed(2)}`);
    return `M${pts.join("L")}`;
  };
  return `${seg(true)}${seg(false)}`;
}

const GLASS_D = glassPath(0);
const CLIP_D = glassPath(0.6);
const GLINT_L = glint(-1, 14, 56);
const GLINT_R = glint(1, 22, 44);

/** Ampulheta de vidro cuja areia cai de verdade: gira sozinha em loop, ou segue um progresso real. */
const HourglassLoader = forwardRef<HTMLDivElement, HourglassLoaderProps>(function HourglassLoader(
  { progress, duration = 4, onFlip, size = 160, label = "Loading", className = "", style, ...props },
  ref,
) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ids = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const capId = `${ids}-cap`;
  const postId = `${ids}-post`;

  // Lido ao vivo pelo laço: mudar a prop no meio da corrida não reinicia nada.
  const settings = useRef({ progress, duration, size });
  const flipRef = useRef(onFlip);
  const wakeRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    settings.current = { progress, duration, size };
    wakeRef.current?.();
  }, [progress, duration, size]);
  useEffect(() => {
    flipRef.current = onFlip;
  }, [onFlip]);

  useEffect(() => {
    const body = bodyRef.current;
    const root = body?.parentElement;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !body || !canvas || !ctx) return;

    const clip = new Path2D(CLIP_D);
    const shade = ctx.createLinearGradient(CX - 32, 0, CX + 32, 0);
    shade.addColorStop(0, "rgba(60,35,10,0.35)");
    shade.addColorStop(0.35, "rgba(60,35,10,0)");
    shade.addColorStop(0.65, "rgba(60,35,10,0)");
    shade.addColorStop(1, "rgba(60,35,10,0.35)");
    let pattern: CanvasPattern | null = null;

    // Estado da simulação (tudo em variáveis do efeito, nada de setState por quadro).
    let phase: "drain" | "wait" | "flip" | "settle" = "drain";
    let prog = 0; // fração da areia que já passou (0 a 1)
    let base = 0; // graus
    let sgn = 1; // +1: o bulbo fonte é o de cima no referencial do corpo
    let t = 0; // relógio da fase atual
    let flowAcc = 0;
    let slideAcc = 0;
    let frame = 0;
    let last = 0;
    let visible = false;
    let lastTransform = "";
    const lv = { src: true, L: L0, dip: 0, Pk: D_MAX };

    // Partículas em arrays fixos. kind: 0 morto, 1 fio, 2 rolador, 3 escorregador.
    const kind = new Uint8Array(MAX_P);
    const pa = new Float32Array(MAX_P); // fio: x - CX; demais: distância ao eixo
    const pd = new Float32Array(MAX_P); // distância ao gargalo
    const pv = new Float32Array(MAX_P);
    const px = new Float32Array(MAX_P); // deriva do fio
    const age = new Float32Array(MAX_P);
    const col = new Uint8Array(MAX_P);
    const side = new Int8Array(MAX_P);
    let alive = 0;
    let fio = 0;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const slot = () => {
      for (let i = 0; i < MAX_P; i++) if (!kind[i]) return i;
      return -1;
    };
    const clearParticles = () => {
      kind.fill(0);
      alive = 0;
      fio = 0;
    };

    // Textura da areia: grãos fixos no vidro, em pixels de dispositivo.
    const makeTile = (pdpr: number) => {
      const n = 48 * pdpr;
      const tile = document.createElement("canvas");
      tile.width = n;
      tile.height = n;
      const c = tile.getContext("2d");
      if (!c) return tile;
      c.fillStyle = "#d4a960";
      c.fillRect(0, 0, n, n);
      const rnd = mulberry32(20261029);
      for (let i = 0; i < 900; i++) {
        const r = rnd();
        c.fillStyle = r < 0.1 ? "#b07f3c" : r < 0.55 ? "#e6c487" : "#c0914c";
        c.fillRect(Math.floor(rnd() * n), Math.floor(rnd() * n), (rnd() < 0.5 ? 1 : 2) * pdpr, pdpr);
      }
      return tile;
    };

    const setBody = (angle: number, lift: number) => {
      const next = `translateY(${lift.toFixed(2)}px) rotate(${angle.toFixed(2)}deg)`;
      if (next === lastTransform) return;
      lastTransform = next;
      body.style.transform = next;
    };

    // Nível da fonte e pico do destino a partir da fração que já passou.
    const levels = () => {
      lv.src = prog < 0.999;
      const vol = lv.src ? (1 - prog) * V : 0;
      lv.L = lv.src ? levelOf(vol) : 0;
      lv.dip = Math.min(lv.L, crater(lv.L));
      lv.Pk = peakOf(V - vol);
    };

    const spawnFio = () => {
      const i = slot();
      if (i < 0) return;
      kind[i] = 1;
      pa[i] = (Math.random() - 0.5) * 0.7;
      pd[i] = 0;
      pv[i] = FALL_V0;
      px[i] = (Math.random() * 2 - 1) * 0.4;
      col[i] = Math.floor(Math.random() * 3);
    };
    const spawnSlide = () => {
      const i = slot();
      if (i < 0) return;
      kind[i] = 3;
      // Na borda da cratera; se ela cai fora do vidro, na coluna mais larga que ainda tem areia.
      let a = Math.min(lv.dip / REPOSE, 32);
      while (a > 2 && surface(a, lv.L, lv.dip) - wall(a) < 0.5) a -= 0.5;
      pa[i] = a;
      pd[i] = surface(pa[i], lv.L, lv.dip);
      pv[i] = 10 + Math.random() * 10;
      side[i] = Math.random() < 0.5 ? -1 : 1;
      col[i] = Math.floor(Math.random() * 3);
    };

    const updateParticles = (dt: number, flowing: boolean) => {
      if (flowing) {
        flowAcc += FLOW * dt;
        while (flowAcc >= 1) {
          flowAcc -= 1;
          spawnFio();
        }
        if (lv.dip > 1) {
          slideAcc += SLIDE_RATE * dt;
          while (slideAcc >= 1) {
            slideAcc -= 1;
            spawnSlide();
          }
        }
      }
      alive = 0;
      fio = 0;
      for (let i = 0; i < MAX_P; i++) {
        const k = kind[i];
        if (!k) continue;
        if (k === 1) {
          pv[i] += G * dt;
          pd[i] += pv[i] * dt;
          pa[i] += px[i] * dt;
          const ax = Math.abs(pa[i]);
          if (pd[i] >= lv.Pk + REPOSE * ax) {
            // Chegou na superfície do cone: some, e às vezes rola encosta abaixo.
            if (Math.random() < 0.35) {
              kind[i] = 2;
              pa[i] = ax;
              pd[i] = lv.Pk + REPOSE * ax;
              pv[i] = 18 + Math.random() * 16;
              age[i] = 0;
              side[i] = Math.random() < 0.5 ? -1 : 1;
            } else kind[i] = 0;
          }
        } else if (k === 2) {
          age[i] += dt;
          pv[i] += 12 * dt;
          pa[i] += pv[i] * dt;
          const s = lv.Pk + REPOSE * pa[i];
          pd[i] = s;
          if (age[i] > 0.8 || s >= D_MAX || pa[i] >= hw(clamp(s, 0, D_MAX))) kind[i] = 0;
        } else {
          pa[i] -= pv[i] * dt;
          if (pa[i] < 1.5 || !lv.src) kind[i] = 0;
          else pd[i] = surface(pa[i], lv.L, lv.dip);
        }
        if (kind[i]) {
          alive++;
          if (kind[i] === 1) fio++;
        }
      }
    };

    // Traça um contorno por colunas: y(ax) em unidades de d, na orientação sgn (de cima = +1 para a fonte).
    const trace = (dOf: (ax: number) => number, toward: number, reverse: boolean) => {
      const n = Math.round(AX_MAX / AX_STEP);
      for (let j = reverse ? n : -n; reverse ? j >= -n : j <= n; j += reverse ? -1 : 1) {
        const ax = Math.abs(j) * AX_STEP;
        ctx.lineTo(CX + j * AX_STEP, NECK + toward * dOf(ax));
      }
    };

    const render = () => {
      if (!pattern) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(canvas.width / 100, 0, 0, canvas.height / 160, 0, 0);
      ctx.save();
      ctx.clip(clip);
      ctx.fillStyle = pattern;
      if (phase === "settle") {
        // Areia caindo do fundo (cone encostado na tampa) para o lugar de fonte cheia.
        const e = (t / SETTLE) ** 2;
        const hi = lerp(D_MAX, L0, e);
        const lo = (ax: number) => Math.min(hi, lerp(Math.max(PK_FULL + REPOSE * ax, wall(ax)), wall(ax), e));
        ctx.beginPath();
        ctx.moveTo(CX - AX_MAX, NECK - sgn * hi);
        trace(() => hi, -sgn, false);
        trace(lo, -sgn, true);
        ctx.closePath();
        ctx.fill();
      } else {
        if (lv.src) {
          ctx.beginPath();
          ctx.moveTo(CX - AX_MAX, NECK);
          trace((ax) => Math.max(0, surface(ax, lv.L, lv.dip)), -sgn, false);
          ctx.lineTo(CX + AX_MAX, NECK);
          ctx.closePath();
          ctx.fill();
        }
        if (lv.Pk < D_MAX) {
          ctx.beginPath();
          ctx.moveTo(CX - AX_MAX, NECK + sgn * (D_MAX + 1));
          trace((ax) => lv.Pk + REPOSE * ax, sgn, false);
          ctx.lineTo(CX + AX_MAX, NECK + sgn * (D_MAX + 1));
          ctx.closePath();
          ctx.fill();
        }
      }
      // Sombreado de volume: só a areia está no canvas, então source-atop pinta só nela.
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = shade;
      ctx.fillRect(CX - 32, NECK - D_MAX, 64, D_MAX * 2);
      ctx.globalCompositeOperation = "source-over";
      for (let i = 0; i < MAX_P; i++) {
        const k = kind[i];
        if (!k) continue;
        const x = k === 1 ? CX + pa[i] : CX + side[i] * pa[i];
        const y = k === 3 ? NECK - sgn * pd[i] : NECK + sgn * pd[i];
        ctx.fillStyle = SAND[col[i]];
        // Grão do fio já rápido vira um risco vertical (desfoque de movimento); o resto é um quadradinho.
        if (k === 1) {
          const len = clamp(pv[i] / 60, GRAIN, 2.4);
          ctx.fillRect(x - 0.35, y - len / 2, 0.7, len);
        } else ctx.fillRect(x - GRAIN / 2, y - GRAIN / 2, GRAIN, GRAIN);
      }
      ctx.restore();
    };

    // Dimensiona o canvas e refaz o pattern (depende do dpr e da escala).
    const resize = () => {
      const { size: h } = settings.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(((h * 100) / 160) * dpr));
      const ch = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== w || canvas.height !== ch) {
        canvas.width = w;
        canvas.height = ch;
      }
      const pdpr = dpr > 1.5 ? 2 : 1;
      pattern = ctx.createPattern(makeTile(pdpr), "repeat");
      pattern?.setTransform(new DOMMatrix().scale(1 / ((h / 160) * pdpr)));
      levels();
      if (!frame) render();
    };

    // Termina na hora o que estava em andamento (movimento reduzido): o giro já feito, areia no lugar.
    const finishNow = () => {
      if (phase === "wait" || phase === "flip") {
        base = (base + 180) % 360;
        sgn = -sgn;
      }
      if (phase !== "drain") prog = 0;
      phase = "drain";
    };
    const drawStill = () => {
      clearParticles();
      finishNow();
      if (settings.current.progress !== undefined) prog = clamp(settings.current.progress);
      setBody(base, 0);
      levels();
      render();
    };

    const advance = (dt: number) => {
      const s = settings.current;
      let flowing = false;
      if (phase === "drain") {
        if (s.progress !== undefined) {
          const target = clamp(s.progress);
          if (target < prog - 0.02) prog = target;
          else if (prog < target) prog += (target - prog) * (1 - Math.exp(-dt / EASE_PROGRESS));
          flowing = target - prog > 0.002 && prog < 1;
          if (!flowing && prog < target) prog = target;
        } else {
          prog = Math.min(1, prog + dt / Math.max(0.1, s.duration));
          flowing = prog < 1;
          if (prog >= 1) {
            phase = "wait";
            t = 0;
          }
        }
      }
      levels();
      updateParticles(dt, flowing);
      if (phase === "wait") {
        t += dt;
        if (fio === 0 || t >= WAIT_AIR) {
          clearParticles();
          phase = "flip";
          t = 0;
          flipRef.current?.();
        }
      } else if (phase === "flip") {
        t += dt;
        const u = Math.min(1, t / FLIP);
        if (u >= 1) {
          base = (base + 180) % 360;
          sgn = -sgn;
          phase = "settle";
          t = 0;
          setBody(base, 0);
        } else setBody(base + 180 * flipEase(u), -0.04 * s.size * Math.sin(Math.PI * u));
      } else if (phase === "settle") {
        t += dt;
        if (t >= SETTLE) {
          phase = "drain";
          prog = 0;
          t = 0;
          levels();
        }
      }
      return flowing;
    };

    const canRun = () => visible && !document.hidden && !mq.matches;
    const step = (now: number) => {
      frame = 0;
      const dt = clamp((now - last) / 1000, 0, 1 / 30);
      last = now;
      const flowing = advance(dt);
      render();
      // No modo progress, dorme quando a areia alcançou o alvo e não há grãos no ar.
      const resting = settings.current.progress !== undefined && phase === "drain" && !flowing && alive === 0;
      if (!resting && canRun()) frame = requestAnimationFrame(step);
    };
    const start = () => {
      if (frame || !canRun()) return;
      last = performance.now();
      frame = requestAnimationFrame(step);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    wakeRef.current = () => {
      if (mq.matches) drawStill();
      else start();
    };

    const onMotion = () => {
      if (mq.matches) {
        stop();
        drawStill();
      } else start();
    };
    const onVisibility = () => (canRun() ? start() : stop());
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[entries.length - 1].isIntersecting;
        onVisibility();
      },
      { rootMargin: "120px 0px" },
    );
    const ro = new ResizeObserver(() => {
      resize();
      if (mq.matches) drawStill();
    });

    resize();
    setBody(base, 0);
    if (mq.matches) drawStill();
    else render();
    io.observe(root);
    ro.observe(root);
    document.addEventListener("visibilitychange", onVisibility);
    mq.addEventListener("change", onMotion);
    return () => {
      wakeRef.current = null;
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      mq.removeEventListener("change", onMotion);
    };
  }, []);

  const known = progress !== undefined;
  const a11y = known
    ? { role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(clamp(progress) * 100), "aria-label": label }
    : { role: "status", "aria-label": label };

  return (
    <div ref={ref} className={`relative inline-block ${className}`} style={{ width: (size * 100) / 160, height: size, ...style }} {...a11y} {...props}>
      <div ref={bodyRef} className="absolute inset-0" style={{ transformOrigin: "50% 50%", willChange: "transform" }}>
        {/* areia, desenhada no referencial do corpo */}
        <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
        {/* vidro, tampas e colunas por cima */}
        <svg aria-hidden viewBox="0 0 100 160" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id={capId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4a4f5c" />
              <stop offset="1" stopColor="#23262e" />
            </linearGradient>
            <linearGradient id={postId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#2a2e37" />
              <stop offset="0.5" stopColor="#5a6070" />
              <stop offset="1" stopColor="#2a2e37" />
            </linearGradient>
          </defs>
          {/* colunas antes do vidro: o vidro fica na frente */}
          <rect x="9" y="11" width="4" height="138" fill={`url(#${postId})`} />
          <rect x="87" y="11" width="4" height="138" fill={`url(#${postId})`} />
          {/* tampas iguais, porque a ampulheta gira */}
          <rect x="6" y="0" width="88" height="11" rx="2.5" fill={`url(#${capId})`} />
          <rect x="6" y="149" width="88" height="11" rx="2.5" fill={`url(#${capId})`} />
          <rect x="7" y="0" width="86" height="0.8" fill="#7a8192" />
          <rect x="7" y="10.2" width="86" height="0.8" fill="#7a8192" />
          <rect x="7" y="149" width="86" height="0.8" fill="#7a8192" />
          <rect x="7" y="159.2" width="86" height="0.8" fill="#7a8192" />
          <rect x="14" y="11" width="72" height="2" fill="#1b1d23" />
          <rect x="14" y="147" width="72" height="2" fill="#1b1d23" />
          <g fill="#8a91a3">
            <circle cx="11" cy="5.5" r="1.4" />
            <circle cx="89" cy="5.5" r="1.4" />
            <circle cx="11" cy="154.5" r="1.4" />
            <circle cx="89" cy="154.5" r="1.4" />
          </g>
          <path d={GLASS_D} fill="rgba(255,255,255,0.035)" stroke="rgba(214,224,255,0.38)" strokeWidth="1.1" strokeLinejoin="round" />
          <path d={GLINT_L} fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d={GLINT_R} fill="none" stroke="#fff" strokeOpacity="0.12" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
});

export default HourglassLoader;
