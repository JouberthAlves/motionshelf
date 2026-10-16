"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

// Um preview por slug, carregado só no navegador (cada componente traz o próprio GSAP).
const load = (loader: () => Promise<{ default: ComponentType }>) =>
  dynamic(loader, {
    ssr: false,
    loading: () => <div className="h-[200px] w-full animate-pulse rounded-lg bg-shelf-2" />,
  });

export const PREVIEWS: Record<string, ComponentType> = {
  "title-reveal": load(() => import("@/registry/motionshelf/title-reveal/title-reveal")),
  "rotating-word": load(() => import("@/registry/motionshelf/rotating-word/rotating-word")),
  // No palco escuro do site, o azul claro da marca: o #1f5bff padrão fica abaixo de 4,5:1 em texto de 16px.
  "before-after-text": load(() =>
    import("@/registry/motionshelf/before-after-text/before-after-text").then(({ default: BeforeAfterText }) => ({
      default: function BeforeAfterOnDark() {
        return <BeforeAfterText accent="#5b86ff" />;
      },
    })),
  ),
  "chat-flow": load(() => import("@/registry/motionshelf/chat-flow/chat-flow")),
  "question-typer": load(() => import("@/registry/motionshelf/question-typer/question-typer")),
  "appointment-reminder": load(() => import("@/registry/motionshelf/appointment-reminder/appointment-reminder")),
  "payment-notification": load(() => import("@/registry/motionshelf/payment-notification/payment-notification")),
  "search-ad": load(() => import("@/registry/motionshelf/search-ad/search-ad")),
  "map-pin-drop": load(() => import("@/registry/motionshelf/map-pin-drop/map-pin-drop")),
  "slot-booking": load(() => import("@/registry/motionshelf/slot-booking/slot-booking")),
  "sales-funnel": load(() => import("@/registry/motionshelf/sales-funnel/sales-funnel")),
  "roi-balance": load(() => import("@/registry/motionshelf/roi-balance/roi-balance")),
  "page-speed-gauge": load(() => import("@/registry/motionshelf/page-speed-gauge/page-speed-gauge")),
};
