/**
 * Test del Patrón del Dinero — raíz + patrón + mentalidad.
 *
 * Segundo test de coach de Holman (oct 2026). Lo aplica en sesión, igual que el
 * de autodescubrimiento (src/lib/test-heridas.ts), y regala un informe A4.
 *
 * Se apoya en dos libros que Holman eligió (resúmenes en libros/, fuera de git):
 *  - T. Harv Eker, «Los secretos de la mente millonaria»: el patrón se forma
 *    con lo que oíste, viste y viviste; funciona como un termostato; y los
 *    «archivos de riqueza» (Parte 3, la rueda de la mentalidad).
 *  - Brad y Ted Klontz, «Mind over Money»: detonantes de la infancia, guiones
 *    del dinero y los doce trastornos, agrupados aquí en seis patrones.
 * Las preguntas y los textos son nuestros: no se copia nada de los libros.
 *
 * Como en el otro test: lenguaje de patrones y fortalezas, nunca diagnósticos.
 */

// ---------------------------------------------------------------------------
// Parte 1 · Tu raíz (Eker: oíste, viste, viviste · Klontz: detonantes)
// ---------------------------------------------------------------------------

/** Frases típicas para marcar rápido; la que más pesa se escribe aparte. */
export const FRASES_OIDAS = [
  "El dinero no crece en los árboles",
  "Los ricos son ambiciosos o tramposos",
  "El dinero es sucio",
  "Hay que matarse trabajando para ganarlo",
  "Eso no es para nosotros",
  "No alcanza",
  "El dinero no da la felicidad",
  "Ahorra por si acaso",
  "¿Tú crees que soy un banco?",
  "De dinero no se habla",
  "Es mejor dar que recibir",
  "Primero la familia, después tú",
] as const;

/** Cómo manejaba el dinero cada figura de la infancia. */
export const ESTILOS_MODELO = [
  "Ahorraba",
  "Gastaba",
  "Lo evitaba",
  "Vivía preocupado",
  "Era generoso",
  "Lo usaba para controlar",
  "Trabajaba sin descanso",
  "Dependía de otros",
  "No estaba presente",
] as const;

export const RELACION_MODELO = [
  { id: "igual", nombre: "Me parezco" },
  { id: "opuesto", nombre: "Soy lo opuesto" },
  { id: "mezcla", nombre: "Una mezcla" },
] as const;
export type RelacionModelo = (typeof RELACION_MODELO)[number]["id"] | "";

export const EMOCIONES = ["Miedo", "Vergüenza", "Rabia", "Tristeza", "Culpa", "Alegría", "Orgullo"] as const;

export const SIGNIFICADOS = [
  "Seguridad",
  "Libertad",
  "Amor",
  "Reconocimiento",
  "Placer",
  "Poder",
  "Paz",
  "Un problema",
] as const;

/** «¿Para qué quieres más dinero?». Los dos primeros son motores de carencia (Eker). */
export const MOTORES = [
  "Dejar de tener miedo",
  "Demostrar lo que valgo",
  "Libertad",
  "Darle lo mejor a mi familia",
  "Contribuir y ayudar",
  "Disfrutar la vida",
] as const;
const MOTORES_CARENCIA: string[] = ["Dejar de tener miedo", "Demostrar lo que valgo"];

/** El termostato de Eker: a qué nivel vuelven siempre los ingresos. */
export const TERMOSTATOS = [
  {
    id: "creciendo",
    nombre: "Crece de forma constante",
    lectura: "Tu termostato ya está subiendo. El trabajo ahora es sostener ese crecimiento y ampliarlo.",
  },
  {
    id: "estable",
    nombre: "Estable en un mismo rango",
    lectura: "Tus ingresos vuelven siempre al mismo rango. Para subir el techo, primero se ajusta el termostato por dentro.",
  },
  {
    id: "altibajos",
    nombre: "Sube y baja",
    lectura: "Tu dinero tiene un ritmo de subidas y bajadas. Mira si se parece al de alguien de tu familia: ahí suele estar la llave.",
  },
  {
    id: "estancado",
    nombre: "Estancado",
    lectura: "Tu termostato pide un ajuste: lo que hoy crees posible es lo que marca tu techo, y eso se puede reprogramar.",
  },
] as const;
export type TermostatoId = (typeof TERMOSTATOS)[number]["id"] | "";

// ---------------------------------------------------------------------------
// Parte 2 · Tu patrón (los doce trastornos de Klontz en seis patrones)
// ---------------------------------------------------------------------------

export type PatronId = "evitador" | "renunciante" | "guardian" | "gastador" | "perseguidor" | "rescatador";

export type Patron = {
  id: PatronId;
  nombre: string;
  /** Una línea: qué cree en el fondo. */
  esencia: string;
  /** Cinco preguntas, respondidas con la escala de frecuencia. */
  preguntas: [string, string, string, string, string];
  /** Solo para Holman: qué observar sin preguntar. */
  senales: string;
  // --- Lo que ve la persona en su informe ---
  origen: string;
  regalo: string;
  practica: string;
  pregunta: string;
  declaracion: string;
};

export const PATRONES: Patron[] = [
  {
    id: "evitador",
    nombre: "El Evitador",
    esencia: "Mejor no mirar.",
    preguntas: [
      "¿Postergas revisar tu cuenta, tus extractos o tus deudas?",
      "¿Prefieres no saber exactamente cuánto ganas, gastas o debes?",
      "¿Cambias de tema cuando la conversación va hacia el dinero?",
      "¿Esperas que otra persona se encargue de las decisiones de dinero?",
      "¿Te quedas en blanco cuando te preguntan cuánto deberías cobrar?",
    ],
    senales: "Dice «no sé cuánto gano» o «no sé cuánto debo», cambia de tema, mira a otro para responder, se queda en blanco con las cifras.",
    origen: "En algún momento mirar el dinero dolía o confundía, y aprendiste que no mirar te daba paz.",
    regalo: "Calma y confianza. Cuando las unes con claridad, tu dinero deja de ser un misterio y se vuelve tu herramienta.",
    practica: "Una vez por semana, quince minutos con un café: mira tus cuentas, anota tres números y celebra que lo hiciste.",
    pregunta: "¿Qué tranquilidad ganarías si supieras exactamente dónde está tu dinero?",
    declaracion: "Miro mi dinero con calma y lo dirijo con claridad.",
  },
  {
    id: "renunciante",
    nombre: "El Renunciante",
    esencia: "Tener dinero me aleja de lo bueno.",
    preguntas: [
      "¿Sientes culpa cuando te pagan bien o cuando tienes más que los que te rodean?",
      "¿Cobras menos de lo que vale tu trabajo o regalas tus servicios?",
      "¿Crees, en el fondo, que el dinero aleja de lo bueno o de lo espiritual?",
      "¿El dinero que te llega sin esfuerzo (herencia, regalo, bono) se te va rápido?",
      "¿Te incomoda que te vean como una persona con dinero?",
    ],
    senales: "Habla de los ricos con desdén, se disculpa por cobrar, regala su trabajo, cuenta herencias o premios que «se fueron».",
    origen: "En algún momento aprendiste que tener dinero te alejaba de ser buena persona o de los tuyos.",
    regalo: "Sentido y generosidad. El dinero en tus manos se vuelve servicio cuando te permites recibirlo.",
    practica: "Cuando esta semana te paguen o te elogien, di solo «gracias» y quédatelo completo, sin devolverlo ni explicarlo.",
    pregunta: "¿A cuántas personas más podrías ayudar si te permitieras prosperar?",
    declaracion: "Recibo con gratitud: mi prosperidad también es servicio.",
  },
  {
    id: "guardian",
    nombre: "El Guardián",
    esencia: "Nunca es suficiente para estar a salvo.",
    preguntas: [
      "¿Te cuesta gastar en ti, aunque tengas el dinero?",
      "¿Sientes que lo que tienes guardado nunca es suficiente?",
      "¿Dejas pasar oportunidades por miedo a perder?",
      "¿Cuidas tu dinero con una tensión que no te deja disfrutarlo?",
      "¿Desconfías de que otros sepan o manejen tu dinero?",
    ],
    senales: "Calcula todo, habla de imprevistos, se niega gustos pequeños, desconfía de bancos o socios, repite «por si acaso».",
    origen: "En algún momento faltó, o pudo faltar, y aprendiste que guardar era la forma de estar a salvo.",
    regalo: "Prudencia y orden. Una base sólida que, cuando la sueltas un poco, te deja disfrutar lo que construiste.",
    practica: "Separa este mes un monto pequeño solo para disfrutar y gástalo completo en algo que te haga sentir próspero.",
    pregunta: "¿Cuánto es suficiente para ti, y qué harás cuando llegues ahí?",
    declaracion: "Estoy a salvo: mi dinero me cuida y también me deja disfrutar.",
  },
  {
    id: "gastador",
    nombre: "El Gastador emocional",
    esencia: "Comprar me hace sentir mejor.",
    preguntas: [
      "¿Compras para calmarte, premiarte o salir de un mal día?",
      "¿El dinero se te va casi tan rápido como llega?",
      "¿Ocultas o maquillas algunas compras ante tu pareja o tu familia?",
      "¿Gastas dinero que todavía no tienes (tarjeta, bono, pago futuro)?",
      "¿Sientes culpa después de comprar y aun así vuelves a hacerlo?",
    ],
    senales: "Cuenta compras de impulso o deudas de tarjeta, dice «me lo merecía» o «solo es dinero», menciona compras que esconde.",
    origen: "En algún momento comprar o recibir algo calmó una emoción, y el dinero se volvió tu forma de consolarte o de celebrar.",
    regalo: "Gusto por la vida. Cuando le das un plan, tu capacidad de disfrutar se convierte en prosperidad.",
    practica: "Antes de una compra no planeada, respira tres veces y espera 24 horas. Si mañana la sigues queriendo, decides tranquilo.",
    pregunta: "¿Qué emoción buscas cuando compras, y de qué otra forma podrías regalártela?",
    declaracion: "Me doy lo que necesito con conciencia, y mi dinero crece conmigo.",
  },
  {
    id: "perseguidor",
    nombre: "El Perseguidor",
    esencia: "Cuando tenga más, por fin estaré bien.",
    preguntas: [
      "¿Sientes que vales según lo que ganas o lo que tienes?",
      "¿Crees que con más dinero por fin estarías en paz?",
      "¿Trabajas más de lo que tu cuerpo y tu familia pueden sostener?",
      "¿Te atraen las apuestas o las inversiones para ganar rápido y en grande?",
      "¿Te comparas con lo que tienen o ganan otros?",
    ],
    senales: "Se presenta con cifras, trabaja sin pausa, se compara, busca el negocio rápido, dice «cuando tenga tanto, estaré bien».",
    origen: "En algún momento sentiste que tu valor dependía de lo que lograras o tuvieras, y aprendiste a correr.",
    regalo: "Empuje y ambición. Una energía enorme que florece cuando nace de la plenitud y no de la carencia.",
    practica: "Regálate esta semana un bloque de descanso sin producir nada, y escribe qué sentiste.",
    pregunta: "¿Quién eres cuando no estás logrando nada?",
    declaracion: "Ya soy valioso; creo riqueza desde la plenitud.",
  },
  {
    id: "rescatador",
    nombre: "El Rescatador",
    esencia: "Dar es la forma de ser querido.",
    preguntas: [
      "¿Te cuesta decir que no cuando alguien te pide dinero?",
      "¿Sostienes económicamente a personas que podrían sostenerse solas?",
      "¿Sientes que demuestras amor con lo que das o pagas?",
      "¿Pones las necesidades de dinero de otros antes que las tuyas?",
      "¿Sientes que sacar adelante a tu familia es tu deber?",
    ],
    senales: "Mantiene a hijos adultos o familiares, presta y no le pagan, se siente responsable de todos, siente culpa al poner límites.",
    origen: "En algún momento aprendiste que dar era la forma de ser querido o de mantener unida a tu familia.",
    regalo: "Lealtad y un corazón grande. Tu generosidad transforma vidas cuando primero te incluye a ti.",
    practica: "La próxima vez que te pidan dinero, responde «déjame pensarlo» y decide en 24 horas, desde la calma.",
    pregunta: "¿Qué pasaría si las personas que amas también aprendieran a sostenerse solas?",
    declaracion: "Me cuido primero para dar desde la abundancia.",
  },
];

/** Escala de frecuencia (0–3), la misma del test de autodescubrimiento. */
export const ESCALA = ["Nunca", "A veces", "Con frecuencia", "Siempre"] as const;

/** Las 30 preguntas intercaladas (una de cada patrón por ronda) para que la
 *  persona no identifique a qué patrón apunta cada bloque. */
export const PREGUNTAS_INTERCALADAS: { patron: PatronId; indice: number; texto: string }[] =
  [0, 1, 2, 3, 4].flatMap((i) => PATRONES.map((p) => ({ patron: p.id, indice: i, texto: p.preguntas[i] })));

// ---------------------------------------------------------------------------
// Parte 3 · Tu mentalidad (los archivos de riqueza de Eker, del 1 al 10)
// ---------------------------------------------------------------------------

export type MentalidadId =
  | "responsabilidad"
  | "intencion"
  | "compromiso"
  | "merecimiento"
  | "vision"
  | "valor"
  | "administracion"
  | "accion";

export type Dimension = {
  id: MentalidadId;
  nombre: string;
  pregunta: string;
  declaracion: string;
  accion: string;
};

export const MENTALIDAD: Dimension[] = [
  {
    id: "responsabilidad",
    nombre: "Responsabilidad",
    pregunta: "¿Cuánto sientes que tú creas tus resultados con el dinero?",
    declaracion: "Yo creo el nivel de mi prosperidad.",
    accion: "Cada noche anota algo que salió bien con tu dinero y cómo lo creaste tú.",
  },
  {
    id: "intencion",
    nombre: "Intención",
    pregunta: "¿Qué tanto juegas para ganar, y no solo para no perder o estar cómodo?",
    declaracion: "Juego para ganar: mi meta es la libertad.",
    accion: "Escribe tu meta de ingresos y de patrimonio para dentro de un año, con una cifra que te emocione.",
  },
  {
    id: "compromiso",
    nombre: "Compromiso",
    pregunta: "¿Qué tan comprometido estás con tu prosperidad, más allá de desearla?",
    declaracion: "Me comprometo con mi prosperidad.",
    accion: "Escribe en un párrafo por qué tu prosperidad es importante y compártelo con alguien que crea en ti.",
  },
  {
    id: "merecimiento",
    nombre: "Merecimiento",
    pregunta: "¿Qué tan fácil te resulta recibir: pagos, regalos, ayuda, elogios?",
    declaracion: "Me abro a recibir con alegría.",
    accion: "Recibe cada elogio con un «gracias» y celebra cada peso que llegue, por pequeño que sea.",
  },
  {
    id: "vision",
    nombre: "Visión de la riqueza",
    pregunta: "¿Qué tanto admiras a las personas prósperas y te inspiras en ellas?",
    declaracion: "Admiro a la gente próspera y aprendo de ella.",
    accion: "Elige a una persona próspera que admires y estudia cómo piensa y cómo decide.",
  },
  {
    id: "valor",
    nombre: "Tu valor",
    pregunta: "¿Qué tanto cobras y te das a conocer según lo que realmente vales?",
    declaracion: "Muestro mi valor con orgullo y lo cobro con alegría.",
    accion: "Califica del 1 al 10 cuánto crees en lo que ofreces, y haz un ajuste que suba esa nota.",
  },
  {
    id: "administracion",
    nombre: "Administración",
    pregunta: "¿Qué tan claro es el plan de tu dinero, y cuánto trabaja él para ti?",
    declaracion: "Administro mi dinero con orden y cariño.",
    accion: "Abre tus botes: 10 % para tu libertad y 10 % para disfrutar. Empieza aunque sea con poco.",
  },
  {
    id: "accion",
    nombre: "Acción",
    pregunta: "¿Qué tanto actúas a pesar del miedo y la incomodidad?",
    declaracion: "Actúo a pesar del miedo.",
    accion: "Haz esta semana una acción con dinero que te incomode: pedir, cobrar, proponer o invertir.",
  },
];

/** El método de los botes de Eker, para el plan del informe. */
export const BOTES = [
  { pct: 50, nombre: "Necesidades" },
  { pct: 10, nombre: "Libertad financiera" },
  { pct: 10, nombre: "Ahorro" },
  { pct: 10, nombre: "Formación" },
  { pct: 10, nombre: "Disfrute" },
  { pct: 10, nombre: "Dar" },
] as const;

// ---------------------------------------------------------------------------
// Estado y cálculo
// ---------------------------------------------------------------------------

export type Modelo = { estilos: string[]; relacion: RelacionModelo };

export type TestDineroState = {
  nombre: string;
  fecha: string;
  // Parte 1
  frases: string[];
  /** La frase que más pesa, con sus palabras (sale en el informe). */
  frasePrincipal: string;
  mama: Modelo;
  papa: Modelo;
  recuerdo: string;
  emociones: string[];
  significados: string[];
  motores: string[];
  termostato: TermostatoId;
  // Parte 2
  respuestas: Record<PatronId, (number | null)[]>;
  // Parte 3
  mentalidad: Record<MentalidadId, number | null>;
  // Cierre
  mantra: string;
  siguientePaso: string;
  /** Frases que apuntan a cada patrón (privado). */
  indicios: Record<PatronId, string>;
  notasPrivadas: string;
};

const porPatron = <T,>(v: () => T) => Object.fromEntries(PATRONES.map((p) => [p.id, v()])) as Record<PatronId, T>;

export function estadoInicial(): TestDineroState {
  return {
    nombre: "",
    fecha: new Date().toISOString().slice(0, 10),
    frases: [],
    frasePrincipal: "",
    mama: { estilos: [], relacion: "" },
    papa: { estilos: [], relacion: "" },
    recuerdo: "",
    emociones: [],
    significados: [],
    motores: [],
    termostato: "",
    respuestas: porPatron(() => [null, null, null, null, null]),
    mentalidad: Object.fromEntries(MENTALIDAD.map((d) => [d.id, null])) as Record<MentalidadId, number | null>,
    mantra: "",
    siguientePaso: "",
    indicios: porPatron(() => ""),
    notasPrivadas: "",
  };
}

export type PuntajePatron = { patron: Patron; puntos: number; pct: number; respondidas: number };

/** Puntaje de cada patrón (0–15 → %), ordenado de mayor a menor. */
export function puntajes(s: TestDineroState): PuntajePatron[] {
  return PATRONES.map((p) => {
    const r = s.respuestas[p.id];
    const puntos = r.reduce<number>((x, v) => x + (v ?? 0), 0);
    return { patron: p, puntos, pct: Math.round((puntos / 15) * 100), respondidas: r.filter((v) => v != null).length };
  }).sort((a, b) => b.pct - a.pct);
}

/** Los dos patrones que más pesan (solo los que tienen algo de puntaje). */
export function principales(s: TestDineroState): PuntajePatron[] {
  return puntajes(s).filter((p) => p.pct > 0).slice(0, 2);
}

export function nivel(pct: number): string {
  if (pct >= 67) return "Muy presente";
  if (pct >= 34) return "Presente";
  return "Leve";
}

/** Las dos dimensiones de mentalidad más bajas (las que se trabajan primero). */
export function mentalidadPorFortalecer(s: TestDineroState): Dimension[] {
  return MENTALIDAD.filter((d) => s.mentalidad[d.id] != null)
    .sort((a, b) => (s.mentalidad[a.id] ?? 0) - (s.mentalidad[b.id] ?? 0))
    .slice(0, 2);
}

export function promedioMentalidad(s: TestDineroState): number | null {
  const vals = MENTALIDAD.map((d) => s.mentalidad[d.id]).filter((v): v is number => v != null);
  return vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null;
}

/** La frase heredada que más pesa: la escrita, o la primera marcada. */
export function fraseHeredada(s: TestDineroState): string {
  return s.frasePrincipal.trim() || s.frases[0] || "";
}

export function motorDeCarencia(s: TestDineroState): boolean {
  return s.motores.some((m) => MOTORES_CARENCIA.includes(m));
}

export function lecturaTermostato(s: TestDineroState): string {
  return TERMOSTATOS.find((t) => t.id === s.termostato)?.lectura ?? "";
}
