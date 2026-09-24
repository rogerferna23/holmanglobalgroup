// Datos de ejemplo para ver el panel de ECOS sin Supabase. Solo en desarrollo.
import type { EcosLibraryItem, EcosMember, EcosReto, EcosSession, Progress } from "@/lib/ecos";
import type { CatalogItem, ClubMockData, DirectoryEntry } from "@/lib/club-store";
import type { ClubContextValue } from "@/contexts/ClubContext";

const at = (d: string, h = 19) => new Date(`${d}T${String(h).padStart(2, "0")}:00:00-05:00`).toISOString();

export const SESSIONS: EcosSession[] = [
  { id: "s9", starts_at: at("2026-09-08"), kind: "clase", subject: "ventas", title: "Sesión piloto: ¿qué es vender?", teacher: "Zack", teacher_id: "m-zack", description: null, zoom_url: null, recording_id: "g1", open_to_guests: false, published: true },
  { id: "s0", starts_at: at("2026-09-15"), kind: "masterclass", subject: "abierta", title: "Bienvenida a la comunidad", teacher: "Holman", teacher_id: "m-holman", description: "Cómo funciona ECOS, cómo sube tu nivel y por qué las tres materias son una sola: comunicación.", zoom_url: null, recording_id: null, open_to_guests: true, published: true },
  { id: "s1", starts_at: at("2026-10-06"), kind: "clase", subject: "ventas", title: "La oferta que se entiende a la primera", teacher: "Zack", teacher_id: "m-zack", description: "Qué vendes realmente por debajo de lo que crees que vendes, a quién le sirve, y cómo se dice el precio con seguridad.", zoom_url: null, recording_id: null, open_to_guests: false, published: true },
  { id: "s2", starts_at: at("2026-10-09"), kind: "practica", subject: "ventas", title: "Práctica de ventas: rol play", teacher: null, teacher_id: null, description: "Uno vende, otro hace de cliente con objeciones reales, la sala observa y devuelve.", zoom_url: null, recording_id: null, open_to_guests: false, published: true },
  { id: "s3", starts_at: at("2026-10-13"), kind: "clase", subject: "marketing", title: "Taller: tu oferta hecha pieza", teacher: "Ingrid", teacher_id: null, description: "Se diseña en vivo. Sales del martes con tu flyer o tu post terminado y publicado.", zoom_url: null, recording_id: null, open_to_guests: false, published: true },
  { id: "s5", starts_at: at("2026-10-20"), kind: "clase", subject: "oratoria", title: "Decirlo en voz alta", teacher: "Holman", teacher_id: "m-holman", description: "Respiración, ritmo y mirada. Primer contacto con el poder de la música aplicado a la voz propia.", zoom_url: null, recording_id: null, open_to_guests: false, published: true },
  { id: "s6", starts_at: at("2026-10-23"), kind: "practica", subject: "oratoria", title: "Práctica de oratoria: tablero", teacher: null, teacher_id: null, description: "Cinco minutos por persona, de pie, con devolución de la sala.", zoom_url: null, recording_id: null, open_to_guests: false, published: true },
  { id: "s7", starts_at: at("2026-10-27"), kind: "masterclass", subject: "abierta", title: "Lo que la gente decide antes de comprarte", teacher: "Holman", teacher_id: "m-holman", description: null, zoom_url: null, recording_id: null, open_to_guests: true, published: true },
];

export const LIBRARY: EcosLibraryItem[] = [
  { id: "c1", title: "Corazón de Elefante — el método", description: "Los cinco valores, las tres fuerzas y el camino Sentido → Marca → Sistema.", kind: "curso", url: null, cover_url: null, unlock_month: 0, published: true, sort_order: 0, parent_id: null, bunny_video_id: null, skill: null },
  { id: "c1l1", title: "Lección 1 · Por qué un elefante", description: null, kind: "curso", url: "https://example.com/c1l1", cover_url: null, unlock_month: 0, published: true, sort_order: 1, parent_id: "c1", bunny_video_id: null, skill: "oratoria" },
  { id: "c1l2", title: "Lección 2 · Las tres fuerzas", description: null, kind: "curso", url: "https://example.com/c1l2", cover_url: null, unlock_month: 0, published: true, sort_order: 2, parent_id: "c1", bunny_video_id: null, skill: "ventas" },
  { id: "c2", title: "Coaching Musical: tu voz", description: "Respiración, ritmo y presencia. El poder de la música aplicado a hablar.", kind: "curso", url: "https://example.com/c2", cover_url: null, unlock_month: 3, published: true, sort_order: 3, parent_id: null, bunny_video_id: null, skill: "oratoria" },
  { id: "c3", title: "Marca con Huella — taller completo", description: "Naming, posicionamiento y storytelling: el taller de marca de HGG grabado.", kind: "curso", url: null, cover_url: null, unlock_month: 6, published: true, sort_order: 4, parent_id: null, bunny_video_id: null, skill: "marketing" },
  { id: "g1", title: "Sesión piloto: ¿qué es vender? (8 sep)", description: "Con Zack. 58 min.", kind: "grabacion", url: "https://example.com/g1", cover_url: null, unlock_month: 0, published: true, sort_order: 5, parent_id: null, bunny_video_id: null, skill: "ventas" },
];

const PRICES: Record<string, number | null> = { c1: null, c2: 197, c3: 497 };
const ACCESS = new Set(["c1", "c2"]);
export const CATALOG: CatalogItem[] = LIBRARY.map(({ id, title, description, kind, cover_url, unlock_month, sort_order, parent_id, skill }) => ({
  id, title, description, kind, cover_url, unlock_month, sort_order, parent_id, skill,
  price_usd: PRICES[id] ?? null, has_access: kind !== "curso" || ACCESS.has(parent_id ?? id),
}));

export const RETOS: EcosReto[] = [
  { id: "r1", month: "2026-10-01", skill: "ventas", title: "Tu oferta en 90 segundos", description: "Dicha frente a la sala, sin leer, en cualquiera de las dos prácticas de octubre.", active: true },
  { id: "r0", month: "2026-09-01", skill: "oratoria", title: "Preséntate en 30 segundos", description: null, active: true },
];

export const DIRECTORY: DirectoryEntry[] = [
  { id: "m2", name: "Laura Pineda", city: "Houston", country: "Estados Unidos", business: "Diseñadora de interiores", level_ventas: 2, level_marketing: 3, level_oratoria: 1, badges: ["primera_clase", "racha_4"], since: "2026-09-02T00:00:00Z" },
  { id: "m3", name: "Andrés Cifuentes", city: "Miami", country: "Estados Unidos", business: "Contador para pequeños negocios", level_ventas: 3, level_marketing: 1, level_oratoria: 2, badges: ["primera_clase", "fundador"], since: "2026-09-03T00:00:00Z" },
  { id: "m4", name: "Mariana Torres", city: "Los Ángeles", country: "Estados Unidos", business: "Coach de bienestar", level_ventas: 1, level_marketing: 2, level_oratoria: 4, badges: ["primera_clase", "nivel_5"], since: "2026-09-05T00:00:00Z" },
  { id: "m-holman", name: "Holman Orjuela", city: "Nueva York", country: "Estados Unidos", business: "Coach expansivo y estratega de marca", level_ventas: 4, level_marketing: 3, level_oratoria: 6, badges: ["primera_clase", "racha_4", "racha_12", "nivel_5", "fundador"], since: "2026-06-10T00:00:00Z" },
];

export const CLUB_MOCK: ClubMockData = {
  sessions: SESSIONS,
  settings: {
    zoom_url: "https://zoom.us/j/82419277301",
    zoom_passcode: "ECOS10",
    horario: "Martes y viernes · 7:00 pm (hora del Este)",
    whatsapp_group_url: "https://chat.whatsapp.com/ejemplo",
    network_url: "https://app.delegawork.com/network",
    bunny_library_id: "",
    founder_cap: "20",
    trial_end: "2026-10-31T23:59:59-05:00",
  },
  library: LIBRARY.filter((i) => i.kind !== "curso" || ["c1", "c1l1", "c1l2", "c2"].includes(i.id)),
  catalog: CATALOG,
  retos: RETOS,
  directory: DIRECTORY,
};

export const MEMBER: EcosMember = {
  id: "m-holman", email: "holman@ejemplo.com", name: "Holman Orjuela", status: "activo",
  // En la vista previa Holman es profesor para poder ver «Mis clases». Los
  // miembros de ejemplo se generan a partir de esta ficha, y `m()` lo apaga.
  teacher: true,
  cortesia: false, price_usd: 47, founder: true, plan: "mensual",
  started_at: "2026-06-10T00:00:00Z", current_period_end: "2026-11-01T05:00:00Z", cancelled_at: null, inactive_since: null,
  stripe_customer_id: "cus_demo", stripe_subscription_id: "sub_demo", referred_by: null, referral_code: "K7MPQ2XA",
  free_months_earned: 1, free_months_used: 0, whatsapp: "+1 917 555 0100", city: "Nueva York", country: "Estados Unidos",
  business: "Coach expansivo y estratega de marca", goal: "Vivir de lo que amo y que la comunidad crezca", show_in_directory: true, created_at: "2026-06-10T00:00:00Z",
};

export const PROGRESS: Progress = {
  xp: { ventas: 340, marketing: 215, oratoria: 560 },
  streak: 13,
  badges: [
    { badge: "primera_clase", at: "2026-06-16T00:00:00Z" }, { badge: "fundador", at: "2026-06-10T00:00:00Z" },
    { badge: "racha_4", at: "2026-07-10T00:00:00Z" }, { badge: "racha_12", at: "2026-09-04T00:00:00Z" }, { badge: "nivel_5", at: "2026-09-01T00:00:00Z" },
  ],
  attended: ["s9"], retos_done: ["r0"], viewed: ["g1"], months_active: 3, referrals_total: 4, referrals_active: 3,
};

const ok = async () => ({ error: null as string | null });
export const CLUB_CTX: ClubContextValue = {
  member: MEMBER, progress: PROGRESS, loading: false, isActive: true,
  refresh: async () => {}, signUp: async () => ({ error: null, needsConfirm: false }),
  startCheckout: async () => ({ error: null as string | null, clientSecret: null }),
  openPortal: ok, updateProfile: ok,
  markAttendance: async () => ({ error: null, points: 30 }), markViewed: async () => ({ error: null, points: 5 }), markReto: async () => ({ error: null, points: 50 }),
};

// ---- Admin ----
const m = (id: string, name: string, email: string, status: EcosMember["status"], founder: boolean, started: string | null, referred_by: string | null, code: string, extra: Partial<EcosMember> = {}): EcosMember => ({
  ...MEMBER, teacher: false, cortesia: false, id, name, email, status, founder, started_at: started, current_period_end: started ? "2026-11-01T05:00:00Z" : null,
  cancelled_at: status === "cancelado" ? "2026-09-10T00:00:00Z" : null, inactive_since: status === "activo" || status === "pendiente" ? null : "2026-09-10T00:00:00Z",
  stripe_customer_id: null, stripe_subscription_id: status === "pendiente" ? null : `sub_${id}`, referred_by, referral_code: code,
  free_months_earned: 0, free_months_used: 0, created_at: started ?? "2026-09-12T00:00:00Z", ...extra,
});

export const ADMIN_MOCK: Record<string, unknown[]> = {
  cuentas_sin_membresia: [
    { id: "u-ingrid", email: "ingrid@ejemplo.com", name: "Ingrid", created_at: "2026-09-22T15:00:00Z" },
    { id: "u-invitado", email: "amigo@ejemplo.com", name: "Juan Pérez", created_at: "2026-09-21T18:30:00Z" },
  ],
  hgg_referrers: [
    { id: "m-holman", code: "K7MPQ2XA", approved: true,  created_at: "2026-06-10T00:00:00Z" },
    { id: "m2",       code: "PQ2XK7MA", approved: true,  created_at: "2026-09-02T00:00:00Z" },
    { id: "m-ext",    code: "TRB9WD",   approved: true,  created_at: "2026-09-20T00:00:00Z" },
  ],
  hgg_commissions: [
    { id: 1, referrer_id: "m-holman", source: "club",     source_id: "in_2", buyer_id: "m2", buyer_email: "laura@ejemplo.com",   buyer_name: "Laura Pineda",     concept: "Membresia de ECOS", base_amount: 47,  pct: 10, amount: 4.70,  referrer_kind: "embajador", status: "pendiente", paid_at: null, created_at: "2026-09-10T00:00:00Z" },
    { id: 2, referrer_id: "m-holman", source: "club",     source_id: "in_3", buyer_id: "m3", buyer_email: "andres@ejemplo.com",  buyer_name: "Andrés Cifuentes", concept: "Membresia de ECOS", base_amount: 470, pct: 10, amount: 47.00, referrer_kind: "embajador", status: "pendiente", paid_at: null, created_at: "2026-09-03T00:00:00Z" },
    { id: 3, referrer_id: "m2",       source: "producto", source_id: "stripe_pi_9", buyer_id: null, buyer_email: "sofia@ejemplo.com", buyer_name: "Sofía Mejía", concept: "Marca con Huella",  base_amount: 890, pct: 10, amount: 89.00, referrer_kind: "embajador", status: "pagada",    paid_at: "2026-09-15T00:00:00Z", created_at: "2026-09-12T00:00:00Z" },
    { id: 4, referrer_id: "m-ext",    source: "producto", source_id: "stripe_pi_7", buyer_id: null, buyer_email: "diego@ejemplo.com", buyer_name: "Diego Ramírez", concept: "Sesión de Claridad", base_amount: 120, pct: 10, amount: 12.00, referrer_kind: "afiliado",  status: "pendiente", paid_at: null, created_at: "2026-09-18T00:00:00Z" },
  ],
  ecos_members: [
    { id: "m-zack", email: "zack@ejemplo.com", name: "Zack", status: "pendiente", teacher: true, cortesia: false, price_usd: 0, founder: false, plan: "mensual", started_at: null, current_period_end: null, cancelled_at: null, inactive_since: null, stripe_customer_id: null, stripe_subscription_id: null, referred_by: null, referral_code: null, free_months_earned: 0, free_months_used: 0, whatsapp: null, city: "Houston", country: "Estados Unidos", business: "Cierre de ventas", goal: null, show_in_directory: true, created_at: "2026-09-18T00:00:00Z" },
    MEMBER,
    m("m2", "Laura Pineda", "laura@ejemplo.com", "activo", true, "2026-09-02T00:00:00Z", "m-holman", "PQ2XK7MA", { city: "Houston", business: "Diseñadora de interiores", whatsapp: "+1 713 555 0101" }),
    m("m3", "Andrés Cifuentes", "andres@ejemplo.com", "activo", true, "2026-09-03T00:00:00Z", "m-holman", "XA7KQ2MP", { city: "Miami", business: "Contador", plan: "anual", price_usd: 470 }),
    m("m4", "Mariana Torres", "mariana@ejemplo.com", "activo", true, "2026-09-05T00:00:00Z", null, "MPXAK72Q", { city: "Los Ángeles", business: "Coach de bienestar" }),
    m("m5", "Carlos Restrepo", "carlos@ejemplo.com", "pausado", true, "2026-09-06T00:00:00Z", "m2", "2QXAMPK7", { city: "Houston", business: "Contratista" }),
    m("m6", "Sofía Mejía", "sofia@ejemplo.com", "pendiente", true, null, null, "K72QMPXA", { city: "Orlando", business: "Fotógrafa" }),
    m("m7", "Diego Ramírez", "diego@ejemplo.com", "cancelado", false, "2026-08-01T00:00:00Z", null, "AQ7XKMP2", { city: "Chicago", business: "Barbero" }),
  ],
  ecos_sessions: SESSIONS,
  ecos_library: LIBRARY,
  ecos_retos: RETOS,
  ecos_settings: Object.entries(CLUB_MOCK.settings).map(([key, value]) => ({ id: key, key, value, updated_at: "2026-09-14T00:00:00Z" })),
  ecos_guests: [
    { id: 1, session_id: "s0", name: "Paola Ruiz", email: "paola@ejemplo.com", phone: null, whatsapp: "+1 305 555 0102", invited_by: "m2", attended: true, converted_id: null, created_at: "2026-09-13T00:00:00Z" },
    { id: 2, session_id: "s0", name: "Julián Ospina", email: "julian@ejemplo.com", phone: null, whatsapp: null, invited_by: "m3", attended: false, converted_id: null, created_at: "2026-09-13T00:00:00Z" },
    { id: 3, session_id: "s7", name: "Natalia Gómez", email: "natalia@ejemplo.com", phone: null, whatsapp: "+1 786 555 0103", invited_by: "m4", attended: false, converted_id: null, created_at: "2026-09-14T00:00:00Z" },
  ],
  ecos_payments: [
    { id: "in_1", stripe_invoice_id: "in_1", member_id: "m-holman", amount_usd: 47, plan: "mensual", paid_at: "2026-08-10T00:00:00Z" },
    { id: "in_2", stripe_invoice_id: "in_2", member_id: "m-holman", amount_usd: 47, plan: "mensual", paid_at: "2026-09-10T00:00:00Z" },
    { id: "in_3", stripe_invoice_id: "in_3", member_id: "m3", amount_usd: 470, plan: "anual", paid_at: "2026-09-03T00:00:00Z" },
    { id: "in_4", stripe_invoice_id: "in_4", member_id: "m7", amount_usd: 47, plan: "mensual", paid_at: "2026-08-01T00:00:00Z" },
    // Los dos casos que cambian el reparto: el mes gratis del fundador no deja
    // nada, y el cupón deja la mitad. Así se ve en la vista previa qué pasa.
    { id: "in_5", stripe_invoice_id: "in_5", member_id: "m4", amount_usd: 0, plan: "mensual", paid_at: "2026-09-05T00:00:00Z" },
    { id: "in_6", stripe_invoice_id: "in_6", member_id: "m2", amount_usd: 23.5, plan: "mensual", paid_at: "2026-09-12T00:00:00Z" },
  ],
  ecos_ranking: [
    { id: "m-holman", name: "Holman Orjuela", xp_ventas: 340, xp_marketing: 215, xp_oratoria: 560, streak: 13, badges: 5 },
    { id: "m4", name: "Mariana Torres", xp_ventas: 60, xp_marketing: 120, xp_oratoria: 330, streak: 2, badges: 2 },
    { id: "m3", name: "Andrés Cifuentes", xp_ventas: 210, xp_marketing: 40, xp_oratoria: 110, streak: 1, badges: 2 },
    { id: "m2", name: "Laura Pineda", xp_ventas: 110, xp_marketing: 230, xp_oratoria: 50, streak: 4, badges: 2 },
  ],
  ecos_attendance_counts: [{ session_id: "s9", n: 4 }, { session_id: "s0", n: 3 }],
  ecos_course_access: [{ id: "m-holman-c2", member_id: "m-holman", library_id: "c2", granted_by: "admin", created_at: "2026-09-01T00:00:00Z" }],
};
