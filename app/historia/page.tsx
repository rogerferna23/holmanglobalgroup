import type { Metadata } from "next";
import { CtaFinal } from "@/components/cta-final";
import { Historia } from "@/components/historia";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Nuestra historia",
  description:
    "El camino que nos trajo aquí. Música, propósito, neurocoaching y el origen del Corazón de Elefante — la historia detrás de Holman Global Group.",
  alternates: { canonical: `${SITE.url}/historia` },
};

export default function HistoriaPage() {
  return (
    <>
      <Historia />
      <CtaFinal />
    </>
  );
}
