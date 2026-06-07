import { useMemo } from "react";
import { Seo } from "@/components/seo";
import { CtaFinal } from "@/components/cta-final";
import { Tienda as TiendaSection, TIENDA_OFFER_ITEMS } from "@/components/tienda";
import { offerCatalogLd, PAGE_SEO } from "@/lib/seo";

export default function Tienda() {
  const jsonLd = useMemo(() => offerCatalogLd(TIENDA_OFFER_ITEMS), []);

  return (
    <>
      <Seo {...PAGE_SEO.tienda} jsonLd={jsonLd} />
      <TiendaSection />
      <CtaFinal />
    </>
  );
}
