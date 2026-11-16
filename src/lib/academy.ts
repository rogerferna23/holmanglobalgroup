import { leerCampana } from "@/lib/campana";
import { leerReferido } from "@/lib/referido";
import { getSupabase } from "@/lib/supabase";

/**
 * ECOS Academy — la primera certificación: Coach M2H2.
 *
 * El contenido sale del documento de diseño (claude.ai/artifact/DFw1W3Mr6LXZuUHUfdmx9Z).
 * Lo que está marcado «propuesta» todavía lo tiene que confirmar Holman: el
 * precio no se muestra en la página hasta entonces.
 *
 * Es una certificación PRIVADA de Holman Global Group LLC. En la página nunca
 * van las palabras acreditado, oficial, título, universitario, licencia ni ICF.
 */

/** Fechas del grupo fundador (propuesta del 1 nov 2026). */
export const PILOTO = {
  preventa: "16 de noviembre",
  cierre: "15 de diciembre",
  inicio: "12 de enero de 2027",
  graduacion: "6 de abril de 2027",
  minimo: 6,
  maximo: 10,
} as const;

export const FORMATO = [
  { horas: 36, t: "Clases en vivo", d: "Una por semana por Zoom con Holman, de 3 horas. Quedan grabadas en tu aula." },
  { horas: 12, t: "Práctica en tríos", d: "Coach, cliente y observador. Una hora por semana, rotando los papeles." },
  { horas: 6, t: "Mentoría grupal", d: "Cada dos semanas revisamos sesiones grabadas de los alumnos." },
  { horas: 6, t: "Aula a tu ritmo", d: "Lecturas, videos y ejercicios entre una clase y otra." },
] as const;

export const PASOS_M2H2 = [
  { letra: "M", t: "Metas", d: "Ver la vida completa y elegir la meta a 90 días que mueve todo lo demás." },
  { letra: "M", t: "Mentalidad", d: "Las creencias, las heridas y la relación con el dinero que frenan al cliente." },
  { letra: "H", t: "Habilidades", d: "Lo que el cliente tiene que aprender para lograr su meta, y cómo lo aprende." },
  { letra: "H", t: "Hábitos", d: "Compromisos semanales y seguimiento para que el cambio se quede." },
] as const;

export const TEMARIO = [
  { semana: 1, modulo: "Bienvenida: Corazón de Elefante", aprende: "Qué es y qué no es coaching, ética y confidencialidad", herramienta: "Acuerdo de coaching" },
  { semana: 2, modulo: "Competencias del coach I", aprende: "Presencia, escucha activa y silencio", herramienta: "Ejercicio de escucha" },
  { semana: 3, modulo: "Competencias del coach II", aprende: "Preguntas poderosas, acuerdos de sesión y cierre con compromiso", herramienta: "Sesión de 60 minutos" },
  { semana: 4, modulo: "Metas I", aprende: "Diagnóstico de la vida completa y el área que mueve todo", herramienta: "Rueda de la Vida" },
  { semana: 5, modulo: "Metas II", aprende: "La meta a 90 días, metas pequeñas y la Sesión de Claridad", herramienta: "Plan a 90 días" },
  { semana: 6, modulo: "Mentalidad I", aprende: "Creencias, juicios y la historia que se cuenta el cliente", herramienta: "Test de autodescubrimiento" },
  { semana: 7, modulo: "Mentalidad II", aprende: "La mentalidad del dinero y cuándo derivar a un psicólogo", herramienta: "Test del patrón del dinero" },
  { semana: 8, modulo: "Habilidades", aprende: "Qué tiene que aprender el cliente y cómo lo aprende", herramienta: "Mapa de habilidades" },
  { semana: 9, modulo: "Hábitos", aprende: "Compromisos, seguimiento y sistemas que sostienen el cambio", herramienta: "Tablero de compromisos" },
  { semana: 10, modulo: "El proceso completo", aprende: "Primera sesión, seguimiento, actas y cierre", herramienta: "Acta de sesión" },
  { semana: 11, modulo: "El negocio del coach", aprende: "Oferta, precio, primeros 5 clientes y ventas sin presión", herramienta: "Oferta en una página" },
  { semana: 12, modulo: "Cierre y certificación", aprende: "Presentación del caso final y graduación", herramienta: "Caso final" },
] as const;

export const REQUISITOS = [
  { t: "Asistencia", d: "Al menos 10 de las 12 clases en vivo." },
  { t: "Práctica", d: "10 horas de sesiones reales, anotadas en tu bitácora." },
  { t: "Dos sesiones evaluadas", d: "Grabadas y revisadas con una rúbrica de 8 puntos." },
  { t: "Examen", d: "30 preguntas sobre el método y la ética." },
  { t: "Caso final", d: "Un cliente acompañado en 4 sesiones, presentado en la semana 12." },
] as const;

export const RECIBES = [
  "Certificado en PDF con tu código de verificación",
  "Página de verificación en holmanglobalgroup.com",
  "Insignia para tu perfil de LinkedIn",
  "Tu lugar en el directorio de coaches M2H2",
  "El kit del coach: Rueda de la Vida, tests, plan a 90 días, acta, acuerdo y rúbrica",
] as const;

export const PERFILES = [
  { id: "ser-coach", t: "Quiero ser coach", d: "y vivir de acompañar a otros" },
  { id: "tengo-formacion", t: "Ya soy coach", d: "y quiero un método y un proceso claro" },
  { id: "liderar", t: "Lidero personas", d: "y quiero acompañar a mi equipo o a mis clientes" },
] as const;

export type Perfil = (typeof PERFILES)[number]["id"];

export const PREGUNTAS = [
  {
    p: "¿Qué tipo de certificado recibo?",
    r: "Una certificación privada de ECOS Academy, emitida por Holman Global Group LLC. Dice exactamente lo que hiciste: 60 horas, 12 semanas y una evaluación práctica aprobada. Cualquier persona puede verificarla en el sitio con tu código.",
  },
  {
    p: "¿Necesito experiencia previa?",
    r: "No. Empezamos por las bases del coach. Si ya tienes formación, lo que te llevas es un método completo y un proceso de sesiones que puedes usar desde la primera semana.",
  },
  {
    p: "¿Y si no puedo llegar a una clase en vivo?",
    r: "Cada clase queda grabada en tu aula. Para certificarte necesitas al menos 10 de las 12 en vivo, porque ahí es donde se practica.",
  },
  {
    p: "¿Qué pasa si no apruebo la evaluación?",
    r: "Puedes repetirla una vez, sin pagar de nuevo, dentro de los 3 meses siguientes.",
  },
  {
    p: "¿Cuánto cuesta?",
    r: "El grupo fundador tiene un precio especial que solo conoce la lista de espera. Anótate y te lo enviamos antes de abrir las inscripciones.",
  },
] as const;

export type DatosLista = { nombre: string; email: string; whatsapp: string; perfil: Perfil | null };

/** Anota a la persona en la lista de espera. Devuelve `true` si ya estaba. */
export async function unirseListaAcademy(d: DatosLista): Promise<boolean> {
  const { error } = await getSupabase()
    .from("hgg_academy_lista")
    .insert({
      nombre: d.nombre.trim(),
      email: d.email.trim().toLowerCase(),
      whatsapp: d.whatsapp.trim(),
      perfil: d.perfil,
      ref: leerReferido(),
      campana: leerCampana(),
    });
  if (!error) return false;
  if (error.code === "23505") return true;
  throw new Error("No pudimos anotarte. Intenta de nuevo en un momento.");
}
