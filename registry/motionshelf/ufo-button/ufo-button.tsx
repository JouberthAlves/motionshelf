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
const LIGHTS = 7; // janelas da borda, que acendem em roda
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
  const lightRefs = useRef<(SVGEllipseElement | null)[]>([]);
  const poolRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  const emitterRef = useRef<SVGEllipseElement>(null);
  const litRef = useRef<HTMLSpanElement>(null);
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
    const pool = poolRef.current;
    const glow = glowRef.current;
    const lit = litRef.current;
    if (!playground || !ufo || !beam || !prize || !canvas || !stripes || !pool || !glow || !lit) return;
    // Movimento reduzido acompanhado ao vivo (ver onMotionChange, mais abaixo).
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches;
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
      // A luz pulsa de leve, como um feixe de energia, e soma com o que está atrás (mix-blend plus-lighter).
      const pulse = 0.9 + 0.1 * Math.sin(clock * 23) * Math.sin(clock * 3.1);
        beam.style.opacity = String(beamOn * pulse);
      // Poça de luz no chão onde o feixe bate, e o brilho do emissor embaixo do disco.
      pool.style.transform = `translate(${u.x - 130}px, ${height - 30}px)`;
      pool.style.opacity = String(beamOn * pulse);
      glow.style.transform = `translate(${u.x - 45}px, ${top - 18}px)`;
      glow.style.opacity = String(beamOn);
      emitterRef.current?.setAttribute("opacity", String(0.35 + 0.65 * beamOn));
      // O botão dentro do feixe recebe a luz azul por cima.
      lit.style.opacity = String(beamOn * 0.9);
      // Faixas subindo pelo feixe: a camada desliza 24 px (um período) e recomeça.
      stripes.style.transform = `translateY(${-((clock * 40) % 24)}px)`;
      const k = Math.min(1, lift / 60);
      const wobble = Math.sin(clock * 2.1) * 5 * k;
      prize.style.transform = `translate(${width / 2 - bw / 2}px, ${height - bh - lift}px) rotate(${wobble}deg) scale(${1 - 0.08 * k})`;
      // Luzes da borda acendem em roda.
      const on = Math.floor(clock * 7) % LIGHTS;
      lightRefs.current.forEach((light, i) => light?.setAttribute("opacity", i === on ? "1" : i === (on + LIGHTS - 1) % LIGHTS ? "0.6" : "0.35"));
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
        // Faíscas somam luz: um ponto e um halo fraco em volta.
        ctx.globalCompositeOperation = "lighter";
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];
          s.y += s.vy * dt;
          s.x += (u.x - s.x) * dt * 0.8;
          s.life -= dt * 1.2;
          if (s.life <= 0 || s.y < UFO_Y) {
            sparks.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = s.life * beamOn * 0.22;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = s.life * beamOn * 0.9;
          ctx.fillRect(s.x - 0.8, s.y - 0.8, 1.6, 1.6);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
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
      if (reduced) return;
      const rect = playground.getBoundingClientRect();
      // Desconta a escala de quem mostra o componente reduzido.
      const px = (event.clientX - rect.left) * (width / (rect.width || 1));
      const py = (event.clientY - rect.top) * (height / (rect.height || 1));
      pointer = px < 0 || py < 0 || px > width || py > height ? null : { x: px, y: py };
      start();
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerType === "touch" && !reduced) {
        pointer = null;
        start();
      }
    };
    // Repouso imediato: para o laço, apaga o feixe e as faíscas, desce o botão e estaciona o disco.
    const rest = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      pointer = null;
      abducting = false;
      lift = liftV = beamOn = 0;
      measure();
      u.x = park();
      u.v = 0;
      sparks.length = 0;
      ctx?.clearRect(0, 0, width, height);
      draw();
    };
    // Ligado no meio da abdução, para na hora; desligado, o próximo movimento do cursor anima de novo.
    const onMotionChange = () => {
      reduced = motion.matches;
      if (reduced) rest();
    };
    motion.addEventListener("change", onMotionChange);

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
      motion.removeEventListener("change", onMotionChange);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      cancelAnimationFrame(frame);
    };
  }, [disabled]);

  return (
    <div ref={playgroundRef} className={`pointer-events-none absolute inset-0 overflow-hidden ${playgroundClassName}`}>
      {/* poça de luz no chão, onde o feixe bate */}
      <span
        ref={poolRef}
        aria-hidden="true"
        className="absolute top-0 left-0 h-[60px] w-[260px] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgb(170_195_255/0.55),rgb(91_134_255/0.22)_42%,transparent_70%)] mix-blend-plus-lighter"
        style={{ opacity: 0 }}
      />
      {/* feixe: halo largo e desfocado, corpo mais claro e núcleo quase branco, com faixas subindo; o grupo
          soma luz com o fundo (plus-lighter) em vez de cobrir com cor chapada */}
      <span ref={beamRef} aria-hidden="true" className="absolute top-0 left-0 w-[210px] mix-blend-plus-lighter" style={{ opacity: 0 }}>
        <span className="absolute inset-0 blur-[10px]">
          <span className="absolute inset-0 bg-[linear-gradient(180deg,rgb(130_165_255/0.55),rgb(91_134_255/0.2)_55%,rgb(91_134_255/0.1))] [clip-path:polygon(39%_0,61%_0,100%_100%,0_100%)]" />
        </span>
        <span className="absolute inset-0 blur-[2px]">
          <span className="absolute inset-0 bg-[linear-gradient(180deg,rgb(205_222_255/0.7),rgb(140_170_255/0.28)_50%,rgb(110_145_255/0.12))] [clip-path:polygon(44%_0,56%_0,82%_100%,18%_100%)]" />
        </span>
        <span className="absolute inset-0 overflow-hidden [clip-path:polygon(42%_0,58%_0,90%_100%,10%_100%)]">
          <span
            ref={stripesRef}
            className="absolute inset-x-0 top-0 -bottom-[24px] bg-[repeating-linear-gradient(180deg,rgb(220_232_255/0.09)_0_3px,transparent_3px_24px)] blur-[1px]"
          />
        </span>
        <span className="absolute top-0 bottom-[20%] left-1/2 w-[8px] -translate-x-1/2 bg-[linear-gradient(180deg,rgb(255_255_255/0.85),rgb(190_210_255/0.25)_60%,transparent)] blur-[3px]" />
      </span>
      {/* brilho do emissor embaixo do disco: só acende com o feixe (parado, brilho permanente vira enfeite) */}
      <span
        ref={glowRef}
        aria-hidden="true"
        className="absolute top-0 left-0 h-[36px] w-[90px] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgb(200_220_255/0.9),rgb(110_150_255/0.35)_40%,transparent_70%)] mix-blend-plus-lighter"
        style={{ opacity: 0 }}
      />
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
          {/* luz do feixe batendo no botão, de cima para baixo */}
          <span
            ref={litRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-md bg-[linear-gradient(180deg,rgb(170_195_255/0.32),rgb(120_155_255/0.08)_60%,transparent)] shadow-[inset_0_1px_0_rgb(210_225_255/0.5)]"
            style={{ opacity: 0 }}
          />
        </button>
      </span>
      {/* disco voador: fundo escuro, borda de metal com janelas acesas, deck, cúpula de vidro com reflexo e o
          emissor embaixo, que acende com o feixe */}
      <span ref={ufoRef} aria-hidden="true" className="absolute top-0 left-0 h-[40px] origin-center" style={{ width: UFO_W, transform: "translate(-200px, 0px)" }}>
        <svg viewBox="0 0 96 40" width={UFO_W} height={40} className="block overflow-visible">
          <defs>
            <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#eef2ff" />
              <stop offset="0.35" stopColor="#a9b4cf" />
              <stop offset="0.7" stopColor="#5b6687" />
              <stop offset="1" stopColor="#262d44" />
            </linearGradient>
            <linearGradient id={`${uid}-under`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#262d44" />
              <stop offset="1" stopColor="#0b0e16" />
            </linearGradient>
            <linearGradient id={`${uid}-deck`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8b93a7" />
              <stop offset="1" stopColor="#3a4360" />
            </linearGradient>
            <radialGradient id={`${uid}-dome`} cx="0.38" cy="0.3" r="0.75">
              <stop offset="0" stopColor="#eef4ff" stopOpacity="0.95" />
              <stop offset="0.35" stopColor="#8fb0ff" stopOpacity="0.6" />
              <stop offset="1" stopColor="#1f5bff" stopOpacity="0.4" />
            </radialGradient>
            <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <ellipse cx={48} cy={28} rx={40} ry={7.5} fill={`url(#${uid}-under)`} />
          <ellipse cx={48} cy={31.5} rx={13} ry={3.4} fill="#0b0e16" />
          <ellipse ref={emitterRef} cx={48} cy={31.5} rx={8.5} ry={2} fill="#bcd0ff" opacity={0.35} filter={`url(#${uid}-glow)`} />
          <ellipse cx={48} cy={24} rx={46} ry={8.5} fill={`url(#${uid}-rim)`} />
          <ellipse cx={48} cy={21} rx={41} ry={3.2} fill="#ffffff" fillOpacity={0.22} />
          <path d="M3 25 Q48 34 93 25" fill="none" stroke="#1b2033" strokeOpacity={0.6} strokeWidth={0.8} />
          <ellipse cx={48} cy={17.5} rx={24} ry={5} fill={`url(#${uid}-deck)`} />
          <path d="M33 17.5 A15 13 0 0 1 63 17.5 Z" fill={`url(#${uid}-dome)`} stroke="#c9d6ff" strokeOpacity={0.55} strokeWidth={0.6} />
          <path d="M38 13 Q41 7 48 6" fill="none" stroke="#ffffff" strokeOpacity={0.7} strokeWidth={1.1} strokeLinecap="round" />
          <g filter={`url(#${uid}-glow)`}>
            {Array.from({ length: LIGHTS }, (_, i) => {
              // Janelas na frente da borda: a perspectiva aproxima as das pontas e encolhe o tamanho.
              const a = Math.PI * (0.12 + (0.76 * i) / (LIGHTS - 1));
              const cx = 48 - Math.cos(a) * 40;
              const cy = 25.5 + Math.sin(a) * 3.2;
              const r = 1.3 + Math.sin(a) * 0.9;
              return (
                <ellipse
                  key={i}
                  ref={(el) => {
                    lightRefs.current[i] = el;
                  }}
                  cx={cx}
                  cy={cy}
                  rx={r}
                  ry={r * 0.75}
                  fill="#a8e4ff"
                  opacity={0.35}
                />
              );
            })}
          </g>
        </svg>
      </span>
    </div>
  );
});

export default UfoButton;
