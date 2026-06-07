import { useMemo } from "react";
import { Seo } from "@/components/seo";
import { CtaFinal } from "@/components/cta-final";
import { Historia as HistoriaSection } from "@/components/historia";
import { PAGE_SEO, personLd } from "@/lib/seo";

export default function Historia() {
  const jsonLd = useMemo(() => personLd(), []);

  return (
    <>
      <Seo {...PAGE_SEO.historia} type="profile" jsonLd={jsonLd} />
      <HistoriaSection />
      <CtaFinal />
    </>
  );
}
