import type { Metadata } from "next";
import { registryBase } from "@/lib/code";
import type { Locale } from "@/lib/catalog";

/** Endereço público do site: o mesmo do registry. */
export const siteUrl = registryBase;

/** Imagem de compartilhamento (1200x630), a mesma em todas as páginas. */
const OG_IMAGE = {
  url: "/og.jpg",
  width: 1200,
  height: 630,
  alt: "Motionshelf: animated React components on showroom pedestals, a chat flow, a map pin and a Pix payment notification.",
};

/**
 * Metadata de uma página: título, descrição, canônico e a mesma página no outro idioma
 * (path sem o prefixo do idioma, ex. "/components/pix-notification"; "" é a home).
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: Locale;
  path: string;
  title?: string;
  description: string;
}): Metadata {
  return {
    ...(title ? { title } : {}),
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: { en: `/en${path}`, "pt-BR": `/pt${path}`, "x-default": `/en${path}` },
    },
    openGraph: {
      type: "website",
      siteName: "Motionshelf",
      locale: locale === "pt" ? "pt_BR" : "en_US",
      url: `/${locale}${path}`,
      ...(title ? { title: `${title} · Motionshelf` } : {}),
      description,
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", images: [OG_IMAGE] },
  };
}
