import type { Locale, PropDoc } from "@/lib/catalog";

/** Tabela de props: nome, tipo, padrão e descrição (no idioma da página). */
export function PropsTable({
  props,
  locale,
  labels,
}: {
  props: PropDoc[];
  locale: Locale;
  labels: { name: string; type: string; default: string; description: string };
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-edge">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-shelf text-xs tracking-wider text-muted uppercase">
          <tr>
            <th className="px-4 py-2.5 font-medium">{labels.name}</th>
            <th className="px-4 py-2.5 font-medium">{labels.type}</th>
            <th className="px-4 py-2.5 font-medium">{labels.default}</th>
            <th className="px-4 py-2.5 font-medium">{labels.description}</th>
          </tr>
        </thead>
        <tbody>
          {props.map((prop) => (
            <tr key={prop.name} className="border-t border-edge align-top">
              <td className="px-4 py-3 font-mono text-text">{prop.name}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted">{prop.type}</td>
              <td className="px-4 py-3 font-mono text-xs break-all text-muted">{prop.default}</td>
              <td className="px-4 py-3 text-muted">{prop.description[locale]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
