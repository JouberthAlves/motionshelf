import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { codeToHtml } from "shiki";

/** Caminho do arquivo do componente, o mesmo que o registry entrega. */
export const sourcePath = (slug: string) => join(process.cwd(), "registry", "motionshelf", slug, `${slug}.tsx`);

export async function highlightedSource(slug: string) {
  const code = await readFile(sourcePath(slug), "utf8");
  return codeToHtml(code, { lang: "tsx", theme: "github-dark-default" });
}

/** URL pública do JSON do registry. A instalação sempre aponta para o site publicado. */
export const registryBase =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://motionshelf-pi.vercel.app");

export const installCommand = (slug: string) => `npx shadcn@latest add ${registryBase}/r/${slug}.json`;
