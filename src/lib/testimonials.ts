// Forma de una reseña tal y como la pintan las tarjetas del sitio: el carrusel
// del landing (components/testimonials.tsx) y la página /experiencias.
//
// Brief "Badges y descripciones" (ago 2026): ya no hay reseñas escritas a mano
// en el código. Todas viven en Supabase y las sube Holman una por una desde el
// panel privado (/admin/resenas) — ver lib/reviews.ts. Este módulo se queda
// solo con el tipo, que es lo que comparten las tarjetas.

/**
 * Etapa del camino a la que pertenece la reseña (brief "Experiencias por
 * etapa", ago 2026). Las reseñas subidas antes de esa migración no tienen
 * etapa: se muestran en /experiencias bajo "Otras experiencias" hasta que se
 * les asigne una desde /admin/resenas.
 */
export type Stage = "sentido" | "marca" | "sistema";

/** Las tres etapas en el orden del camino, con su nombre y su promesa. */
export const STAGES: { id: Stage; label: string; lede: string }[] = [
  {
    id: "sentido",
    label: "Sentido",
    lede: "Quienes empezaron por encontrar su dirección.",
  },
  {
    id: "marca",
    label: "Marca",
    lede: "Quienes convirtieron su esencia en una marca.",
  },
  {
    id: "sistema",
    label: "Sistema",
    lede: "Quienes dejaron de cargar el negocio en la espalda.",
  },
];

export const STAGE_LABEL: Record<Stage, string> = {
  sentido: "Sentido",
  marca: "Marca",
  sistema: "Sistema",
};

export type Testimonial = {
  swatch: 1 | 2 | 3 | 4 | 5;
  initials: string;
  name: string;
  /** Etapa del camino. `null` en las reseñas anteriores a la clasificación. */
  stage?: Stage | null;
  /** Cargo · país. Opcional: hay reseñas que se publican solo con el nombre. */
  role?: string;
  quote: string;
  /** Estrellas (1–5). Si no se indica, se muestran 5. */
  rating?: 1 | 2 | 3 | 4 | 5;
  /**
   * Foto de la persona (Supabase Storage, bucket `resenas`). Es opcional: si
   * falta —o falla la carga— se muestran las iniciales sobre el fondo de marca,
   * igual que en la sección de Equipo.
   */
  photo?: string;
};
