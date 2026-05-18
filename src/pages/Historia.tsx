import { useEffect } from "react";
import { CtaFinal } from "@/components/cta-final";
import { Historia as HistoriaSection } from "@/components/historia";

export default function Historia() {
  useEffect(() => {
    document.title = "Nuestra historia — Origen del Corazón de Elefante · HGG";
  }, []);

  return (
    <>
      <HistoriaSection />
      <CtaFinal />
    </>
  );
}
