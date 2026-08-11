// Forma de una reseña tal y como la pintan las tarjetas del sitio: el carrusel
// del landing (components/testimonials.tsx) y la página /experiencias.
//
// Brief "Badges y descripciones" (ago 2026): ya no hay reseñas escritas a mano
// en el código. Todas viven en Supabase y las sube Holman una por una desde el
// panel privado (/admin/resenas) — ver lib/reviews.ts. Este módulo se queda
// solo con el tipo, que es lo que comparten las tarjetas.

export type Testimonial = {
  swatch: 1 | 2 | 3 | 4 | 5;
  initials: string;
  name: string;
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
