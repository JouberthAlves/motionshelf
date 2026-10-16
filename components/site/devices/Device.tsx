"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { hasGpu } from "@/lib/gpu";
import { CssDevice } from "./CssDevice";
import { BOX, DeviceScreen, type DeviceKind } from "./screens";

const Device3D = dynamic(() => import("./Device3D"), { ssr: false });

/**
 * Aparelho com o componente ao vivo na tela. Começa na moldura em CSS, parada; com GPU de verdade e sem
 * movimento reduzido ela passa a flutuar e, no desktop, troca pelo modelo em three.js depois que a
 * página fica ociosa. Sem GPU (computador de empresa com aceleração bloqueada) a moldura fica parada.
 */
export function Device({ kind, slug, side = 0 }: { kind: DeviceKind; slug: string; side?: -1 | 0 | 1 }) {
  const [mode, setMode] = useState<"css" | "3d">("css");
  const [float, setFloat] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !hasGpu()) return;
    setFloat(true);
    if (!desktop) return;
    let cancelled = false;
    const start = () => {
      // Baixa o three.js antes de trocar, para a moldura não sumir enquanto ele carrega.
      import("./Device3D").then(() => {
        if (!cancelled) setMode("3d");
      });
    };
    const id = typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(start, { timeout: 3000 }) : window.setTimeout(start, 1500);
    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(id);
      window.clearTimeout(id);
    };
  }, []);

  const { w, h } = BOX[kind];
  const screen = <DeviceScreen slug={slug} kind={kind} />;
  return (
    <div className="relative" style={{ width: w, height: h }}>
      {mode === "3d" ? (
        <Device3D kind={kind} side={side} screen={screen} onSlow={() => setMode("css")} />
      ) : (
        <CssDevice kind={kind} side={side} float={float}>
          {screen}
        </CssDevice>
      )}
    </div>
  );
}
