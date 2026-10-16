"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tab = "preview" | "code" | "prompt";

/** Abas Preview / Code / Prompt. O código já chega destacado (shiki, no servidor). `#prompt` na URL abre a aba Prompt. */
export function CodeTabs({
  preview,
  codeHtml,
  prompt,
  labels,
}: {
  preview: ReactNode;
  codeHtml: string;
  prompt?: ReactNode;
  labels: { preview: string; code: string; prompt?: string };
}) {
  const [tab, setTab] = useState<Tab>("preview");
  const root = useRef<HTMLDivElement>(null);
  const tabs: Tab[] = prompt ? ["preview", "code", "prompt"] : ["preview", "code"];

  useEffect(() => {
    if (!prompt) return;
    const sync = () => {
      if (window.location.hash !== "#prompt") return;
      setTab("prompt");
      root.current?.scrollIntoView({ block: "start" });
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [prompt]);

  return (
    <div ref={root} className="scroll-mt-24">
      <div role="tablist" className="mb-3 flex gap-1 border-b border-edge">
        {tabs.map((id) => (
          <button
            key={id}
            id={`tab-${id}`}
            role="tab"
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              tab === id ? "border-led text-text" : "border-transparent text-muted hover:text-text",
            )}
          >
            {labels[id]}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="panel-preview" aria-labelledby="tab-preview" hidden={tab !== "preview"}>
        {preview}
      </div>
      <div role="tabpanel" id="panel-code" aria-labelledby="tab-code" hidden={tab !== "code"}>
        <div className="code max-h-[620px] overflow-auto rounded-xl border border-edge bg-shelf text-[12.5px] leading-relaxed" dangerouslySetInnerHTML={{ __html: codeHtml }} />
      </div>
      {prompt ? (
        <div role="tabpanel" id="panel-prompt" aria-labelledby="tab-prompt" hidden={tab !== "prompt"}>
          {prompt}
        </div>
      ) : null}
    </div>
  );
}
