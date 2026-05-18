import { useEffect } from "react";
import { Corazon } from "@/components/corazon";
import { CtaFinal } from "@/components/cta-final";
import { Hero } from "@/components/hero";
import { Personas } from "@/components/personas";
import { Process } from "@/components/process";
import { Services } from "@/components/services";
import { Testimonials } from "@/components/testimonials";

export default function Home() {
  useEffect(() => {
    document.title = "HGG · Holman Global Group — Corazón de Elefante";
  }, []);

  return (
    <>
      <Hero />
      <Personas />
      <Process />
      <Corazon />
      <Services />
      <Testimonials />
      <CtaFinal />
    </>
  );
}
