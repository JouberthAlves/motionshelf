"use client";

import { useMemo, useState } from "react";
import { CaretDown, MagnifyingGlass, SquaresFour } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Thumb } from "./Thumb";

export type GalleryItem = { slug: string; name: string; code: string; category: string; categoryName: string; summary: string };
export type GalleryCategory = { id: string; name: string; count: number };

type Labels = {
  title: string;
  intro: string;
  all: string;
  filter: string;
  searchLabel: string;
  category: string;
  getStarted: string;
  introduction: string;
  installation: string;
  agents: string;
  categories: string;
  empty: string;
  count: string;
};

/** Galeria de componentes: barra lateral com categorias, busca e filtro no topo, cards com miniatura ao vivo. */
export function ComponentGallery({ items, categories, labels }: { items: GalleryItem[]; categories: GalleryCategory[]; labels: Labels }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const shown = useMemo(() => {
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      const text = `${item.name} ${item.code} ${item.categoryName} ${item.summary}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [items, query, category]);

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-10 pb-24 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* Barra lateral: só no desktop; no celular a busca e o filtro do topo fazem o mesmo. */}
      <aside className="hidden lg:block">
        <nav aria-label={labels.categories} className="sticky top-24 space-y-8">
          <div>
            <p className="mb-2 font-mono text-xs tracking-[0.12em] text-muted uppercase">{labels.getStarted}</p>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/" className="block rounded-md px-2.5 py-1.5 text-text/85 transition-colors hover:text-text">
                  {labels.introduction}
                </Link>
              </li>
              <li>
                <Link href="/docs/installation" className="block rounded-md px-2.5 py-1.5 text-text/85 transition-colors hover:text-text">
                  {labels.installation}
                </Link>
              </li>
              <li>
                <Link href="/docs/agents" className="block rounded-md px-2.5 py-1.5 text-text/85 transition-colors hover:text-text">
                  {labels.agents}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-mono text-xs tracking-[0.12em] text-muted uppercase">{labels.categories}</p>
            <ul className="space-y-1 text-sm">
              {[{ id: "all", name: labels.all, count: items.length }, ...categories].map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setCategory(c.id)}
                    aria-pressed={category === c.id}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left transition-colors",
                      category === c.id ? "bg-shelf-2 text-text" : "text-text/85 hover:text-text",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {c.id === "all" && <SquaresFour size={15} aria-hidden="true" />}
                      {c.name}
                    </span>
                    <span className="font-mono text-xs text-muted">{c.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </aside>

      <div className="@container min-w-0">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="display-wide text-[clamp(2rem,7cqi,3rem)] text-text">{labels.title}</h1>
            <p className="mt-2 max-w-xl text-sm text-muted">{labels.intro}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] xl:w-[400px] xl:shrink-0">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">{labels.searchLabel}</span>
              <MagnifyingGlass size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                maxLength={60}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={labels.filter}
                className="h-10 w-full rounded-lg border border-edge bg-shelf pr-3 pl-9 text-sm text-text placeholder:text-muted focus:border-led/70 focus:outline-none"
              />
            </label>
            <label className="relative">
              <span className="sr-only">{labels.category}</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full appearance-none rounded-lg border border-edge bg-shelf pr-9 pl-3 text-sm text-text focus:border-led/70 focus:outline-none"
              >
                <option value="all">{labels.all}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <CaretDown size={14} aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
            </label>
          </div>
        </div>

        <p className="mt-6 font-mono text-xs text-muted" aria-live="polite">
          {labels.count.replace("{count}", String(shown.length))}
        </p>

        {shown.length ? (
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/components/${item.slug}`}
                  className="group block rounded-2xl border border-edge bg-shelf p-2 transition-colors hover:border-led/60"
                >
                  <div className="relative">
                    <Thumb slug={item.slug} />
                  </div>
                  <div className="px-2 pt-3 pb-2">
                    <p className="font-semibold text-text transition-colors group-hover:text-white">{item.name}</p>
                    <p className="mt-0.5 font-mono text-xs tracking-[0.12em] text-muted uppercase">{item.categoryName}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-10 rounded-xl border border-dashed border-edge p-8 text-center text-sm text-muted">{labels.empty}</p>
        )}
      </div>
    </div>
  );
}
