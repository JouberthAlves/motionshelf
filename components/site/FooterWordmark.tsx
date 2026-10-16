"use client";

import { useEffect, useRef } from "react";

const WORD = "MOTIONSHELF";
// Eixo de largura da Archivo: 62 (estreita) a 125 (expandida, a da logo).
const NARROW = 78;
const WIDE = 125;
// Até onde a onda alcança, em larguras de letra.
const REACH = 2.2;

/**
 * A logo gigante do rodapé: uma onda lenta passa pelas letras, alargando e acendendo cada uma por vez
 * (eixo de largura da fonte). Só animação, sem interação: com movimento reduzido, fica parada.
 */
export function FooterWordmark() {
  const box = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = box.current;
    const line = word.current;
    if (!root || !line) return;
    const letters = [...line.querySelectorAll<HTMLSpanElement>("[data-letter]")];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Tamanho da fonte para a palavra, com as letras em repouso (estreitas), ocupar quase toda a largura
    // do rodapé; sobra um pouco para as letras que alargam quando a onda passa.
    const fit = () => {
      letters.forEach((el) => (el.style.fontVariationSettings = `'wdth' ${NARROW}`));
      line.style.fontSize = "100px";
      // Largura das letras (da primeira à última), não da caixa, que ocupa a linha inteira.
      const natural = letters[letters.length - 1].getBoundingClientRect().right - letters[0].getBoundingClientRect().left;
      line.style.fontSize = `${Math.max(40, Math.floor((root.clientWidth * 0.86 * 100) / natural))}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(root);
    if (reduced) return () => ro.disconnect();

    let frame = 0;
    let visible = false;
    let t = 0;
    let last = 0;
    const current = letters.map(() => 0);

    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      t += dt;
      const r = root.getBoundingClientRect();
      const x = (Math.sin(t * 0.55) * 0.5 + 0.5) * r.width;
      letters.forEach((el, i) => {
        const b = el.getBoundingClientRect();
        const center = b.left + b.width / 2 - r.left;
        const d = Math.abs(center - x) / Math.max(b.width, 1);
        const target = Math.max(0, 1 - d / REACH);
        current[i] += (target - current[i]) * (1 - Math.exp(-dt / 0.12));
        const k = current[i];
        el.style.fontVariationSettings = `'wdth' ${Math.round(NARROW + (WIDE - NARROW) * k)}`;
        el.style.color = `rgb(${Math.round(30 + 193 * k)} ${Math.round(35 + 196 * k)} ${Math.round(52 + 203 * k)})`;
        el.style.textShadow = k > 0.55 ? `0 0 ${Math.round(28 * k)}px rgb(31 91 255 / ${(0.55 * k).toFixed(2)})` : "none";
      });
      frame = visible ? requestAnimationFrame(tick) : 0;
    };
    const run = () => {
      if (!frame && visible) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };

    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      run();
    });
    io.observe(root);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div ref={box} aria-hidden="true" className="mx-auto max-w-7xl overflow-hidden px-4 pt-2 pb-10 select-none sm:px-6">
      <div
        ref={word}
        className="font-display leading-[0.82] font-extrabold whitespace-nowrap text-center uppercase"
        style={{ fontSize: 120, color: "rgb(30 35 52)" }}
      >
        {[...WORD].map((ch, i) => (
          <span key={i} data-letter className="inline-block">
            {ch}
          </span>
        ))}
      </div>
      {/* A prateleira da logo, embaixo da palavra. */}
      <div className="mx-auto mt-3 h-[3px] w-[94%] bg-[#1e2334]" />
      <div className="mx-auto flex w-[94%] justify-between px-[3%]">
        <span className="block h-[10px] w-[3px] bg-[#1e2334]" />
        <span className="block h-[10px] w-[3px] bg-[#1e2334]" />
      </div>
    </div>
  );
}
