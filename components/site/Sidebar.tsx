import { Link } from "@/i18n/navigation";
import { CATEGORIES, inCategory, type Locale } from "@/lib/catalog";

/** Índice das categorias e dos componentes, com o atual destacado. */
export function Sidebar({ current, locale, label }: { current?: string; locale: Locale; label: string }) {
  return (
    <nav aria-label={label} className="hidden md:sticky md:top-24 md:block md:self-start">
      {CATEGORIES.map((category) => {
        const items = inCategory(category.id);
        if (!items.length) return null;
        return (
          <div key={category.id} className="mb-6">
            <p className="mb-2 font-mono text-xs tracking-[0.12em] text-muted uppercase">{category.name[locale]}</p>
            <ul className="space-y-1">
              {items.map((item) => {
                const active = item.slug === current;
                return (
                  <li key={item.slug}>
                    <Link
                      href={`/components/${item.slug}`}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                        active ? "bg-shelf-2 text-text" : "text-muted hover:text-text"
                      }`}
                    >
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
