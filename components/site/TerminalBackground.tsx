"use client";

import dynamic from "next/dynamic";

// WebGL só no navegador: sem SSR e com o hero legível enquanto carrega.
const FaultyTerminal = dynamic(() => import("@/components/backgrounds/FaultyTerminal"), { ssr: false });

/** Fundo do hero: glifos no azul da marca, discretos, com uma área escura no centro que cobre título, texto e botões. */
export function TerminalBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-90">
        <FaultyTerminal
          tint="#1f5bff"
          scale={1.5}
          gridMul={[2, 1]}
          digitSize={1.2}
          timeScale={0.5}
          scanlineIntensity={0.5}
          glitchAmount={0.8}
          flickerAmount={0.8}
          noiseAmp={1}
          curvature={0.1}
          brightness={0.75}
          mouseReact
          mouseStrength={0.25}
          pageLoadAnimation
          className="h-full w-full"
        />
      </div>
      <div className="absolute inset-0 bg-black/55 sm:bg-black/25" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_62%_58%_at_50%_52%,rgb(0_0_0/0.92),rgb(0_0_0/0.6)_55%,transparent_85%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink" />
    </div>
  );
}
