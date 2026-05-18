import { useEffect } from "react";
import { CtaFinal } from "@/components/cta-final";
import { Tienda as TiendaSection } from "@/components/tienda";

export default function Tienda() {
  useEffect(() => {
    document.title = "Tienda — Coaching, Branding y Sistemas Digitales · HGG";
  }, []);

  return (
    <>
      <TiendaSection />
      <CtaFinal />
    </>
  );
}
