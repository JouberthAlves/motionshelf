"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export type SearchItem = { slug: string; name: string; group: string; code: string; summary: string };

/** Busca ⌘K: abre pelo atalho ou pelo botão da barra (evento "motionshelf:search"). */
export function CommandMenu({ items }: { items: SearchItem[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("search");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("motionshelf:search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("motionshelf:search", onOpen);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <Command
        label={t("title")}
        loop
        className="w-full max-w-lg overflow-hidden rounded-xl border border-edge bg-shelf text-text shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <Command.Input
          autoFocus
          placeholder={t("placeholder")}
          className="w-full border-b border-edge bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted"
        />
        <Command.List className="max-h-[360px] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted">{t("empty")}</Command.Empty>
          {items.map((item) => (
            <Command.Item
              key={item.slug}
              value={`${item.name} ${item.group} ${item.summary}`}
              onSelect={() => {
                setOpen(false);
                router.push(`/components/${item.slug}`);
              }}
              className="flex cursor-pointer flex-col gap-0.5 rounded-lg px-3 py-2 data-[selected=true]:bg-shelf-2"
            >
              <span className="flex items-center justify-between text-sm font-medium">
                {item.name}
                <span className="font-mono text-[10px] text-muted">{item.code}</span>
              </span>
              <span className="text-xs text-muted">
                {item.group} · {item.summary}
              </span>
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}
