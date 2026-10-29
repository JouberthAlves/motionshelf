"use client";

import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type MouseEvent } from "react";

export type ClawButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Side of the prize chute. */
  chute?: "left" | "right";
  /** Called when the button drops into the chute, at the end of the grab. */
  onComplete?: () => void;
  /** Classes for the playground, which fills the nearest positioned ancestor by default. */
  playgroundClassName?: string;
};

// Máquina de garra de fliperama: o carrinho corre no trilho de cima seguindo o cursor; no clique, a garra
// desce, pega o botão (o prêmio), sobe balançando e solta na rampa. Física em px e segundos, y para baixo.
const G = 900; // gravidade (queda do botão e pêndulo da garra)
const RAIL_Y = 14; // centro do trilho
const ANCHOR_Y = 22; // onde o cabo sai do carrinho
const CLAW_H = 30; // do fim do cabo à ponta das garras
const REST_L = 26; // comprimento do cabo parado
const SPEED = 520; // velocidade máxima do carrinho
const CHUTE_W = 86; // largura mínima da rampa; cresce com o botão para ele caber inteiro sobre o buraco

/** Botão que é o prêmio de uma máquina de garra: no clique a garra pega o botão e solta na rampa. */
const ClawButton = forwardRef<HTMLButtonElement, ClawButtonProps>(function ClawButton(
  { children, className = "", chute = "right", onComplete, onClick, playgroundClassName = "", disabled, type = "button", ...props },
  ref,
) {
  const playgroundRef = useRef<HTMLDivElement>(null);
  const carriageRef = useRef<HTMLSpanElement>(null);
  const swingRef = useRef<HTMLSpanElement>(null);
  const cableRef = useRef<HTMLSpanElement>(null);
  const clawRef = useRef<HTMLSpanElement>(null);
  const prongRefs = useRef<(SVGGElement | null)[]>([]);
  const prizeRef = useRef<HTMLSpanElement>(null);
  const chuteRef = useRef<HTMLSpanElement>(null);
  const chuteLabelRef = useRef<HTMLSpanElement>(null);
  // O clique só pede a pegada; o laço lê e zera.
  const grab = useRef(false);
  const settings = useRef({ chute, onComplete });
  useEffect(() => {
    settings.current = { chute, onComplete };
  }, [chute, onComplete]);
  const reduced = useRef(false);
  const startRef = useRef<(() => void) | null>(null);
  const metal = `${useId().replace(/:/g, "")}-metal`;

  useEffect(() => {
    const playground = playgroundRef.current;
    const carriage = carriageRef.current;
    const swing = swingRef.current;
    const cable = cableRef.current;
    const claw = clawRef.current;
    const prize = prizeRef.current;
    if (!playground || !carriage || !swing || !cable || !claw || !prize) return;
    // Movimento reduzido acompanhado ao vivo (ver onMotionChange, mais abaixo).
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = motion.matches;

    let width = 0;
    let height = 0;
    let bw = 0;
    let bh = 0;
    let chuteW = CHUTE_W;
    const measure = () => {
      width = playground.clientWidth;
      height = playground.clientHeight;
      bw = prize.offsetWidth;
      bh = prize.offsetHeight;
      // A rampa tem a largura do botão e mais folga: carregado até ela, ele não passa da parede.
      chuteW = Math.max(CHUTE_W, bw + 24);
      for (const el of [chuteRef.current, chuteLabelRef.current]) if (el) el.style.width = `${chuteW}px`;
    };
    measure();
    const homeX = () => (settings.current.chute === "right" ? width * 0.4 : width * 0.6);
    const chuteX = () => (settings.current.chute === "right" ? width - chuteW / 2 - 14 : chuteW / 2 + 14);

    // Carrinho, cabo e pêndulo (ângulo da garra) e o prêmio.
    const cart = { x: homeX(), v: 0, target: homeX() };
    let length = REST_L;
    let theta = 0;
    let omega = 0;
    let open = 0.35; // abertura das garras, rad
    let openTarget = 0.35;
    const prizePos = { x: homeX(), y: height - bh / 2, vx: 0, vy: 0, rot: 0, scale: 1 };
    let phase: "idle" | "seek" | "lower" | "close" | "lift" | "carry" | "drop" | "fall" | "respawn" = "idle";
    let timer = 0;
    let pointerX: number | null = null;
    let frame = 0;
    let last = 0;

    const clawTip = () => {
      // Ponta das garras, presa ao carrinho e girada pelo pêndulo.
      const r = length + CLAW_H;
      return { x: cart.x + Math.sin(theta) * r, y: ANCHOR_Y + Math.cos(theta) * r };
    };

    const draw = () => {
      carriage.style.transform = `translateX(${cart.x - 17}px)`;
      swing.style.transform = `translate(${cart.x}px, ${ANCHOR_Y}px) rotate(${(-theta * 180) / Math.PI}deg)`;
      // O cabo tem 100 px e estica por scaleY: por quadro só transform (sem mexer em height).
      cable.style.transform = `scaleY(${length / 100})`;
      claw.style.transform = `translate(-50%, ${length}px)`;
      const deg = (open * 180) / Math.PI;
      prongRefs.current[0]?.setAttribute("transform", `rotate(${deg} 22 8)`);
      prongRefs.current[1]?.setAttribute("transform", `rotate(${-deg} 22 8)`);
      prize.style.transform = `translate(${prizePos.x - bw / 2}px, ${prizePos.y - bh / 2}px) rotate(${prizePos.rot}deg) scale(${prizePos.scale})`;
    };

    const step = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      timer += dt;

      // Alvo do carrinho conforme a fase.
      if (phase === "idle") cart.target = pointerX ?? homeX();
      else if (phase === "seek") cart.target = prizePos.x;
      else if (phase === "carry" || phase === "drop") cart.target = chuteX();
      const lo = 30;
      const hi = width - 30;
      cart.target = Math.max(lo, Math.min(hi, cart.target));
      // Mola com velocidade máxima: o carrinho acelera e freia, e a garra balança com isso.
      // Carregando o prêmio o carrinho vai mais devagar: balança menos e o botão não bate na parede.
      const speed = phase === "carry" || phase === "drop" ? SPEED * 0.55 : SPEED;
      const want = Math.max(-speed, Math.min(speed, (cart.target - cart.x) * 7));
      const accel = Math.max(-2600, Math.min(2600, (want - cart.v) * 12));
      cart.v += accel * dt;
      cart.x += cart.v * dt;

      // Pêndulo: a aceleração do carrinho empurra a garra para o lado oposto.
      const arm = length + CLAW_H * 0.7 + (phase === "lift" || phase === "carry" ? bh : 0);
      omega += (-(G / arm) * Math.sin(theta) - (accel / arm) * Math.cos(theta) - 2.2 * omega) * dt;
      theta += omega * dt;

      open += (openTarget - open) * (1 - Math.exp(-dt / 0.08));
      const tip = clawTip();
      const grabLength = height - bh - ANCHOR_Y - CLAW_H + 10; // as pontas abraçam o topo do botão

      if (phase === "idle" && grab.current) {
        grab.current = false;
        phase = "seek";
      } else if (phase === "seek") {
        openTarget = 0.85;
        if (Math.abs(cart.x - prizePos.x) < 2 && Math.abs(cart.v) < 20) {
          phase = "lower";
          timer = 0;
        }
      } else if (phase === "lower") {
        length = Math.min(grabLength, length + 300 * dt);
        if (length >= grabLength) {
          phase = "close";
          timer = 0;
        }
      } else if (phase === "close") {
        openTarget = 0.12;
        if (timer > 0.3) {
          phase = "lift";
          timer = 0;
        }
      } else if (phase === "lift" || phase === "carry") {
        length = Math.max(REST_L + 8, length - 240 * dt);
        if (phase === "lift" && length <= REST_L + 8) phase = "carry";
        if (phase === "carry" && Math.abs(cart.x - chuteX()) < 3 && Math.abs(cart.v) < 30) {
          phase = "drop";
          timer = 0;
        }
      } else if (phase === "drop") {
        openTarget = 0.85;
        if (timer > 0.18) {
          // Solto: cai com a velocidade que a garra tinha.
          phase = "fall";
          prizePos.vx = cart.v + Math.cos(theta) * omega * arm * 0.6;
          prizePos.vy = 0;
        }
      }

      if (phase === "lift" || phase === "carry" || phase === "drop") {
        // Preso na garra: o topo do botão fica na ponta das garras, girado pelo pêndulo.
        prizePos.x = tip.x + Math.sin(theta) * (bh / 2 - 8);
        prizePos.y = tip.y + Math.cos(theta) * (bh / 2 - 8);
        prizePos.rot = (-theta * 180) / Math.PI;
        prizePos.x = Math.max(bw / 2 + 4, Math.min(width - bw / 2 - 4, prizePos.x));
      } else if (phase === "fall") {
        prizePos.vy += G * dt;
        prizePos.x += prizePos.vx * dt;
        prizePos.y += prizePos.vy * dt;
        prizePos.rot += prizePos.vx * dt * 0.4;
        // A rampa é um buraco no chão: o botão atravessa e some.
        if (prizePos.y - bh / 2 > height + 4) {
          phase = "respawn";
          timer = 0;
          settings.current.onComplete?.();
        }
      } else if (phase === "respawn") {
        prizePos.x = homeX();
        prizePos.y = height - bh / 2;
        prizePos.rot = 0;
        // Um prêmio novo surge no lugar com um pulinho (ease out back).
        const t = Math.max(0, timer - 0.5);
        const k = Math.min(1, t / 0.35) - 1;
        prizePos.scale = t <= 0 ? 0 : 1 + 2.7 * k * k * k + 1.7 * k * k;
        if (t > 0.5) {
          prizePos.scale = 1;
          phase = "idle";
          openTarget = 0.35;
        }
      }
      if (phase === "idle" || phase === "respawn") length += (REST_L - length) * (1 - Math.exp(-dt / 0.15));

      draw();
      const settled = phase === "idle" && Math.abs(cart.target - cart.x) < 0.5 && Math.abs(cart.v) < 2 && Math.abs(theta) < 0.002 && Math.abs(omega) < 0.01;
      if (settled && pointerX === null) {
        frame = 0;
        last = 0;
        return;
      }
      frame = requestAnimationFrame(step);
    };
    const start = () => {
      if (!frame && !reduced.current && !disabled) frame = requestAnimationFrame(step);
    };
    // Exposto ao clique do botão.
    startRef.current = start;

    const onPointerMove = (event: PointerEvent) => {
      if (reduced.current) return;
      const rect = playground.getBoundingClientRect();
      // Desconta a escala de quem mostra o componente reduzido.
      const px = (event.clientX - rect.left) * (width / (rect.width || 1));
      const py = (event.clientY - rect.top) * (height / (rect.height || 1));
      pointerX = px < 0 || py < 0 || px > width || py > height ? null : px;
      start();
    };
    // Repouso imediato: para o laço e volta carrinho, garra e prêmio para casa. Se havia uma pegada em
    // andamento (pedida ou com o prêmio no ar), avisa onComplete uma vez, como se ele tivesse caído na rampa.
    const rest = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      const pending = grab.current || (phase !== "idle" && phase !== "respawn");
      grab.current = false;
      phase = "idle";
      timer = 0;
      pointerX = null;
      measure();
      cart.x = cart.target = homeX();
      cart.v = 0;
      length = REST_L;
      theta = omega = 0;
      open = openTarget = 0.35;
      prizePos.x = homeX();
      prizePos.y = height - bh / 2;
      prizePos.vx = prizePos.vy = prizePos.rot = 0;
      prizePos.scale = 1;
      draw();
      if (pending) settings.current.onComplete?.();
    };
    // Ligado no meio da pegada, para na hora; desligado, o próximo clique anima de novo.
    const onMotionChange = () => {
      reduced.current = motion.matches;
      if (reduced.current) rest();
    };
    motion.addEventListener("change", onMotionChange);

    const observer = new ResizeObserver(() => {
      measure();
      if (phase === "idle") {
        prizePos.x = homeX();
        prizePos.y = height - bh / 2;
      }
      draw();
    });
    observer.observe(playground);
    draw();
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      motion.removeEventListener("change", onMotionChange);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(frame);
      startRef.current = null;
    };
  }, [disabled]);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || disabled) return;
    if (reduced.current || !startRef.current) {
      onComplete?.();
      return;
    }
    grab.current = true;
    startRef.current();
  };

  const prong = (i: number) => (
    <g
      ref={(el) => {
        prongRefs.current[i] = el;
      }}
    >
      <path
        d={i === 0 ? "M22 8 L11 20 Q8 25 13 31" : "M22 8 L33 20 Q36 25 31 31"}
        fill="none"
        stroke={`url(#${metal})`}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );

  return (
    <div ref={playgroundRef} className={`pointer-events-none absolute inset-0 overflow-hidden ${playgroundClassName}`}>
      {/* trilho de cima, com as pontas */}
      <span aria-hidden="true" className="absolute inset-x-3 h-[6px] rounded-full bg-[linear-gradient(180deg,#5b6687,#262d44)]" style={{ top: RAIL_Y - 3 }} />
      <span aria-hidden="true" className="absolute left-2 h-[12px] w-[6px] rounded-sm bg-[#3a4360]" style={{ top: RAIL_Y - 6 }} />
      <span aria-hidden="true" className="absolute right-2 h-[12px] w-[6px] rounded-sm bg-[#3a4360]" style={{ top: RAIL_Y - 6 }} />
      {/* rampa do prêmio: um buraco no chão com a borda acesa */}
      <span
        ref={chuteRef}
        aria-hidden="true"
        className="absolute bottom-0 h-[12px] rounded-t-md bg-[linear-gradient(180deg,#000,#05070d)] shadow-[inset_0_2px_0_rgb(91_134_255/0.6)]"
        style={chute === "right" ? { right: 14, width: CHUTE_W } : { left: 14, width: CHUTE_W }}
      />
      <span
        ref={chuteLabelRef}
        aria-hidden="true"
        className="absolute bottom-[16px] font-mono text-[9px] tracking-[0.2em] text-[#5b86ff] uppercase"
        style={chute === "right" ? { right: 14, width: CHUTE_W, textAlign: "center" } : { left: 14, width: CHUTE_W, textAlign: "center" }}
      >
        Prize ▾
      </span>
      {/* carrinho no trilho */}
      <span
        ref={carriageRef}
        aria-hidden="true"
        className="absolute left-0 h-[14px] w-[34px] rounded-[4px] border border-[#4a5574] bg-[linear-gradient(180deg,#3a4360,#1b2033)]"
        style={{ top: RAIL_Y - 5 }}
      >
        <span className="absolute top-[4px] left-[6px] h-[3px] w-[3px] rounded-full bg-[#5b86ff] shadow-[0_0_5px_1px_#5b86ff]" />
      </span>
      {/* cabo e garra: giram juntos em volta do ponto de saída do cabo */}
      <span ref={swingRef} aria-hidden="true" className="absolute top-0 left-0 h-0 w-0">
        <span ref={cableRef} className="absolute top-0 left-[-1px] h-[100px] w-[2px] origin-top bg-[linear-gradient(90deg,#5b6687,#c9d2ea,#5b6687)]" style={{ transform: `scaleY(${REST_L / 100})` }} />
        <span ref={clawRef} className="absolute top-0 left-0 h-[36px] w-[44px]" style={{ transform: `translate(-50%, ${REST_L}px)` }}>
          <svg viewBox="0 0 44 36" width={44} height={36} className="overflow-visible">
            <defs>
              <linearGradient id={metal} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#5b6687" />
                <stop offset="0.5" stopColor="#c9d2ea" />
                <stop offset="1" stopColor="#5b6687" />
              </linearGradient>
            </defs>
            {prong(0)}
            {prong(1)}
            <path d="M22 8 L22 26" stroke={`url(#${metal})`} strokeWidth={2.5} strokeLinecap="round" />
            <rect x={15} y={0} width={14} height={10} rx={3} fill="#3a4360" stroke="#5b6687" strokeWidth={0.8} />
            <circle cx={22} cy={5} r={1.6} fill="#5b86ff" />
          </svg>
        </span>
      </span>
      {/* o prêmio: o botão de verdade */}
      <span
        ref={prizeRef}
        className="pointer-events-auto absolute top-0 left-0 inline-flex origin-center"
        style={{ transform: "translate(-200px, -200px)" }}
      >
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

export default ClawButton;
