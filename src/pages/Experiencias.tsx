import { useState } from "react";
import { Seo } from "@/components/seo";
import { CtaFinal } from "@/components/cta-final";
import { Reveal } from "@/components/reveal";
import { TESTIMONIALS, type Testimonial } from "@/lib/testimonials";
import { PAGE_SEO } from "@/lib/seo";

// Página completa de experiencias (brief ago 2026): las mismas reseñas que ya
// se muestran en el bloque del landing, aquí juntas y con más aire. Sin filtro
// por categoría. La foto es opcional — si no hay (o falla), caen las iniciales.
function ExperienciaCard({ t }: { t: Testimonial }) {
  const [photoOk, setPhotoOk] = useState(true);
  const showPhoto = Boolean(t.photo) && photoOk;

  return (
    <article className="experiencia">
      <div className="quote-mark" aria-hidden="true">
        &ldquo;
      </div>
      <p className="experiencia-quote">{t.quote}</p>
      <div className="experiencia-meta">
        <div className={`experiencia-avatar swatch-${t.swatch}`}>
          {showPhoto ? (
            <img
              src={t.photo}
              alt={`${t.name} — ${t.role}`}
              loading="lazy"
              onError={() => setPhotoOk(false)}
            />
          ) : (
            <span aria-hidden="true">{t.initials}</span>
          )}
        </div>
        <div className="who">
          <div className="name">{t.name}</div>
          <div className="role">{t.role}</div>
        </div>
        <div className="stars" aria-label="5 de 5 estrellas">
          ★★★★★
        </div>
      </div>
    </article>
  );
}

export default function Experiencias() {
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
            {TESTIMONIALS.map((t) => (
              <ExperienciaCard key={t.name} t={t} />
            ))}
          </Reveal>
        </div>
      </section>
      <CtaFinal />
    </>
  );
}
