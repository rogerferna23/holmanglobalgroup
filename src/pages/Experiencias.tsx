import { Seo } from "@/components/seo";
import { CtaFinal } from "@/components/cta-final";
import { Reveal } from "@/components/reveal";
import { ExperienciaCard } from "@/components/testimonial-card";
import { useTestimonials } from "@/lib/reviews";
import { PAGE_SEO } from "@/lib/seo";

// Página completa de experiencias (brief ago 2026): las 9 experiencias que
// entregó Holman más las reseñas que llegan por el formulario privado y él
// aprueba en /admin/resenas. Sin filtro por categoría. La foto es opcional — si
// no hay (o falla), caen las iniciales.
export default function Experiencias() {
  const { items } = useTestimonials();

  return (
    <>
      <Seo {...PAGE_SEO.experiencias} />
      <section className="experiencias">
        <div className="shell">
          <header className="experiencias-head">
            <div className="eyebrow-row">
              <span className="num">·</span>
              <span className="bar" />
              <span className="eyebrow eyebrow-w">Experiencias</span>
            </div>
            <h1 className="display experiencias-title">
              Historias de quienes
              <br />
              ya recorrieron el camino.
            </h1>
            <p className="experiencias-lede">
              No son reseñas de cinco estrellas: son procesos reales de personas
              que decidieron construir su propósito, su marca y su sistema con
              nosotros. Esto es lo que cuentan.
            </p>
          </header>

          <Reveal stagger className="experiencias-grid">
            {items.map((t, i) => (
              <ExperienciaCard key={`${t.name}-${i}`} t={t} />
            ))}
          </Reveal>
        </div>
      </section>
      <CtaFinal />
    </>
  );
}
