"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

export type DeviceKind = "phone" | "laptop";

// Tamanho da tela de cada aparelho, em px de CSS (é o tamanho em que o componente aparece).
export const SCREEN: Record<DeviceKind, { w: number; h: number }> = {
  phone: { w: 290, h: 520 },
  laptop: { w: 520, h: 325 },
};

// Caixa ocupada pelo aparelho no layout (com folga para a inclinação e a flutuação).
export const BOX: Record<DeviceKind, { w: number; h: number }> = {
  phone: { w: 360, h: 600 },
  laptop: { w: 700, h: 480 },
};

type Screen = ComponentType<{ className?: string }>;
const load = (loader: () => Promise<{ default: Screen }>) =>
  dynamic(loader, { ssr: false, loading: () => <div className="h-full w-full bg-[#0c0d10]" /> });

const COMPONENTS: Record<string, Screen> = {
  "chat-flow": load(() => import("@/registry/motionshelf/chat-flow/chat-flow")),
  "payment-notification": load(() => import("@/registry/motionshelf/payment-notification/payment-notification")),
  "map-pin-drop": load(() => import("@/registry/motionshelf/map-pin-drop/map-pin-drop")),
};

// Classes que tiram a moldura própria do componente, para ele ocupar a tela do aparelho inteira.
const STRIP: Record<string, string> = {
  "chat-flow": "rounded-[34px]! p-0! bg-transparent! shadow-none!",
  "payment-notification": "rounded-[34px]! p-0! bg-transparent! shadow-none!",
  "map-pin-drop": "h-[325px]! max-w-none! rounded-none!",
};

/** O componente ao vivo no tamanho exato da tela do aparelho. */
export function DeviceScreen({ slug, kind }: { slug: string; kind: DeviceKind }) {
  const Component = COMPONENTS[slug];
  const { w, h } = SCREEN[kind];
  return (
    <div style={{ width: w, height: h }} className="relative overflow-hidden bg-black">
      {Component ? <Component className={STRIP[slug]} /> : null}
    </div>
  );
}
