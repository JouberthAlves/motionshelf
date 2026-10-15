"use client";

import { useEffect, useRef } from "react";
import {
  BALL_RADIUS,
  BIN,
  DROP,
  FIGURE_CSS,
  FIGURE_SVG,
  HOPPER,
  PROJECTION,
  RATES,
  type Box,
  type Projection,
  type Tray,
  TRAYS,
} from "./sales-funnel-figure";

export type SalesFunnelProps = {
  /** Chance that someone who reaches each stage moves on: [clicked, called, booked]. */
  rates?: [number, number, number];
  /** Extra classes for the outer element. */
  className?: string;
};

type Point = [number, number, number];
type Path = { pts: Point[]; speeds: number[]; stage: number; kept: boolean };
type Ball = Path & {
  lengths: number[];
  seg: number;
  along: number;
  fade: number;
  done: boolean;
  marked: number;
  el: SVGCircleElement;
};

const RAD = Math.PI / 180;
const UNIT = Math.sqrt(1.6);
const NS = "http://www.w3.org/2000/svg";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const dist = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
const fmt = (n: number) => n.toLocaleString("en-US");

// Mesma projeção do kit da skill anatomy (kit/iso-kit.mjs), para as bolinhas caírem sobre o desenho.
function camera(p: Projection) {
  const a = p.azimuth * RAD;
  const e = p.elevation * RAD;
  return { sinA: Math.sin(a), cosA: Math.cos(a), sinE: Math.sin(e), cosE: Math.cos(e), k: p.scale * UNIT };
}
function toScreen([x, y, z]: Point): [number, number] {
  const { sinA, cosA, sinE, cosE, k } = camera(PROJECTION);
  return [
    PROJECTION.origin[0] + (x * sinA - y * cosA) * k,
    PROJECTION.origin[1] + ((x * cosA + y * sinA) * sinE - z * cosE) * k,
  ];
}
function depthOf([x, y, z]: Point) {
  const { sinA, cosA, sinE, cosE } = camera(PROJECTION);
  return (x * cosA + y * sinA) * cosE + z * sinE;
}
// Quantos pixels da tela cabe uma unidade do desenho: tamanho das bolinhas.
const SCALE = (() => {
  const a = toScreen([0, 0, 0]);
  const b = toScreen([1, 0, 0]);
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
})();

// Caminho de uma pessoa: passa pelas bandejas e cai onde parar.
function pathFor(rnd: () => number, rates: [number, number, number]): Path {
  const pts: Point[] = [];
  const speeds: number[] = [];
  const push = (p: Point, v: number) => {
    pts.push(p);
    speeds.push(v);
  };

  let y = HOPPER.y + (rnd() - 0.5) * 4;
  push([HOPPER.x, y, HOPPER.z - 1], 0);

  let stage = 0;
  for (const t of TRAYS as Tray[]) {
    const lo = t.y0 + 5;
    const hi = t.y1 - 6;
    y = clamp(y, lo, hi);
    push([t.i === 0 ? HOPPER.x : t.a + 5, y, t.z + BALL_RADIUS], 90);

    if (rnd() >= rates[t.i]) {
      push([t.notch, clamp(y, lo, hi), t.z + BALL_RADIUS], 40);
      push([t.notch, t.y1 + 4, t.z - 1.4 + BALL_RADIUS], 28);
      const box = DROP[t.i] as Box;
      push([t.notch + (rnd() - 0.5) * 8, box.y + box.d / 2 + (rnd() - 0.5) * 6, box.h + BALL_RADIUS], 85);
      return { pts, speeds, stage, kept: false };
    }

    stage = t.i + 1;
    y = clamp(y + (rnd() - 0.5) * 10, lo, hi);
    push([t.b - 2, y, t.z + BALL_RADIUS], 40);
  }

  push([BIN.x + BIN.w / 2 + (rnd() - 0.5) * 10, BIN.y + BIN.d / 2 + (rnd() - 0.5) * 8, BIN.h - 1], 90);
  return { pts, speeds, stage, kept: true };
}

export default function SalesFunnel({ rates = RATES, className = "" }: SalesFunnelProps) {
  const stage = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLParagraphElement>(null);
  const ratesRef = useRef(rates);

  useEffect(() => {
    ratesRef.current = rates;
  }, [rates]);

  useEffect(() => {
    const root = stage.current;
    const holder = host.current;
    const text = readout.current;
    const svg = holder?.querySelector("svg");
    const layer = svg?.querySelector('[data-part="balls"]');
    const countEl = svg?.querySelector('[data-part="count"] text');
    if (!root || !text || !layer || !countEl) return;

    let active = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Semente fixa: o mesmo filme toda vez que a página abre.
    let seed = 20261015;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };

    const balls: Ball[] = [];
    const counts = { seen: 0, clicked: 0, called: 0, booked: 0 };
    let rate = 2.2;
    let target = 2.2;
    let owed = 0;
    let touring = true;
    let tour = 0;
    let last = 0;
    let visible = false;
    let running = false;
    let frame = 0;
    let idle = 0;
    let startTimer = 0;

    const spawn = () => {
      const path = pathFor(rnd, ratesRef.current);
      const lengths: number[] = [];
      for (let i = 1; i < path.pts.length; i++) lengths.push(dist(path.pts[i - 1], path.pts[i]));
      const el = document.createElementNS(NS, "circle");
      el.setAttribute("r", (BALL_RADIUS * SCALE).toFixed(2));
      el.style.fill = "url(#fn-ball)";
      el.style.stroke = "var(--anatomy-paper)";
      el.setAttribute("stroke-width", "0.5");
      layer.appendChild(el);
      balls.push({ ...path, lengths, seg: 0, along: 0, fade: 1, done: false, marked: 0, el });
      counts.seen++;
    };

    const step = (ball: Ball, dt: number) => {
      if (ball.done) {
        ball.fade -= dt / 0.9;
        return;
      }
      let move = ball.speeds[ball.seg + 1] * dt;
      while (move > 0 && !ball.done) {
        const left = ball.lengths[ball.seg] - ball.along;
        if (move < left) {
          ball.along += move;
          move = 0;
        } else {
          move -= left;
          ball.seg++;
          ball.along = 0;
          if (ball.seg >= ball.pts.length - 1) ball.done = true;
          else move = (move * ball.speeds[ball.seg + 1]) / ball.speeds[ball.seg];
        }
      }
      // Marcas: passou da 1ª, 2ª e 3ª bandeja.
      const marks = [3, 5, 7];
      while (ball.marked < ball.stage && ball.seg >= marks[ball.marked]) {
        ball.marked++;
        if (ball.marked === 1) counts.clicked++;
        if (ball.marked === 2) counts.called++;
        if (ball.marked === 3) {
          counts.booked++;
          ball.el.style.fill = "url(#fn-lit)";
        }
      }
    };

    const positionOf = (ball: Ball): Point => {
      const a = ball.pts[ball.seg];
      const b = ball.pts[Math.min(ball.seg + 1, ball.pts.length - 1)];
      const len = ball.lengths[ball.seg] || 1;
      const f = clamp(ball.along / len, 0, 1);
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    };

    const draw = () => {
      balls.sort((p, q) => depthOf(positionOf(p)) - depthOf(positionOf(q)));
      for (const ball of balls) {
        const [x, y] = toScreen(positionOf(ball));
        ball.el.setAttribute("cx", x.toFixed(2));
        ball.el.setAttribute("cy", y.toFixed(2));
        ball.el.setAttribute("opacity", clamp(ball.fade, 0, 1).toFixed(2));
        layer.appendChild(ball.el);
      }
      const summary = `${fmt(counts.seen)} came in → ${fmt(counts.clicked)} → ${fmt(counts.called)} → ${fmt(counts.booked)} booked`;
      text.textContent = summary;
      countEl.textContent = String(counts.booked).padStart(3, "0");
      root.setAttribute("aria-valuenow", rate.toFixed(1));
      root.setAttribute("aria-valuetext", `${rate.toFixed(1)} people per second. ${summary}`);
    };

    const reset = () => {
      for (const ball of balls) ball.el.remove();
      balls.length = 0;
      counts.seen = 0;
      counts.clicked = 0;
      counts.called = 0;
      counts.booked = 0;
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
        target = 2.2 + 1.6 * Math.sin(tour / 4);
      }
      rate += (target - rate) * (1 - Math.exp(-dt / 0.6));
      owed += rate * dt;
      while (owed >= 1) {
        owed -= 1;
        spawn();
      }
      for (const ball of balls) step(ball, dt);
      for (let i = balls.length - 1; i >= 0; i--) {
        if (balls[i].fade <= 0) {
          balls[i].el.remove();
          balls.splice(i, 1);
        }
      }
      if (counts.seen >= 1000 && balls.length === 0) reset();
      if (counts.seen >= 1000) owed = 0;
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

    const steer = (next: number) => {
      touring = false;
      target = clamp(next, 0.6, 6);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        touring = true;
        run();
      }, 4000);
      run();
    };

    const onPointer = (event: PointerEvent) => {
      const box = root.getBoundingClientRect();
      steer(0.6 + clamp((event.clientX - box.left) / box.width, 0, 1) * 5.4);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "ArrowUp") steer(target + 0.6);
      else if (event.key === "ArrowLeft" || event.key === "ArrowDown") steer(target - 0.6);
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

    // Movimento reduzido: um quadro parado, já com o resultado de 1.000 pessoas.
    if (reduced.matches) {
      for (let i = 0; i < 1000; i++) {
        let s = 0;
        while (s < 3 && rnd() < ratesRef.current[s]) s++;
        counts.seen++;
        if (s >= 1) counts.clicked++;
        if (s >= 2) counts.called++;
        if (s >= 3) counts.booked++;
      }
    }
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
      for (const ball of balls) ball.el.remove();
    };
  }, []);

  return (
    <div className={`iso iso-stage mx-auto w-full max-w-[640px] ${className}`} data-theme="dark">
      <style>{FIGURE_CSS}</style>
      <div
        ref={stage}
        role="slider"
        tabIndex={0}
        aria-label="Sales funnel. Arrow keys or the pointer change the ad budget."
        aria-valuemin={0.6}
        aria-valuemax={6}
        aria-valuenow={2.2}
        className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
      >
        <div ref={host} dangerouslySetInnerHTML={{ __html: FIGURE_SVG }} />
      </div>
      <p ref={readout} className="mt-2 text-center font-mono text-xs text-neutral-400" />
    </div>
  );
}
