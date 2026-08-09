// Reseñas reales de clientes de HGG. Fuente única: la usan el bloque compacto
// del landing (components/testimonials.tsx) y la página completa
// /experiencias (pages/Experiencias.tsx).
//
// Orden estrategico: Evelyn featured (testimonio emocional, "antes y despues"),
// luego Daniel (USA, asesor estrategico — credibilidad B2B internacional),
// Natha (marketing digital — credibilidad profesional), Tatiana (coach internacional
// hablando de coach, mercado España) y Valentina (testimonio con resultados concretos).

export type Testimonial = {
  /** Destacado en el bloque del landing (tarjeta grande a la izquierda). */
  feature?: boolean;
  swatch: 1 | 2 | 3 | 4 | 5;
  initials: string;
  name: string;
  role: string;
  quote: string;
  /**
   * Foto opcional en public/experiencias/*.jpg. No todas las personas tienen
   * foto: si falta (o falla la carga) se muestran las iniciales sobre el
   * fondo de marca, igual que en la sección de Equipo.
   */
  photo?: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    feature: true,
    swatch: 1,
    initials: "ER",
    name: "Evelyn Rivas",
    role: "Empresaria Internacional · Venezuela",
    quote:
      "Si tengo que resumir mi experiencia con Holman Global Group LLC en una palabra, sería “maravilloso”: excelente atención, supercertero en cada detalle, de mucha utilidad para mi vida y la de mi hijo. Marcó un antes y un después. Por eso y más estoy inmensamente agradecida.",
  },
  {
    swatch: 2,
    initials: "DD",
    name: "Daniel Domínguez",
    role: "Asesor Estratégico de Seguros · Estados Unidos",
    quote:
      "Estoy muy feliz con mi página de marca personal. Agradecido a mi mentor y coach por todo el tiempo y su gran experiencia. Súper profesional. Gracias Holman Orjuela.",
  },
  {
    swatch: 3,
    initials: "NS",
    name: "Natha Sánchez",
    role: "Gerente en Marketing Digital · Colombia",
    quote:
      "El profesionalismo es increíble, el mejor trato y la mejor estructura. Puedo asegurar que mi visión hacia la vida y el ámbito laboral cambió por completo después de tener el gusto de conocer Holman Global Group.",
  },
  {
    swatch: 4,
    initials: "TA",
    name: "Tatiana Acosta",
    role: "Coach Internacional · España",
    quote:
      "Quiero darle las gracias a Holman por su entrega y su acogida a la hora de acompañarme en mi proceso. Tiene una empatía y un mimo en el proceso que me ayudó mucho a dar un paso muy importante para mí.",
  },
  {
    swatch: 5,
    initials: "VT",
    name: "Valentina Tafur",
    role: "Especialista en Interpretación de Espacios · Colombia",
    quote:
      "Increíble trabajo. Se acomodaron a mis tiempos y definitivamente se interesaron por mí, por lo que quería, y se lograron resultados que considero que sin el coaching no se habrían podido conseguir.",
  },
];
