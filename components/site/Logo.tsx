import { cn } from "@/lib/utils";

/** Wordmark: MOTIONSHELF em Archivo expandida, apoiado numa prateleira com dois suportes. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex w-fit flex-col items-stretch leading-none", className)}>
      <span className="display-wide text-[15px] tracking-[0.02em] text-text">Motionshelf</span>
      <span aria-hidden className="mt-[3px] block h-[2px] bg-text" />
      <span aria-hidden className="flex justify-between px-[6px]">
        <span className="block h-[4px] w-[2px] bg-text" />
        <span className="block h-[4px] w-[2px] bg-text" />
      </span>
    </span>
  );
}
