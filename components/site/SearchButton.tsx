"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";

/** Abre a busca (⌘K). A paleta de comandos entra no passo da busca; por ora só dispara o evento. */
export function SearchButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("motionshelf:search"))}
      aria-label={label}
      className="flex h-9 items-center gap-2 rounded-md border border-edge bg-shelf px-3 text-sm text-muted transition-colors hover:border-led/60 hover:text-text"
    >
      <MagnifyingGlass size={16} aria-hidden="true" />
      <span aria-hidden="true" className="hidden sm:inline">{label}</span>
      <kbd aria-hidden="true" className="hidden rounded border border-edge px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
    </button>
  );
}
