"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ComponentType } from "react";

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
  "add-to-cart": load(() => import("@/registry/motionshelf/add-to-cart/add-to-cart")),
  "plan-toggle": load(() => import("@/registry/motionshelf/plan-toggle/plan-toggle")),
  "offer-countdown": load(() => import("@/registry/motionshelf/offer-countdown/offer-countdown")),
  "review-card": load(() => import("@/registry/motionshelf/review-card/review-card")),
  "map-pin-drop": load(() => import("@/registry/motionshelf/map-pin-drop/map-pin-drop")),
  "order-tracker": load(() => import("@/registry/motionshelf/order-tracker/order-tracker")),
  "slot-booking": load(() => import("@/registry/motionshelf/slot-booking/slot-booking")),
  "sales-funnel": load(() => import("@/registry/motionshelf/sales-funnel/sales-funnel")),
  "roi-balance": load(() => import("@/registry/motionshelf/roi-balance/roi-balance")),
  "page-speed-gauge": load(() => import("@/registry/motionshelf/page-speed-gauge/page-speed-gauge")),
  // Os botões da categoria Buttons ocupam o container posicionado mais próximo: na prévia cada um ganha
  // uma área chapada, sem borda (dentro do palco viraria card dentro de card) e sem brilho de fundo.
  "drone-button": load(() =>
    import("@/registry/motionshelf/drone-button/drone-button").then(({ default: DroneButton }) => ({
      default: function DroneButtonDemo() {
        return (
          <div className="relative h-[300px] w-[520px] max-w-full rounded-lg bg-[#0d0f14]">
            <DroneButton>Book a demo</DroneButton>
          </div>
        );
      },
    })),
  ),
  "claw-button": load(() =>
    import("@/registry/motionshelf/claw-button/claw-button").then(({ default: ClawButton }) => ({
      default: function ClawButtonDemo() {
        return (
          <div className="relative h-[320px] w-[520px] max-w-full rounded-lg bg-[#0d0f14]">
            <ClawButton>Claim your prize</ClawButton>
          </div>
        );
      },
    })),
  ),
  "rocket-button": load(() =>
    import("@/registry/motionshelf/rocket-button/rocket-button").then(({ default: RocketButton }) => ({
      default: function RocketButtonDemo() {
        return (
          <div className="relative h-[360px] w-[520px] max-w-full rounded-lg bg-[#0d0f14]">
            <RocketButton>Launch now</RocketButton>
          </div>
        );
      },
    })),
  ),
  "ufo-button": load(() =>
    import("@/registry/motionshelf/ufo-button/ufo-button").then(({ default: UfoButton }) => ({
      default: function UfoButtonDemo() {
        return (
          <div className="relative h-[340px] w-[520px] max-w-full rounded-lg bg-[#0d0f14]">
            <UfoButton>Take me</UfoButton>
          </div>
        );
      },
    })),
  ),
  "magnet-button": load(() =>
    import("@/registry/motionshelf/magnet-button/magnet-button").then(({ default: MagnetButton }) => ({
      default: function MagnetButtonDemo() {
        return (
          <div className="relative h-[300px] w-[520px] max-w-full rounded-lg bg-[#0d0f14]">
            <MagnetButton>Get attracted</MagnetButton>
          </div>
        );
      },
    })),
  ),
  "letters-button": load(() =>
    import("@/registry/motionshelf/letters-button/letters-button").then(({ default: LettersButton }) => ({
      default: function LettersButtonDemo() {
        return (
          <div className="relative h-[260px] w-[520px] max-w-full rounded-lg bg-[#0d0f14]">
            <LettersButton label="Start free trial" />
          </div>
        );
      },
    })),
  ),
  "bulb-toggle": load(() =>
    import("@/registry/motionshelf/bulb-toggle/bulb-toggle").then(({ default: BulbToggle }) => ({
      default: function BulbToggleDemo() {
        return (
          <div className="relative h-[320px] w-[520px] max-w-full rounded-lg bg-[#0d0f14]">
            <BulbToggle />
          </div>
        );
      },
    })),
  ),
  // Duas ampulhetas lado a lado: uma em loop e outra seguindo um carregamento falso.
  "hourglass-loader": load(() =>
    import("@/registry/motionshelf/hourglass-loader/hourglass-loader").then(({ default: HourglassLoader }) => ({
      default: function HourglassLoaderDemo() {
        const [v, setV] = useState(0);
        useEffect(() => {
          let value = 0;
          let hold = 0; // ms segurando em 100%
          const id = window.setInterval(() => {
            if (value >= 1) {
              hold += 250;
              if (hold >= 1200) {
                value = 0;
                hold = 0;
              }
            } else {
              value = Math.min(1, value + 0.02 + Math.random() * 0.05);
            }
            setV(value);
          }, 250);
          return () => window.clearInterval(id);
        }, []);
        return (
          <div className="relative flex h-[260px] w-[520px] max-w-full items-center justify-center gap-14 rounded-lg bg-[#0d0f14]">
            <div className="flex flex-col items-center">
              <HourglassLoader size={170} />
              <p className="mt-3 text-center font-mono text-xs tabular-nums text-white/60">Loop</p>
            </div>
            <div className="flex flex-col items-center">
              <HourglassLoader size={170} progress={v} />
              <p className="mt-3 text-center font-mono text-xs tabular-nums text-white/60">{Math.round(v * 100)}%</p>
            </div>
          </div>
        );
      },
    })),
  ),
  "origami-button": load(() =>
    import("@/registry/motionshelf/origami-button/origami-button").then(({ default: OrigamiButton }) => ({
      default: function OrigamiButtonDemo() {
        return (
          <div className="relative h-[340px] w-[520px] max-w-full rounded-lg bg-[#0d0f14]">
            <OrigamiButton>Send message</OrigamiButton>
          </div>
        );
      },
    })),
  ),
};
