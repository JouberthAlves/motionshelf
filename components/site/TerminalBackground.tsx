"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// WebGL só no navegador: sem SSR e com o hero legível enquanto carrega.
const FaultyTerminal = dynamic(() => import("@/components/backgrounds/FaultyTerminal"), { ssr: false });

/** true quando o WebGL2 roda em GPU de verdade (não em renderização por software, como SwiftShader). */
function hasGpu() {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}

/** Fundo do hero: glifos no azul da marca, discretos, com uma área escura no centro que cobre título, texto e botões. */
export function TerminalBackground() {
  // O fundo entra depois que a página fica ociosa, para não disputar CPU com a hidratação e o
  // primeiro paint, e só com GPU de verdade (sem ela o hero fica no preto). Em tela de toque roda
  // a 30 fps; os glifos são blocos grandes, então DPR 1 basta.
  const [ready, setReady] = useState(false);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    const start = () => setReady(hasGpu());
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(start, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(start, 1200);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-90" : "opacity-0"}`}>
        {ready && (
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
            brightness={1}
            glow={0.7}
            mouseReact
            mouseStrength={0.25}
            pageLoadAnimation
            dpr={1}
            maxFps={touch ? 30 : 0}
            className="h-full w-full"
          />
        )}
      </div>
      {/* Escuro só atrás do texto: no celular a camada geral é leve para os glifos manterem a cor. */}
      <div className="absolute inset-0 bg-black/15 sm:bg-black/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_42%_at_50%_50%,rgb(0_0_0/0.88),rgb(0_0_0/0.45)_60%,transparent_90%)] sm:bg-[radial-gradient(ellipse_55%_50%_at_50%_52%,rgb(0_0_0/0.9),rgb(0_0_0/0.5)_55%,transparent_85%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink" />
    </div>
  );
}
