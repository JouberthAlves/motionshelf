"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export type PixNotificationProps = {
  /** Amount the counter climbs to. */
  amount?: number;
  /** ISO 4217 currency code. */
  currency?: string;
  /** Locale used to format the amount. */
  locale?: string;
  /** Who sent the payment. */
  sender?: string;
  /** What the payment was for. */
  reference?: string;
  /** Notification title. */
  title?: string;
  /** App name shown on the notification. */
  appName?: string;
  /** Clock on the lock screen. */
  time?: string;
  /** Date line under the clock. */
  date?: string;
  /** Color of the app icon and the check. */
  accent?: string;
  /** Replay forever with a pause between runs. */
  loop?: boolean;
  className?: string;
};

export default function PixNotification({
  amount = 150,
  currency = "USD",
  locale = "en-US",
  sender = "Alex M.",
  reference = "Order #1042",
  title = "Payment received",
  appName = "Bank",
  time = "14:02",
  date = "Saturday, October 18",
  accent = "#1f5bff",
  loop = true,
  className = "",
}: PixNotificationProps) {
  const root = useRef<HTMLDivElement>(null);
  const amountText = useRef<HTMLDivElement>(null);
  const money = new Intl.NumberFormat(locale, { style: "currency", currency });

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const counter = { v: 0 };
      const write = () => {
        if (amountText.current) amountText.current.textContent = money.format(counter.v);
      };
      const tl = gsap.timeline({ repeat: loop ? -1 : 0, repeatDelay: 1.4 });
      tl.set(q("[data-app]"), { autoAlpha: 0 })
        .set(q("[data-notif]"), { y: -110, autoAlpha: 1, scale: 1 })
        .set(q("[data-check-path]"), { strokeDashoffset: 24 })
        .set(q("[data-check]"), { scale: 0 })
        .set(q("[data-from]"), { autoAlpha: 0, y: 10 })
        .set(counter, { v: 0 })
        .add(write, 0)
        .to(q("[data-notif]"), { y: 0, duration: 0.6, ease: "back.out(1.6)" }, 0.6)
        .to(q("[data-notif]"), { scale: 0.97, duration: 0.12, yoyo: true, repeat: 1 }, 2.0)
        .to(q("[data-app]"), { autoAlpha: 1, duration: 0.35 }, 2.3)
        .to(q("[data-check]"), { scale: 1, duration: 0.45, ease: "back.out(2)" }, 2.5)
        .to(q("[data-check-path]"), { strokeDashoffset: 0, duration: 0.4 }, 2.8)
        .to(counter, { v: amount, duration: 1.3, ease: "power2.out", onUpdate: write }, 2.8)
        .to(q("[data-from]"), { autoAlpha: 1, y: 0, duration: 0.4 }, 3.6)
        .to({}, { duration: 1.2 });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.progress(1).pause();
    },
    { scope: root, dependencies: [amount, currency, locale, loop] },
  );

  return (
    <div
      ref={root}
      className={`relative h-[520px] w-[290px] shrink-0 overflow-hidden rounded-[34px] bg-neutral-950 p-[9px] shadow-2xl ${className}`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[26px] bg-linear-to-b from-slate-800 to-slate-950">
        <div className="absolute inset-x-0 top-[70px] text-center text-white">
          <div className="text-6xl font-light tracking-tight">{time}</div>
          <div className="mt-1 text-[13px] opacity-80">{date}</div>
        </div>

        <div
          data-notif
          className="absolute inset-x-[10px] top-3 flex items-start gap-2.5 rounded-2xl bg-white/95 px-3 py-2.5 text-neutral-900 shadow-lg"
        >
          <div
            className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg text-[15px] font-bold text-white"
            style={{ backgroundColor: accent }}
          >
            $
          </div>
          <div className="min-w-0">
            <div className="text-[10.5px] uppercase text-neutral-500">{appName} · now</div>
            <div className="text-[13px] font-semibold">{title}</div>
            <div className="text-[12.5px]">
              {money.format(amount)} from {sender}
            </div>
          </div>
        </div>

        <div
          data-app
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-neutral-50 text-neutral-900"
        >
          <div
            data-check
            className="mb-2 grid h-[58px] w-[58px] place-items-center rounded-full"
            style={{ backgroundColor: accent }}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="#ffffff"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path data-check-path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray={24} strokeDashoffset={24} />
            </svg>
          </div>
          <div className="text-[12px] uppercase tracking-[0.08em] text-neutral-500">{title}</div>
          <div ref={amountText} className="text-[40px] font-bold tabular-nums tracking-tight">
            {money.format(0)}
          </div>
          <div data-from className="text-[13px] text-neutral-600">
            {reference} · {sender}
          </div>
        </div>
      </div>
    </div>
  );
}
