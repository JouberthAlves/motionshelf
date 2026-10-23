"use client";

import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type MouseEvent } from "react";

export type RocketButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Called at liftoff, right after the countdown. */
  onLaunch?: () => void;
  /** Called when the button is back on the pad under its parachute. */
  onLand?: () => void;
  /** Classes for the playground, which fills the nearest positioned ancestor by default. */
  playgroundClassName?: string;
};

// O botão vai entre dois propulsores, na plataforma do chão. No clique: contagem 3-2-1, ignição com fumaça
// na plataforma, decolagem acelerando até sair por cima, e a volta descendo de paraquedas. px e segundos.
const PAD_H = 6;
const COUNT_STEP = 0.42; // s por número da contagem
const THRUST = 1500; // aceleração para cima na decolagem
const SINK = 95; // velocidade de descida com o paraquedas
const MAX_SMOKE = 260;

type Puff = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; flame: boolean };

/** Botão-foguete: no clique, conta 3-2-1, decola da plataforma e volta de paraquedas. */
const RocketButton = forwardRef<HTMLButtonElement, RocketButtonProps>(function RocketButton(
  { children, className = "", onLaunch, onLand, onClick, playgroundClassName = "", disabled, type = "button", ...props },
  ref,
) {
  const playgroundRef = useRef<HTMLDivElement>(null);
  const craftRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const flameRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const chuteRef = useRef<HTMLSpanElement>(null);
  const launch = useRef(false);
  const startRef = useRef<(() => void) | null>(null);
  const reduced = useRef(false);
  const settings = useRef({ onLaunch, onLand });
  useEffect(() => {
    settings.current = { onLaunch, onLand };
  }, [onLaunch, onLand]);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    const playground = playgroundRef.current;
    const craft = craftRef.current;
    const canvas = canvasRef.current;
    const count = countRef.current;
    const chute = chuteRef.current;
    if (!playground || !craft || !canvas || !count || !chute) return;
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let cw = 0;
    let ch = 0;
    const measure = () => {
      width = playground.clientWidth;
      height = playground.clientHeight;
      cw = craft.offsetWidth;
      ch = craft.offsetHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    measure();

    // y é o deslocamento a partir da plataforma (negativo é para cima).
    let x = 0;
    let y = 0;
    let vy = 0;
    let tilt = 0;
    let throttle = 0;
    let chuteOpen = 0;
    let phase: "idle" | "count" | "lift" | "away" | "descend" | "fold" = "idle";
    let timer = 0;
    let clock = 0;
    let frame = 0;
    let last = 0;
    const puffs: Puff[] = [];

    // Bocais dos dois propulsores, em px do container.
    const nozzles = () => {
      const cx = width / 2 + x;
      const bottom = height - PAD_H + y;
      // Cada propulsor tem 14 px e fica 13 px para fora da borda do botão: o bocal está 6 px fora dela.
      return [cx - cw / 2 - 6, cx + cw / 2 + 6].map((nx) => ({ x: nx, y: bottom }));
    };

    const emit = (dt: number) => {
      if (!ctx || throttle <= 0.02) return;
      for (const n of nozzles()) {
        // Chama curta e quente logo no bocal; fumaça grande que se espalha quando bate na plataforma.
        const smoke = Math.round(dt * 70 * throttle + Math.random());
        for (let i = 0; i < smoke && puffs.length < MAX_SMOKE; i++) {
          puffs.push({ x: n.x + (Math.random() - 0.5) * 6, y: n.y + 6, vx: (Math.random() - 0.5) * 40, vy: 160 + 260 * throttle * Math.random(), r: 7 + Math.random() * 6, life: 0, max: 1.4 + Math.random() * 1.2, flame: false });
        }
        if (puffs.length < MAX_SMOKE) puffs.push({ x: n.x, y: n.y + 4, vx: 0, vy: 120, r: 3, life: 0, max: 0.12, flame: true });
      }
    };

    const stepSmoke = (dt: number) => {
      if (!ctx) return;
      const floor = height - PAD_H;
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.life += dt;
        if (p.life > p.max) {
          puffs.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (!p.flame && p.y > floor - p.r * 0.4) {
          // Bateu na plataforma: abre para os lados e sobe devagar.
          p.y = floor - p.r * 0.4;
          if (Math.abs(p.vx) < 60) p.vx = (p.x < width / 2 + x ? -1 : 1) * (80 + Math.random() * 160);
          p.vy = -Math.abs(p.vy) * 0.1;
        }
        p.vx *= Math.exp(-1.6 * dt);
        p.vy = p.vy * Math.exp(-1.8 * dt) - 18 * dt;
        p.r += dt * (p.flame ? 0 : 22);
      }
      ctx.clearRect(0, 0, width, height);
      for (const p of puffs) {
        const k = p.life / p.max;
        if (p.flame) {
          ctx.globalAlpha = 0.9 * (1 - k);
          ctx.fillStyle = "#ffd28a";
        } else {
          // Nuvem macia: centro opaco e borda transparente (com cor chapada, viravam bolas sólidas).
          ctx.globalAlpha = Math.min(0.22, 0.34 * (1 - k) * Math.min(1, p.life * 6));
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, "rgba(169,180,207,1)");
          g.addColorStop(1, "rgba(169,180,207,0)");
          ctx.fillStyle = g;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      craft.style.transform = `translate(calc(-50% + ${x}px), ${y}px) rotate(${tilt}deg)`;
      const flicker = 0.8 + Math.random() * 0.4;
      flameRefs.current.forEach((flame) => {
        if (!flame) return;
        flame.style.opacity = String(Math.min(1, throttle * 1.4));
        flame.style.transform = `translateX(-50%) scaleY(${(0.3 + throttle * 1.1) * flicker})`;
      });
      chute.style.opacity = String(chuteOpen);
      chute.style.transform = `translateX(-50%) scale(${0.3 + 0.7 * chuteOpen}, ${0.15 + 0.85 * chuteOpen})`;
    };

    const say = (text: string) => {
      if (count.textContent !== text) count.textContent = text;
      count.style.opacity = text ? "1" : "0";
    };

    const step = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      timer += dt;
      clock += dt;

      if (phase === "idle" && launch.current) {
        launch.current = false;
        phase = "count";
        timer = 0;
      }
      if (phase === "count") {
        const n = 3 - Math.floor(timer / COUNT_STEP);
        say(n > 0 ? String(n) : "Liftoff");
        // No "1" os motores acendem: a fumaça cresce na plataforma antes de sair do chão.
        throttle = timer > COUNT_STEP * 2 ? Math.min(0.55, (timer - COUNT_STEP * 2) * 1.6) : 0;
        if (timer >= COUNT_STEP * 3) {
          phase = "lift";
          timer = 0;
          settings.current.onLaunch?.();
        }
      } else if (phase === "lift") {
        if (timer > 0.5) say("");
        throttle = Math.min(1, throttle + dt * 3);
        vy -= THRUST * throttle * dt;
        y += vy * dt;
        tilt = Math.sin(clock * 9) * 1.2;
        x = Math.sin(clock * 3.1) * 3;
        if (height - PAD_H + y < -ch - 30) {
          phase = "away";
          timer = 0;
          throttle = 0;
        }
      } else if (phase === "away") {
        if (timer > 0.9) {
          // Volta por cima com o paraquedas já aberto.
          phase = "descend";
          timer = 0;
          y = -(height + 40);
          vy = SINK;
          x = (Math.random() - 0.5) * Math.min(120, width * 0.3);
        }
      } else if (phase === "descend") {
        chuteOpen = Math.min(1, chuteOpen + dt * 3);
        y += vy * dt;
        // Balança sob o paraquedas e volta para cima da plataforma.
        tilt = Math.sin(clock * 2.2) * 7 * Math.min(1, -y / 120);
        x += (0 - x) * (1 - Math.exp(-dt / 0.9));
        if (y >= 0) {
          y = 0;
          vy = 0;
          phase = "fold";
          timer = 0;
          settings.current.onLand?.();
        }
      } else if (phase === "fold") {
        tilt *= Math.exp(-dt / 0.08);
        x *= Math.exp(-dt / 0.1);
        chuteOpen = Math.max(0, chuteOpen - dt * 2.2);
        if (chuteOpen <= 0) phase = "idle";
      }

      emit(dt);
      stepSmoke(dt);
      draw();
      if (phase === "idle" && puffs.length === 0) {
        tilt = 0;
        x = 0;
        draw();
        frame = 0;
        last = 0;
        return;
      }
      frame = requestAnimationFrame(step);
    };
    const start = () => {
      if (!frame && !reduced.current && !disabled) frame = requestAnimationFrame(step);
    };
    startRef.current = start;

    const observer = new ResizeObserver(() => {
      measure();
      draw();
    });
    observer.observe(playground);
    draw();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      startRef.current = null;
    };
  }, [disabled]);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || disabled) return;
    if (reduced.current || !startRef.current) {
      onLaunch?.();
      onLand?.();
      return;
    }
    launch.current = true;
    startRef.current();
  };

  // Propulsor lateral: ogiva, corpo branco com faixa azul, bocal e a chama embaixo.
  const booster = (i: number) => (
    <span aria-hidden="true" className={`absolute bottom-0 h-[52px] w-[14px] ${i === 0 ? "-left-[13px]" : "-right-[13px]"}`}>
      <span className="absolute inset-x-0 top-0 h-[12px] rounded-t-full bg-[linear-gradient(90deg,#8b93a7,#eef2ff_45%,#8b93a7)]" />
      <span className="absolute inset-x-0 top-[11px] bottom-[5px] bg-[linear-gradient(90deg,#8b93a7,#eef2ff_45%,#8b93a7)]" />
      <span className="absolute inset-x-0 top-[22px] h-[3px] bg-[#1f5bff]" />
      <span className="absolute bottom-0 left-1/2 h-[6px] w-[12px] -translate-x-1/2 bg-[#2c3552] [clip-path:polygon(20%_0,80%_0,100%_100%,0_100%)]" />
      <span
        ref={(el) => {
          flameRefs.current[i] = el;
        }}
        className="absolute top-full left-1/2 h-[30px] w-[9px] origin-top rounded-b-full bg-[linear-gradient(180deg,#fff7e0,#ffb347_35%,#ff5a1f_70%,transparent)] blur-[0.6px]"
        style={{ opacity: 0, transform: "translateX(-50%) scaleY(0.3)" }}
      />
    </span>
  );

  return (
    <div ref={playgroundRef} className={`pointer-events-none absolute inset-0 overflow-hidden ${playgroundClassName}`}>
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 size-full" />
      {/* plataforma de lançamento */}
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 w-[220px] max-w-[80%] -translate-x-1/2 rounded-t-sm bg-[linear-gradient(180deg,#3a4360,#1b2033)] shadow-[0_-1px_0_rgb(91_134_255/0.5)]"
        style={{ height: PAD_H }}
      />
      <span
        ref={craftRef}
        className="pointer-events-auto absolute left-1/2 inline-flex origin-bottom"
        style={{ bottom: PAD_H, transform: "translate(-50%, 0px)" }}
      >
        {/* contagem por cima do foguete */}
        <span
          ref={countRef}
          aria-live="polite"
          className="pointer-events-none absolute bottom-full left-1/2 mb-14 -translate-x-1/2 font-mono text-lg font-semibold tracking-[0.12em] text-[#5b86ff] uppercase opacity-0 transition-opacity"
        />
        {/* paraquedas: listras azul e branco, cordas até as pontas do botão */}
        <span
          ref={chuteRef}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-full left-1/2 origin-bottom"
          style={{ opacity: 0, transform: "translateX(-50%) scale(0.3, 0.15)" }}
        >
          <svg viewBox="0 0 140 86" width={140} height={86} className="block overflow-visible">
            <defs>
              <linearGradient id={`${uid}-shade`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.18" />
                <stop offset="1" stopColor="#000000" stopOpacity="0.25" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3, 4].map((g) => {
              const a0 = Math.PI + (g / 5) * Math.PI;
              const a1 = Math.PI + ((g + 1) / 5) * Math.PI;
              const p = (a: number) => `${(70 + Math.cos(a) * 66).toFixed(1)} ${(40 + Math.sin(a) * 36).toFixed(1)}`;
              return <path key={g} d={`M70 40 L${p(a0)} A66 36 0 0 1 ${p(a1)} Z`} fill={g % 2 ? "#eef2ff" : "#1f5bff"} />;
            })}
            <path d="M4 40 A66 36 0 0 1 136 40 Z" fill={`url(#${uid}-shade)`} />
            <path d="M4 40 L40 86 M50 40 L58 86 M90 40 L82 86 M136 40 L100 86" stroke="#c9d2ea" strokeWidth={0.8} strokeOpacity={0.7} />
          </svg>
        </span>
        {booster(0)}
        {booster(1)}
        <button
          ref={ref}
          type={type}
          disabled={disabled}
          onClick={handleClick}
          className={`relative inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#2c3552] bg-[#121726] px-5 text-sm font-semibold whitespace-nowrap text-[#dfe7ff] shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_6px_14px_-6px_rgb(0_0_0/0.7)] transition-transform duration-150 outline-none select-none active:scale-95 focus-visible:ring-2 focus-visible:ring-[#1f5bff] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          {...props}
        >
          {children}
        </button>
      </span>
    </div>
  );
});

export default RocketButton;
