"use client";

import { useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { PREVIEWS } from "./previews";
import { cn } from "@/lib/utils";

/** Palco do componente: monta de novo a cada Replay para a animação recomeçar do zero. */
export function Preview({ slug, replayLabel, className }: { slug: string; replayLabel: string; className?: string }) {
  const [run, setRun] = useState(0);
  const Component = PREVIEWS[slug];
  return (
    <div className={cn("relative flex min-h-[560px] items-center justify-center overflow-hidden rounded-xl border border-edge bg-shelf p-6", className)}>
      <button
        type="button"
        onClick={() => setRun((n) => n + 1)}
        className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-md border border-edge bg-ink/70 px-2.5 py-1.5 font-mono text-xs text-muted transition-colors hover:text-text"
      >
        <ArrowCounterClockwise size={14} />
        {replayLabel}
      </button>
      {Component ? <Component key={run} /> : null}
    </div>
  );
}
