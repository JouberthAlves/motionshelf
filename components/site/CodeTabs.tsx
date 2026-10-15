"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Abas Preview / Code. O código já chega destacado (shiki, no servidor). */
export function CodeTabs({ preview, codeHtml, labels }: { preview: ReactNode; codeHtml: string; labels: { preview: string; code: string } }) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  return (
    <div>
      <div role="tablist" className="mb-3 flex gap-1 border-b border-edge">
        {(["preview", "code"] as const).map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
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
      <div role="tabpanel" hidden={tab !== "preview"}>
        {preview}
      </div>
      <div role="tabpanel" hidden={tab !== "code"}>
        <div className="code max-h-[620px] overflow-auto rounded-xl border border-edge bg-shelf text-[12.5px] leading-relaxed" dangerouslySetInnerHTML={{ __html: codeHtml }} />
      </div>
    </div>
  );
}
