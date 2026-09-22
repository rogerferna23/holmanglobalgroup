/**
 * ECOS Business Club — configuración de negocio y tipos.
 *
 * Todo lo que es una DECISIÓN (precio, plazas, cupo fundador, fecha de la
 * prueba, puntos de XP, insignias) vive aquí para que cambiarlo sea tocar una
 * constante. Los importes que Stripe cobra de verdad salen del Price
 * configurado en Stripe y llegan por webhook — este archivo pinta y calcula;
 * no cobra. Los puntos de XP los aplica el servidor (funciones SQL); aquí solo
 * se muestran.
 *
 * Documento maestro: https://claude.ai/code/artifact/bafa0f68-ee42-4b42-ba9d-5d6a28259ae1
 * Especificación:    https://claude.ai/code/artifact/1aff63f2-ac86-48e0-82f1-4ddf6f14aa6e
 */

export const ECOS = {
  brand: "ECOS",
  category: "Business Club",
  descriptor: "Escuela de Comunicación, Oratoria y Sentido",
  claim: "Las habilidades necesarias para un negocio: vender, comunicar y hablar en público.",

  /** Precio de lista, USD al mes. Tres plazas de profesor → $47. */
  priceUsd: 47,
  /** Plan anual: dos meses gratis. */
  priceAnualUsd: 470,
  /** Lo que cobra cada plaza de profesor por miembro activo al mes. */
  plazaUsd: 4,

  /**
   * Cohorte fundadora: octubre gratis con tarjeta y cupo de 50.
   *
   * No se promete que el precio quede congelado. En la práctica, si el precio
   * sube se crea un Price nuevo en Stripe y quien ya está sigue en el suyo —así
   * funcionan las suscripciones—, pero eso queda como decisión de Holman más
   * adelante, no como algo prometido de antemano.
   */
  founderCap: 50,
  /**
   * Fin del mes gratis. Se pone al mediodía del 1 de noviembre a propósito: es
   * el momento del primer cobro y es lo que Stripe le muestra a la persona. Con
   * el 31 a medianoche, Stripe decía «31 de octubre» y el sitio «1 de
   * noviembre» — dos fechas para lo mismo. Se edita en Ajustes.
   */
  trialEndsAt: "2026-11-01T12:00:00-05:00",
  /** Cómo se nombra esa fecha en los textos de venta. */
  primerCobroTexto: "1 de noviembre",
  launchDate: "2026-10-01",
  /** Días para recuperar el avance tras dejar de estar activo. */
  graceDays: 14,
  /** Beneficios del miembro sobre los productos de HGG. */
  descuentoMiembroPct: 10,
  comisionReferidoPct: 10,

  plazas: [
    { id: "ventas", label: "Ventas", teacher: "Zack", day: "Semana 1 · martes clase, viernes práctica" },
    { id: "marketing", label: "Marketing", teacher: "Ingrid", day: "Semana 2 · martes taller" },
    { id: "oratoria", label: "Oratoria", teacher: "Holman", day: "Semana 3 · martes clase, viernes práctica" },
  ] as const,

  /** Reparto de lo que queda tras pagos y profesores (acordado sep 2026). */
  socios: [
    { nombre: "Holman", pct: 70 },
    { nombre: "Roger", pct: 30 },
  ] as const,

  stripePct: 0.029,
  stripeFixed: 0.3,
  embajadoresPct: 0.04,

  /** Modo RPG — espejo de ecos_xp_for() y de las funciones SQL. */
  xp: {
    clase: 20,
    practica: 30,
    masterclass: 10,
    invitado: 20,
    reto: 50,
    visto: 5,
    referido: 30,
    porNivel: 100,
  },
} as const;

// ---------------------------------------------------------------------------
// Reparto mensual
// ---------------------------------------------------------------------------

export type Reparto = {
  miembros: number; bruto: number; stripe: number; embajadores: number;
  profesores: number; porPlaza: number; sociedad: number;
  /** Lo que le toca a cada socio, ya con su porcentaje aplicado. */
  socios: { nombre: string; pct: number; monto: number }[];
};

/**
 * Cómo se reparte el dinero del club. Vive en ecos_settings (clave «reparto»)
 * para que Holman lo edite desde el panel: quién ocupa cada plaza, cuánto paga
 * cada una y el porcentaje de cada socio. Si no hay nada guardado, se usan los
 * valores de ECOS.
 *
 * Ojo: esto es la calculadora del reparto, no un sistema de pagos. Cambiar
 * estos números no cobra ni transfiere nada — dice cuánto le toca a cada quien.
 */
export type ConfigReparto = {
  plazaUsd: number;
  plazas: { label: string; teacher: string }[];
  socios: { nombre: string; pct: number }[];
};

export const REPARTO_POR_DEFECTO: ConfigReparto = {
  plazaUsd: ECOS.plazaUsd,
  plazas: ECOS.plazas.map((p) => ({ label: p.label, teacher: p.teacher })),
  socios: ECOS.socios.map((s) => ({ nombre: s.nombre, pct: s.pct })),
};

/** Lee la configuración guardada; si está vacía o rota, devuelve la de siempre. */
export function leerReparto(json: string | undefined | null): ConfigReparto {
  if (!json?.trim()) return REPARTO_POR_DEFECTO;
  try {
    const c = JSON.parse(json) as Partial<ConfigReparto>;
    return {
      plazaUsd: Number(c.plazaUsd) > 0 ? Number(c.plazaUsd) : REPARTO_POR_DEFECTO.plazaUsd,
      plazas: Array.isArray(c.plazas) && c.plazas.length ? c.plazas : REPARTO_POR_DEFECTO.plazas,
      socios: Array.isArray(c.socios) && c.socios.length ? c.socios : REPARTO_POR_DEFECTO.socios,
    };
  } catch {
    return REPARTO_POR_DEFECTO;
  }
}

export function repartoMensual(
  miembrosActivos: number,
  plazasOcupadas?: number,
  precio = ECOS.priceUsd,
  config: ConfigReparto = REPARTO_POR_DEFECTO
): Reparto {
  const nPlazas = plazasOcupadas ?? config.plazas.length;
  const bruto = miembrosActivos * precio;
  const stripe = miembrosActivos * (precio * ECOS.stripePct + ECOS.stripeFixed);
  const embajadores = bruto * ECOS.embajadoresPct;
  const porPlaza = miembrosActivos * config.plazaUsd;
  const profesores = porPlaza * nPlazas;
  const sociedad = Math.max(0, bruto - stripe - embajadores - profesores);
  return {
    miembros: miembrosActivos, bruto, stripe, embajadores, profesores, porPlaza, sociedad,
    socios: config.socios.map((s) => ({ nombre: s.nombre, pct: s.pct, monto: sociedad * (s.pct / 100) })),
  };
}

/**
 * El reparto de verdad: sobre el dinero que entró, no sobre cuántos miembros hay.
 *
 * Es la diferencia que importa a la hora de pagar. Quien entra con el mes gratis
 * no deja nada ese mes, así que al profesor no le corresponde nada por él; quien
 * usa un cupón deja menos, y el profesor cobra en la misma proporción. Cada plaza
 * vale su parte de cada dólar cobrado (con $4 sobre $47, el 8,5%), venga de donde
 * venga ese dólar.
 *
 * @param cobrado  Suma de las facturas pagadas, en dólares (lo que Stripe cobró de verdad).
 * @param facturas Cuántas facturas fueron, para la comisión fija de $0.30 de cada una.
 */
export function repartoSobreIngreso(
  cobrado: number,
  facturas: number,
  plazasOcupadas: number,
  config: ConfigReparto = REPARTO_POR_DEFECTO,
  precio = ECOS.priceUsd
): Reparto {
  const bruto = Math.max(0, cobrado);
  const stripe = bruto > 0 ? bruto * ECOS.stripePct + facturas * ECOS.stripeFixed : 0;
  const embajadores = bruto * ECOS.embajadoresPct;
  // La parte de cada plaza es una fracción de lo cobrado, no un fijo por cabeza.
  const porPlaza = bruto * (config.plazaUsd / precio);
  const profesores = porPlaza * plazasOcupadas;
  const sociedad = Math.max(0, bruto - stripe - embajadores - profesores);
  return {
    miembros: precio > 0 ? bruto / precio : 0, bruto, stripe, embajadores, profesores, porPlaza, sociedad,
    socios: config.socios.map((s) => ({ nombre: s.nombre, pct: s.pct, monto: sociedad * (s.pct / 100) })),
  };
}

export function usd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// ---------------------------------------------------------------------------
// Filas de Supabase
// ---------------------------------------------------------------------------

export type MemberStatus = "pendiente" | "activo" | "pausado" | "cancelado";
export type Plan = "mensual" | "anual";
export type Skill = "ventas" | "marketing" | "oratoria";

export const SKILLS: Skill[] = ["ventas", "marketing", "oratoria"];
export const SKILL_LABEL: Record<Skill, string> = { ventas: "Ventas", marketing: "Marketing", oratoria: "Oratoria" };

export type EcosMember = {
  id: string;
  email: string;
  name: string | null;
  status: MemberStatus;
  /** Da una materia: entra sin pagar y edita sus propias clases. */
  teacher: boolean;
  price_usd: number;
  founder: boolean;
  plan: Plan;
  started_at: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  inactive_since: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  referred_by: string | null;
  referral_code: string | null;
  free_months_earned: number;
  free_months_used: number;
  whatsapp: string | null;
  city: string | null;
  country: string | null;
  business: string | null;
  goal: string | null;
  show_in_directory: boolean;
  created_at: string;
};

/** Lo que el miembro puede editar de sí mismo. */
export type MemberProfile = Pick<EcosMember, "name" | "whatsapp" | "city" | "country" | "business" | "goal" | "show_in_directory">;

export type LibraryKind = "curso" | "grabacion" | "recurso";

export type EcosLibraryItem = {
  id: string;
  title: string;
  description: string | null;
  kind: LibraryKind;
  url?: string | null;
  cover_url: string | null;
  unlock_month: number;
  published: boolean;
  sort_order: number;
  /** Lección dentro de un curso. */
  parent_id: string | null;
  /** Video en Bunny Stream (se incrusta dentro del panel). */
  bunny_video_id: string | null;
  skill: Skill | null;
  /** Cursos: precio de venta. Sin precio = incluido para todos los miembros. */
  price_usd?: number | null;
};

export type SessionKind = "clase" | "practica" | "masterclass";
export type SessionSubject = Skill | "abierta";

export type EcosSession = {
  id: string;
  starts_at: string;
  kind: SessionKind;
  subject: SessionSubject;
  title: string;
  /** Nombre a mostrar. */
  teacher: string | null;
  /** De quién es la sesión: quien puede prepararla desde su panel. */
  teacher_id: string | null;
  description: string | null;
  zoom_url: string | null;
  recording_id: string | null;
  open_to_guests: boolean;
  published: boolean;
};

export type EcosReto = {
  id: string;
  month: string;
  skill: Skill;
  title: string;
  description: string | null;
  active: boolean;
};

export type EcosSettings = Record<string, string>;

export const SESSION_KIND_LABEL: Record<SessionKind, string> = {
  clase: "Clase",
  practica: "Práctica",
  masterclass: "Masterclass",
};

export const SUBJECT_LABEL: Record<SessionSubject, string> = {
  ventas: "Ventas", marketing: "Marketing", oratoria: "Oratoria", abierta: "Abierta",
};

// ---------------------------------------------------------------------------
// Modo RPG
// ---------------------------------------------------------------------------

export type Progress = {
  xp: Record<Skill, number>;
  streak: number;
  badges: { badge: string; at: string }[];
  attended: string[];
  retos_done: string[];
  viewed: string[];
  months_active: number;
  referrals_total: number;
  referrals_active: number;
};

export const EMPTY_PROGRESS: Progress = {
  xp: { ventas: 0, marketing: 0, oratoria: 0 },
  streak: 0, badges: [], attended: [], retos_done: [], viewed: [],
  months_active: 0, referrals_total: 0, referrals_active: 0,
};

/** Cada 100 XP un nivel. Espejo de ecos_level(). */
export function levelOf(xp: number): number {
  return Math.max(1, Math.floor(xp / ECOS.xp.porNivel) + 1);
}
/** XP dentro del nivel actual (0–99) para la barra. */
export function levelProgress(xp: number): number {
  return xp % ECOS.xp.porNivel;
}
export function nivelEcos(xp: Record<Skill, number>): number {
  return Math.round((levelOf(xp.ventas) + levelOf(xp.marketing) + levelOf(xp.oratoria)) / 3);
}

export const BADGES: Record<string, { label: string; desc: string; icon: string }> = {
  primera_clase: { label: "Primera clase", desc: "Viniste. Eso ya es más que la mayoría.", icon: "◆" },
  racha_4: { label: "Racha de 4", desc: "Cuatro semanas seguidas.", icon: "🔥" },
  racha_12: { label: "Racha de 12", desc: "Tres meses sin faltar una semana.", icon: "🔥" },
  racha_26: { label: "Racha de 26", desc: "Medio año, semana tras semana.", icon: "🔥" },
  tres_retos: { label: "Tres retos", desc: "Presentaste tres retos frente a la sala.", icon: "★" },
  nivel_5: { label: "Nivel 5", desc: "Nivel 5 en una habilidad.", icon: "▲" },
  nivel_5_x3: { label: "Nivel 5 ×3", desc: "Nivel 5 en las tres habilidades.", icon: "▲" },
  nivel_10: { label: "Nivel 10", desc: "Nivel 10 en una habilidad.", icon: "◈" },
  trajo_3: { label: "Trajo a 3", desc: "Tres personas entraron por ti.", icon: "●" },
  fundador: { label: "Fundador", desc: "Estuviste desde octubre de 2026.", icon: "✦" },
};

// ---------------------------------------------------------------------------
// Bunny Stream
// ---------------------------------------------------------------------------

export function bunnyEmbedUrl(libraryId: string, videoId: string): string {
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=false&preload=true`;
}

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

export function monthsBetween(fromISO: string | null, to = new Date()): number {
  if (!fromISO) return 0;
  const from = new Date(fromISO);
  if (!Number.isFinite(from.getTime())) return 0;
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / (30 * 24 * 3600 * 1000)));
}

export function fmtDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("es-US", {
    weekday: withTime ? "long" : undefined, day: "numeric", month: "long",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export function isFounderWindowOpen(now = new Date()): boolean {
  return now.getTime() < new Date(ECOS.trialEndsAt).getTime();
}

/** Días que le quedan a un miembro inactivo para recuperar su avance. */
export function graceDaysLeft(inactiveSince: string | null, now = new Date()): number {
  if (!inactiveSince) return ECOS.graceDays;
  const elapsed = (now.getTime() - new Date(inactiveSince).getTime()) / 86400000;
  return Math.max(0, Math.ceil(ECOS.graceDays - elapsed));
}

/** Enlace .ics para agregar una sesión al calendario del teléfono. */
export function icsFor(s: EcosSession, zoom?: string): string {
  const start = new Date(s.starts_at);
  const end = new Date(start.getTime() + 90 * 60000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HGG//ECOS//ES", "BEGIN:VEVENT",
    `UID:${s.id}@ecos.holmanglobalgroup.com`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
    `SUMMARY:ECOS · ${s.title}`, `DESCRIPTION:${(s.description ?? "").replace(/\n/g, " ")}${zoom ? ` Zoom: ${zoom}` : ""}`,
    ...(zoom ? [`URL:${zoom}`] : []), "END:VEVENT", "END:VCALENDAR",
  ];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}
