import { defineRouting } from "next-intl/routing";

// Só inglês (o site é para devs). Sem prefixo no endereço: /components, não /en/components.
export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
  localePrefix: "never",
});
