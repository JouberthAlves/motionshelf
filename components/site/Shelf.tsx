import { Link } from "@/i18n/navigation";
import type { Entry, Locale } from "@/lib/catalog";

/** Uma prateleira: o nome da categoria, uma linha e os componentes como etiquetas de produto. */
export function Shelf({ title, entries, locale }: { title: string; entries: Entry[]; locale: Locale }) {
  if (!entries.length) return null;
  return (
    <section className="mt-16 first:mt-0">
      <div className="flex items-end gap-4 border-b border-edge pb-3">
        <h2 className="display-wide text-2xl text-text">{title}</h2>
        <span className="pb-1 font-mono text-xs text-muted">{entries.length}</span>
      </div>
      <div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <Link
            key={entry.slug}
            href={`/components/${entry.slug}`}
            className="group flex flex-col gap-3 rounded-xl border border-edge bg-shelf p-5 transition-colors hover:border-led/70"
          >
            <span className="font-mono text-[11px] text-led-soft">{entry.code} · React · GSAP</span>
            <span className="text-lg font-semibold text-text">{entry.name}</span>
            <span className="text-sm text-muted">{entry.summary[locale]}</span>
            <span className="mt-auto font-mono text-xs text-muted transition-colors group-hover:text-text">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
