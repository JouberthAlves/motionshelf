"use client";

import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes } from "react";

export type DroneButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Maximum bank in degrees while the drone flies sideways. */
  maxTilt?: number;
  /** How hard the autopilot chases the pointer. 1 is the default feel; lower drifts, higher snaps. */
  agility?: number;
  /** Kick up dust when the rotor wash reaches the floor. */
  dust?: boolean;
  /** Classes for the playground, which fills the nearest positioned ancestor by default. */
  playgroundClassName?: string;
};

// Ideia do ThrusterButton (Evil Buttons, Apache-2.0), refeita como quadricóptero: em vez de jatos em
// cada lado, o drone só empurra para cima do próprio corpo. Para andar de lado ele inclina, e para
// frear inclina para o outro lado. Física em px e segundos, y para baixo.
const G = 900; // gravidade
const MAX_THRUST = G * 2.1; // empuxo máximo dos motores
const KP = 38; // piloto automático: mola até o cursor…
const KD = 2 * 0.8 * Math.sqrt(KP); // …com amortecimento quase crítico (drone é mais estável que jato)
const SPOOL = 0.09; // s: atraso dos motores (a hélice leva um tempo para girar)
const ATTITUDE = 0.07; // s: atraso para inclinar
const DRAG = 0.6; // arrasto do ar, por segundo
const GROUND = 36; // px: altura em que o efeito solo começa a ajudar a sustentar
const SKID = 7; // altura do trem de pouso
const ARM = 22; // quanto cada braço passa da lateral do botão
const PROP = 17; // meia largura do disco da hélice
const FRAME_TOP = 20; // altura da armação acima do botão (motor e hélice)
const WALL_GAP = 2;
const MAX_PARTICLES = 320;

// Hélice vista de leve por cima: o disco é uma elipse achatada e cada pá gira dando a volta nele.
const TILT = 0.36; // achatamento da elipse
const CX = 20; // centro da hélice no SVG de 40 × 16
const CY = 8;

// Ângulo de repouso: pousadas, as pás ficam na diagonal (alinhadas ao braço, de lado, viravam um palito).
const REST = 0.75;
/** Ângulos da pá de trás e da da frente do motor i (o da direita gira ao contrário). */
function bladeAngles(phase: number, i: number) {
  const dir = i === 0 ? 1 : -1;
  const a = phase * dir + i * 0.9;
  // A pá com o seno positivo está do lado de baixo da elipse, mais perto de quem olha: vai na frente.
  const front = Math.sin(a) > 0 ? a : a + Math.PI;
  return { dir, back: front + Math.PI, front };
}

/**
 * Contorno de uma pá no ângulo a: raiz larga, ponta estreita e arredondada, com uma leve curva para trás
 * no sentido do giro (dir), como a hélice de um drone. r e off são o raio e o desvio lateral no plano.
 */
function bladePath(a: number, dir: number) {
  const pt = (r: number, off: number, sweep: number) => {
    const ang = a - sweep * dir;
    const x = Math.cos(ang) * r - Math.sin(ang) * off * dir;
    const y = Math.sin(ang) * r + Math.cos(ang) * off * dir;
    return `${(CX + x).toFixed(2)} ${(CY + y * TILT).toFixed(2)}`;
  };
  return `M${pt(2, -2, 0)}L${pt(9.5, -3, 0.07)}L${pt(15.6, -1.6, 0.15)}Q${pt(17.4, 0, 0.17)} ${pt(15.6, 1.4, 0.15)}L${pt(9.5, 1.7, 0.09)}L${pt(2, 2, 0)}Z`;
}
/** Ponta azul da pá (a faixa colorida que marca a hélice). */
function tipPath(a: number, dir: number) {
  const at = (r: number, sweep: number) => {
    const ang = a - sweep * dir;
    return `${(CX + Math.cos(ang) * r).toFixed(2)} ${(CY + Math.sin(ang) * r * TILT).toFixed(2)}`;
  };
  return `M${at(13.6, 0.13)}L${at(16.4, 0.16)}`;
}

type Particle = { x: number; y: number; vx: number; vy: number; life: number; energy: number; dust: boolean };

/**
 * Botão carregado por um drone. Fica pousado no chão do container; com o cursor dentro dele, os motores
 * aceleram, o drone decola e voa até o cursor inclinando para os lados; quando o cursor sai, ele desce
 * onde está e desliga as hélices. O vento das hélices levanta poeira quando chega ao chão.
 */
const DroneButton = forwardRef<HTMLButtonElement, DroneButtonProps>(function DroneButton(
  { children, className = "", maxTilt = 24, agility = 1, dust = true, playgroundClassName = "", disabled, type = "button", ...props },
  ref,
) {
  const playgroundRef = useRef<HTMLDivElement>(null);
  const craftRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Por motor: pá de trás e da frente (com a ponta azul), disco borrado, anel da ponta e LED do motor.
  const bladeRefs = useRef<(SVGPathElement | null)[]>([]);
  const tipRefs = useRef<(SVGPathElement | null)[]>([]);
  const discRefs = useRef<(SVGEllipseElement | null)[]>([]);
  const ringRefs = useRef<(SVGEllipseElement | null)[]>([]);
  const ledRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const lightRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const uid = useId().replace(/:/g, "");

  // Lidos ao vivo pelo laço de voo: mudar as props no meio do voo não reinicia nada.
  const settings = useRef({ maxTilt, agility, dust });
  useEffect(() => {
    settings.current = { maxTilt, agility, dust };
  }, [maxTilt, agility, dust]);

  useEffect(() => {
    const playground = playgroundRef.current;
    const craft = craftRef.current;
    if (!playground || !craft || disabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Deslocamento a partir do ponto de pouso (embaixo, no meio); y negativo é no ar.
    const pos = { x: 0, y: 0 };
    const vel = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    let mode: "landed" | "flying" | "landing" = "landed";
    let bank = 0; // rad, positivo inclina para a direita
    let thrust = 0;
    let phase = REST;
    let clock = 0;
    let frame = 0;
    let last = 0;
    let width = 0;
    let height = 0;
    let halfW = 0;
    let halfH = 0;
    const particles: Particle[] = [];
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d") ?? null;
    let dustColor = "#8b93a7";
    let emitDebt = 0;

    const measure = () => {
      width = playground.clientWidth;
      height = playground.clientHeight;
      halfW = craft.offsetWidth / 2;
      halfH = craft.offsetHeight / 2;
      if (canvas && ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const w = Math.max(1, Math.round(width * dpr));
        const h = Math.max(1, Math.round(height * dpr));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        dustColor = getComputedStyle(canvas).color || dustColor;
      }
    };

    // Até onde o drone vai sem bater: conta os braços e as hélices, não só o botão.
    const bounds = () => ({
      reachX: Math.max(0, width / 2 - halfW - ARM - PROP - WALL_GAP),
      ceiling: Math.min(0, -(height - SKID - halfH * 2 - FRAME_TOP - WALL_GAP)),
    });

    const draw = (rpm: number) => {
      const jitter = mode === "landed" ? 0 : rpm * 0.3;
      const jx = (Math.random() - 0.5) * jitter;
      const jy = (Math.random() - 0.5) * jitter;
      craft.style.transform = `translate(calc(-50% + ${pos.x + jx}px), ${Math.min(0, pos.y + jy)}px) rotate(${(bank * 180) / Math.PI}deg)`;
      // Hélices: as pás dão a volta no disco (a da frente passa por cima do eixo, a de trás por baixo) e
      // giram em sentidos opostos, como num drone de verdade. Rápidas, viram um disco borrado com o anel
      // azul das pontas.
      const bladeOpacity = Math.min(1, Math.max(0.24, 1 - (rpm - 0.35) * 1.8));
      const discOpacity = Math.min(0.55, Math.max(0, (rpm - 0.2) * 1.2));
      const ringOpacity = Math.min(0.75, Math.max(0, (rpm - 0.3) * 1.4));
      for (let i = 0; i < 2; i++) {
        const { dir, back, front } = bladeAngles(phase, i);
        const set = (k: number, angle: number, shade: number) => {
          bladeRefs.current[k]?.setAttribute("d", bladePath(angle, dir));
          tipRefs.current[k]?.setAttribute("d", tipPath(angle, dir));
          bladeRefs.current[k]?.setAttribute("opacity", String(bladeOpacity * shade));
          tipRefs.current[k]?.setAttribute("opacity", String(bladeOpacity * shade));
        };
        set(i * 2, back, 0.7);
        set(i * 2 + 1, front, 1);
        discRefs.current[i]?.setAttribute("opacity", String(discOpacity));
        ringRefs.current[i]?.setAttribute("opacity", String(ringOpacity));
      }
      // Luzes de navegação e LED dos motores: acesos com os motores armados; as de navegação piscam.
      const armed = rpm > 0.05;
      ledRefs.current.forEach((led) => {
        if (led) led.style.opacity = armed ? String(0.45 + 0.55 * Math.min(1, rpm * 1.4)) : "0.2";
      });
      const blink = Math.sin(clock * 7) > 0.2 ? 1 : 0.35;
      lightRefs.current.forEach((light) => {
        if (light) light.style.opacity = armed ? String(blink) : "0.25";
      });
    };

    const emit = (dt: number, rpm: number) => {
      if (!ctx || !settings.current.dust || rpm < 0.3) return;
      emitDebt += dt * 110 * rpm;
      const cx = width / 2 + pos.x;
      const cy = height - SKID - halfH + pos.y;
      const cos = Math.cos(bank);
      const sin = Math.sin(bank);
      // Direção "para baixo" do corpo do drone, girada pela inclinação.
      const downX = -sin;
      const downY = cos;
      while (emitDebt >= 1 && particles.length < MAX_PARTICLES) {
        emitDebt -= 1;
        const side = Math.random() < 0.5 ? -1 : 1;
        const ox = side * (halfW + ARM) + (Math.random() - 0.5) * PROP * 1.6;
        const oy = -(halfH + 14);
        const speed = (240 + 300 * rpm) * (0.8 + Math.random() * 0.4);
        particles.push({
          x: cx + ox * cos - oy * sin,
          y: cy + ox * sin + oy * cos,
          vx: downX * speed + (Math.random() - 0.5) * 30,
          vy: downY * speed,
          life: 1,
          energy: 1,
          dust: false,
        });
      }
      if (emitDebt > 1) emitDebt = 0;
    };

    const stepParticles = (dt: number) => {
      if (!ctx) return;
      const floor = height - 1;
      const cx = width / 2 + pos.x;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.dust) {
          // Poeira corre pelo chão, perde força e sobe um pouco.
          p.vx *= Math.exp(-2.4 * dt);
          p.vy = p.vy * Math.exp(-1.5 * dt) - 26 * dt;
          p.life -= dt * 0.9;
        } else {
          // O vento perde força com a distância; se ainda tiver força ao chegar no chão, vira poeira.
          p.energy -= (Math.hypot(p.vx, p.vy) * dt) / 300;
          p.life = p.energy;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (!p.dust && p.y >= floor) {
          if (p.energy < 0.15) {
            particles.splice(i, 1);
            continue;
          }
          const out = Math.sign(p.x - cx) || (Math.random() < 0.5 ? -1 : 1);
          p.dust = true;
          p.y = floor - Math.random() * 3;
          p.vx = out * (90 + Math.random() * 200) * p.energy + p.vx * 0.3;
          p.vy = -Math.random() * 50 * p.energy;
          p.life = 0.5 + p.energy * 0.6;
        }
        if (p.life <= 0 || p.x < -4 || p.x > width + 4 || p.y < -4) particles.splice(i, 1);
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = dustColor;
      for (const p of particles) {
        ctx.globalAlpha = p.dust ? Math.min(1, p.life) * 0.45 : p.life * 0.12;
        const size = p.dust ? 1.6 : 1.2;
        ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    };

    const step = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      clock += dt;
      const { maxTilt: tiltDeg, agility: k } = settings.current;

      if (mode !== "landed") {
        const { reachX, ceiling } = bounds();
        const kp = KP * Math.max(0.2, k);
        const kd = KD * Math.sqrt(Math.max(0.2, k));
        const limit = (tiltDeg * Math.PI) / 180;
        // Velocidade pedida: perto do alvo é a mola de sempre (kp/kd × erro); longe, o máximo que ainda
        // dá para frear a tempo com a inclinação permitida. Sem isso, em trajeto longo ele passava do
        // cursor uns 60 px e voltava.
        const approach = (error: number, brake: number) =>
          Math.sign(error) * Math.min((kp / kd) * Math.abs(error), Math.sqrt(2 * brake * Math.abs(error)));
        const ax = kd * (approach(target.x - pos.x, G * Math.tan(limit) * 0.75) - vel.x);
        // Drone não mergulha em queda livre: desce no máximo com 60% da gravidade.
        const ay = Math.min(G * 0.6, kd * (approach(target.y - pos.y, G * 0.5) - vel.y));
        // Empuxo pedido (a = empuxo + gravidade): o ângulo dele vira a inclinação do corpo.
        const tx = ax;
        const ty = ay - G;
        const want = Math.max(-limit, Math.min(limit, Math.atan2(tx, -ty)));
        bank += (want - bank) * (1 - Math.exp(-dt / ATTITUDE));
        const command = Math.max(0, Math.min(MAX_THRUST, -ty / Math.max(0.3, Math.cos(bank))));
        thrust += (command - thrust) * (1 - Math.exp(-dt / SPOOL));

        // Rajadas leves e efeito solo: perto do chão o próprio vento ajuda a sustentar.
        const gustX = (Math.sin(clock * 1.7) + Math.sin(clock * 2.9 + 1.3)) * 16;
        const gustY = Math.sin(clock * 2.3 + 0.4) * 10;
        const lift = thrust * (1 + 0.12 * Math.max(0, 1 - -pos.y / GROUND));
        vel.x += (lift * Math.sin(bank) + gustX * (thrust / G)) * dt;
        vel.y += (G - lift * Math.cos(bank) + gustY * (thrust / G)) * dt;
        vel.x *= Math.exp(-DRAG * dt);
        vel.y *= Math.exp(-DRAG * dt);
        pos.x += vel.x * dt;
        pos.y += vel.y * dt;

        if (Math.abs(pos.x) > reachX) {
          pos.x = Math.sign(pos.x) * reachX;
          vel.x *= -0.3;
        }
        if (pos.y < ceiling) {
          pos.y = ceiling;
          vel.y *= -0.3;
        }
        if (pos.y > 0) {
          // No chão: o trem de pouso segura e o atrito freia o deslize.
          pos.y = 0;
          if (vel.y > 0) vel.y = 0;
          vel.x *= Math.exp(-8 * dt);
          if (thrust < G) bank *= Math.exp(-dt / 0.05);
        }
        if (mode === "landing" && pos.y > -0.5 && Math.hypot(vel.x, vel.y) < 20) {
          mode = "landed";
          pos.y = 0;
          vel.x = vel.y = 0;
        }
      } else {
        // Pousado: os motores desaceleram até parar e o corpo assenta reto.
        thrust *= Math.exp(-dt / 0.35);
        bank *= Math.exp(-dt / 0.08);
      }

      const rpm = Math.sqrt(Math.min(1, thrust / MAX_THRUST));
      phase += (6 + 75 * rpm) * dt;
      emit(dt, rpm);
      stepParticles(dt);
      draw(rpm);

      if (mode === "landed" && thrust < 4 && particles.length === 0) {
        thrust = 0;
        bank = 0;
        draw(0);
        frame = 0;
        last = 0;
        return;
      }
      frame = requestAnimationFrame(step);
    };

    const start = () => {
      if (frame) return;
      measure();
      frame = requestAnimationFrame(step);
    };

    const land = () => {
      if (mode !== "flying") return;
      // Desce reto de onde estiver, mirando um pouco abaixo do chão: senão o efeito solo deixa o drone
      // pairando 3 px acima dele (é o que o motor de verdade faz ao cortar no fim do pouso).
      mode = "landing";
      target.x = pos.x;
      target.y = 8;
      start();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = playground.getBoundingClientRect();
      measure();
      // Desconta a escala de quem mostra o componente reduzido: o cursor vira px do layout.
      const px = (event.clientX - rect.left) * (width / (rect.width || 1));
      const py = (event.clientY - rect.top) * (height / (rect.height || 1));
      if (px < 0 || py < 0 || px > width || py > height) {
        land();
        return;
      }
      const { reachX, ceiling } = bounds();
      // Leva o centro do botão até o cursor, até onde as paredes deixam.
      target.x = Math.max(-reachX, Math.min(reachX, px - width / 2));
      target.y = Math.max(ceiling, Math.min(0, py - (height - SKID - halfH)));
      mode = "flying";
      start();
    };

    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerType === "touch") land();
    };

    // Mantém o drone pousado dentro do container quando ele muda de tamanho.
    const observer = new ResizeObserver(() => {
      measure();
      const { reachX } = bounds();
      if (Math.abs(pos.x) > reachX) {
        pos.x = Math.sign(pos.x) * reachX;
        if (mode === "landed") draw(0);
      }
    });
    observer.observe(playground);

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    document.documentElement.addEventListener("pointerleave", land);
    window.addEventListener("blur", land);
    return () => {
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      document.documentElement.removeEventListener("pointerleave", land);
      window.removeEventListener("blur", land);
      cancelAnimationFrame(frame);
      ctx?.clearRect(0, 0, width, height);
      craft.style.transform = `translate(calc(-50% + ${pos.x}px), 0px)`;
    };
  }, [disabled]);

  // Um motor com hélice na ponta de cada braço; a luz da esquerda é vermelha e a da direita, verde.
  const rotor = (i: number) => (
    <span
      aria-hidden="true"
      className="absolute bottom-[2px] h-0 w-0"
      style={{ left: i === 0 ? -ARM : `calc(100% + ${ARM}px)` }}
    >
      {/* motor: corpo de metal com o anel de LED azul em cima, e o eixo até a hélice */}
      <span className="absolute bottom-0 left-0 h-[7px] w-[9px] -translate-x-1/2 rounded-t-[3px] bg-[linear-gradient(90deg,#262d44,#6a76a0_42%,#3a4360_70%,#1b2033)]" />
      <span
        ref={(el) => {
          ledRefs.current[i] = el;
        }}
        className="absolute bottom-[6px] left-0 h-[1.5px] w-[9px] -translate-x-1/2 rounded-full bg-[#5b86ff] shadow-[0_0_6px_1px_rgb(91_134_255/0.8)]"
        style={{ opacity: 0.2 }}
      />
      <span className="absolute bottom-[7px] left-0 h-[5px] w-[2px] -translate-x-1/2 bg-[linear-gradient(90deg,#5b6687,#c9d2ea,#5b6687)]" />
      <span
        ref={(el) => {
          lightRefs.current[i] = el;
        }}
        className={`absolute bottom-[1px] h-[3px] w-[3px] -translate-x-1/2 rounded-full ${
          i === 0 ? "left-[-6px] bg-[#ff4d4d] shadow-[0_0_6px_1px_#ff4d4d]" : "left-[6px] bg-[#3ddc84] shadow-[0_0_6px_1px_#3ddc84]"
        }`}
        style={{ opacity: 0.25 }}
      />
      <svg viewBox="0 0 40 16" width={40} height={16} className="absolute bottom-[4px] left-0 -translate-x-1/2 overflow-visible">
        <defs>
          <radialGradient id={`${uid}-disc-${i}`}>
            <stop offset="0" stopColor="#dfe7ff" stopOpacity="0.05" />
            <stop offset="0.55" stopColor="#9fb4ff" stopOpacity="0.28" />
            <stop offset="0.9" stopColor="#5b86ff" stopOpacity="0.4" />
            <stop offset="1" stopColor="#5b86ff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-blade-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a5574" />
            <stop offset="1" stopColor="#161b2b" />
          </linearGradient>
        </defs>
        <ellipse
          ref={(el) => {
            discRefs.current[i] = el;
          }}
          cx={CX}
          cy={CY}
          rx={PROP}
          ry={PROP * TILT}
          fill={`url(#${uid}-disc-${i})`}
          opacity={0}
        />
        <ellipse
          ref={(el) => {
            ringRefs.current[i] = el;
          }}
          cx={CX}
          cy={CY}
          rx={PROP - 1}
          ry={(PROP - 1) * TILT}
          fill="none"
          stroke="#7d9bff"
          strokeWidth={0.7}
          opacity={0}
        />
        {[0, 1].map((k) => {
          const rest = bladeAngles(REST, i);
          const angle = k === 0 ? rest.back : rest.front;
          return (
          <g key={k}>
            <path
              ref={(el) => {
                bladeRefs.current[i * 2 + k] = el;
              }}
              d={bladePath(angle, rest.dir)}
              fill={`url(#${uid}-blade-${i})`}
              stroke="#6a76a0"
              strokeWidth={0.35}
              strokeLinejoin="round"
            />
            <path
              ref={(el) => {
                tipRefs.current[i * 2 + k] = el;
              }}
              d={tipPath(angle, rest.dir)}
              stroke="#5b86ff"
              strokeWidth={1.7}
              strokeLinecap="round"
            />
          </g>
          );
        })}
        {/* porca do eixo, por cima das raízes das pás */}
        <ellipse cx={CX} cy={CY} rx={2.4} ry={1.3} fill="#3a4360" />
        <ellipse cx={CX} cy={CY - 0.4} rx={1.3} ry={0.7} fill="#c9d2ea" />
      </svg>
    </span>
  );

  return (
    <div ref={playgroundRef} className={`pointer-events-none absolute inset-0 overflow-hidden ${playgroundClassName}`}>
      {/* Vento e poeira das hélices; o chão é a borda de baixo. */}
      {dust ? <canvas ref={canvasRef} aria-hidden="true" width={0} height={0} className="absolute inset-0 size-full text-[#8b93a7]" /> : null}
      <span
        ref={craftRef}
        className="pointer-events-auto absolute left-1/2 inline-flex"
        style={{ bottom: SKID, transform: "translate(-50%, 0px)" }}
      >
        {/* armação: braço por cima do botão, de ponta a ponta, com um motor em cada ponta */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-full">
          <span
            className="absolute bottom-0 h-[3px] rounded-full bg-[linear-gradient(180deg,#5b6687,#262d44)]"
            style={{ left: -ARM, right: -ARM }}
          />
          <span className="absolute bottom-0 left-1/2 h-[5px] w-[18px] -translate-x-1/2 rounded-t-[4px] bg-[#262d44]" />
          {rotor(0)}
          {rotor(1)}
        </span>
        <button
          ref={ref}
          type={type}
          disabled={disabled}
          className={`relative inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#2c3552] bg-[#121726] px-5 text-sm font-semibold whitespace-nowrap text-[#dfe7ff] shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_6px_14px_-6px_rgb(0_0_0/0.7)] transition-transform duration-150 outline-none select-none active:scale-95 focus-visible:ring-2 focus-visible:ring-[#1f5bff] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          {...props}
        >
          {children}
        </button>
        {/* trem de pouso: duas pernas inclinadas com o pé apoiado no chão */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-full h-[7px]">
          <span className="absolute top-0 left-[22%] h-[7px] w-[2px] -skew-x-[20deg] bg-[#3a4360]" />
          <span className="absolute top-0 right-[22%] h-[7px] w-[2px] skew-x-[20deg] bg-[#3a4360]" />
          <span className="absolute bottom-0 left-[14%] h-[2px] w-[14%] rounded-full bg-[#5b6687]" />
          <span className="absolute right-[14%] bottom-0 h-[2px] w-[14%] rounded-full bg-[#5b6687]" />
        </span>
      </span>
    </div>
  );
});

export default DroneButton;
