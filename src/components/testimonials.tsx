import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTestimonialsByStage } from "@/lib/reviews";
import type { Testimonial } from "@/lib/testimonials";
import { ArrowRightIcon } from "./icons";
import { Reveal } from "./reveal";
import { PersonAvatar, Stars } from "./testimonial-card";

// Brief "Experiencias por etapa" (ago 2026): la sección 06 pasa de un carrusel
// único a tres carruseles pegados —Sentido, Marca y Sistema—, cada uno corriendo
// por su cuenta. Así la persona encuentra el caso parecido al suyo sin tener que
// pasar por todas las reseñas.
//
// Las reseñas salen de Supabase (las sube Holman en /admin/resenas). Una reseña
// sin etapa no aparece aquí: se ve en /experiencias hasta que se le asigne una.
// Si no hubiera ninguna clasificada todavía, la sección cae a un solo carrusel
// con todo, para no quedarse vacía mientras se etiquetan.

const AUTOPLAY_MS = 6500;
/** Desfase entre carruseles para que no pasen de reseña a la vez. */
const AUTOPLAY_STAGGER_MS = 1200;
const SWIPE_PX = 40;

function StageCarousel({
  label,
  lede,
  items,
  delay,
}: {
  label: string;
  lede?: string;
  items: Testimonial[];
  delay: number;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const total = items.length;

  // Si la lista cambia de tamaño (llega una reseña publicada), no dejar el
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
  // El `delay` inicial es lo que evita que los tres salten sincronizados.
  useEffect(() => {
    if (paused || total <= 1) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let interval = 0;
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        if (!document.hidden) setIndex((i) => (i + 1) % total);
      }, AUTOPLAY_MS);
    }, delay);
    return () => {
      window.clearTimeout(start);
      if (interval) window.clearInterval(interval);
    };
  }, [paused, total, delay]);

  if (total === 0) return null;

  return (
    <div
      className="testimonials-stage"
      role="group"
      aria-roledescription="carrusel"
      aria-label={`Experiencias de ${label}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="testimonials-stage-head">
        <span className="testimonials-stage-name">{label}</span>
        {lede && <span className="testimonials-stage-lede">{lede}</span>}
        <span className="testimonials-stage-count">
          {total} {total === 1 ? "experiencia" : "experiencias"}
        </span>
      </div>

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

      {total > 1 && (
        <div className="testimonials-nav">
          <button
            type="button"
            className="testimonials-arrow"
            aria-label={`${label}: reseña anterior`}
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
                aria-label={`${label}: ir a la reseña ${i + 1} de ${total}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <button
            type="button"
            className="testimonials-arrow next"
            aria-label={`${label}: reseña siguiente`}
            onClick={() => go(1)}
          >
            <ArrowRightIcon width={14} height={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export function Testimonials() {
  const { groups, sinEtapa } = useTestimonialsByStage();

  const conReseñas = groups.filter((g) => g.items.length > 0);

  // Nada clasificado todavía (o migración sin aplicar): un único carrusel con
  // lo que haya, para que la sección no desaparezca del landing.
  const bloques =
    conReseñas.length > 0
      ? conReseñas
      : sinEtapa.length > 0
        ? [{ id: "todas", label: "Experiencias", lede: undefined, items: sinEtapa }]
        : [];

  if (bloques.length === 0) return null;

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
            Esto es lo que cuentan quienes empezaron antes que tú, en cada etapa
            del camino.
          </p>
        </div>

        <Reveal stagger className="testimonials-stages">
          {bloques.map((g, i) => (
            <StageCarousel
              key={g.id}
              label={g.label}
              lede={g.lede}
              items={g.items}
              delay={i * AUTOPLAY_STAGGER_MS}
            />
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
