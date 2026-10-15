"use client";

import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";

/** Linha de comando com botão de copiar. */
export function CopyCommand({ command, label }: { command: string; label: { copy: string; copied: string } }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      // Sem permissão de área de transferência: o texto continua selecionável.
    }
  };
  return (
    <div className="flex items-center gap-2 rounded-lg border border-edge bg-shelf py-2 pl-4 pr-2">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[12.5px] text-text">{command}</code>
      <button
        type="button"
        onClick={copy}
        aria-label={done ? label.copied : label.copy}
        className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[11px] text-muted transition-colors hover:bg-shelf-2 hover:text-text"
      >
        {done ? <Check size={14} /> : <Copy size={14} />}
        {done ? label.copied : label.copy}
      </button>
    </div>
  );
}
