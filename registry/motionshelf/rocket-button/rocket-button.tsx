"use client";

import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type MouseEvent } from "react";
import { createFluidSmoke, createSpriteSmoke, type Jet, type Smoke } from "./rocket-smoke";

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
// Tempo e física de um Falcon 9 de verdade, em tempo real. A contagem anda 1 s por número: a ignição começa
// em T-3, os motores chegam à potência máxima em T-1 e as garras soltam em T-0.
const COUNT_STEP = 1;
// Empuxo/peso na decolagem: 7.607 kN para 549 t, ~1,4. A aceleração é g × (empuxo/peso − 1), e o empuxo/peso
// sobe conforme o combustível queima: a massa cai ~2,75 t/s, então ela acabaria em MASS_TIME segundos.
const TWR_LIFTOFF = 1.4;
const MASS_TIME = 200;
const G = 9.81; // m/s²
// Escala: o foguete (a altura do botão com os propulsores) tem os 70 m de um Falcon 9. Assim ele leva ~6 s
// para subir a própria altura e ~16 s para sair de uma área de 360 px.
const ROCKET_M = 70;
const SINK = 95; // velocidade de descida com o paraquedas
const SMOKE_TINT: [number, number, number] = [0.72, 0.76, 0.86]; // cinza-azulado, puxado para o tom do site
// Propulsor: 16 px de largura, 13 px para fora da borda do botão, então o bocal fica 5 px fora dela.
const BOOSTER_W = 16;
const BOOSTER_OUT = 13;

/** Botão-foguete: no clique, conta 3-2-1, decola da plataforma e volta de paraquedas. */
const RocketButton = forwardRef<HTMLButtonElement, RocketButtonProps>(function RocketButton(
  { children, className = "", onLaunch, onLand, onClick, playgroundClassName = "", disabled, type = "button", ...props },
  ref,
) {
  const playgroundRef = useRef<HTMLDivElement>(null);
  const craftRef = useRef<HTMLSpanElement>(null);
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const spriteCanvasRef = useRef<HTMLCanvasElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const flameRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const heatRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const padGlowRef = useRef<HTMLSpanElement>(null);
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
    const glCanvas = glCanvasRef.current;
    const spriteCanvas = spriteCanvasRef.current;
    const count = countRef.current;
    const chute = chuteRef.current;
    const padGlow = padGlowRef.current;
    if (!playground || !craft || !glCanvas || !spriteCanvas || !count || !chute || !padGlow) return;
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let cw = 0;
    let ch = 0;
    // A fumaça só é criada no 1º lançamento (o fluido aloca texturas na GPU).
    let smoke: Smoke | null = null;
    let fluid = false;
    const makeSmoke = () => {
      if (smoke) return smoke;
      smoke = createFluidSmoke(glCanvas, SMOKE_TINT);
      fluid = !!smoke;
      if (!smoke) smoke = createSpriteSmoke(spriteCanvas, SMOKE_TINT);
      glCanvas.style.display = fluid ? "block" : "none";
      spriteCanvas.style.display = fluid ? "none" : "block";
      smoke.resize(width, height);
      return smoke;
    };
    // GPU que não dá conta (12 quadros seguidos acima de 50 ms) ou contexto perdido: troca para sprites.
    const dropFluid = () => {
      if (!fluid || !smoke) return;
      smoke.dispose();
      fluid = false;
      smoke = createSpriteSmoke(spriteCanvas, SMOKE_TINT);
      smoke.resize(width, height);
      glCanvas.style.display = "none";
      spriteCanvas.style.display = "block";
    };
    glCanvas.addEventListener("webglcontextlost", dropFluid);

    const measure = () => {
      width = playground.clientWidth;
      height = playground.clientHeight;
      cw = craft.offsetWidth;
      ch = craft.offsetHeight;
      smoke?.resize(width, height);
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
    let slow = 0;
    let quiet = 0;

    // Jatos para a fumaça: bocais em px com y para cima a partir do chão, apontando para baixo do corpo.
    const jets = (): Jet[] => {
      const rad = (tilt * Math.PI) / 180;
      const dx = -Math.sin(rad);
      const dy = -Math.cos(rad);
      const cx = width / 2 + x;
      const up = PAD_H - y; // fundo do foguete, medido do chão
      const off = cw / 2 + BOOSTER_OUT - BOOSTER_W / 2;
      return [-off, off].map((o) => ({ x: cx + o * Math.cos(rad), y: up - o * Math.sin(rad), dx, dy, power: throttle }));
    };

    const draw = () => {
      craft.style.transform = `translate(calc(-50% + ${x}px), ${y}px) rotate(${tilt}deg)`;
      const flicker = 0.85 + Math.random() * 0.3;
      flameRefs.current.forEach((flame) => {
        if (!flame) return;
        flame.style.opacity = String(Math.min(1, throttle * 1.6));
        flame.style.transform = `translateX(-50%) scale(${0.85 + 0.15 * flicker}, ${(0.25 + throttle * 1.15) * flicker})`;
      });
      heatRefs.current.forEach((heat) => {
        if (heat) heat.style.opacity = String(Math.min(1, throttle * 1.3));
      });
      // A plataforma acende com a chama enquanto o foguete está perto dela.
      padGlow.style.opacity = String(Math.min(1, throttle * 1.2) * Math.max(0, 1 + y / 140));
      chute.style.opacity = String(chuteOpen);
      chute.style.transform = `translateX(-50%) scale(${0.3 + 0.7 * chuteOpen}, ${0.15 + 0.85 * chuteOpen})`;
    };

    const say = (text: string) => {
      if (count.textContent !== text) count.textContent = text;
      count.style.opacity = text ? "1" : "0";
    };

    const step = (now: number) => {
      const raw = last ? (now - last) / 1000 : 1 / 60;
      const dt = Math.min(raw, 1 / 30);
      last = now;
      timer += dt;
      clock += dt;
      if (fluid) {
        slow = raw > 0.05 ? slow + 1 : 0;
        if (slow >= 12) dropFluid();
      }

      if (phase === "idle" && launch.current) {
        launch.current = false;
        makeSmoke();
        phase = "count";
        timer = 0;
      }
      if (phase === "count") {
        const n = 3 - Math.floor(timer / COUNT_STEP);
        say(n > 0 ? String(n) : "");
        // Em T-3 os motores acendem e sobem até a potência máxima em T-1; daí até T-0 o foguete fica preso à
        // plataforma em potência máxima, só tremendo, enquanto a nuvem se espalha.
        throttle = Math.min(1, timer / (COUNT_STEP * 2));
        x = throttle >= 1 ? (Math.random() - 0.5) * 0.8 : 0;
        if (timer >= COUNT_STEP * 3) {
          phase = "lift";
          timer = 0;
          x = 0;
          settings.current.onLaunch?.();
        }
      } else if (phase === "lift") {
        say(timer < 2 ? "Liftoff" : "");
        throttle = 1;
        const twr = TWR_LIFTOFF / (1 - timer / MASS_TIME);
        vy -= G * (twr - 1) * (ch / ROCKET_M) * dt;
        y += vy * dt;
        // Sobe reto: só um balanço mínimo do controle de direção.
        tilt = Math.sin(clock * 5) * 0.3;
        x = Math.sin(clock * 2.1) * 0.6;
        if (height - PAD_H + y < -ch - 30) {
          phase = "away";
          timer = 0;
          throttle = 0;
        }
      } else if (phase === "away") {
        if (timer > 1.1) {
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

      // Fora das fases com motor ligado, a fumaça só continua se espalhando e sumindo.
      smoke?.step(dt, phase === "count" || phase === "lift" ? jets() : []);
      draw();
      // Para quando pousou e a fumaça se dissipou (com folga de 1,5 s para o resto sumir).
      quiet = phase === "idle" && (!smoke || smoke.amount() < 0.05) ? quiet + dt : 0;
      if (phase === "idle" && quiet > 1.5) {
        smoke?.clear();
        tilt = 0;
        x = 0;
        draw();
        frame = 0;
        last = 0;
        slow = 0;
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
      glCanvas.removeEventListener("webglcontextlost", dropFluid);
      cancelAnimationFrame(frame);
      smoke?.dispose();
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

  // Propulsor lateral: ogiva, corpo de metal claro com sombra cilíndrica, faixa azul, aleta para fora,
  // bocal de metal escuro que esquenta por dentro, e a chama em camadas (núcleo branco, corpo laranja).
  const booster = (i: number) => (
    <span
      aria-hidden="true"
      className="absolute bottom-0 h-[54px]"
      style={{ width: BOOSTER_W, [i === 0 ? "left" : "right"]: -BOOSTER_OUT }}
    >
      {/* aleta, do lado de fora */}
      <span
        className={`absolute bottom-[5px] h-[14px] w-[7px] bg-[linear-gradient(180deg,#3a4360,#1b2033)] ${
          i === 0 ? "-left-[6px] [clip-path:polygon(100%_0,100%_100%,0_100%)]" : "-right-[6px] [clip-path:polygon(0_0,100%_100%,0_100%)]"
        }`}
      />
      {/* ogiva */}
      <span className="absolute inset-x-0 top-0 h-[14px] rounded-t-[50%_100%] bg-[linear-gradient(90deg,#6a76a0,#dfe7ff_38%,#c9d2ea_55%,#5b6687)]" />
      {/* corpo cilíndrico */}
      <span className="absolute inset-x-0 top-[13px] bottom-[6px] bg-[linear-gradient(90deg,#7a8399,#f4f6ff_35%,#d7ddee_55%,#8b93a7_85%,#5b6687)]" />
      <span className="absolute inset-x-0 top-[24px] h-[4px] bg-[linear-gradient(90deg,#123a9e,#3f74ff_40%,#1f5bff_60%,#0f2f80)]" />
      <span className="absolute inset-x-0 top-[13px] h-px bg-[#5b6687]/60" />
      <span className="absolute inset-x-0 bottom-[14px] h-px bg-[#5b6687]/60" />
      {/* bocal: sino de metal escuro; por dentro, o brilho do calor */}
      <span className="absolute bottom-0 left-1/2 h-[7px] w-[14px] -translate-x-1/2 bg-[linear-gradient(90deg,#1b2033,#5b6687_45%,#262d44)] [clip-path:polygon(22%_0,78%_0,100%_100%,0_100%)]" />
      <span
        ref={(el) => {
          heatRefs.current[i] = el;
        }}
        className="absolute bottom-0 left-1/2 h-[4px] w-[10px] -translate-x-1/2 rounded-b-full bg-[radial-gradient(ellipse_at_50%_100%,#ffd9a0,#ff7a2a_55%,transparent_75%)]"
        style={{ opacity: 0 }}
      />
      {/* chama: brilho largo (soma luz), corpo laranja e núcleo quase branco */}
      <span
        ref={(el) => {
          flameRefs.current[i] = el;
        }}
        className="absolute top-full left-1/2 h-[46px] w-[22px] origin-top"
        style={{ opacity: 0, transform: "translateX(-50%) scale(1, 0.25)" }}
      >
        <span className="absolute inset-x-[-8px] top-0 h-[40px] rounded-b-full bg-[radial-gradient(ellipse_at_50%_10%,rgb(255_170_90/0.55),transparent_70%)] blur-[3px] mix-blend-plus-lighter" />
        <span className="absolute inset-x-[3px] top-0 h-[44px] rounded-b-full bg-[linear-gradient(180deg,#ffe2b0,#ff9d3d_30%,#ff4d1a_62%,transparent)] blur-[1px] mix-blend-plus-lighter" />
        <span className="absolute inset-x-[7px] top-0 h-[22px] rounded-b-full bg-[linear-gradient(180deg,#ffffff,#d8e6ff_45%,transparent)] mix-blend-plus-lighter" />
      </span>
    </span>
  );

  return (
    <div ref={playgroundRef} className={`pointer-events-none absolute inset-0 overflow-hidden ${playgroundClassName}`}>
      {/* plataforma de lançamento, com o brilho laranja da chama por cima */}
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 w-[220px] max-w-[80%] -translate-x-1/2 rounded-t-sm bg-[linear-gradient(180deg,#3a4360,#1b2033)] shadow-[0_-1px_0_rgb(91_134_255/0.5)]"
        style={{ height: PAD_H }}
      />
      <span
        ref={padGlowRef}
        aria-hidden="true"
        className="absolute bottom-[-30px] left-1/2 h-[70px] w-[300px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgb(255_150_70/0.55),rgb(255_90_30/0.18)_45%,transparent_70%)] mix-blend-plus-lighter"
        style={{ opacity: 0 }}
      />
      <span
        ref={craftRef}
        className="pointer-events-auto absolute left-1/2 z-[1] inline-flex origin-bottom"
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
        {/* travas que prendem os propulsores ao botão */}
        <span aria-hidden="true" className="absolute top-[9px] -right-[3px] -left-[3px] h-[3px] rounded-full bg-[#3a4360]" />
        <span aria-hidden="true" className="absolute -right-[3px] bottom-[9px] -left-[3px] h-[3px] rounded-full bg-[#3a4360]" />
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
      {/* fumaça na frente do foguete: ela envolve a base dele na plataforma */}
      <canvas ref={glCanvasRef} aria-hidden="true" className="absolute inset-0 z-[2] size-full" style={{ display: "none" }} />
      <canvas ref={spriteCanvasRef} aria-hidden="true" className="absolute inset-0 z-[2] size-full" style={{ display: "none" }} />
    </div>
  );
});

export default RocketButton;
