"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { Trophy } from "@phosphor-icons/react";

// Cliques na logo para desbloquear; um intervalo maior que GAP entre dois cliques zera a contagem.
const CLICKS = 15;
const GAP = 1500;

/** Dois tons curtos, sintetizados na hora (sem arquivo de áudio). */
function chime() {
  try {
    const ctx = new AudioContext();
    [
      [660, 0],
      [990, 0.12],
    ].forEach(([freq, at]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + at);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + 0.55);
    });
    window.setTimeout(() => ctx.close(), 1000);
  } catch {
    // Sem áudio no navegador: a conquista aparece em silêncio.
  }
}

/**
 * Easter egg: 15 cliques seguidos na logo desbloqueiam uma conquista no estilo dos consoles. O círculo
 * com o troféu aparece, a barra abre para o lado, mostra "Achievement unlocked" e depois o nome, e fecha.
 */
export function LogoAchievement({ children }: { children: React.ReactNode }) {
  const count = useRef(0);
  const last = useRef(0);
  const [open, setOpen] = useState(false);
  const toast = useRef<HTMLDivElement>(null);

  const onClick = () => {
    const now = performance.now();
    count.current = now - last.current > GAP ? 1 : count.current + 1;
    last.current = now;
    if (count.current >= CLICKS && !open) {
      count.current = 0;
      setOpen(true);
    }
  };

  useEffect(() => {
    if (!open || !toast.current) return;
    const q = gsap.utils.selector(toast.current);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    chime();
    if (reduced) {
      const tl = gsap
        .timeline({ onComplete: () => setOpen(false) })
        .set(q("[data-bar]"), { width: "auto" })
        .set(q("[data-line1]"), { autoAlpha: 0 })
        .fromTo(toast.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 })
        .to(toast.current, { autoAlpha: 0, duration: 0.3 }, "+=4");
      return () => {
        tl.kill();
      };
    }
    const tl = gsap
      .timeline({ onComplete: () => setOpen(false) })
      .set(q("[data-bar]"), { width: 64 })
      .set(q("[data-text]"), { autoAlpha: 0 })
      .set(q("[data-line2]"), { autoAlpha: 0, y: 14 })
      .fromTo(q("[data-orb]"), { scale: 0, rotate: -90 }, { scale: 1, rotate: 0, duration: 0.45, ease: "back.out(2.2)" })
      .to(q("[data-bar]"), { width: 340, duration: 0.5, ease: "expo.out" }, "+=0.15")
      .to(q("[data-text]"), { autoAlpha: 1, duration: 0.25 }, "-=0.2")
      .to(q("[data-line1]"), { autoAlpha: 0, y: -14, duration: 0.3, ease: "power2.in" }, "+=1.4")
      .to(q("[data-line2]"), { autoAlpha: 1, y: 0, duration: 0.35, ease: "expo.out" })
      .fromTo(q("[data-orb]"), { boxShadow: "0 0 0 0 rgb(91 134 255 / 0.8)" }, { boxShadow: "0 0 0 14px rgb(91 134 255 / 0)", duration: 0.8 }, "<")
      .to(q("[data-text]"), { autoAlpha: 0, duration: 0.2 }, "+=3")
      .to(q("[data-bar]"), { width: 64, duration: 0.4, ease: "expo.in" })
      .to(q("[data-orb]"), { scale: 0, duration: 0.3, ease: "back.in(2)" });
    return () => {
      tl.kill();
    };
  }, [open]);

  return (
    <>
      <span onClick={onClick}>{children}</span>
      {open &&
        createPortal(
          <div
            ref={toast}
            role="status"
            aria-live="polite"
            className="pointer-events-none fixed bottom-8 left-1/2 z-[110] -translate-x-1/2"
          >
            <div
              data-bar
              className="relative flex h-16 items-center overflow-hidden rounded-full border border-white/10 bg-[#15171c]/95 shadow-[0_10px_40px_rgb(0_0_0/0.6)]"
            >
              <div
                data-orb
                className="absolute top-1 left-1 grid size-14 place-items-center rounded-full bg-gradient-to-b from-led-soft to-led text-white"
              >
                <Trophy size={28} weight="fill" />
              </div>
              <div data-text className="relative ml-[76px] h-10 w-[248px] overflow-hidden whitespace-nowrap">
                <p data-line1 className="absolute inset-x-0 top-0 text-xs text-muted">
                  Achievement unlocked
                  <span className="block text-base font-semibold text-white">Motionshelf</span>
                </p>
                <p data-line2 className="absolute inset-x-0 top-0 text-xs text-muted">
                  15G · Logo whisperer
                  <span className="block text-base font-semibold text-white">You clicked the logo 15 times</span>
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
