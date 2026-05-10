import type { Metadata } from "next";
import { CtaFinal } from "@/components/cta-final";
import { Tienda } from "@/components/tienda";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Tienda",
  description:
    "Catálogo completo de servicios HGG: Coaching Expansivo y Musical, Construcción de Marca con Huella y Estructuración Empresarial.",
  alternates: { canonical: `${SITE.url}/tienda` },
};

export default function TiendaPage() {
  return (
    <>
      <Tienda />
      <CtaFinal />
    </>
  );
}
