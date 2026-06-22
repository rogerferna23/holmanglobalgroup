import { SITE } from "./config";

/** Convierte una ruta relativa en URL absoluta canónica (dominio de SITE.url). */
export function absUrl(path = "/"): string {
  const base = SITE.url.replace(/\/$/, "");
  if (!path || path === "/") return `${base}/`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Imagen OG por defecto, absoluta (los bots sociales no resuelven rutas relativas). */
export const OG_IMAGE = absUrl("/logo-h.png");

export type PageSeo = {
  title: string;
  description: string;
};

/**
 * SEO por página. Las descripciones de home/historia/tienda provienen
 * literalmente de la Auditoría SEO HGG 2026.
 */
export const PAGE_SEO = {
  home: {
    title: "Holman Global Group | Propósito, Marca y Sistema",
    description:
      "Coaching expansivo, branding y sistemas digitales para vivir de lo que amas.",
  },
  historia: {
    title: "Nuestra Historia — Holman Global Group",
    description:
      "Conoce el origen de Holman Global Group y la filosofía Corazón de Elefante: propósito, marca y sistema para personas que quieren vivir diferente.",
  },
  tienda: {
    title: "Tienda — Coaching, Branding y LLC | Holman Global Group",
    description:
      "Sesiones de coaching, paquetes de branding, creación de LLC y sistemas de marketing digital. Elige el servicio que se ajusta a tu momento.",
  },
  blog: {
    title: "Blog — Holman Global Group",
    description:
      "Ideas sobre propósito, marca y sistemas digitales para vivir de lo que amas. Próximamente, artículos de Holman Global Group.",
  },
} satisfies Record<string, PageSeo>;

type JsonLd = Record<string, unknown>;

/**
 * Schema Person para /historia. Solo se emite si SITE.founder está relleno
 * (si no, devuelve null y no se inyecta nada).
 */
export function personLd(): JsonLd | null {
  if (!SITE.founder) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: SITE.founder,
    jobTitle: "Coach Expansivo y Musical · Fundador",
    worksFor: { "@type": "Organization", name: SITE.name, url: SITE.url },
    url: absUrl("/historia"),
  };
}

export type OfferItem = {
  name: string;
  description: string;
  price?: number;
  currency?: string;
  category?: string;
};

/**
 * Catálogo de servicios de la tienda como OfferCatalog (schema.org).
 * Cada item es una Offer con su Service y, si hay precio, price/priceCurrency.
 */
export function offerCatalogLd(items: OfferItem[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: `Servicios de ${SITE.name}`,
    url: absUrl("/tienda"),
    itemListElement: items.map((it) => ({
      "@type": "Offer",
      ...(typeof it.price === "number"
        ? { price: String(it.price), priceCurrency: it.currency ?? "USD" }
        : {}),
      url: absUrl("/tienda"),
      itemOffered: {
        "@type": "Service",
        name: it.name,
        description: it.description,
        ...(it.category ? { category: it.category } : {}),
        areaServed: [...SITE.areaServed],
        provider: { "@type": "Organization", name: SITE.name, url: SITE.url },
      },
    })),
  };
}
