/**
 * Test de Autodescubrimiento — Rueda de la Vida + las cinco heridas.
 *
 * Contenido del test que Holman aplica en sesión (antes vivía en un Word:
 * "Plantilla de Observación para Sesiones de Test de Autodescubrimiento").
 * Aquí están las preguntas, la escala y el cálculo; la página vive en
 * src/admin/test/ y el informe que se regala a la persona en InformeTest.tsx.
 *
 * Marco de las heridas: Lise Bourbeau (rechazo, abandono, humillación,
 * traición, injusticia) con su máscara correspondiente. Es una herramienta de
 * coaching y autoconocimiento: el informe habla de patrones y de fortalezas,
 * nunca de diagnósticos. Por eso las "patologías relacionadas" del Word viejo
 * ya no se muestran.
 */

export type AreaId =
  | "salud"
  | "amorPropio"
  | "pareja"
  | "familia"
  | "amigos"
  | "finanzas"
  | "carrera"
  | "crecimiento"
  | "diversion"
  | "espiritualidad";

export type Area = { id: AreaId; nombre: string; pregunta: string };

/** Las 10 áreas de la Rueda de la Vida, con la pregunta que se lee en voz alta. */
export const AREAS: Area[] = [
  { id: "salud", nombre: "Salud", pregunta: "¿Cómo están tu energía, tu descanso y la relación con tu cuerpo?" },
  { id: "amorPropio", nombre: "Amor propio", pregunta: "¿Qué tan bien te tratas, te hablas y te cuidas cuando nadie te ve?" },
  { id: "pareja", nombre: "Vida afectiva", pregunta: "Con pareja o sin ella, ¿qué tan en paz y pleno te sientes con tu vida amorosa hoy?" },
  { id: "familia", nombre: "Familia", pregunta: "¿Cuánta paz y cercanía sientes con tu familia?" },
  { id: "amigos", nombre: "Amistades", pregunta: "¿Qué tan acompañado te sientes por tus amistades?" },
  { id: "finanzas", nombre: "Finanzas", pregunta: "¿Cuánta tranquilidad y orden sientes con tu dinero?" },
  { id: "carrera", nombre: "Carrera / Sentido", pregunta: "¿Qué tanto sentido tiene para ti lo que haces cada día?" },
  { id: "crecimiento", nombre: "Crecimiento personal", pregunta: "¿Cuánto estás aprendiendo y evolucionando en esta etapa?" },
  { id: "diversion", nombre: "Disfrute", pregunta: "¿Cuánto espacio le das al juego, al descanso y a lo que te hace feliz?" },
  { id: "espiritualidad", nombre: "Espiritualidad", pregunta: "¿Qué tan conectado te sientes contigo y con algo más grande que tú?" },
];

export type HeridaId = "rechazo" | "abandono" | "humillacion" | "traicion" | "injusticia";

export type Herida = {
  id: HeridaId;
  nombre: string;
  mascara: string;
  /** Cinco preguntas, respondidas con la escala de frecuencia. */
  preguntas: [string, string, string, string, string];
  /** Solo para Holman: qué observar en lo que la persona dice sin preguntarle. */
  senales: string;
  // --- Lo que ve la persona en su informe ---
  origen: string;
  fuerza: string;
  practica: string;
  pregunta: string;
};

export const HERIDAS: Herida[] = [
  {
    id: "rechazo",
    nombre: "Rechazo",
    mascara: "Huidizo",
    preguntas: [
      "Cuando llegas a un lugar nuevo, ¿buscas pasar desapercibido, como si ocupar espacio fuera pedir demasiado?",
      "Cuando alguien te reconoce o te elogia, ¿sientes por dentro que es exagerado o que pronto verán quién eres \"de verdad\"?",
      "Ante una tensión o un conflicto, ¿tu primer impulso es desaparecer: callarte, irte o encerrarte en tu mundo?",
      "¿Sientes que tienes que justificar tu lugar —en tu familia, tu trabajo o tu relación— para merecer estar ahí?",
      "¿Te cuesta creer que alguien te elija tal como eres, sin que tengas que ganártelo?",
    ],
    senales: "Minimiza sus logros, habla bajito o se disculpa por ocupar tiempo, cuenta que se aísla, dice «no encajo» o «nadie me entiende».",
    origen: "En algún momento aprendiste a hacerte pequeño para estar a salvo.",
    fuerza: "Presencia: ocupar tu espacio con la certeza de que tu existencia ya es valiosa.",
    practica: "Esta semana, quédate un minuto más en una conversación que te incomode y di en voz alta lo que piensas.",
    pregunta: "¿Qué harías distinto si supieras que tu lugar ya está asegurado?",
  },
  {
    id: "abandono",
    nombre: "Abandono",
    mascara: "Dependiente",
    preguntas: [
      "Cuando alguien importante tarda en responderte, ¿tu mente empieza a imaginar que algo cambió entre ustedes?",
      "¿Te quedas en relaciones, trabajos o grupos más tiempo del que quisieras por miedo a quedarte solo?",
      "¿Necesitas que otros aprueben tus decisiones antes de sentirte seguro de tomarlas?",
      "Cuando estás a solas contigo, sin planes ni pantallas, ¿aparece un vacío o una inquietud difícil de habitar?",
      "¿Das más de lo que recibes con la esperanza de que así las personas se queden?",
    ],
    senales: "Habla mucho de otros y poco de sí, busca tu aprobación durante la sesión, describe relaciones donde espera, pide o se adapta.",
    origen: "En algún momento sentiste que el afecto podía irse, y aprendiste a retenerlo.",
    fuerza: "Autonomía afectiva: disfrutar de tu propia compañía y elegir a los demás desde la plenitud.",
    practica: "Regálate una hora a solas, sin pantallas, y escribe tres cosas que descubras de ti.",
    pregunta: "¿Quién eres cuando nadie te está mirando?",
  },
  {
    id: "humillacion",
    nombre: "Humillación",
    mascara: "Masoquista",
    preguntas: [
      "¿Sientes vergüenza de tu cuerpo, de tus deseos o de alguna parte de tu historia que prefieres guardar?",
      "¿Dices que sí a lo que te piden aunque por dentro quisieras decir que no?",
      "Cuando disfrutas algo solo para ti —descansar, darte un gusto, celebrar—, ¿aparece la culpa?",
      "¿Te encargas de los problemas de todos y dejas los tuyos para el final?",
      "¿Te hablas con dureza o te burlas de ti antes de que otro pueda hacerlo?",
    ],
    senales: "Se ríe de sí misma, carga responsabilidades ajenas, se castiga («soy un desastre»), le cuesta nombrar lo que desea o cobra por debajo de su valor.",
    origen: "En algún momento aprendiste a cargar con todo para merecer amor.",
    fuerza: "Dignidad y libertad: disfrutar sin culpa y decir que sí solo cuando es un sí de verdad.",
    practica: "Permítete un placer pequeño cada día y recíbelo completo, sin explicarlo ni justificarlo.",
    pregunta: "¿Qué te darías hoy si supieras que ya lo mereces?",
  },
  {
    id: "traicion",
    nombre: "Traición",
    mascara: "Controlador",
    preguntas: [
      "¿Te cuesta delegar porque sientes que, si no lo haces tú, no saldrá como debe?",
      "Cuando alguien incumple lo que prometió, ¿lo vives como algo personal y te cuesta volver a confiar?",
      "¿Necesitas anticiparte a todo y tener un plan B para sentirte tranquilo?",
      "¿Te impacientas o te irritas cuando las cosas van a otro ritmo o de otra forma que la que planeaste?",
      "¿Sientes que pedir ayuda o mostrar necesidad te deja en desventaja?",
    ],
    senales: "Quiere dirigir la sesión, anticipa tus preguntas, habla de promesas rotas, desconfía de socios o equipos, necesita tener la razón.",
    origen: "En algún momento confiar tuvo un costo, y aprendiste a tomar el mando.",
    fuerza: "Confianza y entrega: delegar, soltar el control y dejar que la vida también te sorprenda.",
    practica: "Delega una tarea esta semana y deja que se resuelva a su manera, sin revisarla.",
    pregunta: "¿Qué se abriría en tu vida si pudieras confiar un poco más?",
  },
  {
    id: "injusticia",
    nombre: "Injusticia",
    mascara: "Rígido",
    preguntas: [
      "¿Sientes que algo solo es válido si está perfecto?",
      "¿Te cuesta darte permiso para descansar si sientes que todavía no te lo has ganado?",
      "Cuando algo te duele, ¿lo explicas con la cabeza en lugar de permitirte sentirlo?",
      "¿Te afecta profundamente ver reglas que se rompen o personas que reciben lo que no merecen?",
      "¿Te exiges el doble de lo que le exigirías a alguien que amas?",
    ],
    senales: "Postura recta, respuestas precisas, habla de lo que «debería», justifica todo, muestra poca emoción aunque el tema sea fuerte.",
    origen: "En algún momento aprendiste que para ser valorado había que hacerlo todo bien.",
    fuerza: "Flexibilidad y ternura: permitirte sentir, equivocarte y descansar sin tener que ganártelo.",
    practica: "Termina algo \"suficientemente bien\" esta semana y celebra que lo terminaste.",
    pregunta: "¿Cómo te tratarías si fueras tu mejor amigo?",
  },
];

/** Escala de frecuencia (0–3) para las 25 preguntas de heridas. */
export const ESCALA = ["Casi nunca", "A veces", "Con frecuencia", "Casi siempre"] as const;

/** Las 25 preguntas intercaladas (una de cada herida por ronda) para que la
 *  persona no identifique a qué herida apunta cada bloque. */
export const PREGUNTAS_INTERCALADAS: { herida: HeridaId; indice: number; texto: string }[] =
  [0, 1, 2, 3, 4].flatMap((i) =>
    HERIDAS.map((h) => ({ herida: h.id, indice: i, texto: h.preguntas[i] }))
  );

export type Respuestas = Record<HeridaId, (number | null)[]>;

export type TestState = {
  nombre: string;
  fecha: string;
  rueda: Record<AreaId, number | null>;
  /** Área elegida para explorar; vacía = la más baja. */
  areaFoco: AreaId | "";
  sentir: string;
  frena: string;
  distinto: string;
  respuestas: Respuestas;
  /** Frases que la persona dijo y apuntan a cada herida (privado). */
  indicios: Record<HeridaId, string>;
  emociones: string;
  siguientePaso: string;
  notasPrivadas: string;
};

const vacioHeridas = <T,>(v: () => T) =>
  Object.fromEntries(HERIDAS.map((h) => [h.id, v()])) as Record<HeridaId, T>;

export function estadoInicial(): TestState {
  return {
    nombre: "",
    fecha: new Date().toISOString().slice(0, 10),
    rueda: Object.fromEntries(AREAS.map((a) => [a.id, null])) as Record<AreaId, number | null>,
    areaFoco: "",
    sentir: "",
    frena: "",
    distinto: "",
    respuestas: vacioHeridas(() => [null, null, null, null, null]),
    indicios: vacioHeridas(() => ""),
    emociones: "",
    siguientePaso: "",
    notasPrivadas: "",
  };
}

/** Área más baja de la rueda (la primera si hay empate). */
export function areaMasBaja(s: TestState): Area | null {
  let min: Area | null = null;
  for (const a of AREAS) {
    const v = s.rueda[a.id];
    if (v == null) continue;
    if (!min || v < (s.rueda[min.id] ?? 11)) min = a;
  }
  return min;
}

export function areaFoco(s: TestState): Area | null {
  return AREAS.find((a) => a.id === s.areaFoco) ?? areaMasBaja(s);
}

export function promedioRueda(s: TestState): number | null {
  const vals = AREAS.map((a) => s.rueda[a.id]).filter((v): v is number => v != null);
  return vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null;
}

export type Puntaje = { herida: Herida; puntos: number; pct: number; respondidas: number };

/** Puntaje de cada herida (0–15 → %), ordenado de mayor a menor. */
export function puntajes(s: TestState): Puntaje[] {
  return HERIDAS.map((h) => {
    const r = s.respuestas[h.id];
    const puntos = r.reduce<number>((x, v) => x + (v ?? 0), 0);
    return {
      herida: h,
      puntos,
      pct: Math.round((puntos / 15) * 100),
      respondidas: r.filter((v) => v != null).length,
    };
  }).sort((a, b) => b.pct - a.pct);
}

export function nivel(pct: number): string {
  if (pct >= 67) return "Muy presente";
  if (pct >= 34) return "Presente";
  return "Leve";
}
