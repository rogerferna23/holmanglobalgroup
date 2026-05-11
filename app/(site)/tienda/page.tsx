import type { Metadata } from "next";
import { CtaFinal } from "@/components/cta-final";
import { Tienda } from "@/components/tienda";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Tienda — Coaching, Branding y Sistemas Digitales",
  description:
    "Servicios HGG: coaching expansivo y musical, construcción de marca personal con propósito, sistemas digitales premium y creación de LLC en USA. Precios y planes desde $250.",
  keywords: [
    "comprar coaching online",
    "servicios de branding",
    "paquetes de marca personal",
    "creación de LLC España USA",
    "coaching expansivo precio",
    "diseño web premium emprendedores",
    "consultoría de marca",
  ],
  alternates: { canonical: `${SITE.url}/tienda` },
  openGraph: {
    type: "website",
    url: `${SITE.url}/tienda`,
    title: "Tienda HGG — Coaching, Branding y Sistemas Digitales",
    description:
      "Catálogo completo de servicios HGG con planes desde $250: coaching, marca personal, sistemas digitales y estructuración de LLC.",
    images: [
      {
        url: "/logo-h.png",
        width: 512,
        height: 512,
        alt: "Tienda Holman Global Group",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tienda HGG · Coaching, Branding y LLC",
    description:
      "Coaching expansivo, branding con propósito, sistemas digitales y creación de LLC.",
    images: ["/logo-h.png"],
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Inicio", item: SITE.url },
    {
      "@type": "ListItem",
      position: 2,
      name: "Tienda",
      item: `${SITE.url}/tienda`,
    },
  ],
};

const itemListJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Tienda Holman Global Group",
  description:
    "Catálogo completo de servicios HGG: coaching, branding, sistemas digitales y creación de LLC.",
  url: `${SITE.url}/tienda`,
  inLanguage: "es",
  isPartOf: { "@id": `${SITE.url}#website` },
  about: { "@id": `${SITE.url}#organization` },
};

export default function TiendaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Tienda />
      <CtaFinal />
    </>
  );
}
