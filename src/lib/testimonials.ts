// Reseñas reales de clientes de HGG. Fuente única: la usan el carrusel del
// landing (components/testimonials.tsx) y la página completa /experiencias
// (pages/Experiencias.tsx).
//
// Brief "Ajustes Adicionales" (ago 2026): son las 9 experiencias entregadas por
// Holman, en el orden del brief y con los textos tal cual los envió. El nombre
// de archivo de cada foto es el que indicó el brief para que no haya ambigüedad
// sobre cuál foto va con cuál texto — viven en public/experiencias/.
//
// Evelyn abre la lista (testimonio emocional, "antes y después") y es la tarjeta
// destacada del landing.

export type Testimonial = {
  /** Destacado en el carrusel del landing (tarjeta grande). */
  feature?: boolean;
  swatch: 1 | 2 | 3 | 4 | 5;
  initials: string;
  name: string;
  /** Cargo · país. Opcional: las reseñas enviadas por formulario pueden no traerlo. */
  role?: string;
  quote: string;
  /** Estrellas (1–5). Si no se indica, se muestran 5. */
  rating?: 1 | 2 | 3 | 4 | 5;
  /**
   * Foto opcional en public/experiencias/. No todas las personas tienen
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
    role: "Empresaria Internacional · Brasil",
    photo: "/experiencias/evelyn-rivas.jpg",
    quote:
      "Si tengo que resumir mi experiencia con Holman Global Group LLC en una palabra, sería “maravilloso” (excelente atención, supercertero en cada detalle, de mucha utilidad para mi vida y la de mi hijo); marcó un antes y un después. Por eso y más estoy inmensamente agradecida.",
  },
  {
    swatch: 2,
    initials: "NS",
    name: "Natha Sánchez",
    role: "Gerente en Marketing Digital · Colombia",
    photo: "/experiencias/natha-sanchez.jpeg",
    quote:
      "El profesionalismo es increíble, el mejor trato y la mejor estructura. Puedo asegurar que mi visión hacia la vida y el ámbito laboral cambió por completo después de tener el gusto de conocer Holman Global Group.",
  },
  {
    swatch: 3,
    initials: "AD",
    name: "Alberto Deleyto",
    role: "Empresario · España",
    photo: "/experiencias/alberto-deleyto.jpeg",
    quote:
      "Una maravilla el trabajo que hace Holman. Todas las sesiones son muy productivas, tanto para desarrollar tu marca como para crecer personalmente. ¡Estoy encantado!",
  },
  {
    swatch: 4,
    initials: "DD",
    name: "Daniel Domínguez",
    role: "Asesor Estratégico de Seguros · Estados Unidos",
    photo: "/experiencias/daniel-dominguez.jpeg",
    quote:
      "Hola, mi nombre es Daniel Domínguez y estoy muy feliz con mi página de marca personal, agradecido a mi mentor y coach por todo el tiempo y su gran experiencia; es súper profesional. Gracias, Holman Orjuela.",
  },
  {
    swatch: 5,
    initials: "TA",
    name: "Tatiana Acosta",
    role: "Coach Internacional · España",
    photo: "/experiencias/tatiana-acosta.jpeg",
    quote:
      "Quiero darle las gracias a Holman por su entrega y su acogida a la hora de acompañarme en mi proceso; tiene una empatía y un mimo en el proceso que me ayudó mucho a dar un paso muy importante para mí.",
  },
  {
    swatch: 1,
    initials: "JB",
    name: "Juan David Bernal Niño",
    role: "Estratega en Mindset · España",
    photo: "/experiencias/juan-david-bernal-nin_o.jpeg",
    quote:
      "El trabajar con Holman siempre me da mucha claridad para mis proyectos, su acompañamiento es súper profesional y recomiendo a Holman Global Group LLC con los ojos cerrados.",
  },
  {
    swatch: 2,
    initials: "DL",
    name: "Dayana Luna",
    role: "Empresaria · Colombia",
    photo: "/experiencias/dayana-luna.jpeg",
    quote:
      "Trabajar de la mano de HGG ha sido una de las mejores experiencias, el acompañamiento para alcanzar mis metas ha sido exponencial. Súper recomendado.",
  },
  {
    swatch: 3,
    initials: "EF",
    name: "Elied Fajardo",
    role: "Deportista · Brasil",
    photo: "/experiencias/elied-fajardo.jpg",
    quote:
      "Créanme, la experiencia es única. Gente que sabe lo que hace: resultados 100% garantizados.",
  },
  {
    swatch: 4,
    initials: "VT",
    name: "Valentina Tafur",
    role: "Especialista en Interpretación de Espacios · Colombia",
    photo: "/experiencias/valentina-tafur.jpg",
    quote:
      "Increíble trabajo. Se acomodaron a mis tiempos y definitivamente se interesaron por mí, por lo que quería, y se lograron resultados que considero que sin el coaching no se habrían podido conseguir.",
  },
];
