import { useState } from "react";
import type { Testimonial } from "@/lib/testimonials";

/**
 * Estrellas de una reseña. Las 9 experiencias curadas son de 5 estrellas; las
 * que llegan por el formulario privado traen la calificación que puso el cliente.
 */
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
 * Avatar de la persona: foto si existe (public/experiencias/ para las curadas,
 * Supabase Storage para las enviadas por formulario) y, si falta o falla la
 * carga, las iniciales sobre el fondo de marca — igual que en Equipo.
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
