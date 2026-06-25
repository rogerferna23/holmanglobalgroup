import { Seo } from "@/components/seo";
import { Coaching } from "@/components/coaching";
import { Corazon } from "@/components/corazon";
import { CtaFinal } from "@/components/cta-final";
import { Hero } from "@/components/hero";
import { Personas } from "@/components/personas";
import { Process } from "@/components/process";
import { Services } from "@/components/services";
import { Sofia } from "@/components/sofia";
import { Testimonials } from "@/components/testimonials";
import { PAGE_SEO } from "@/lib/seo";

export default function Home() {
  return (
    <>
      <Seo {...PAGE_SEO.home} />
      <Hero />
      <Personas />
      <Process />
      <Corazon />
      <Coaching />
      <Services />
      <Sofia />
      <Testimonials />
      <CtaFinal />
    </>
  );
}
