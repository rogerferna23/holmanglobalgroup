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
    "coaching",
    "branding",
    "marca personal",
    "identidad de marca",
    "sitios web premium",
    "estrategia digital",
    "coaching musical",
    "Holman Global Group",
    "HGG",
    "Corazón de Elefante",
  ],
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
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.shortName} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE.url },
};

export const viewport: Viewport = {
  themeColor: "#0B1016",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${questrial.variable} ${manrope.variable}`}>
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
