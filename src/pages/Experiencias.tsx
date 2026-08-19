import { Seo } from "@/components/seo";
import { CtaFinal } from "@/components/cta-final";
import { Reveal } from "@/components/reveal";
import { ExperienciaCard } from "@/components/testimonial-card";
import { useTestimonialsByStage } from "@/lib/reviews";
import type { Testimonial } from "@/lib/testimonials";
import { PAGE_SEO } from "@/lib/seo";

// Página completa de experiencias. Brief "Experiencias por etapa" (ago 2026):
// las reseñas se agrupan en Sentido, Marca y Sistema, en el orden del camino, y
// dentro de cada bloque en el orden en que Holman las subió en /admin/resenas.
//
// Las reseñas sin etapa asignada no se pierden: caen al final en "Otras
// experiencias" hasta que se les ponga una desde el panel.
// La foto es opcional — si no hay (o falla), caen las iniciales.

function Grupo({
  label,
  lede,
  items,
}: {
  label: string;
  lede?: string;
  items: Testimonial[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="experiencias-grupo">
      <header className="experiencias-grupo-head">
        <h2 className="display experiencias-grupo-title">{label}</h2>
        {lede && <p className="experiencias-grupo-lede">{lede}</p>}
      </header>
      <Reveal stagger className="experiencias-grid">
        {items.map((t, i) => (
          <ExperienciaCard key={`${t.name}-${i}`} t={t} />
        ))}
      </Reveal>
    </section>
  );
}

export default function Experiencias() {
  const { groups, sinEtapa, loading } = useTestimonialsByStage();
  const total = groups.reduce((n, g) => n + g.items.length, 0) + sinEtapa.length;

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
              nosotros. Están agrupadas por etapa, para que encuentres la que se
              parece a la tuya.
            </p>
          </header>

          {total > 0 ? (
            <>
              {groups.map((g) => (
                <Grupo key={g.id} label={g.label} lede={g.lede} items={g.items} />
              ))}
              <Grupo
                label="Otras experiencias"
                lede="Historias de quienes recorrieron varias etapas del camino."
                items={sinEtapa}
              />
            </>
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
