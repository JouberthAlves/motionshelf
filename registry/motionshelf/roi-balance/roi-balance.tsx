"use client";

import { useEffect, useRef } from "react";
import { BEAM, FIGURE_CSS, FIGURE_SVG, L, MODEL, PAN_H, PAN_R, PIVOT, POINTER, PROJECTION, REST } from "./roi-balance-figure";

export type RoiBalanceProps = {
  /** Share of clicks that buy (0.03 = 3%). */
  conversion?: number;
  /** Average order value. */
  ticket?: number;
  /** Currency symbol used in the readout. */
  currency?: string;
  /** Extra classes for the outer element. */
  className?: string;
};

type Point = [number, number, number];

const RAD = Math.PI / 180;
const UNIT = Math.sqrt(1.6);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

// Mesma projeção do kit da skill anatomy, para as peças que se mexem caírem sobre o desenho.
const CAM = (() => {
  const a = PROJECTION.azimuth * RAD;
  const e = PROJECTION.elevation * RAD;
  return { sinA: Math.sin(a), cosA: Math.cos(a), sinE: Math.sin(e), cosE: Math.cos(e), k: PROJECTION.scale * UNIT };
})();
function iso([x, y, z]: Point): [number, number] {
  const { sinA, cosA, sinE, cosE, k } = CAM;
  return [PROJECTION.origin[0] + (x * sinA - y * cosA) * k, PROJECTION.origin[1] + ((x * cosA + y * sinA) * sinE - z * cosE) * k];
}
function depthOf([x, y, z]: Point) {
  const { sinA, cosA, sinE, cosE } = CAM;
  return (x * cosA + y * sinA) * cosE + z * sinE;
}
function translateAlong(d: Point) {
  const a = iso([0, 0, 0]);
  const b = iso(d);
  return `translate(${f1(b[0] - a[0])} ${f1(b[1] - a[1])})`;
}

// Giro em torno do eixo y: ângulo positivo baixa a ponta da direita do braço.
function rotY([x, y, z]: Point, phi: number): Point {
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  return [x * c + z * s, y, -x * s + z * c];
}
function hull(points: [number, number][]) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  const upper: [number, number][] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
const poly = (pts: [number, number][]) => pts.map((q, i) => (i ? "L" : "M") + f1(q[0]) + " " + f1(q[1])).join("") + "Z";

// O braço é uma caixa girada: faces visíveis pela profundidade, contorno pelo fecho convexo.
function beamSvg(phi: number) {
  const [hx, hy, hz] = BEAM;
  const C: Record<string, Point> = {};
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        const r = rotY([sx * hx, sy * hy, sz * hz], phi);
        C[`${sx},${sy},${sz}`] = [PIVOT[0] + r[0], PIVOT[1] + r[1], PIVOT[2] + r[2]];
      }
  const faces: { n: Point; c: string[] }[] = [
    { n: [0, 0, 1], c: ["-1,-1,1", "1,-1,1", "1,1,1", "-1,1,1"] },
    { n: [0, 0, -1], c: ["-1,-1,-1", "-1,1,-1", "1,1,-1", "1,-1,-1"] },
    { n: [0, 1, 0], c: ["-1,1,-1", "-1,1,1", "1,1,1", "1,1,-1"] },
    { n: [0, -1, 0], c: ["-1,-1,-1", "1,-1,-1", "1,-1,1", "-1,-1,1"] },
    { n: [1, 0, 0], c: ["1,-1,-1", "1,1,-1", "1,1,1", "1,-1,1"] },
    { n: [-1, 0, 0], c: ["-1,-1,-1", "-1,-1,1", "-1,1,1", "-1,1,-1"] },
  ];
  const outline = poly(hull(Object.values(C).map(iso)));
  let shades = "";
  let top = "";
  for (const f of faces) {
    const n = rotY(f.n, phi);
    if (depthOf(n) <= 0.001) continue;
    const d = poly(f.c.map((key) => iso(C[key])));
    if (n[2] > 0.6) top += d;
    else shades += `<path class="iso-shade" data-shade="${Math.abs(n[0]) > Math.abs(n[1]) ? 1 : 2}" d="${d}"/>`;
  }
  return `<g class="iso-solid"><path class="iso-fill" d="${outline}"/>${shades}<path class="iso-top" d="${top}"/><path class="iso-line iso-edge" data-tone="mid" d="${outline}"/></g>`;
}

// Objeto fixo para o innerHTML: no React 19, um { __html } novo a cada render troca a figura inteira.
const FIGURE_HTML = { __html: FIGURE_SVG };

export default function RoiBalance({ conversion = MODEL.conv, ticket = MODEL.ticket, currency = "$", className = "" }: RoiBalanceProps) {
  const stage = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLParagraphElement>(null);
  const settings = useRef({ conversion, ticket, currency });

  useEffect(() => {
    settings.current = { conversion, ticket, currency };
  }, [conversion, ticket, currency]);

  useEffect(() => {
    const root = stage.current;
    const text = readout.current;
    const svg = host.current?.querySelector("svg");
    if (!root || !text || !svg) return;
    const part = (name: string) => svg.querySelector(`[data-part="${name}"]`);
    const beam = part("beam");
    const pointer = part("pointer");
    const rods = { left: part("rods-left"), right: part("rods-right") };
    const pans = { left: part("pan-left"), right: part("pan-right") };
    const roasText = svg.querySelector('[data-part="roas"] text');
    if (!beam || !pointer || !rods.left || !rods.right || !pans.left || !pans.right || !roasText) return;
    const discs = {
      left: [...pans.left.querySelectorAll<SVGGElement>("[data-disc]")],
      right: [...pans.right.querySelectorAll<SVGGElement>("[data-disc]")],
    };

    // O modelo: o clique encarece com a verba (mesmo leilão), então o retorno cai.
    const roasOf = (budget: number) =>
      (settings.current.conversion * settings.current.ticket) / (MODEL.cpc0 * Math.pow(1 + budget / MODEL.ref, MODEL.curve));
    const tiltOf = (roas: number) => MODEL.maxTilt * ((roas - 1) / (roas + 1)) * RAD;
    const budgetAt = (share: number) => MODEL.min * Math.pow(MODEL.max / MODEL.min, share);
    const shareOf = (budget: number) => Math.log(budget / MODEL.min) / Math.log(MODEL.max / MODEL.min);
    const money = (n: number) => settings.current.currency + (n >= 1000 ? (n / 1000).toFixed(1) + "k" : Math.round(n));

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let active = true;
    let share = shareOf(4000);
    let target = share;
    let touring = true;
    let tour = 0;
    let idle = 0;
    let startTimer = 0;
    let frame = 0;
    let running = false;
    let visible = false;
    let last = 0;
    const tilt = { at: tiltOf(roasOf(budgetAt(share))), rate: 0 };

    const endOf = (side: "left" | "right", phi: number): Point => {
      const r = rotY([side === "left" ? -(L - 4) : L - 4, 0, -BEAM[2]], phi);
      return [PIVOT[0] + r[0], PIVOT[1] + r[1], PIVOT[2] + r[2]];
    };

    const draw = () => {
      const budget = budgetAt(share);
      const roas = roasOf(budget);
      const revenue = roas * budget;
      beam.innerHTML = beamSvg(tilt.at);
      // Ponteiro preso ao braço, pendurado na frente da escala.
      const tipR = rotY([0, 0, -POINTER], tilt.at);
      const a = iso([PIVOT[0], -1, PIVOT[2]]);
      const b = iso([PIVOT[0] + tipR[0], -1, PIVOT[2] + tipR[2]]);
      const c = iso([PIVOT[0], 1.6, PIVOT[2]]);
      pointer.innerHTML =
        `<path class="iso-line" data-tone="lit" data-free="end" style="stroke-width:1.1" d="M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}"/>` +
        `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="2.2" class="iso-fill"/><circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="2.2" fill="none" class="iso-line" data-tone="mid"/>`;
      for (const side of ["left", "right"] as const) {
        const end = endOf(side, tilt.at);
        const restEnd = endOf(side, 0);
        const dx = end[0] - restEnd[0];
        const dz = end[2] - restEnd[2];
        pans[side]!.setAttribute("transform", translateAlong([dx, 0, dz]));
        const c0 = REST[side];
        const center: Point = [c0[0] + dx, c0[1], c0[2] + dz + PAN_H];
        const hook = iso(end);
        let d = "";
        for (const deg of [90, 210, 330]) {
          const ang = deg * RAD;
          const q = iso([center[0] + Math.cos(ang) * (PAN_R - 1.6), center[1] + Math.sin(ang) * (PAN_R - 1.6), center[2]]);
          d += `M${f1(hook[0])} ${f1(hook[1])}L${f1(q[0])} ${f1(q[1])}`;
        }
        rods[side]!.innerHTML = `<path class="iso-line" data-tone="lo" d="${d}"/><circle cx="${f1(hook[0])}" cy="${f1(hook[1])}" r="1" class="iso-dot"/>`;
        // Pesos: um disco a cada 2.000 de valor.
        const count = Math.max(1, Math.ceil((side === "left" ? budget : revenue) / MODEL.unit));
        discs[side].forEach((el) => {
          el.style.display = Number(el.dataset.disc) < count ? "" : "none";
        });
      }
      const shown = roas.toFixed(1) + "x";
      if (roasText.textContent !== shown) roasText.textContent = shown;
      const summary = `Budget ${money(budget)} → revenue ${money(revenue)} · ROAS ${roas.toFixed(1)}×`;
      if (text.textContent !== summary) text.textContent = summary;
      root.setAttribute("aria-valuenow", String(Math.round(budget)));
      root.setAttribute("aria-valuetext", summary);
    };

    // rAF com rede de segurança: com a janela atrás de outra, o rAF para e a figura congelaria.
    const schedule = (fn: (now: number) => void) => {
      let fired = false;
      const go = (now: number) => {
        if (fired) return;
        fired = true;
        fn(now || performance.now());
      };
      frame = requestAnimationFrame(go);
      window.setTimeout(() => go(performance.now()), 60);
    };

    const tick = (now: number) => {
      if (!active) return;
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      if (touring) {
        tour += dt;
        target = 0.5 + 0.45 * Math.sin(tour / 3.2);
      }
      share += (target - share) * (1 - Math.exp(-dt / 0.5));
      const want = tiltOf(roasOf(budgetAt(share)));
      // Braço com mola e amortecimento: passa um pouco do ponto e assenta, como uma balança de verdade.
      for (let i = 0; i < 4; i++) {
        tilt.rate += (((want - tilt.at) * 60 - tilt.rate * 7) * dt) / 4;
        tilt.at += (tilt.rate * dt) / 4;
      }
      draw();
      if (visible && !reduced.matches) schedule(tick);
      else running = false;
    };

    const run = () => {
      if (running || !visible || reduced.matches || !active) return;
      running = true;
      last = 0;
      schedule(tick);
    };

    const steer = (to: number) => {
      touring = false;
      target = clamp(to, 0, 1);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        touring = true;
        run();
      }, 4000);
      if (reduced.matches) {
        share = target;
        tilt.at = tiltOf(roasOf(budgetAt(share)));
        draw();
      }
      run();
    };

    const onPointer = (event: PointerEvent) => {
      const box = root.getBoundingClientRect();
      steer((event.clientX - box.left) / box.width);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "ArrowUp") steer(target + 0.08);
      else if (event.key === "ArrowLeft" || event.key === "ArrowDown") steer(target - 0.08);
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

    draw();

    return () => {
      active = false;
      running = false;
      cancelAnimationFrame(frame);
      window.clearTimeout(idle);
      window.clearTimeout(startTimer);
      io.disconnect();
      root.removeEventListener("pointermove", onPointer);
      root.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className={`iso iso-stage mx-auto w-full max-w-[640px] ${className}`} data-theme="dark">
      <style>{FIGURE_CSS}</style>
      <div
        ref={stage}
        role="slider"
        tabIndex={0}
        aria-label="Return on ad spend. Arrow keys or the pointer change the monthly budget."
        aria-valuemin={MODEL.min}
        aria-valuemax={MODEL.max}
        aria-valuenow={4000}
        className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
      >
        <div ref={host} dangerouslySetInnerHTML={FIGURE_HTML} />
      </div>
      <p ref={readout} className="mt-2 text-center font-mono text-xs text-neutral-400" />
    </div>
  );
}
