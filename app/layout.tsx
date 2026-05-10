import type { Metadata, Viewport } from "next";
import { Manrope, Questrial } from "next/font/google";
import { SITE } from "@/lib/config";
import { Fab } from "@/components/fab";
import { Footer } from "@/components/footer";
import { Grain } from "@/components/grain";
import { Nav } from "@/components/nav";
import "./globals.css";

const questrial = Questrial({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-questrial",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.shortName} · ${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.shortName}`,
  },
  description: SITE.description,
  keywords: [
    // Servicios principales
    "coaching expansivo",
    "coaching musical",
    "neurocoaching",
    "coaching de propósito",
    "coaching para emprendedores",
    "coaching de marca personal",
    // Branding
    "branding con propósito",
    "marca personal con alma",
    "identidad de marca",
    "construcción de marca",
    "estrategia de marca",
    "diseño de marca premium",
    "consultoría de branding",
    // Sistemas digitales
    "sitios web premium",
    "estrategia digital",
    "sistemas digitales para marcas",
    "automatización para emprendedores",
    "embudos de venta",
    // Empresarial
    "creación de LLC",
    "estructuración empresarial",
    "abrir empresa en USA",
    // Marca
    "Holman Global Group",
    "HGG",
    "Corazón de Elefante",
    "consultoría holística",
    "marca con alma",
    "propósito de vida y marca",
  ],
  category: "Business Consulting",
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.shortName} — ${SITE.tagline}`,
    description: SITE.description,
    images: [
      {
        url: "/logo-h.png",
        width: 512,
        height: 512,
        alt: `${SITE.name} — ${SITE.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.shortName} — ${SITE.tagline}`,
    description: SITE.description,
    images: ["/logo-h.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE.url },
};

export const viewport: Viewport = {
  themeColor: "#0B1016",
  width: "device-width",
  initialScale: 1,
};

// JSON-LD para que Google entienda el negocio (Organization + Website + sitelinks search).
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${SITE.url}#organization`,
  name: SITE.name,
  alternateName: SITE.shortName,
  url: SITE.url,
  logo: `${SITE.url}/logo-h.png`,
  image: `${SITE.url}/logo-h.png`,
  description: SITE.description,
  email: SITE.email,
  telephone: SITE.phone.raw,
  slogan: SITE.tagline,
  foundingDate: "2024",
  areaServed: [
    { "@type": "Country", name: "España" },
    { "@type": "Country", name: "Estados Unidos" },
    { "@type": "Place", name: "Latinoamérica" },
  ],
  knowsLanguage: ["es", "en"],
  serviceType: [
    "Coaching",
    "Branding",
    "Diseño Web",
    "Estrategia Digital",
    "Consultoría Empresarial",
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Servicios HGG",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Coaching Expansivo y Musical",
          description:
            "Sesiones de coaching para descubrir propósito, claridad personal y dirección de vida.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Tu Marca con Huella",
          description:
            "Construcción de marca personal y empresarial con identidad visual, voz y estrategia.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Sistemas Digitales Premium",
          description:
            "Sitios web, embudos de venta y automatización para vivir de lo que amas.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Creación de LLC en USA",
          description:
            "Estructuración empresarial y apertura de LLC para emprendedores internacionales.",
        },
      },
    ],
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE.url}#website`,
  url: SITE.url,
  name: SITE.name,
  description: SITE.description,
  inLanguage: "es",
  publisher: { "@id": `${SITE.url}#organization` },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${questrial.variable} ${manrope.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body>
        <Grain />
        <Nav />
        <main>{children}</main>
        <Footer />
        <Fab />
      </body>
    </html>
  );
}
