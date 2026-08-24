// Corazón de Elefante — el método (brief "El método bien explicado", ago 2026).
//
// Vivía dentro de components/corazon.tsx. Se saca aquí por lo mismo que el
// camino en lib/camino.ts: lo comparten la sección de la web y las historias de
// Instagram del panel, y tiene que ser **el mismo texto**, no una copia. Si
// Holman cambia una frase en la web, cambia en la destacada de Método.
//
// Nomenclatura: se dice "la estrategia", nunca "coaching estratégico" — sonaría
// a una tercera modalidad de coaching y se pisaría con Marca y Sistema. Y el
// Coaching Musical conserva su nombre: se encabeza con "el poder de la música",
// que se entiende a la primera, y el nombre aparece justo detrás.

/** Cómo se explica el método, en este orden. */
export const METODO = {
  nombre: "Corazón de Elefante",
  /** Qué es. Es también el párrafo de la sección de la web. */
  queEs:
    "Es la forma en que acompañamos a una persona desde tener algo valioso que dar hasta vivir de ello. Parte de algo que vemos una y otra vez: lo que de verdad mueve a alguien se siente antes de razonarse. Por eso el orden es sentir, decidir y construir.",
  /** Por qué un elefante. Acaba en dos puntos: lo completan las cualidades. */
  porQue:
    "Y lleva el nombre del elefante porque recorrer ese camino pide lo mismo que reconoces en él:",
  /** Con qué se pone en práctica. */
  intro: "Se pone en práctica con tres fuerzas.",
  /**
   * La frase que amarra el método. Las fuerzas no van una por etapa — eso es lo
   * que lo convierte en un método y no en un menú de servicios.
   */
  remate:
    "Las tres se usan en las tres etapas del camino. En cada una se siente, se decide y se construye.",
} as const;

export type Fuerza = {
  /** Identificador y color de acento (ver .coaching-card[data-brand]). */
  brand: "musical" | "expansivo" | "estrategia";
  /**
   * Qué hace en el motor: sentir → decidir → construir. En la web no se pinta
   * —las tarjetas se quedaron como estaban— pero sí en las historias, donde una
   * etiqueta corta arriba ahorra tener que deducirlo.
   */
  funcion: string;
  kind: string;
  lead: string;
  body: string;
};

/** Las tres fuerzas: sentir → decidir → construir. */
export const FUERZAS: Fuerza[] = [
  {
    brand: "musical",
    funcion: "Sentir",
    kind: "El poder de la música",
    lead: "Llega donde el razonamiento no llega.",
    body:
      "Es nuestro Coaching Musical: integramos principios de la neurociencia y la psicología aplicada de la música para facilitar procesos de autoconocimiento, claridad y toma de decisiones.",
  },
  {
    brand: "expansivo",
    funcion: "Decidir",
    kind: "El coaching expansivo",
    lead: "Convierte esa claridad en decisiones.",
    body:
      "A través de herramientas de desarrollo humano y preguntas estratégicas, acompañamos a las personas a convertir el autoconocimiento en decisiones, hábitos y acciones alineadas con su propósito.",
  },
  {
    brand: "estrategia",
    funcion: "Construir",
    kind: "La estrategia",
    lead: "Convierte las decisiones en resultados que se sostienen.",
    body:
      "Marca, sistemas y marketing digital: la estructura que hace que lo decidido funcione, y que siga funcionando sin depender de que estés en todo.",
  },
];

/** Lo que reconoces en el elefante, y lo que sostiene a quien construye algo. */
export const CUALIDADES = [
  "Fortaleza",
  "Conciencia",
  "Sentido",
  "Humildad",
  "Expansión",
];
