import type { Metadata } from "next";
import { CtaFinal } from "@/components/cta-final";
import { Historia } from "@/components/historia";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Nuestra historia — Origen del Corazón de Elefante",
  description:
    "Música, propósito y neurocoaching: la historia real detrás de Holman Global Group y por qué creemos en construir marcas con alma. Lee el camino que nos trajo aquí.",
  keywords: [
    "historia Holman Global Group",
    "origen Corazón de Elefante",
    "neurocoaching y branding",
    "marca con propósito",
    "coaching y música",
  ],
  alternates: { canonical: `${SITE.url}/historia` },
  openGraph: {
    type: "article",
    url: `${SITE.url}/historia`,
    title: "Nuestra historia — Origen del Corazón de Elefante · HGG",
    description:
      "Música, propósito y neurocoaching: el camino que dio origen a Holman Global Group y la metodología Corazón de Elefante.",
    images: [
      {
        url: "/corazon-elefante.jpg",
        width: 1024,
        height: 1024,
        alt: "Corazón de Elefante — esencia de Holman Global Group",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nuestra historia · HGG",
    description:
      "Música, propósito y neurocoaching: el origen de Holman Global Group.",
    images: ["/corazon-elefante.jpg"],
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
      name: "Historia",
      item: `${SITE.url}/historia`,
    },
  ],
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "Historia de Holman Global Group",
  description:
    "El origen de Holman Global Group: música, propósito, neurocoaching y la metodología Corazón de Elefante.",
  url: `${SITE.url}/historia`,
  inLanguage: "es",
  isPartOf: { "@id": `${SITE.url}#website` },
  about: { "@id": `${SITE.url}#organization` },
};

export default function HistoriaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Historia />
      <CtaFinal />
    </>
  );
}
