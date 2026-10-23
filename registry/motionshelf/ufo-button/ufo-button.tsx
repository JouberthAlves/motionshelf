"use client";

import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes } from "react";

export type UfoButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** How close the pointer must get to the button, in px, before the saucer beams it up. */
  range?: number;
  /** Classes for the playground, which fills the nearest positioned ancestor by default. */
  playgroundClassName?: string;
};

// Um disco voador ronda o alto do container seguindo o cursor devagar. Com o cursor perto do botão, ele
// para em cima, acende o feixe e puxa o botão até meia altura, onde fica flutuando (e clicável). Quando o
// cursor sai do container, o botão desce de volta e o disco apaga o feixe. px e segundos, y para baixo.
const UFO_Y = 42; // centro do disco
const UFO_W = 96;
const SPEED = 280;
const LIGHTS = 5;
const MAX_SPARKS = 90;

type Spark = { x: number; y: number; vy: number; life: number };

/** Botão que é abduzido por um disco voador quando o cursor chega perto. */
const UfoButton = forwardRef<HTMLButtonElement, UfoButtonProps>(function UfoButton(
  { children, className = "", range = 140, playgroundClassName = "", disabled, type = "button", ...props },
  ref,
) {
  const playgroundRef = useRef<HTMLDivElement>(null);
  const ufoRef = useRef<HTMLSpanElement>(null);
  const beamRef = useRef<HTMLSpanElement>(null);
  const stripesRef = useRef<HTMLSpanElement>(null);
  const prizeRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightRefs = useRef<(SVGCircleElement | null)[]>([]);
  const settings = useRef({ range });
  useEffect(() => {
    settings.current = { range };
  }, [range]);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    const playground = playgroundRef.current;
    const ufo = ufoRef.current;
    const beam = beamRef.current;
    const prize = prizeRef.current;
    const canvas = canvasRef.current;
    const stripes = stripesRef.current;
    if (!playground || !ufo || !beam || !prize || !canvas || !stripes) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let bw = 0;
    let bh = 0;
    const measure = () => {
      width = playground.clientWidth;
      height = playground.clientHeight;
      bw = prize.offsetWidth;
      bh = prize.offsetHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Altura do feixe só aqui: por quadro ele só se move (transform) e acende (opacity). As 6 px a mais
      // cobrem a flutuação do disco; o que passa do chão o overflow corta.
      beam.style.height = `${Math.max(0, height - UFO_Y - 10 + 6)}px`;
    };
    measure();

    const park = () => width * 0.72;
    const u = { x: park(), v: 0 };
    let lift = 0; // quanto o botão subiu, px
    let liftV = 0;
    let beamOn = 0; // 0–1
    let abducting = false;
    let pointer: { x: number; y: number } | null = null;
    let clock = 0;
    let frame = 0;
    let last = 0;
    const sparks: Spark[] = [];

    const prizeCenter = () => ({ x: width / 2, y: height - bh / 2 - lift });

    const draw = () => {
      const bob = Math.sin(clock * 2.4) * 2.5;
      const bank = Math.max(-12, Math.min(12, u.v / 22));
      ufo.style.transform = `translate(${u.x - UFO_W / 2}px, ${UFO_Y - 20 + bob}px) rotate(${bank}deg)`;
      const top = UFO_Y + 10 + bob;
      beam.style.transform = `translate(${u.x}px, ${top}px) translateX(-50%)`;
      beam.style.opacity = String(beamOn);
      // Faixas subindo pelo feixe: a camada desliza 24 px (um período) e recomeça.
      stripes.style.transform = `translateY(${-((clock * 40) % 24)}px)`;
      const k = Math.min(1, lift / 60);
      const wobble = Math.sin(clock * 2.1) * 5 * k;
      prize.style.transform = `translate(${width / 2 - bw / 2}px, ${height - bh - lift}px) rotate(${wobble}deg) scale(${1 - 0.08 * k})`;
      // Luzes da borda acendem em roda.
      const on = Math.floor(clock * 7) % LIGHTS;
      lightRefs.current.forEach((light, i) => light?.setAttribute("opacity", i === on ? "1" : "0.3"));
    };

    const step = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      clock += dt;
      const c = prizeCenter();
      if (pointer && !abducting && Math.hypot(pointer.x - c.x, pointer.y - c.y) < settings.current.range) abducting = true;
      if (!pointer) abducting = false;

      // O disco vai para cima do botão (abdução), atrás do cursor, ou volta a estacionar.
      const target = abducting ? c.x : pointer ? Math.max(UFO_W / 2, Math.min(width - UFO_W / 2, pointer.x)) : park();
      const want = Math.max(-SPEED, Math.min(SPEED, (target - u.x) * 4));
      u.v += (want - u.v) * (1 - Math.exp(-dt / 0.25));
      u.x += u.v * dt;

      // Feixe só acende com o disco parado em cima do botão; o botão sobe até meia altura dentro dele.
      const over = abducting && Math.abs(u.x - c.x) < 8;
      beamOn += ((over || lift > 1 ? 1 : 0) - beamOn) * (1 - Math.exp(-dt / 0.15));
      const top = (height - bh - UFO_Y - 30) * 0.55;
      const liftTarget = over && beamOn > 0.6 ? top : 0;
      liftV += ((liftTarget - lift) * 18 - liftV * 7) * dt;
      lift = Math.max(0, lift + liftV * dt);
      if (lift === 0 && liftV < 0) liftV = 0;

      // Faíscas subindo pelo feixe.
      if (ctx) {
        if (beamOn > 0.3 && sparks.length < MAX_SPARKS && Math.random() < dt * 40) {
          const y = UFO_Y + 20 + Math.random() * (height - UFO_Y - 20);
          const spread = 18 + ((y - UFO_Y) / (height - UFO_Y)) * 60;
          sparks.push({ x: u.x + (Math.random() - 0.5) * spread * 2, y, vy: -(50 + Math.random() * 80), life: 1 });
        }
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#c9d6ff";
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];
          s.y += s.vy * dt;
          s.x += (u.x - s.x) * dt * 0.8;
          s.life -= dt * 1.2;
          if (s.life <= 0 || s.y < UFO_Y) {
            sparks.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = s.life * beamOn * 0.8;
          ctx.fillRect(s.x - 0.8, s.y - 0.8, 1.6, 1.6);
        }
        ctx.globalAlpha = 1;
      }

      draw();
      const settled = !pointer && Math.abs(u.x - park()) < 0.5 && Math.abs(u.v) < 1 && lift === 0 && beamOn < 0.01 && sparks.length === 0;
      if (settled) {
        beamOn = 0;
        draw();
        frame = 0;
        last = 0;
        return;
      }
      frame = requestAnimationFrame(step);
    };
    const start = () => {
      if (!frame && !reduced && !disabled) frame = requestAnimationFrame(step);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = playground.getBoundingClientRect();
      // Desconta a escala de quem mostra o componente reduzido.
      const px = (event.clientX - rect.left) * (width / (rect.width || 1));
      const py = (event.clientY - rect.top) * (height / (rect.height || 1));
      pointer = px < 0 || py < 0 || px > width || py > height ? null : { x: px, y: py };
      start();
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        pointer = null;
        start();
      }
    };
    const observer = new ResizeObserver(() => {
      measure();
      if (!frame) u.x = park();
      draw();
    });
    observer.observe(playground);
    draw();
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerEnd);
    return () => {
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      cancelAnimationFrame(frame);
    };
  }, [disabled]);

  return (
    <div ref={playgroundRef} className={`pointer-events-none absolute inset-0 overflow-hidden ${playgroundClassName}`}>
      {/* feixe: trapézio de luz azul com faixas subindo */}
      <span
        ref={beamRef}
        aria-hidden="true"
        className="absolute top-0 left-0 w-[170px] overflow-hidden [clip-path:polygon(40%_0,60%_0,100%_100%,0_100%)]"
        style={{ opacity: 0, background: "linear-gradient(180deg, rgb(125 155 255 / 0.55), rgb(91 134 255 / 0.10))" }}
      >
        <span
          ref={stripesRef}
          className="absolute inset-x-0 top-0 -bottom-[24px] bg-[repeating-linear-gradient(180deg,rgb(201_214_255/0.10)_0_2px,transparent_2px_24px)]"
        />
      </span>
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 size-full" />
      {/* o botão de verdade */}
      <span ref={prizeRef} className="pointer-events-auto absolute top-0 left-0 inline-flex origin-center" style={{ transform: "translate(-200px, -200px)" }}>
        <button
          ref={ref}
          type={type}
          disabled={disabled}
          className={`relative inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#2c3552] bg-[#121726] px-5 text-sm font-semibold whitespace-nowrap text-[#dfe7ff] shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_6px_14px_-6px_rgb(0_0_0/0.7)] transition-transform duration-150 outline-none select-none active:scale-95 focus-visible:ring-2 focus-visible:ring-[#1f5bff] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          {...props}
        >
          {children}
        </button>
      </span>
      {/* disco voador: cúpula de vidro, casco de metal e luzes na borda */}
      <span ref={ufoRef} aria-hidden="true" className="absolute top-0 left-0 h-[40px] origin-center" style={{ width: UFO_W, transform: "translate(-200px, 0px)" }}>
        <svg viewBox="0 0 96 40" width={UFO_W} height={40} className="block overflow-visible">
          <defs>
            <linearGradient id={`${uid}-hull`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c9d2ea" />
              <stop offset="0.45" stopColor="#6a76a0" />
              <stop offset="1" stopColor="#262d44" />
            </linearGradient>
            <radialGradient id={`${uid}-dome`} cx="0.4" cy="0.35" r="0.7">
              <stop offset="0" stopColor="#dfe7ff" stopOpacity="0.9" />
              <stop offset="0.5" stopColor="#5b86ff" stopOpacity="0.55" />
              <stop offset="1" stopColor="#1f5bff" stopOpacity="0.35" />
            </radialGradient>
          </defs>
          <ellipse cx={48} cy={15} rx={17} ry={12} fill={`url(#${uid}-dome)`} stroke="#9fb4ff" strokeOpacity={0.5} strokeWidth={0.6} />
          <ellipse cx={48} cy={24} rx={46} ry={10} fill={`url(#${uid}-hull)`} />
          <ellipse cx={48} cy={21} rx={44} ry={4} fill="#eef2ff" fillOpacity={0.18} />
          <ellipse cx={48} cy={31} rx={16} ry={3.5} fill="#1b2033" />
          <ellipse cx={48} cy={31} rx={9} ry={2} fill="#7d9bff" fillOpacity={0.8} />
          {Array.from({ length: LIGHTS }, (_, i) => (
            <circle
              key={i}
              ref={(el) => {
                lightRefs.current[i] = el;
              }}
              cx={14 + i * 17}
              cy={25 + Math.sin((i / (LIGHTS - 1)) * Math.PI) * 3}
              r={2}
              fill="#9fdcff"
              opacity={0.3}
            />
          ))}
        </svg>
      </span>
    </div>
  );
});

export default UfoButton;
