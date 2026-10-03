import { Seo } from "@/components/seo";
import { ClubHome } from "@/components/club-home";
import { Corazon } from "@/components/corazon";
import { CtaFinal } from "@/components/cta-final";
import { Equipo } from "@/components/equipo";
import { Hero } from "@/components/hero";
import { Podcast } from "@/components/podcast";
import { Process } from "@/components/process";
import { Services } from "@/components/services";
import { Testimonials } from "@/components/testimonials";
import { PAGE_SEO } from "@/lib/seo";

// Home más corta (oct 2026): salen «Tu punto de partida» (repetía el Camino) y
// la demo de Sofía. Orden: lo gratis (podcast) → el camino → el método → las
// soluciones → las personas → la prueba social → el club → la conversación.
export default function Home() {
  return (
    <>
      <Seo {...PAGE_SEO.home} />
      <Hero />
      <Podcast />
      <Process />
      <Corazon />
      <Services />
      <Equipo />
      <Testimonials />
      <ClubHome />
      <CtaFinal />
    </>
  );
}
