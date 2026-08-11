import { useState } from "react";
import type { Testimonial } from "@/lib/testimonials";

/** Estrellas de la reseña, tal y como las marcó Holman al subirla (1–5). */
export function Stars({ rating = 5 }: { rating?: number }) {
  const n = Math.min(5, Math.max(1, Math.round(rating)));
  return (
    <div className="stars" aria-label={`${n} de 5 estrellas`}>
      <span aria-hidden="true">{"★".repeat(n)}</span>
      {n < 5 && (
        <span className="stars-off" aria-hidden="true">
          {"★".repeat(5 - n)}
        </span>
      )}
    </div>
  );
}

/**
 * Avatar de la persona: la foto que se subió con la reseña (Supabase Storage) y,
 * si falta o falla la carga, las iniciales sobre el fondo de marca — igual que
 * en Equipo.
 */
export function PersonAvatar({
  t,
  className,
}: {
  t: Testimonial;
  className: string;
}) {
  const [photoOk, setPhotoOk] = useState(true);
  const showPhoto = Boolean(t.photo) && photoOk;
  return (
    <div className={`${className} swatch-${t.swatch}`}>
      {showPhoto ? (
        <img
          src={t.photo}
          alt={t.role ? `${t.name} — ${t.role}` : t.name}
          loading="lazy"
          onError={() => setPhotoOk(false)}
        />
      ) : (
        <span aria-hidden="true">{t.initials}</span>
      )}
    </div>
  );
}

/** Tarjeta grande de la página completa /experiencias. */
export function ExperienciaCard({ t }: { t: Testimonial }) {
  return (
    <article className="experiencia">
      <div className="quote-mark" aria-hidden="true">
        &ldquo;
      </div>
      <p className="experiencia-quote">{t.quote}</p>
      <div className="experiencia-meta">
        <PersonAvatar t={t} className="experiencia-avatar" />
        <div className="who">
          <div className="name">{t.name}</div>
          {t.role && <div className="role">{t.role}</div>}
        </div>
        <Stars rating={t.rating} />
      </div>
    </article>
  );
}
