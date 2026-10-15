import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { CATEGORIES, inCategory, type Entry, type Locale } from "@/lib/catalog";

// Classes fixas para o Tailwind achar: a prateleira ocupa tantas colunas quantos componentes tiver.
const SPAN = { 1: "lg:col-span-1", 2: "lg:col-span-2", 3: "lg:col-span-3" } as const;
const COLS = { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3" } as const;

/** Uma prateleira: o nome da categoria, uma linha e os componentes como etiquetas de produto. */
export function Shelf({ title, entries, locale }: { title: string; entries: Entry[]; locale: Locale }) {
  if (!entries.length) return null;
  const n = Math.min(entries.length, 3) as 1 | 2 | 3;
  return (
    <section className={SPAN[n]}>
      <div className="flex items-end gap-4 border-b border-edge pb-3">
        <h2 className="display-wide text-2xl text-text">{title}</h2>
        <span className="pb-1 font-mono text-xs text-muted">{entries.length}</span>
      </div>
      <div className={`grid gap-4 pt-6 sm:grid-cols-2 ${COLS[n]}`}>
        {entries.map((entry) => (
          <Link
            key={entry.slug}
            href={`/components/${entry.slug}`}
            className="group flex flex-col gap-3 rounded-xl border border-edge bg-shelf p-5 transition-colors hover:border-led/70"
          >
            <span className="flex items-center justify-between font-mono text-xs text-muted">
              {entry.code} · React · GSAP
              <ArrowUpRight size={16} className="transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-led-soft" />
            </span>
            <span className="text-lg font-semibold text-text">{entry.name}</span>
            <span className="text-sm text-muted">{entry.summary[locale]}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Todas as prateleiras numa grade de 3 colunas: categorias pequenas dividem a mesma linha. */
export function Shelves({ locale }: { locale: Locale }) {
  return (
    <div className="grid gap-x-4 gap-y-16 lg:grid-cols-3">
      {CATEGORIES.map((category) => (
        <Shelf key={category.id} title={category.name[locale]} entries={inCategory(category.id)} locale={locale} />
      ))}
    </div>
  );
}
