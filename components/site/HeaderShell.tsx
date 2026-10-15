"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Cabeçalho transparente no topo da página; ganha fundo e borda quando a página rola. */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
        scrolled ? "border-edge/70 bg-ink/80 backdrop-blur-md" : "border-transparent bg-transparent"
      }`}
    >
      {children}
    </header>
  );
}
