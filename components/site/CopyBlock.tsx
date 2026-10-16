"use client";

import { useState } from "react";
import { CaretDown, Check, Copy } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type Labels = { copy: string; copied: string; showAll: string; showLess: string };

/**
 * Texto de várias linhas (um prompt) com botão de copiar. Começa mostrando só o começo, com um
 * esmaecido e "Mostrar tudo", para não haver rolagem dentro da rolagem da página.
 * `primary` deixa o botão de copiar em destaque (a ação principal da aba).
 */
export function CopyBlock({ text, label, title, primary = false }: { text: string; label: Labels; title: string; primary?: boolean }) {
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      // Sem permissão de área de transferência: o texto continua selecionável.
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-shelf">
      <div className="flex items-center justify-between gap-3 border-b border-edge py-2 pr-2 pl-4">
        <span className="font-mono text-xs tracking-[0.12em] text-muted uppercase">{title}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={`${done ? label.copied : label.copy}: ${title}`}
          className={cn(
            "flex min-h-10 shrink-0 items-center gap-1.5 rounded-md px-3 font-mono text-xs transition-colors",
            primary ? "bg-led text-white hover:bg-led-soft" : "text-muted hover:bg-shelf-2 hover:text-text",
          )}
        >
          {done ? <Check size={14} /> : <Copy size={14} />}
          {done ? label.copied : label.copy}
        </button>
      </div>
      <div className="relative">
        <pre
          className={cn(
            "overflow-hidden p-4 font-mono text-[12.5px] leading-relaxed break-words whitespace-pre-wrap text-text",
            !open && "max-h-[240px]",
          )}
        >
          {text}
        </pre>
        {!open && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-shelf to-transparent" />}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-10 w-full items-center justify-center gap-1.5 border-t border-edge text-xs text-muted transition-colors hover:text-text"
      >
        {open ? label.showLess : label.showAll}
        <CaretDown size={12} className={cn("transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
    </div>
  );
}
