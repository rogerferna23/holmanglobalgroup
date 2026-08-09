import { Link } from "react-router-dom";
import { TESTIMONIALS } from "@/lib/testimonials";
import { ArrowRightIcon } from "./icons";
import { Reveal } from "./reveal";

// Bloque compacto de reseñas dentro del landing. Se mantiene tal cual (brief
// ago 2026); lo único nuevo es el enlace "Ver más experiencias" hacia la
// página completa /experiencias. Los datos viven en lib/testimonials.ts.
export function Testimonials() {
  return (
    <section id="experiencias" className="testimonials">
      <div className="shell">
        <div className="section-head">
          <div className="meta">
            <div className="eyebrow-row">
              <span className="num">06</span>
              <span className="bar" />
              <span className="eyebrow eyebrow-w">Experiencias</span>
            </div>
            <h2 className="display">
              Personas que decidieron
              <br />
              recorrer el camino.
            </h2>
          </div>
          <p className="lede">
            Esto es lo que cuentan quienes empezaron antes que tú.
          </p>
        </div>

        <Reveal stagger className="testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <article
              key={t.name}
              className={`testimonial${t.feature ? " feature" : ""}`}
            >
              <div className="quote-mark" aria-hidden="true">
                &ldquo;
              </div>
              <p className="quote">{t.quote}</p>
              <div className="testimonial-meta">
                <div
                  className={`avatar swatch-${t.swatch}`}
                  aria-hidden="true"
                >
                  {t.initials}
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
          ))}
        </Reveal>

        <div className="testimonials-more">
          <Link to="/experiencias" className="testimonials-more-link">
            Ver más experiencias
            <ArrowRightIcon width={14} height={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
