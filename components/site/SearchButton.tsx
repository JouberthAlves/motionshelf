"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";

/** Abre a busca (⌘K). A paleta de comandos entra no passo da busca; por ora só dispara o evento. */
export function SearchButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("motionshelf:search"))}
      aria-label={label}
      className="flex h-9 items-center gap-2 rounded-md border border-white/15 bg-white/[0.06] px-3 text-sm text-text/90 backdrop-blur-sm transition-colors hover:border-led/60 hover:text-white"
    >
      <MagnifyingGlass size={16} aria-hidden="true" />
      <span aria-hidden="true" className="hidden sm:inline">{label}</span>
      <kbd aria-hidden="true" className="hidden rounded border border-white/15 px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
    </button>
  );
}
