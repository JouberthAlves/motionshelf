"use client";

import { forwardRef, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";

export type BulbToggleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  /** Lit or not (controlled). */
  checked?: boolean;
  /** Initial state when uncontrolled. */
  defaultChecked?: boolean;
  /** Called with the new state when the switch is pulled, clicked or pressed. */
  onCheckedChange?: (checked: boolean) => void;
  /** Accessible name of the switch. */
  label?: string;
  /** Classes for the playground, which fills the nearest positioned ancestor by default. */
  playgroundClassName?: string;
};

// Lâmpada pendurada por um fio no teto da área: pêndulo amortecido com a correntinha de puxar ao lado.
// Puxe a correntinha (ou clique) para acender: o filamento esquenta e só então a luz se espalha. px e
// segundos, y para baixo.
const G = 900; // gravidade do pêndulo
const DAMP = 1.6; // amortecimento do pêndulo
const CORD = 70; // comprimento do fio
const R = CORD + 18 + 36; // do teto ao centro da parte larga do vidro
const CHAIN_X = 27; // a correntinha fica à direita do eixo, por fora do vidro
const CHAIN_TOP = CORD + 14;
const BEADS = 14;
const SPACING = 4.5;
const CHAIN_LEN = BEADS * SPACING;
const K = 700; // mola da correntinha
const C = 18;
const THRESHOLD = 22; // puxada mínima para alternar
const SOFT = 28; // depois daqui a correntinha oferece resistência
const MAX_PULL = 40;
const MIN_PULL = -6; // quique para cima
const HIDDEN = "translate(-400px, -400px)";

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

type Actions = {
  down: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  move: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  up: () => void;
  cancel: () => void;
  kick: () => void;
  glass: (clientX: number) => void;
};

/** Interruptor de lâmpada pendurada: puxe a correntinha (ou clique) para acender. */
const BulbToggle = forwardRef<HTMLButtonElement, BulbToggleProps>(function BulbToggle(
  { checked, defaultChecked, onCheckedChange, label = "Light", playgroundClassName = "", className = "", onClick, disabled, type = "button", ...props },
  ref,
) {
  const [inner, setInner] = useState(defaultChecked ?? false);
  const on = checked ?? inner;
  // Montou já aceso: a luz começa no máximo, sem animação. Estado inicial fixo para o React não reescrever.
  const [initial] = useState(on ? 1 : 0);

  const playgroundRef = useRef<HTMLDivElement>(null);
  const poolRef = useRef<HTMLSpanElement>(null);
  const haloRef = useRef<HTMLSpanElement>(null);
  const swingRef = useRef<HTMLSpanElement>(null);
  const coreRef = useRef<HTMLSpanElement>(null);
  const litRef = useRef<SVGPathElement>(null);
  const emberRef = useRef<SVGPathElement>(null);
  const hotRef = useRef<SVGPathElement>(null);
  const beadRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const ballRef = useRef<HTMLSpanElement>(null);
  const grabRef = useRef<HTMLSpanElement>(null);
  const onRef = useRef(on);
  const toggleRef = useRef<() => void>(() => {});
  const actions = useRef<Actions | null>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  // O click que vem depois de um arrasto é ignorado uma vez.
  const suppressClick = useRef(false);
  const uid = useId().replace(/:/g, "");

  const toggle = () => {
    const next = !on;
    if (checked === undefined) setInner(next);
    onCheckedChange?.(next);
  };
  useEffect(() => {
    toggleRef.current = toggle;
  });

  useEffect(() => {
    onRef.current = on;
    wakeRef.current?.();
  }, [on]);

  useEffect(() => {
    const playground = playgroundRef.current;
    const pool = poolRef.current;
    const halo = haloRef.current;
    const swing = swingRef.current;
    const core = coreRef.current;
    const lit = litRef.current;
    const ember = emberRef.current;
    const hot = hotRef.current;
    const ball = ballRef.current;
    const grab = grabRef.current;
    if (!playground || !pool || !halo || !swing || !core || !lit || !ember || !hot || !ball || !grab) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = mq.matches;

    let width = 0;
    let height = 0;
    const measure = () => {
      width = playground.clientWidth;
      height = playground.clientHeight;
    };
    measure();

    let theta = 0;
    let omega = 0;
    let pull = 0;
    let pullV = 0;
    let heat = onRef.current ? 1 : 0; // filamento esquentando, 0–1
    let glow = onRef.current ? 1 : 0; // luz espalhada, 0–1
    let dragging = false;
    let startY = 0;
    let dy = 0;
    let maxMove = 0;
    let bulbX = 0;
    let frame = 0;
    let last = 0;

    const draw = () => {
      const pivotX = width / 2;
      bulbX = pivotX - R * Math.sin(theta);
      const bulbY = R * Math.cos(theta);
      swing.style.transform = `translate(${pivotX}px, 0px) rotate(${theta}rad)`;
      // A luz vive fora do swing para somar com o fundo do palco (plus-lighter).
      pool.style.transform = `translate(${bulbX - 160}px, ${height - 50}px)`;
      pool.style.opacity = String(glow);
      halo.style.transform = `translate(${bulbX - 150}px, ${bulbY - 150}px) scale(${0.8 + 0.2 * glow})`;
      halo.style.opacity = String(glow);
      core.style.transform = `translate(${bulbX - 32}px, ${bulbY - 32}px)`;
      core.style.opacity = String(glow);
      lit.setAttribute("opacity", String(glow * 0.92));
      // Apagada de vez, as camadas de luz saem da pintura: parado, brilho invisível ainda é enfeite.
      const seen = glow > 0 ? "visible" : "hidden";
      for (const el of [pool, halo, core]) if (el.style.visibility !== seen) el.style.visibility = seen;
      ember.setAttribute("opacity", String(smooth(0, 0.45, heat)));
      hot.setAttribute("opacity", String(smooth(0.35, 1, heat)));
      // A correntinha estica: só o translate de cada conta muda.
      const k = 1 + pull / CHAIN_LEN;
      beadRefs.current.forEach((bead, i) => {
        if (bead) bead.style.transform = `translate(${CHAIN_X - 1.25}px, ${CHAIN_TOP + i * SPACING * k}px)`;
      });
      ball.style.transform = `translate(${CHAIN_X - 4}px, ${CHAIN_TOP + CHAIN_LEN + pull}px)`;
      grab.style.transform = `translate(${CHAIN_X - 22}px, ${CHAIN_TOP + CHAIN_LEN + pull + 4 - 22}px)`;
    };

    const pullFor = (d: number) => Math.min(MAX_PULL, d <= 0 ? 0 : d <= SOFT ? d : SOFT + (d - SOFT) * 0.3);

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    };

    const step = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      const target = onRef.current ? 1 : 0;

      // Pêndulo: puxar a correntinha (à direita do eixo) inclina no sentido de θ positivo.
      const tau = dragging ? 0.03 * pull : 0;
      omega += (-(G / R) * Math.sin(theta) - DAMP * omega + tau) * dt;
      theta += omega * dt;

      // Correntinha: segue o dedo ou volta por uma mola, com um quique pequeno.
      if (dragging) {
        pull = pullFor(dy);
        pullV = 0;
      } else {
        pullV += (-K * pull - C * pullV) * dt;
        pull += pullV * dt;
        if (pull < MIN_PULL) {
          pull = MIN_PULL;
          if (pullV < 0) pullV = 0;
        }
      }

      // Luz: acender esquenta o filamento primeiro; apagar é mais rápido e o filamento fica laranja um instante.
      if (target === 1) {
        heat = Math.min(1, heat + dt / 0.15);
        if (heat >= 0.6) glow += (1 - glow) * (1 - Math.exp(-dt / 0.16));
      } else {
        glow += (0 - glow) * (1 - Math.exp(-dt / 0.06));
        heat += (0 - heat) * (1 - Math.exp(-dt / 0.09));
      }

      draw();
      const settled =
        !dragging &&
        Math.abs(theta) < 0.0005 &&
        Math.abs(omega) < 0.002 &&
        Math.abs(pull) < 0.1 &&
        Math.abs(pullV) < 1 &&
        Math.abs(heat - target) < 0.002 &&
        Math.abs(glow - target) < 0.002;
      if (settled) {
        theta = omega = pull = pullV = 0;
        heat = glow = target;
        draw();
        frame = 0;
        last = 0;
        return;
      }
      frame = requestAnimationFrame(step);
    };

    // Com movimento reduzido o estado muda direto, sem esquentar nem balançar.
    const snap = () => {
      theta = omega = pull = pullV = 0;
      heat = glow = onRef.current ? 1 : 0;
      draw();
    };
    const start = () => {
      if (reduced) {
        if (!dragging) snap();
        else draw();
        return;
      }
      if (!frame) frame = requestAnimationFrame(step);
    };
    wakeRef.current = start;

    const onMotionChange = () => {
      reduced = mq.matches;
      if (reduced) {
        stop();
        snap();
      } else {
        start();
      }
    };
    mq.addEventListener("change", onMotionChange);

    // Ponteiro em px de layout, descontando a escala de quem mostra o componente reduzido.
    const localY = (clientY: number) => {
      const rect = playground.getBoundingClientRect();
      return (clientY - rect.top) * (height / (rect.height || 1));
    };

    actions.current = {
      down: (event) => {
        if (event.button !== 0 || disabled) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        suppressClick.current = false;
        startY = localY(event.clientY);
        dy = 0;
        maxMove = 0;
        dragging = true;
        start();
        if (reduced) {
          pull = 0;
          draw();
        }
      },
      move: (event) => {
        if (!dragging) return;
        dy = localY(event.clientY) - startY;
        maxMove = Math.max(maxMove, Math.abs(dy));
        if (reduced) {
          pull = pullFor(dy);
          draw();
        }
      },
      up: () => {
        if (!dragging) return;
        dragging = false;
        if (maxMove > 4) {
          suppressClick.current = true;
          window.setTimeout(() => {
            suppressClick.current = false;
          }, 100);
        }
        const pulled = pull >= THRESHOLD;
        if (pulled) {
          toggleRef.current();
          if (!reduced) omega += 0.5;
        }
        if (reduced) {
          pull = 0;
          draw();
        } else {
          start();
        }
      },
      cancel: () => {
        if (!dragging) return;
        dragging = false;
        if (reduced) {
          pull = 0;
          draw();
        } else {
          start();
        }
      },
      kick: () => {
        if (reduced) return;
        pullV = 320;
        omega += 0.6;
        start();
      },
      glass: (clientX) => {
        if (reduced) return;
        const rect = playground.getBoundingClientRect();
        const x = (clientX - rect.left) * (width / (rect.width || 1));
        omega += x < bulbX ? -0.7 : 0.7;
        start();
      },
    };

    const observer = new ResizeObserver(() => {
      measure();
      draw();
    });
    observer.observe(playground);
    draw();
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", onMotionChange);
      cancelAnimationFrame(frame);
      actions.current = null;
      wakeRef.current = null;
    };
  }, [disabled]);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || disabled) return;
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    toggle();
    actions.current?.kick();
  };
  const handleGlass = (event: MouseEvent<HTMLSpanElement>) => {
    if (disabled) return;
    toggle();
    actions.current?.glass(event.clientX);
  };

  const legs = "#5a5f6a";
  const coil = "M19 30 q1.25 -4 2.5 0 t2.5 0 t2.5 0 t2.5 0";

  return (
    <div ref={playgroundRef} className={`pointer-events-none absolute inset-0 overflow-hidden ${playgroundClassName}`}>
      {/* poça de luz no chão, sob a lâmpada */}
      <span
        ref={poolRef}
        aria-hidden="true"
        className="absolute top-0 left-0 h-[70px] w-[320px] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgb(255_214_160/0.38),rgb(255_190_120/0.14)_45%,transparent_70%)] mix-blend-plus-lighter"
        style={{ opacity: initial, transform: HIDDEN, visibility: initial ? "visible" : "hidden" }}
      />
      {/* luz de trás: o blend fica no contêiner que leva a opacidade, os filhos desfocados não têm blend */}
      <span ref={haloRef} aria-hidden="true" className="absolute top-0 left-0 h-[300px] w-[300px] origin-center mix-blend-plus-lighter" style={{ opacity: initial, transform: HIDDEN, visibility: initial ? "visible" : "hidden" }}>
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgb(255_214_160/0.42),rgb(255_190_120/0.12)_45%,transparent_70%)] blur-[24px]" />
        <span className="absolute inset-[90px] rounded-full bg-[radial-gradient(circle,rgb(255_236_205/0.75),rgb(255_210_150/0.25)_55%,transparent_75%)] blur-[8px]" />
      </span>
      {/* a luminária inteira gira em volta do ponto onde o fio prende no teto */}
      <span
        ref={swingRef}
        className={`absolute top-0 left-0 ${disabled ? "opacity-50" : ""}`}
        style={{ transform: HIDDEN, transformOrigin: "0 0" }}
      >
        <span aria-hidden="true" className="absolute top-0 left-[-1px] w-[2px] bg-[#2a2d35]" style={{ height: CORD }} />
        {/* soquete de metal */}
        <svg aria-hidden="true" viewBox="0 0 22 20" width={22} height={20} className="absolute top-0 left-0 block overflow-visible" style={{ transform: `translate(-11px, ${CORD}px)` }}>
          <defs>
            <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3a3f4a" />
              <stop offset="1" stopColor="#1b1e25" />
            </linearGradient>
          </defs>
          <rect x={6} y={0} width={10} height={5} rx={1.5} fill="#2a2d35" />
          <rect x={0} y={4} width={22} height={16} rx={3} fill={`url(#${uid}-metal)`} />
          <path d="M1 9 H21 M1 12.5 H21 M1 16 H21" stroke="#12141a" strokeWidth={1} />
        </svg>
        {/* vidro, luz de dentro e filamento */}
        <svg aria-hidden="true" viewBox="0 0 48 64" width={48} height={64} className="absolute top-0 left-0 block overflow-visible" style={{ transform: `translate(-24px, ${CORD + 18}px)` }}>
          <defs>
            <radialGradient id={`${uid}-lit`} cx="0.5" cy="0.55" r="0.6">
              <stop offset="0" stopColor="#fffaf0" />
              <stop offset="0.6" stopColor="#ffe2b0" />
              <stop offset="1" stopColor="#ffbe70" stopOpacity="0.85" />
            </radialGradient>
            <filter id={`${uid}-glow`} filterUnits="userSpaceOnUse" x="10" y="20" width="38" height="20">
              <feGaussianBlur stdDeviation="1.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M15 0 C15 10 2 16 2 36 A22 22 0 0 0 46 36 C46 16 33 10 33 0 Z" fill="rgb(255 255 255 / 0.05)" stroke="rgb(255 255 255 / 0.22)" strokeWidth={1} />
          <path ref={litRef} d="M15 0 C15 10 2 16 2 36 A22 22 0 0 0 46 36 C46 16 33 10 33 0 Z" fill={`url(#${uid}-lit)`} opacity={initial * 0.92} />
          <path d="M9 30 Q9 20 15 14" fill="none" stroke="#ffffff" strokeOpacity={0.28} strokeWidth={2} strokeLinecap="round" />
          <path d="M19 0 V30 M29 0 V30" fill="none" stroke={legs} strokeWidth={0.8} />
          <path d={coil} fill="none" stroke="#4a4e58" strokeWidth={1.2} strokeLinecap="round" />
          <path ref={emberRef} d={coil} fill="none" stroke="#ff6a1a" strokeWidth={1.2} strokeLinecap="round" opacity={smooth(0, 0.45, initial)} />
          <path ref={hotRef} d={coil} fill="none" stroke="#fff4dc" strokeWidth={1.2} strokeLinecap="round" opacity={smooth(0.35, 1, initial)} filter={`url(#${uid}-glow)`} />
        </svg>
        {/* área clicável do vidro: fica antes da correntinha para ela ficar por cima */}
        <span
          aria-hidden="true"
          onClick={handleGlass}
          className={`pointer-events-auto absolute top-0 left-0 h-[64px] w-[48px] ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
          style={{ transform: `translate(-24px, ${CORD + 18}px)` }}
        />
        {/* haste que leva a correntinha do soquete para fora do vidro */}
        <span aria-hidden="true" className="absolute top-0 left-0 h-[2px] w-[17px] rounded-full bg-[#3a3f4a]" style={{ transform: `translate(10px, ${CHAIN_TOP - 2}px)` }} />
        {/* correntinha: só o translate de cada conta muda */}
        {Array.from({ length: BEADS }, (_, i) => (
          <span
            key={i}
            ref={(el) => {
              beadRefs.current[i] = el;
            }}
            aria-hidden="true"
            className="absolute top-0 left-0 size-[2.5px] rounded-full bg-[#8a8f9c]"
            style={{ transform: `translate(${CHAIN_X - 1.25}px, ${CHAIN_TOP + i * SPACING}px)` }}
          />
        ))}
        <span
          ref={ballRef}
          aria-hidden="true"
          className="absolute top-0 left-0 size-2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#eef1f6,#9aa0ad_55%,#4b505c)]"
          style={{ transform: `translate(${CHAIN_X - 4}px, ${CHAIN_TOP + CHAIN_LEN}px)` }}
        />
        {/* o interruptor de verdade: alvo de toque invisível de 44 px em volta da esfera */}
        <span ref={grabRef} className="absolute top-0 left-0 size-11" style={{ transform: `translate(${CHAIN_X - 22}px, ${CHAIN_TOP + CHAIN_LEN + 4 - 22}px)` }}>
          <button
            ref={ref}
            type={type}
            role="switch"
            aria-checked={on}
            aria-label={label}
            disabled={disabled}
            className={`pointer-events-auto size-11 cursor-grab touch-none rounded-full bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[#1f5bff] focus-visible:ring-offset-2 focus-visible:ring-offset-black active:cursor-grabbing disabled:cursor-not-allowed ${className}`}
            {...props}
            onClick={handleClick}
            onPointerDown={(event) => actions.current?.down(event)}
            onPointerMove={(event) => actions.current?.move(event)}
            onPointerUp={() => actions.current?.up()}
            onPointerCancel={() => actions.current?.cancel()}
            onLostPointerCapture={() => actions.current?.cancel()}
          />
        </span>
      </span>
      {/* núcleo quase branco por cima do vidro */}
      <span ref={coreRef} aria-hidden="true" className="absolute top-0 left-0 h-[64px] w-[64px] mix-blend-plus-lighter" style={{ opacity: initial, transform: HIDDEN, visibility: initial ? "visible" : "hidden" }}>
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgb(255_252_245/0.95),rgb(255_235_200/0.35)_45%,transparent_70%)] blur-[6px]" />
      </span>
    </div>
  );
});

export default BulbToggle;
