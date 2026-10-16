"use client";

import { useEffect, useRef } from "react";
import { BELT, BELT_Z, DOOR_X, FIGURE_CSS, FIGURE_SVG, MODEL, PROJECTION, PUSH_X, TRAY, WATCH } from "./page-speed-gauge-figure";

export type PageSpeedGaugeProps = {
  /** Share of visitors who leave when the page loads in 1 s (0.2 = 20%). */
  bounceAt1s?: number;
  /** Connection speed in MB per second. */
  speed?: number;
  /** Extra classes for the outer element. */
  className?: string;
};

type Point = [number, number, number];
type Visitor = { x: number; y: number; z: number; leaves: boolean; state: "ride" | "pushed" | "fall" | "tray" | "in"; t: number; fade: number; el: SVGGElement };

const RAD = Math.PI / 180;
const UNIT = Math.sqrt(1.6);
const SPEED = 34; // velocidade da esteira
const GAP = 0.55; // segundos entre visitantes

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

// Abandono: parte do valor em 1 s e sobe pela curva publicada pelo Google (Think with Google, 2017).
function bounceOf(secs: number, at1s: number) {
  const c = MODEL.curve;
  if (secs <= c[0][0]) return at1s;
  for (let i = 1; i < c.length; i++) {
    if (secs <= c[i][0]) {
      const [x0, y0] = c[i - 1];
      const [x1, y1] = c[i];
      return at1s * (1 + y0 + ((y1 - y0) * (secs - x0)) / (x1 - x0));
    }
  }
  return at1s * (1 + c[c.length - 1][1]);
}

// Ponteiro do cronômetro: 0 a 10 s em 300°.
function needleD(secs: number) {
  const span = 300 * RAD;
  const a = -span / 2 + (span * clamp(secs, 0, 10)) / 10;
  const r = WATCH.r - 6;
  const z = WATCH.z + WATCH.h + 0.2;
  const p0 = iso([WATCH.x - Math.sin(a) * 4, WATCH.y + Math.cos(a) * 4, z]);
  const p1 = iso([WATCH.x + Math.sin(a) * r, WATCH.y - Math.cos(a) * r, z]);
  return `M${f1(p0[0])} ${f1(p0[1])}L${f1(p1[0])} ${f1(p1[1])}`;
}

// Objeto fixo para o innerHTML: no React 19, um { __html } novo a cada render troca a figura inteira.
const FIGURE_HTML = { __html: FIGURE_SVG };

export default function PageSpeedGauge({ bounceAt1s = MODEL.bounce1s, speed = MODEL.rate, className = "" }: PageSpeedGaugeProps) {
  const stage = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLParagraphElement>(null);
  const settings = useRef({ bounceAt1s, speed });

  useEffect(() => {
    settings.current = { bounceAt1s, speed };
  }, [bounceAt1s, speed]);

  useEffect(() => {
    const root = stage.current;
    const text = readout.current;
    const svg = host.current?.querySelector("svg");
    if (!root || !text || !svg) return;
    const needle = svg.querySelector('[data-part="needle"]');
    const layer = svg.querySelector('[data-part="pawns"]');
    const template = svg.querySelector<SVGGElement>('[data-part="pawn"]');
    const ram = svg.querySelector('[data-part="ram"]');
    const plates = [...svg.querySelectorAll<SVGGElement>("[data-plate]")];
    if (!needle || !layer || !template || !ram) return;

    const loadOf = (mb: number) => MODEL.base + mb / settings.current.speed;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Semente fixa: o mesmo filme toda vez que a página abre.
    let seed = 20261016;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };

    let active = true;
    let mb = 2.5;
    let target = mb;
    let touring = true;
    let tour = 0;
    let idle = 0;
    let startTimer = 0;
    let owed = 0;
    let push = 0;
    let frame = 0;
    let running = false;
    let visible = false;
    let last = 0;
    const visitors: Visitor[] = [];

    const spawn = () => {
      const el = template.cloneNode(true) as SVGGElement;
      el.removeAttribute("data-part");
      el.style.display = "";
      layer.appendChild(el);
      visitors.push({ x: BELT.x + 6, y: 0, z: BELT_Z, leaves: rnd() < bounceOf(loadOf(mb), settings.current.bounceAt1s), state: "ride", t: 0, fade: 1, el });
    };

    const step = (p: Visitor, dt: number) => {
      if (p.state === "ride") {
        p.x += SPEED * dt;
        if (p.leaves && p.x >= PUSH_X) {
          p.x = PUSH_X;
          p.state = "pushed";
          push = 1;
        }
        if (p.x >= DOOR_X) p.state = "in";
      } else if (p.state === "pushed") {
        p.y += 70 * dt;
        if (p.y >= BELT.y + BELT.d + 2) p.state = "fall";
      } else if (p.state === "fall") {
        p.y = Math.min(p.y + 40 * dt, TRAY.y + TRAY.d / 2);
        p.z -= 60 * dt;
        if (p.z <= TRAY.h) {
          p.z = TRAY.h;
          p.state = "tray";
        }
      } else if (p.state === "tray") {
        p.t += dt;
        p.fade = 1 - clamp((p.t - 1.2) / 0.8, 0, 1);
      } else {
        p.x += SPEED * dt;
        p.fade = 1 - clamp((p.x - DOOR_X) / 10, 0, 1);
      }
    };

    const draw = () => {
      const secs = loadOf(mb);
      const bounce = bounceOf(secs, settings.current.bounceAt1s);
      needle.setAttribute("d", needleD(secs));
      // Chapas na célula de carga: uma por MB.
      const n = Math.max(1, Math.ceil(mb));
      plates.forEach((el, i) => {
        el.style.display = i < n ? "" : "none";
      });
      ram.setAttribute("transform", translateAlong([0, push * 14, 0]));
      visitors.sort((a, b) => depthOf([a.x, a.y, a.z]) - depthOf([b.x, b.y, b.z]));
      for (const p of visitors) {
        p.el.setAttribute("transform", translateAlong([p.x, p.y, p.z]));
        p.el.setAttribute("opacity", p.fade.toFixed(2));
        layer.appendChild(p.el);
      }
      const summary = `${mb.toFixed(1)} MB · loads in ${secs.toFixed(1)} s · ${Math.round(bounce * 100)}% leave`;
      if (text.textContent !== summary) text.textContent = summary;
      root.setAttribute("aria-valuenow", mb.toFixed(1));
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
        target = 4.25 + 3.6 * Math.sin(tour / 3.5);
      }
      mb += (target - mb) * (1 - Math.exp(-dt / 0.6));
      owed += dt / GAP;
      while (owed >= 1) {
        owed -= 1;
        spawn();
      }
      push = Math.max(0, push - dt * 3);
      for (const p of visitors) step(p, dt);
      for (let i = visitors.length - 1; i >= 0; i--) {
        if (visitors[i].fade <= 0) {
          visitors[i].el.remove();
          visitors.splice(i, 1);
        }
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
      target = clamp(to, MODEL.minMB, MODEL.maxMB);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        touring = true;
        run();
      }, 4000);
      if (reduced.matches) {
        mb = target;
        draw();
      }
      run();
    };

    const onPointer = (event: PointerEvent) => {
      const box = root.getBoundingClientRect();
      steer(MODEL.minMB + clamp((event.clientX - box.left) / box.width, 0, 1) * (MODEL.maxMB - MODEL.minMB));
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "ArrowUp") steer(target + 0.5);
      else if (event.key === "ArrowLeft" || event.key === "ArrowDown") steer(target - 0.5);
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

    // Movimento reduzido: um quadro parado, com visitantes na esteira e um na bandeja.
    if (reduced.matches) {
      for (const x of [BELT.x + 20, BELT.x + 60, BELT.x + 150]) {
        spawn();
        visitors[visitors.length - 1].x = x;
      }
      spawn();
      Object.assign(visitors[visitors.length - 1], { x: PUSH_X, y: TRAY.y + TRAY.d / 2, z: TRAY.h, state: "tray" });
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
      for (const p of visitors) p.el.remove();
    };
  }, []);

  return (
    <div className={`iso iso-stage mx-auto w-full max-w-[640px] ${className}`} data-theme="dark">
      <style>{FIGURE_CSS}</style>
      <div
        ref={stage}
        role="slider"
        tabIndex={0}
        aria-label="Page speed. Arrow keys or the pointer change the page weight."
        aria-valuemin={MODEL.minMB}
        aria-valuemax={MODEL.maxMB}
        aria-valuenow={2.5}
        className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
      >
        <div ref={host} dangerouslySetInnerHTML={FIGURE_HTML} />
      </div>
      <p ref={readout} className="mt-2 text-center font-mono text-xs text-neutral-400" />
    </div>
  );
}
