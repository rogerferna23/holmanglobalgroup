import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SITE } from "@/lib/config";
import { absUrl, OG_IMAGE } from "@/lib/seo";

type JsonLd = Record<string, unknown>;

type Props = {
  title: string;
  description: string;
  /** Imagen OG/Twitter absoluta. Por defecto el logo del sitio. */
  image?: string;
  type?: "website" | "article" | "profile";
  noindex?: boolean;
  /** JSON-LD específico de la página (se limpia y re-inyecta al cambiar de ruta). */
  jsonLd?: JsonLd | (JsonLd | null)[] | null;
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string, hreflang?: string) {
  const sel = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector<HTMLLinkElement>(sel);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    if (hreflang) el.setAttribute("hreflang", hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Gestiona la metadata por ruta en esta SPA: actualiza de forma idempotente
 * las etiquetas que ya viven en index.html (title, description, OG…) y añade
 * canonical, hreflang y JSON-LD. No duplica etiquetas: busca-o-crea y reescribe.
 */
export function Seo({
  title,
  description,
  image,
  type = "website",
  noindex,
  jsonLd,
}: Props) {
  const { pathname } = useLocation();

  useEffect(() => {
    const url = absUrl(pathname);
    const img = image ?? OG_IMAGE;

    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
    upsertLink("canonical", url);

    // hreflang — mismo árbol en español para US y ES
    upsertLink("alternate", url, "es-ES");
    upsertLink("alternate", url, "es-US");
    upsertLink("alternate", url, "x-default");

    // Open Graph
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:site_name", SITE.name);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", img);
    upsertMeta("property", "og:locale", "es_ES");

    // Twitter
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", img);

    // JSON-LD gestionado: se limpia y re-inyecta en cada ruta (no toca el
    // JSON-LD estático de index.html, que no lleva data-seo-jsonld).
    document.head
      .querySelectorAll('script[data-seo-jsonld="true"]')
      .forEach((n) => n.remove());
    const blocks = (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).filter(
      Boolean
    ) as JsonLd[];
    for (const block of blocks) {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.setAttribute("data-seo-jsonld", "true");
      s.textContent = JSON.stringify(block);
      document.head.appendChild(s);
    }
  }, [pathname, title, description, image, type, noindex, jsonLd]);

  return null;
}
