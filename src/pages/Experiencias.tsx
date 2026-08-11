import { Seo } from "@/components/seo";
import { CtaFinal } from "@/components/cta-final";
import { Reveal } from "@/components/reveal";
import { ExperienciaCard } from "@/components/testimonial-card";
import { useTestimonials } from "@/lib/reviews";
import { PAGE_SEO } from "@/lib/seo";

// Página completa de experiencias (brief ago 2026): las reseñas que Holman sube
// una por una en /admin/resenas, en ese mismo orden. Sin filtro por categoría.
// La foto es opcional — si no hay (o falla), caen las iniciales.
export default function Experiencias() {
  const { items, loading } = useTestimonials();

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

          {items.length > 0 ? (
            <Reveal stagger className="experiencias-grid">
              {items.map((t, i) => (
                <ExperienciaCard key={`${t.name}-${i}`} t={t} />
              ))}
            </Reveal>
          ) : (
            // Mientras no haya reseñas publicadas (o si Supabase no responde) la
            // página no se queda vacía del todo.
            !loading && (
              <p className="experiencias-empty">
                Estamos recogiendo las historias de quienes ya recorrieron el
                camino. Muy pronto las verás aquí.
              </p>
            )
          )}
        </div>
      </section>
      <CtaFinal />
    </>
  );
}
