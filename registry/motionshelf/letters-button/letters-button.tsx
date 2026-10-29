"use client";

import { forwardRef, useEffect, useMemo, useRef, type ButtonHTMLAttributes } from "react";

export type LettersButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  /** The button text. Each letter is drawn on its own and falls when the pointer hovers the button. */
  label: string;
  /** Classes for the playground, which fills the nearest positioned ancestor by default. */
  playgroundClassName?: string;
};

// As letras do botão são soltas uma a uma quando o cursor entra: pulam, caem, quicam no chão do container
// e esbarram umas nas outras. Quando o cursor sai, cada uma volta para a sua casa presa por uma mola.
// O botão guarda as casas com letras invisíveis (que também dão a largura dele); as letras que se mexem
// ficam numa camada à parte. px e segundos, y para baixo.
const G = 1900; // gravidade
const BOUNCE = 0.35; // restituição no chão e nas paredes
const LETTER_BOUNCE = 0.2; // restituição entre letras
const FLOOR_FRICTION = 0.88; // vx multiplicado a cada quique no chão
const REST_FRICTION = 5; // atrito por segundo quando a letra já está só apoiada (sem quicar)
const REST_SPEED = 40; // abaixo disso o impacto não quica mais, a letra só se apoia
const SPIN_DAMP = 4; // amortecimento do giro enquanto encosta em algo
const STAGGER = 0.035; // s entre uma letra e a próxima ao cair
const RETURN_DELAY = 0.15; // s entre o cursor sair e as letras voltarem
const TOUCH_RETURN = 1.6; // s entre soltar o dedo e as letras voltarem
const K = 180; // mola de volta para casa…
const C = 2 * Math.sqrt(K) * 0.7; // …com amortecimento um pouco abaixo do crítico
const MAX_LETTERS = 40;
const MAX_STEP = 1 / 120; // passo máximo da física, para a colisão não atravessar

type Phase = "home" | "wait" | "fall" | "spring";

type Letter = {
  el: HTMLSpanElement;
  marker: HTMLSpanElement;
  w: number;
  h: number;
  r: number;
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  av: number;
  phase: Phase;
  releaseT: number;
  returnT: number;
  touch: boolean;
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Botão cujas letras caem quando o cursor passa e voltam para o lugar quando ele sai. */
const LettersButton = forwardRef<HTMLButtonElement, LettersButtonProps>(function LettersButton(
  { label, className = "", playgroundClassName = "", disabled, type = "button", ...props },
  ref,
) {
  const playgroundRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const markerRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const chars = useMemo(() => Array.from(label), [label]);

  useEffect(() => {
    const playground = playgroundRef.current;
    const wrap = wrapRef.current;
    if (!playground || !wrap) return;
    // Movimento reduzido acompanhado ao vivo (ver onMotionChange, mais abaixo).
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches;

    const letters: Letter[] = [];
    chars.forEach((ch, i) => {
      const marker = markerRefs.current[i];
      const el = letterRefs.current[i];
      if (!marker || !el || ch.trim() === "") return;
      letters.push({
        el,
        marker,
        w: 0,
        h: 0,
        r: 0,
        hx: 0,
        hy: 0,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        a: 0,
        av: 0,
        phase: "home",
        releaseT: 0,
        returnT: -1,
        touch: false,
      });
    });

    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;
    let restT = 0;
    let touching = false;

    const render = (l: Letter) => {
      l.el.style.transform = `translate(${l.x - l.w / 2}px, ${l.y - l.h / 2}px) rotate(${l.a}rad)`;
    };

    // Casa de cada letra: onde a letra invisível está dentro do playground, em px do layout (sem a escala
    // de quem mostra o componente reduzido). Letras em casa são recolocadas, as soltas só trocam de alvo.
    const measure = () => {
      width = playground.clientWidth;
      height = playground.clientHeight;
      const box = playground.getBoundingClientRect();
      const sx = box.width / (width || 1) || 1;
      const sy = box.height / (height || 1) || 1;
      for (const l of letters) {
        const rect = l.marker.getBoundingClientRect();
        l.w = l.marker.offsetWidth;
        l.h = l.marker.offsetHeight;
        l.r = 0.5 * Math.max(l.w, l.h);
        l.hx = (rect.left - box.left) / sx + l.w / 2;
        l.hy = (rect.top - box.top) / sy + l.h / 2;
        if (l.phase === "home") {
          l.x = l.hx;
          l.y = l.hy;
          l.a = 0;
        }
        render(l);
        l.el.style.opacity = "1";
      }
    };

    const physics = (h: number) => {
      for (const l of letters) {
        if (l.phase !== "fall") continue;
        l.touch = false;
        l.vy += G * h;
        l.x += l.vx * h;
        l.y += l.vy * h;
        l.a += l.av * h;
      }

      // Colisão entre letras, como círculos de massas iguais.
      for (let i = 0; i < letters.length; i++) {
        const p = letters[i];
        if (p.phase !== "fall") continue;
        for (let j = i + 1; j < letters.length; j++) {
          const q = letters[j];
          if (q.phase !== "fall") continue;
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const min = p.r + q.r;
          const d2 = dx * dx + dy * dy;
          if (d2 >= min * min) continue;
          const d = Math.sqrt(d2);
          const nx = d > 1e-6 ? dx / d : 1;
          const ny = d > 1e-6 ? dy / d : 0;
          const push = (min - d) / 2;
          p.x -= nx * push;
          p.y -= ny * push;
          q.x += nx * push;
          q.y += ny * push;
          const vn = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
          if (vn < 0) {
            const j2 = (-(1 + LETTER_BOUNCE) * vn) / 2;
            p.vx -= j2 * nx;
            p.vy -= j2 * ny;
            q.vx += j2 * nx;
            q.vy += j2 * ny;
          }
          p.touch = true;
          q.touch = true;
        }
      }

      for (const l of letters) {
        if (l.phase === "fall") {
          // Paredes e chão: a letra é um círculo de raio r.
          if (width < 2 * l.r) {
            l.x = width / 2;
          } else if (l.x < l.r) {
            l.x = l.r;
            if (l.vx < 0) l.vx *= -BOUNCE;
          } else if (l.x > width - l.r) {
            l.x = width - l.r;
            if (l.vx > 0) l.vx *= -BOUNCE;
          }
          if (l.y > height - l.r) {
            l.y = height - l.r;
            if (l.vy > 0) {
              if (l.vy < REST_SPEED) {
                l.vy = 0;
                l.vx *= Math.exp(-REST_FRICTION * h);
              } else {
                l.vy *= -BOUNCE;
                l.vx *= FLOOR_FRICTION;
              }
            }
            l.touch = true;
          }
          if (l.touch) l.av *= Math.exp(-SPIN_DAMP * h);
        } else if (l.phase === "spring") {
          // Mola na posição e na rotação (o ângulo já foi normalizado para o caminho curto).
          l.vx += (K * (l.hx - l.x) - C * l.vx) * h;
          l.vy += (K * (l.hy - l.y) - C * l.vy) * h;
          l.av += (K * (0 - l.a) - C * l.av) * h;
          l.x += l.vx * h;
          l.y += l.vy * h;
          l.a += l.av * h;
        }
      }
    };

    const step = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;

      // Relógios: a fila de queda e o atraso para voltar.
      for (const l of letters) {
        if (l.phase === "wait") {
          l.releaseT -= dt;
          if (l.releaseT <= 0) {
            l.phase = "fall";
            l.vx = rand(-70, 70);
            l.vy = rand(-120, -30);
            l.av = rand(-7, 7);
          }
        } else if (l.phase === "fall" && l.returnT >= 0) {
          l.returnT -= dt;
          if (l.returnT <= 0) {
            l.returnT = -1;
            l.phase = "spring";
            // Gira pelo caminho curto de volta a 0.
            l.a -= Math.PI * 2 * Math.round(l.a / (Math.PI * 2));
          }
        }
      }

      const n = Math.ceil(dt / MAX_STEP);
      for (let i = 0; i < n; i++) physics(dt / n);

      let busy = false;
      let falling = 0;
      let resting = true;
      for (const l of letters) {
        if (l.phase === "spring") {
          if (
            Math.hypot(l.hx - l.x, l.hy - l.y) < 0.2 &&
            Math.hypot(l.vx, l.vy) < 1 &&
            Math.abs(l.a) < 0.01 &&
            Math.abs(l.av) < 0.05
          ) {
            l.phase = "home";
            l.x = l.hx;
            l.y = l.hy;
            l.a = 0;
            l.vx = l.vy = l.av = 0;
          } else {
            busy = true;
          }
        } else if (l.phase === "wait") {
          busy = true;
        } else if (l.phase === "fall") {
          falling++;
          if (l.returnT >= 0) busy = true;
          if (Math.hypot(l.vx, l.vy) >= 4 || Math.abs(l.av) >= 0.05) resting = false;
        }
        render(l);
      }

      restT = !busy && falling > 0 && resting ? restT + dt : 0;
      const settled = !busy && (falling === 0 || restT >= 0.3);
      if (settled) {
        for (const l of letters) {
          if (l.phase !== "fall") continue;
          l.vx = l.vy = l.av = 0;
        }
        restT = 0;
        frame = 0;
        last = 0;
        return;
      }
      frame = requestAnimationFrame(step);
    };

    const start = () => {
      if (frame) return;
      last = 0;
      frame = requestAnimationFrame(step);
    };

    // Solta as letras em fila. As que ainda voltavam (ou já estavam no ar) caem de onde estiverem.
    const drop = () => {
      letters.forEach((l, i) => {
        l.returnT = -1;
        if (i >= MAX_LETTERS) return;
        if (l.phase === "home") {
          l.phase = "wait";
          l.releaseT = i * STAGGER;
        } else if (l.phase === "spring") {
          l.phase = "fall";
        }
      });
      start();
    };

    const release = (delay: number) => {
      for (const l of letters) {
        // Quem ainda esperava a vez de cair nunca saiu de casa.
        if (l.phase === "wait") l.phase = "home";
        else if (l.phase === "fall") l.returnT = delay;
      }
      start();
    };

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && !reduced) drop();
    };
    const onLeave = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && !reduced) release(RETURN_DELAY);
    };
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch" || reduced) return;
      touching = true;
      drop();
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerType !== "touch" || !touching) return;
      touching = false;
      release(TOUCH_RETURN);
    };

    // Repouso imediato: para o laço e põe cada letra de volta na casa, reta e parada (rótulo legível).
    const rest = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      restT = 0;
      touching = false;
      for (const l of letters) {
        l.phase = "home";
        l.returnT = -1;
        l.vx = l.vy = l.av = 0;
      }
      measure();
    };
    // Ligado com as letras no chão, elas voltam na hora; desligado, o próximo hover derruba de novo.
    const onMotionChange = () => {
      reduced = motion.matches;
      if (reduced) rest();
    };
    motion.addEventListener("change", onMotionChange);

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(playground);
    observer.observe(wrap);
    let cancelled = false;
    // Quando a fonte chega a largura das letras muda, então as casas mudam.
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });

    // Desabilitado: as letras ficam nas casas e só o botão funciona. Com movimento reduzido os ouvintes
    // ficam ligados, mas cada um confere a preferência na hora e não faz nada.
    if (!disabled) {
      wrap.addEventListener("pointerenter", onEnter, { passive: true });
      wrap.addEventListener("pointerleave", onLeave, { passive: true });
      wrap.addEventListener("pointerdown", onDown, { passive: true });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    }
    return () => {
      motion.removeEventListener("change", onMotionChange);
      cancelled = true;
      observer.disconnect();
      wrap.removeEventListener("pointerenter", onEnter);
      wrap.removeEventListener("pointerleave", onLeave);
      wrap.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      cancelAnimationFrame(frame);
    };
  }, [chars, disabled]);

  return (
    <div className={"pointer-events-none absolute inset-0 overflow-hidden " + playgroundClassName} ref={playgroundRef}>
      {/* O botão fica um pouco acima do meio: as letras caem dele até o chão, sem se amontoar em cima dele. */}
      <span ref={wrapRef} className="pointer-events-auto absolute top-[38%] left-1/2 inline-flex" style={{ transform: "translate(-50%, -50%)" }}>
        <button
          ref={ref}
          type={type}
          disabled={disabled}
          className={`relative inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#2c3552] bg-[#121726] px-5 text-sm font-semibold whitespace-nowrap text-[#dfe7ff] shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_6px_14px_-6px_rgb(0_0_0/0.7)] transition-transform duration-150 outline-none select-none active:scale-95 focus-visible:ring-2 focus-visible:ring-[#1f5bff] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          {...props}
          aria-label={label}
        >
          {/* linha de medição: invisível, dá a largura ao botão e marca a casa de cada letra */}
          <span aria-hidden="true" className="inline-flex">
            {chars.map((ch, i) => (
              <span
                key={i}
                ref={(el) => {
                  markerRefs.current[i] = el;
                }}
                aria-hidden="true"
                className="inline-block whitespace-pre"
                style={{ opacity: 0 }}
              >
                {ch.trim() === "" ? " " : ch}
              </span>
            ))}
          </span>
        </button>
      </span>
      {/* letras visíveis: mesma fonte da linha de medição, então caem exatamente em cima dela */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {chars.map((ch, i) =>
          ch.trim() === "" ? null : (
            <span
              key={i}
              ref={(el) => {
                letterRefs.current[i] = el;
              }}
              className="absolute top-0 left-0 inline-block text-sm font-semibold whitespace-pre text-[#dfe7ff]"
              style={{ opacity: 0 }}
            >
              {ch}
            </span>
          ),
        )}
      </div>
    </div>
  );
});

export default LettersButton;
