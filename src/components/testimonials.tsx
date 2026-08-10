import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTestimonials } from "@/lib/reviews";
import { ArrowRightIcon } from "./icons";
import { Reveal } from "./reveal";
import { PersonAvatar, Stars } from "./testimonial-card";

// Brief "Ajustes Adicionales" (ago 2026): la sección 06 pasa de bloque fijo a
// carrusel que va cambiando de una reseña en una automáticamente. El contenido
// es el mismo y el enlace "Ver más experiencias" sigue aquí, llevando a la
// página completa /experiencias.

const AUTOPLAY_MS = 6500;
const SWIPE_PX = 40;

export function Testimonials() {
  const { items } = useTestimonials();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const total = items.length;

  // Si la lista cambia de tamaño (llega una reseña aprobada), no dejar el
  // índice apuntando fuera del rango.
  useEffect(() => {
    setIndex((i) => (total === 0 ? 0 : Math.min(i, total - 1)));
  }, [total]);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => (total === 0 ? 0 : (i + delta + total) % total));
    },
    [total]
  );

  // Avance automático: se detiene al pasar el cursor / enfocar los controles,
  // con la pestaña en segundo plano o si el visitante pidió menos movimiento.
  useEffect(() => {
    if (paused || total <= 1) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % total);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, total]);

  if (total === 0) return null;

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

        <Reveal
          className="testimonials-carousel"
          role="group"
          aria-roledescription="carrusel"
          aria-label="Experiencias de clientes"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div
            className="testimonials-viewport"
            onTouchStart={(e) => {
              touchX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              const start = touchX.current;
              touchX.current = null;
              if (start === null) return;
              const dx = (e.changedTouches[0]?.clientX ?? start) - start;
              if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
            }}
          >
            <div
              className="testimonials-track"
              style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
            >
              {items.map((t, i) => {
                const current = i === index;
                return (
                  <article
                    key={`${t.name}-${i}`}
                    className={`testimonial feature${current ? " is-current" : ""}`}
                    role="group"
                    aria-roledescription="reseña"
                    aria-label={`${i + 1} de ${total}`}
                    aria-hidden={!current}
                    inert={!current}
                  >
                    <div className="quote-mark" aria-hidden="true">
                      &ldquo;
                    </div>
                    <p className="quote">{t.quote}</p>
                    <div className="testimonial-meta">
                      <PersonAvatar t={t} className="avatar" />
                      <div className="who">
                        <div className="name">{t.name}</div>
                        {t.role && <div className="role">{t.role}</div>}
                      </div>
                      <Stars rating={t.rating} />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="testimonials-nav">
            <button
              type="button"
              className="testimonials-arrow"
              aria-label="Reseña anterior"
              onClick={() => go(-1)}
            >
              <ArrowRightIcon width={14} height={14} />
            </button>
            <div className="testimonials-dots">
              {items.map((t, i) => (
                <button
                  key={`dot-${t.name}-${i}`}
                  type="button"
                  className={`testimonials-dot${i === index ? " active" : ""}`}
                  aria-label={`Ir a la reseña ${i + 1} de ${total}`}
                  aria-current={i === index}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
            <button
              type="button"
              className="testimonials-arrow next"
              aria-label="Reseña siguiente"
              onClick={() => go(1)}
            >
              <ArrowRightIcon width={14} height={14} />
            </button>
          </div>
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
