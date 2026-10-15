"use client";

import dynamic from "next/dynamic";

// WebGL só no navegador: sem SSR e com o hero legível enquanto carrega.
const FaultyTerminal = dynamic(() => import("@/components/backgrounds/FaultyTerminal"), { ssr: false });

/** Fundo do hero: glifos no azul da marca, discretos, com uma área escura no centro para o título. */
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
          brightness={0.9}
          mouseReact
          mouseStrength={0.25}
          pageLoadAnimation
          className="h-full w-full"
        />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_38%_at_50%_42%,rgb(0_0_0/0.85),rgb(0_0_0/0.35)_65%,transparent)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink" />
    </div>
  );
}
