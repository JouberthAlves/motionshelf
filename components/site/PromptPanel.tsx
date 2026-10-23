import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import type { Technique } from "@/lib/prompts";
import { CopyBlock } from "./CopyBlock";

type Labels = {
  intro: string;
  needs: string;
  optional: string;
  claudeTitle: string;
  otherTitle: string;
  otherIntro: string;
  learnMore: string;
  copy: string;
  copied: string;
  showAll: string;
  showLess: string;
};

/**
 * Aba "Prompt": o que pedir ao Claude Code para recriar o componente (ação principal, em destaque)
 * e, recolhida, a versão para outros agentes.
 */
export function PromptPanel({ claude, other, technique, labels }: { claude: string; other: string; technique: Technique; labels: Labels }) {
  const block = { copy: labels.copy, copied: labels.copied, showAll: labels.showAll, showLess: labels.showLess };
  const skill = technique === "anatomy" ? "anatomy" : technique === "physics" ? "React · requestAnimationFrame" : "GSAP skills";

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="max-w-2xl text-sm text-muted">{labels.intro}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono tracking-[0.12em] text-muted uppercase">{labels.needs}</span>
          <span className="rounded-md border border-led/50 bg-led/10 px-2 py-0.5 font-mono text-text">{skill}</span>
          <span className="rounded-md border border-edge px-2 py-0.5 font-mono text-muted">HyperFrames · {labels.optional}</span>
        </div>
      </div>

      <CopyBlock text={claude} label={block} title={labels.claudeTitle} primary />

      <details className="group rounded-xl border border-edge">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-sm font-semibold text-text">{labels.otherTitle}</span>
            <span className="mt-0.5 block text-xs text-muted">{labels.otherIntro}</span>
          </span>
          <CaretDown size={14} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t border-edge p-3">
          <CopyBlock text={other} label={block} title={labels.otherTitle} />
        </div>
      </details>

      <p className="text-sm">
        <Link href="/docs/agents" className="text-led-soft transition-colors hover:text-text">
          {labels.learnMore} →
        </Link>
      </p>
    </div>
  );
}
