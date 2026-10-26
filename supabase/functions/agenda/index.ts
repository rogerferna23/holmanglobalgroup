// agenda — la agenda propia de HGG (reemplaza a DelegaMeet, oct 2026).
//
// Acciones (POST, cuerpo JSON con «accion»):
//   · horarios      { tipo, con? }                 → las horas libres de los próximos días (público);
//                   con = id de un anfitrión (/agendar?con=zack): solo sus horas
//   · reservar      { tipo, inicio, nombre, email, whatsapp?, motivo?, zona?, ref?, campana?, con? } (público)
//                   → aparta la hora, crea la reunión de Zoom y manda los correos
//   · cancelar      { token }  (público, desde el correo)   o   { id } con JWT de admin (Torre)
//   · zoom          { id } con JWT de admin → vuelve a intentar crear el Zoom de una cita
//   · asignar       { id, anfitrion } con JWT de admin → pasa la cita a Holman o a Zack
//                   (Zoom nuevo en la cuenta del nuevo, aviso a la persona y a él)
//   · zoom_estado   con JWT de admin → qué anfitriones tienen su Zoom conectado
//   · zoom_ecos     { session_id, duracion? } (cabecera x-ecos-cron) → crea un Zoom
//                   propio para una clase de ECOS (p. ej. la masterclass con
//                   invitados, que no debe usar el Zoom fijo del club)
//   · recordatorios (tarea programada, cabecera x-ecos-cron) → aviso del día (8 a. m.
//                   de la persona, o la noche antes si la sesión es temprano) y
//                   aviso 15 min antes con el Zoom
//
// El horario lo pone Holman en Torre → Agenda (hgg_agenda_ajustes) en SU zona;
// aquí se convierte a instantes reales. La persona ve las horas en la suya.
// La base impide que dos citas del mismo anfitrión se pisen (hgg_citas_sin_choque).
// La Claridad la da Holman o alguien del equipo (hgg_agenda_anfitriones): se
// ofrece toda hora en la que uno de ellos esté libre.
//
// Zoom: cada anfitrión, su propia cuenta con una app «Server-to-Server OAuth».
// Sin sus variables la reserva igual se hace (con su sala fija si la tiene);
// si no, el correo dice que el enlace llega aparte y Holman lo pega en la Torre.
//
// Variables: RESEND_API_KEY, SITE_URL, ALLOWED_ORIGINS (+ las de Supabase).
//            ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET (Holman, opcionales).
//            ZOOM_ZACK_ACCOUNT_ID, ZOOM_ZACK_CLIENT_ID, ZOOM_ZACK_CLIENT_SECRET (Zack;
//            igual para cualquier otro anfitrión, con su id en mayúsculas).
//            AGENDA_REMITENTE (opcional).
// Verify JWT: NO (la usan visitantes sin cuenta).

import { adminClient, callerFrom, env, json, preflight } from "../_shared/ecos.ts";
import { faltaColumnaCampana, limpiarCampana } from "../_shared/campana.ts";

const db = adminClient();
const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

type TipoId = "claridad" | "sesion";
type TipoCfg = { nombre: string; duracion: number; bloque: number; activo: boolean };
type Ajustes = {
  zona: string;
  horario: Record<string, [string, string][]>;
  aviso_horas: number;
  dias_adelante: number;
  tipos: Record<TipoId, TipoCfg>;
  correo_avisos: string;
};
type Cita = {
  id: string; tipo: TipoId; inicio: string; fin: string; bloque_fin: string;
  nombre: string; email: string; whatsapp: string | null; zona_cliente: string | null;
  motivo: string | null; ref_code: string | null; estado: string;
  zoom_id: string | null; zoom_url: string | null; token: string;
  anfitrion: string;
  // aviso_24h = el aviso del día; aviso_1h = el de 15 minutos antes (los
  // nombres vienen de la primera versión, cuando eran 24 h y 1 h).
  aviso_24h: boolean; aviso_1h: boolean; created_at: string;
};

/** Quien da la sesión (hgg_agenda_anfitriones). Holman usa el horario de los ajustes. */
type Anfitrion = {
  id: string; nombre: string; correo: string; tipos: string[];
  horario: Record<string, [string, string][]> | null;
  zoom_fijo: string | null; orden: number; activo: boolean;
};

const esTipo = (t: unknown): t is TipoId => t === "claridad" || t === "sesion";

/** Lo que viene de la persona va dentro de un correo HTML: se escapa. */
function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function zonaValida(tz: unknown): string | null {
  if (typeof tz !== "string" || !tz || tz.length > 64) return null;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Horas: el horario está escrito en la zona de Holman; se pasa a instantes.
// ---------------------------------------------------------------------------

/** Cuántos ms va la zona por delante de UTC en ese instante. */
function desfase(ms: number, tz: string): number {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(ms));
  const v = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second")) - ms;
}

/** «2026-10-20» + «14:30» en la zona `tz` → instante (ms). */
function instante(fecha: string, hhmm: string, tz: string): number {
  const [y, m, d] = fecha.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const pared = Date.UTC(y, m - 1, d, h, mi);
  let ms = pared - desfase(pared, tz);
  ms = pared - desfase(ms, tz); // segunda pasada por si cambia la hora ese día
  return ms;
}

/** Fecha «YYYY-MM-DD» y día de la semana ISO de un instante en una zona. */
function fechaEn(ms: number, tz: string): { fecha: string; dow: number } {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  }).formatToParts(new Date(ms));
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  const dias: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { fecha: `${v("year")}-${v("month")}-${v("day")}`, dow: dias[v("weekday")] ?? 0 };
}

async function ajustes(): Promise<Ajustes> {
  const { data, error } = await db.from("hgg_agenda_ajustes").select("*").eq("id", 1).single();
  if (error) throw error;
  return data as Ajustes;
}

/**
 * Los anfitriones activos, por orden de preferencia. Si la migración del
 * equipo aún no corrió, Holman solo, como antes.
 */
async function anfitriones(a: Ajustes): Promise<Anfitrion[]> {
  const { data, error } = await db.from("hgg_agenda_anfitriones").select("*").eq("activo", true).order("orden");
  if (error || !data?.length) {
    return [{ id: "holman", nombre: "Holman", correo: a.correo_avisos, tipos: ["claridad", "sesion"], horario: null, zoom_fijo: null, orden: 1, activo: true }];
  }
  return data as Anfitrion[];
}

async function anfitrion(id: string, a: Ajustes): Promise<Anfitrion | null> {
  const { data } = await db.from("hgg_agenda_anfitriones").select("*").eq("id", id).maybeSingle();
  if (data) return data as Anfitrion;
  return id === "holman" ? (await anfitriones(a)).find((x) => x.id === "holman") ?? null : null;
}

const horarioDe = (x: Anfitrion, a: Ajustes) => x.horario ?? a.horario;

/**
 * Las horas de inicio libres para un tipo, de ahora a `dias_adelante`, y
 * quién está libre en cada una (en orden de preferencia). Una hora se ofrece
 * si al menos un anfitrión que atiende ese tipo la tiene libre.
 */
async function huecos(
  a: Ajustes, tipo: TipoId, opc: { ahora?: number; solo?: string; sinCita?: string } = {},
): Promise<Map<number, string[]>> {
  const ahora = opc.ahora ?? Date.now();
  const salida = new Map<number, string[]>();
  const cfg = a.tipos[tipo];
  if (!cfg?.activo) return salida;
  const equipo = (await anfitriones(a)).filter((x) => x.tipos.includes(tipo) && (!opc.solo || x.id === opc.solo));
  if (!equipo.length) return salida;
  const bloque = Math.max(15, Number(cfg.bloque) || 60) * MIN;
  const desde = ahora + Math.max(0, a.aviso_horas) * HORA;
  const hasta = ahora + a.dias_adelante * DIA;

  const [{ data: citas }, { data: bloqueos }] = await Promise.all([
    db.from("hgg_citas").select("id, inicio, bloque_fin, anfitrion").neq("estado", "cancelada")
      .lt("inicio", new Date(hasta + DIA).toISOString()).gt("bloque_fin", new Date(ahora).toISOString()),
    db.from("hgg_agenda_bloqueos").select("*")
      .lt("desde", new Date(hasta + DIA).toISOString()).gt("hasta", new Date(ahora).toISOString()),
  ]);
  type Ocupa = { i: number; f: number; de: string | null };
  const ocupado: Ocupa[] = [
    ...(citas ?? []).filter((c: { id: string }) => c.id !== opc.sinCita)
      .map((c: { inicio: string; bloque_fin: string; anfitrion?: string }) =>
        ({ i: Date.parse(c.inicio), f: Date.parse(c.bloque_fin), de: c.anfitrion ?? "holman" })),
    ...(bloqueos ?? []).map((b: { desde: string; hasta: string; anfitrion?: string | null }) =>
      ({ i: Date.parse(b.desde), f: Date.parse(b.hasta), de: b.anfitrion ?? null })),
  ];
  const choca = (quien: string, i: number, f: number) =>
    ocupado.some((o) => (o.de === null || o.de === quien) && i < o.f && f > o.i);

  for (const x of equipo) {
    const horario = horarioDe(x, a);
    const vistos = new Set<string>();
    for (let t = ahora; t <= hasta + DIA; t += DIA) {
      const { fecha, dow } = fechaEn(t, a.zona);
      if (vistos.has(fecha)) continue;
      vistos.add(fecha);
      for (const [ini, fin] of horario[String(dow)] ?? []) {
        const tramoFin = instante(fecha, fin, a.zona);
        for (let s = instante(fecha, ini, a.zona); s + bloque <= tramoFin; s += bloque) {
          if (s < desde || s > hasta || choca(x.id, s, s + bloque)) continue;
          salida.set(s, [...(salida.get(s) ?? []), x.id]);
        }
      }
    }
  }
  return salida;
}

async function libres(a: Ajustes, tipo: TipoId, solo?: string): Promise<number[]> {
  return [...(await huecos(a, tipo, { solo })).keys()].sort((x, y) => x - y);
}

/** «?con=zack»: el enlace de ventas de un anfitrión muestra solo sus horas. */
function conQuienPide(cuerpo: Record<string, unknown>): string | undefined {
  const con = String(cuerpo.con ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{2,32}$/.test(con) ? con : undefined;
}

// ---------------------------------------------------------------------------
// Zoom (Server-to-Server OAuth)
// ---------------------------------------------------------------------------

/**
 * Cada anfitrión tiene su propia cuenta de Zoom con una app Server-to-Server
 * OAuth. Holman usa ZOOM_ACCOUNT_ID/ZOOM_CLIENT_ID/ZOOM_CLIENT_SECRET; los
 * demás, los mismos con su id: ZOOM_ZACK_ACCOUNT_ID, etc.
 */
type ZoomCred = { account: string; client: string; secret: string };

function zoomCred(anfitrionId = "holman"): ZoomCred | null {
  const pre = anfitrionId === "holman" ? "ZOOM_" : `ZOOM_${anfitrionId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_`;
  const account = Deno.env.get(`${pre}ACCOUNT_ID`);
  const client = Deno.env.get(`${pre}CLIENT_ID`);
  const secret = Deno.env.get(`${pre}CLIENT_SECRET`);
  return account && client && secret ? { account, client, secret } : null;
}

const zoomListo = () => !!zoomCred("holman");

async function zoomToken(cred: ZoomCred | null = zoomCred("holman")): Promise<string> {
  if (!cred) throw new Error("Zoom sin conectar");
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(cred.account)}`,
    { method: "POST", headers: { Authorization: `Basic ${btoa(`${cred.client}:${cred.secret}`)}` } },
  );
  if (!res.ok) throw new Error(`Zoom token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).access_token as string;
}

/**
 * El Zoom de una cita, en la cuenta de quien la da. Sin sus secrets, su sala
 * fija (sin id: no se borra); sin nada, null y Holman lo pega en la Torre.
 * Nunca se usa la cuenta de otro: dos citas a la misma hora no deben chocar.
 */
async function crearZoom(c: Cita, a: Ajustes, anf?: Anfitrion | null): Promise<{ id: string | null; url: string } | null> {
  const quien = anf?.id ?? c.anfitrion ?? "holman";
  const cred = zoomCred(quien);
  if (!cred) return anf?.zoom_fijo ? { id: null, url: anf.zoom_fijo } : null;
  const cfg = a.tipos[c.tipo];
  const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: { Authorization: `Bearer ${await zoomToken(cred)}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: `${cfg?.nombre ?? "Sesión"} · ${c.nombre}`,
      type: 2,
      start_time: new Date(c.inicio).toISOString().replace(/\.\d{3}Z$/, "Z"),
      duration: Math.round((Date.parse(c.fin) - Date.parse(c.inicio)) / MIN),
      timezone: a.zona,
      agenda: c.motivo ?? undefined,
      settings: { join_before_host: false, waiting_room: true, mute_upon_entry: false },
    }),
  });
  if (!res.ok) throw new Error(`Zoom ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const m = await res.json();
  return { id: String(m.id), url: String(m.join_url) };
}

/** Borra la reunión en la cuenta de quien la tenía. */
async function borrarZoom(id: string | null, anfitrionId = "holman"): Promise<void> {
  const cred = zoomCred(anfitrionId);
  if (!id || !cred) return;
  const res = await fetch(`https://api.zoom.us/v2/meetings/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${await zoomToken(cred)}` },
  });
  if (!res.ok && res.status !== 404) console.error("[agenda] borrar zoom", res.status, await res.text());
}

// ---------------------------------------------------------------------------
// Correos
// ---------------------------------------------------------------------------

const SITE = () => env("SITE_URL", "https://holmanglobalgroup.com");

/** Texto UTF-8 → base64 (los adjuntos de Resend van así). */
function base64(texto: string): string {
  let bin = "";
  for (const b of new TextEncoder().encode(texto)) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function enviar(
  to: string, subject: string, html: string, ics?: string, replyTo?: string,
): Promise<string | null> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env("AGENDA_REMITENTE", "Holman Global Group <agenda@mkt.holmanglobalgroup.com>"),
      reply_to: replyTo ?? env("ECOS_RESPONDER_A", "equipo@holmanglobalgroup.com"),
      to: [to],
      subject,
      html,
      attachments: ics
        ? [{ filename: "sesion.ics", content: base64(ics), content_type: "text/calendar; charset=utf-8; method=REQUEST" }]
        : undefined,
    }),
  });
  if (res.ok) return null;
  return `Resend ${res.status}: ${(await res.text()).slice(0, 300)}`;
}

function marco(contenido: string): string {
  return `<div style="margin:0;padding:32px 16px;background:#f4f2ee;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:36px 32px;color:#333333;font-size:15px;line-height:1.7;">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:3px;color:#b8860b;text-transform:uppercase;">Holman Global Group</p>
    ${contenido}
    <p style="margin:28px 0 0;font-size:12px;color:#999999;">Holman Global Group · holmanglobalgroup.com</p>
  </div>
</div>`;
}

const boton = (href: string, texto: string) =>
  `<a href="${esc(href)}" style="display:inline-block;padding:13px 26px;background:#e8b923;color:#111111;text-decoration:none;border-radius:999px;font-weight:bold;">${esc(texto)}</a>`;

/** «martes 20 de octubre · 3:00 p. m.» en una zona. */
function cuando(iso: string, tz: string): string {
  const d = new Date(iso);
  const dia = d.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", timeZone: tz });
  const hora = d.toLocaleTimeString("es-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
  return `${dia} · ${hora}`;
}

const CIUDADES: Record<string, string> = {
  Bogota: "Bogotá", Mexico_City: "Ciudad de México", New_York: "Nueva York", Los_Angeles: "Los Ángeles",
  Sao_Paulo: "São Paulo", Buenos_Aires: "Buenos Aires", Santo_Domingo: "Santo Domingo", Panama: "Panamá",
  Asuncion: "Asunción", Canary: "Canarias", London: "Londres", Lisbon: "Lisboa",
};

/** «Bogotá», «Madrid»… a partir de la zona, para decir de dónde es la hora. */
function lugar(tz: string): string {
  const c = tz.split("/").pop() ?? tz;
  return CIUDADES[c] ?? c.replace(/_/g, " ");
}

function bloqueSesion(c: Cita, a: Ajustes, tz: string): string {
  const cfg = a.tipos[c.tipo];
  const duracion = Math.round((Date.parse(c.fin) - Date.parse(c.inicio)) / MIN);
  const otra = tz !== a.zona ? `<br/><span style="color:#999999;font-size:13px;">${esc(cuando(c.inicio, a.zona))} en ${esc(lugar(a.zona))}</span>` : "";
  return `<p style="margin:0 0 20px;padding:16px 18px;background:#faf7ef;border-left:3px solid #e8b923;border-radius:6px;">
      <strong>${esc(cfg?.nombre ?? "Sesión")}</strong> · ${duracion} minutos por Zoom<br/>
      <span style="color:#444444;">${esc(cuando(c.inicio, tz))} <span style="color:#777777;">(hora de ${esc(lugar(tz))})</span></span>${otra}
    </p>`;
}

const enlaceZoom = (c: Cita) =>
  c.zoom_url
    ? `<p style="margin:24px 0 8px;">${boton(c.zoom_url, "Entrar a la sesión en Zoom")}</p>
       <p style="font-size:13px;color:#777777;margin:0 0 16px;">O copia este enlace: <a href="${esc(c.zoom_url)}" style="color:#b8860b;">${esc(c.zoom_url)}</a></p>`
    : `<p>El enlace de Zoom te llega en un correo aparte antes de la sesión.</p>`;

const enlaceCancelar = (c: Cita) =>
  `<p style="font-size:13px;color:#777777;margin-top:24px;">¿Te surgió algo? <a href="${esc(`${SITE()}/agendar/cancelar?t=${c.token}`)}" style="color:#b8860b;">Cancela aquí</a> y elige otro horario cuando quieras.</p>`;

/** Invitación de calendario: con ella la sesión entra sola a Google o Apple Calendar. */
function ics(c: Cita, a: Ajustes, organizador: string): string {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const linea = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const titulo = `${a.tipos[c.tipo]?.nombre ?? "Sesión"} · Holman Global Group`;
  const desc = [c.zoom_url ? `Zoom: ${c.zoom_url}` : "El enlace de Zoom llega por correo.", c.motivo ? `Tema: ${c.motivo}` : ""]
    .filter(Boolean).join("\n");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Holman Global Group//Agenda//ES", "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${c.id}@holmanglobalgroup.com`,
    `DTSTAMP:${f(new Date().toISOString())}`,
    `DTSTART:${f(c.inicio)}`,
    `DTEND:${f(c.fin)}`,
    `SUMMARY:${linea(titulo)}`,
    `DESCRIPTION:${linea(desc)}`,
    `LOCATION:${linea(c.zoom_url ?? "Zoom")}`,
    `ORGANIZER;CN=Holman Global Group:mailto:${organizador}`,
    `ATTENDEE;CN=${linea(c.nombre)};RSVP=FALSE:mailto:${c.email}`,
    "STATUS:CONFIRMED",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

// La Sesión de Claridad la puede dar Holman o alguien de su equipo: sus correos
// hablan y firman como HGG. Las sesiones de coaching sí son con Holman.
function conQuien(tipo: string): string {
  return tipo === "claridad" ? "con Holman Global Group" : "con Holman";
}
function firma(tipo: string): string {
  return tipo === "claridad" ? "El equipo de Holman Global Group" : "Holman";
}

/** «Te acompaña Zack, del equipo…» cuando la Claridad no la da Holman. */
const quienAtiende = (anf?: Anfitrion | null) =>
  anf && anf.id !== "holman"
    ? `<p>Te acompaña <strong>${esc(anf.nombre)}</strong>, del equipo de Holman Global Group.</p>`
    : "";

/** El aviso de cada cita va a quien la da y, si no es Holman, también a Holman. */
function destinosEquipo(a: Ajustes, anf?: Anfitrion | null): string[] {
  return [...new Set([anf?.correo, a.correo_avisos].filter((x): x is string => !!x).map((x) => x.trim().toLowerCase()))];
}

async function correosReserva(c: Cita, a: Ajustes, anf?: Anfitrion | null): Promise<string[]> {
  const fallos: string[] = [];
  const tz = c.zona_cliente || a.zona;
  const primer = c.nombre.trim().split(/\s+/)[0] ?? "";
  const esClaridad = c.tipo === "claridad";
  const invitacion = ics(c, a, a.correo_avisos);

  const paraCliente = marco(`
    <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#111111;font-weight:normal;">${esc(primer)}, tu sesión quedó reservada</h1>
    ${bloqueSesion(c, a, tz)}
    ${quienAtiende(anf)}
    ${enlaceZoom(c)}
    ${esClaridad
      ? `<p>Antes de la sesión, mira el video de bienvenida: en pocos minutos Holman te cuenta cómo llegar preparado para aprovecharla al máximo.</p>
         <p style="margin:18px 0 10px;">${boton(`${SITE()}/sesion-reservada`, "Ver cómo prepararme")}</p>`
      : `<p>Llega con lo que quieras trabajar hoy. Entra unos minutos antes con cámara y micrófono listos.</p>`}
    <p>El día de la sesión te llega un recordatorio, y 15 minutos antes otro con el enlace de Zoom a la mano.</p>
    <p>Nos vemos pronto,<br/>${firma(c.tipo)}</p>
    ${enlaceCancelar(c)}`);
  const e1 = await enviar(c.email, `Reservada: ${a.tipos[c.tipo]?.nombre ?? "tu sesión"} ${conQuien(c.tipo)}`, paraCliente, invitacion);
  if (e1) fallos.push(e1);

  const paraHolman = marco(`
    <h1 style="margin:0 0 18px;font-size:22px;color:#111111;font-weight:normal;">Nueva reserva: ${esc(c.nombre)}</h1>
    ${bloqueSesion(c, a, a.zona)}
    <p><strong>La da:</strong> ${esc(anf?.nombre ?? "Holman")}</p>
    <p><strong>Correo:</strong> ${esc(c.email)}<br/>
       <strong>WhatsApp:</strong> ${esc(c.whatsapp || "—")}<br/>
       <strong>Su zona:</strong> ${esc(c.zona_cliente || "—")}<br/>
       ${c.ref_code ? `<strong>La trajo:</strong> código ${esc(c.ref_code)}<br/>` : ""}
       ${c.motivo ? `<strong>Qué quiere trabajar:</strong> ${esc(c.motivo)}` : ""}</p>
    ${c.zoom_url ? `<p><a href="${esc(c.zoom_url)}" style="color:#b8860b;">Enlace de Zoom</a></p>` : `<p style="color:#b8860b;">No se creó el Zoom: pégalo en Torre → Agenda.</p>`}
    <p style="margin:22px 0 0;">${boton(`${SITE()}/torre/agenda`, "Abrir la agenda en la Torre")}</p>`);
  for (const para of destinosEquipo(a, anf)) {
    const e2 = await enviar(para, `Nueva reserva · ${c.nombre} · ${cuando(c.inicio, a.zona)}`, paraHolman, invitacion, c.email);
    if (e2) fallos.push(e2);
  }
  return fallos;
}

type Aviso = "dia" | "15min";

function correoRecordatorio(c: Cita, a: Ajustes, cual: Aviso, ahora: number): { asunto: string; html: string } {
  const tz = c.zona_cliente || a.zona;
  const primer = c.nombre.trim().split(/\s+/)[0] ?? "";
  const nombre = a.tipos[c.tipo]?.nombre ?? "tu sesión";
  if (cual === "15min") {
    return {
      asunto: `En 15 minutos: ${nombre} ${conQuien(c.tipo)}`,
      html: marco(`
        <h1 style="margin:0 0 18px;font-size:24px;color:#111111;font-weight:normal;">${esc(primer)}, en 15 minutos nos vemos</h1>
        ${bloqueSesion(c, a, tz)}
        <p>Busca un lugar tranquilo, ten a mano cámara y micrófono, y entra con este botón:</p>
        ${enlaceZoom(c)}
        <p>${c.tipo === "claridad" ? "Te esperamos" : "Te espero"},<br/>${firma(c.tipo)}</p>`),
    };
  }
  // La noche antes (sesión temprano) dice «mañana»; el mismo día, «hoy».
  const esHoy = fechaEn(ahora, tz).fecha === fechaEn(Date.parse(c.inicio), tz).fecha;
  const cuandoEs = esHoy ? "hoy" : "mañana";
  return {
    asunto: `${esHoy ? "Hoy" : "Mañana"}: ${nombre} ${conQuien(c.tipo)}`,
    html: marco(`
      <h1 style="margin:0 0 18px;font-size:24px;color:#111111;font-weight:normal;">${esc(primer)}, ${cuandoEs} es tu sesión</h1>
      ${bloqueSesion(c, a, tz)}
      ${c.tipo === "claridad"
        ? `<p>Si aún no lo has visto, mira el video de bienvenida: te ayuda a llegar con claridad sobre lo que quieres lograr.</p>
           <p style="margin:18px 0 10px;">${boton(`${SITE()}/sesion-reservada`, "Ver cómo prepararme")}</p>`
        : `<p>Piensa qué quieres llevarte de esta sesión: así la aprovechamos al máximo.</p>`}
      <p>15 minutos antes te llega otro correo con el enlace de Zoom.</p>
      <p>Nos vemos ${cuandoEs},<br/>${firma(c.tipo)}</p>
      ${enlaceCancelar(c)}`),
  };
}

/** Hora (0–23) de un instante en una zona. */
function horaEn(ms: number, tz: string): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(new Date(ms)));
}

/**
 * ¿Ya toca el aviso del día? A las 8 a. m. de la persona, el mismo día. Si la
 * sesión empieza antes de las 10 a. m. de su hora, sale la noche antes (desde
 * las 7 p. m.) para que no le llegue encima. Nunca a menos de 2 horas: para
 * eso está el de 15 minutos.
 */
function tocaAvisoDia(c: Cita, a: Ajustes, ahora: number): boolean {
  const tz = c.zona_cliente || a.zona;
  const inicio = Date.parse(c.inicio);
  if (inicio - ahora <= 2 * HORA) return false;
  // Quien reservó hace menos de 2 horas acaba de recibir la confirmación.
  if (ahora - Date.parse(c.created_at) < 2 * HORA) return false;
  const hoy = fechaEn(ahora, tz).fecha;
  const dia = fechaEn(inicio, tz).fecha;
  if (horaEn(inicio, tz) < 10) {
    const visperas = fechaEn(inicio - DIA, tz).fecha;
    // Si la noche antes no alcanzó (reservó tarde), sale desde las 6 a. m.
    return (hoy === visperas && horaEn(ahora, tz) >= 19) || (hoy === dia && horaEn(ahora, tz) >= 6);
  }
  return hoy === dia && horaEn(ahora, tz) >= 8;
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------

async function horarios(req: Request, cuerpo: Record<string, unknown>) {
  const tipo = cuerpo.tipo;
  if (!esTipo(tipo)) return json(req, { error: "Tipo de sesión no válido." }, 400);
  const a = await ajustes();
  const cfg = a.tipos[tipo];
  const con = conQuienPide(cuerpo);
  // Un enlace de anfitrión que no existe o está apagado cae a la agenda de todos.
  const anf = con ? (await anfitriones(a)).find((x) => x.id === con && x.tipos.includes(tipo)) : undefined;
  const lista = await libres(a, tipo, anf?.id);
  return json(req, {
    tipo: { id: tipo, nombre: cfg?.nombre, duracion: cfg?.duracion, activo: !!cfg?.activo },
    con: anf ? { id: anf.id, nombre: anf.nombre } : null,
    zonaHolman: a.zona,
    horas: lista.map((ms) => new Date(ms).toISOString()),
  });
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function reservar(req: Request, cuerpo: Record<string, unknown>) {
  const tipo = cuerpo.tipo;
  const nombre = String(cuerpo.nombre ?? "").trim().slice(0, 120);
  const email = String(cuerpo.email ?? "").trim().toLowerCase().slice(0, 200);
  const whatsapp = String(cuerpo.whatsapp ?? "").trim().slice(0, 40) || null;
  const motivo = String(cuerpo.motivo ?? "").trim().slice(0, 1000) || null;
  const zona = zonaValida(cuerpo.zona);
  const ref = String(cuerpo.ref ?? "").trim().toUpperCase().slice(0, 32) || null;
  const inicioMs = Date.parse(String(cuerpo.inicio ?? ""));

  if (!esTipo(tipo)) return json(req, { error: "Tipo de sesión no válido." }, 400);
  if (nombre.length < 2) return json(req, { error: "Escribe tu nombre." }, 400);
  if (!CORREO.test(email)) return json(req, { error: "Revisa tu correo: parece que le falta algo." }, 400);
  if (!Number.isFinite(inicioMs)) return json(req, { error: "Elige una hora." }, 400);

  const a = await ajustes();
  const cfg = a.tipos[tipo];
  // Quién está libre a esa hora, en orden de preferencia (o solo él, si
  // reservó desde el enlace de un anfitrión).
  const con = conQuienPide(cuerpo);
  const deEse = con ? (await anfitriones(a)).find((x) => x.id === con && x.tipos.includes(tipo)) : undefined;
  const quienes = (await huecos(a, tipo, { solo: deEse?.id })).get(inicioMs) ?? [];
  if (!quienes.length) {
    return json(req, { error: "Esa hora acaba de ocuparse. Elige otra, por favor.", ocupada: true }, 409);
  }

  // Una persona, una reserva viva del mismo tipo por delante.
  const { data: previa } = await db.from("hgg_citas").select("id, inicio").eq("tipo", tipo)
    .eq("estado", "agendada").eq("email", email).gt("inicio", new Date().toISOString()).limit(1).maybeSingle();
  if (previa) {
    return json(req, {
      error: `Ya tienes una ${cfg.nombre} reservada para el ${cuando(previa.inicio, zona ?? a.zona)}. Si quieres cambiarla, cancélala desde tu correo y elige otra hora.`,
    }, 409);
  }

  let referrer: string | null = null;
  if (ref) {
    const { data } = await db.rpc("hgg_resolve_code", { p_code: ref });
    referrer = (data as string | null) ?? null;
  }

  const nueva: Record<string, unknown> = {
    tipo,
    inicio: new Date(inicioMs).toISOString(),
    fin: new Date(inicioMs + cfg.duracion * MIN).toISOString(),
    bloque_fin: new Date(inicioMs + Math.max(cfg.bloque, cfg.duracion) * MIN).toISOString(),
    nombre, email, whatsapp, motivo, zona_cliente: zona, ref_code: ref, referrer,
  };
  // La campaña por la que llegó (tablero de /torre). Si la columna aún no
  // existe, la cita se guarda igual sin ese dato.
  const campana = limpiarCampana(cuerpo.campana);
  const insertar = async (quien: string) => {
    // Sin la migración del equipo no existe la columna: solo Holman, como antes.
    const conQuien = quien === "holman" && quienes.length === 1 ? nueva : { ...nueva, anfitrion: quien };
    let r = await db.from("hgg_citas").insert(campana ? { ...conQuien, campana } : conQuien).select("*").single();
    if (r.error && campana && faltaColumnaCampana(r.error)) {
      r = await db.from("hgg_citas").insert(conQuien).select("*").single();
    }
    return r;
  };
  let fila: unknown = null;
  let error: { code?: string } | null = null;
  // 23P01: otra persona tomó la hora en el mismo instante; se prueba con el siguiente libre.
  for (const quien of quienes) {
    ({ data: fila, error } = await insertar(quien));
    if (!error || error.code !== "23P01") break;
  }
  if (error) {
    if (error.code === "23P01") {
      return json(req, { error: "Esa hora acaba de ocuparse. Elige otra, por favor.", ocupada: true }, 409);
    }
    throw error;
  }
  const cita = fila as Cita;
  const anf = await anfitrion(cita.anfitrion ?? "holman", a);

  try {
    const z = await crearZoom(cita, a, anf);
    if (z) {
      cita.zoom_id = z.id;
      cita.zoom_url = z.url;
      await db.from("hgg_citas").update({ zoom_id: z.id, zoom_url: z.url }).eq("id", cita.id);
    }
  } catch (e) {
    console.error("[agenda] zoom", e);
  }

  const fallos = await correosReserva(cita, a, anf);
  if (fallos.length) console.error("[agenda] correos", fallos);

  return json(req, {
    ok: true,
    cita: { id: cita.id, tipo, inicio: cita.inicio, fin: cita.fin, zoom_url: cita.zoom_url, nombre: cfg.nombre },
  });
}

async function cancelar(req: Request, cuerpo: Record<string, unknown>) {
  let cita: Cita | null = null;
  let porAdmin = false;
  if (typeof cuerpo.token === "string" && cuerpo.token.length >= 16) {
    const { data } = await db.from("hgg_citas").select("*").eq("token", cuerpo.token).maybeSingle();
    cita = data as Cita | null;
  } else if (typeof cuerpo.id === "string") {
    if (!(await esAdmin(req))) return json(req, { error: "No autorizado" }, 401);
    const { data } = await db.from("hgg_citas").select("*").eq("id", cuerpo.id).maybeSingle();
    cita = data as Cita | null;
    porAdmin = true;
  }
  if (!cita) return json(req, { error: "No encontramos esa reserva." }, 404);
  if (cita.estado === "cancelada") return json(req, { ok: true, yaEstaba: true });
  if (!porAdmin && Date.parse(cita.inicio) < Date.now()) {
    return json(req, { error: "Esa sesión ya pasó." }, 400);
  }

  await db.from("hgg_citas").update({ estado: "cancelada" }).eq("id", cita.id);
  try {
    await borrarZoom(cita.zoom_id, cita.anfitrion ?? "holman");
  } catch (e) {
    console.error("[agenda] borrar zoom", e);
  }

  const a = await ajustes();
  const tz = cita.zona_cliente || a.zona;
  const primer = cita.nombre.trim().split(/\s+/)[0] ?? "";
  const otraVez = `${SITE()}${cita.tipo === "sesion" ? "/sesion" : "/agendar"}`;
  if (porAdmin) {
    await enviar(cita.email, `Tu sesión del ${cuando(cita.inicio, tz)} se canceló`, marco(`
      <h1 style="margin:0 0 18px;font-size:22px;color:#111111;font-weight:normal;">${esc(primer)}, tuvimos que mover tu sesión</h1>
      <p>${cita.tipo === "claridad" ? "Lamentamos" : "Lamento"} el cambio. Elige el horario que mejor te quede y la retomamos:</p>
      <p style="margin:18px 0 10px;">${boton(otraVez, "Elegir otro horario")}</p>
      <p>Gracias por tu comprensión,<br/>${firma(cita.tipo)}</p>`));
  } else {
    const anf = await anfitrion(cita.anfitrion ?? "holman", a);
    for (const para of destinosEquipo(a, anf)) {
      await enviar(para, `Canceló: ${cita.nombre} · ${cuando(cita.inicio, a.zona)}`, marco(`
        <p><strong>${esc(cita.nombre)}</strong> (${esc(cita.email)}) canceló su ${esc(a.tipos[cita.tipo]?.nombre ?? "sesión")} del ${esc(cuando(cita.inicio, a.zona))}${anf && anf.id !== "holman" ? ` con ${esc(anf.nombre)}` : ""}.</p>
        <p>La hora quedó libre otra vez en la agenda.</p>`), undefined, cita.email);
    }
  }
  return json(req, { ok: true, otraVez });
}

async function esAdmin(req: Request): Promise<boolean> {
  const user = await callerFrom(req);
  if (!user) return false;
  const { data } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return ["super", "admin"].includes(String(data?.role ?? ""));
}

async function reintentarZoom(req: Request, cuerpo: Record<string, unknown>) {
  if (!(await esAdmin(req))) return json(req, { error: "No autorizado" }, 401);
  const { data } = await db.from("hgg_citas").select("*").eq("id", String(cuerpo.id ?? "")).maybeSingle();
  const cita = data as Cita | null;
  if (!cita) return json(req, { error: "No encontramos esa cita." }, 404);
  const a = await ajustes();
  const z = await crearZoom(cita, a, await anfitrion(cita.anfitrion ?? "holman", a));
  if (!z) return json(req, { error: "Falta conectar el Zoom de quien da esta sesión (sus secrets ZOOM_… o su sala fija en Torre → Agenda → Equipo)." }, 400);
  await db.from("hgg_citas").update({ zoom_id: z.id, zoom_url: z.url }).eq("id", cita.id);
  return json(req, { ok: true, zoom_url: z.url });
}

/**
 * Pasa una cita a otro anfitrión (Torre → Agenda). Comprueba que esté libre,
 * cambia el Zoom por el suyo y le manda a la persona el enlace nuevo. Al
 * nuevo anfitrión le llega el aviso con la invitación de calendario.
 */
async function asignar(req: Request, cuerpo: Record<string, unknown>) {
  if (!(await esAdmin(req))) return json(req, { error: "No autorizado" }, 401);
  const { data } = await db.from("hgg_citas").select("*").eq("id", String(cuerpo.id ?? "")).maybeSingle();
  const cita = data as Cita | null;
  if (!cita) return json(req, { error: "No encontramos esa cita." }, 404);
  if (cita.estado !== "agendada" || Date.parse(cita.inicio) < Date.now()) {
    return json(req, { error: "Solo se puede pasar una sesión agendada que no haya empezado." }, 400);
  }
  const a = await ajustes();
  const nuevo = await anfitrion(String(cuerpo.anfitrion ?? ""), a);
  if (!nuevo) return json(req, { error: "No encontramos a ese anfitrión." }, 404);
  if (nuevo.id === cita.anfitrion) return json(req, { ok: true, igual: true });

  // Libre = sin otra cita suya ni bloqueo a esa hora. El horario semanal no
  // se exige: si Holman la pasa, es porque ya lo habló con él.
  const { data: choques } = await db.from("hgg_citas").select("id").eq("anfitrion", nuevo.id).neq("estado", "cancelada")
    .neq("id", cita.id).lt("inicio", cita.bloque_fin).gt("bloque_fin", cita.inicio).limit(1);
  const { data: bloqueos } = await db.from("hgg_agenda_bloqueos").select("id, anfitrion")
    .lt("desde", cita.bloque_fin).gt("hasta", cita.inicio);
  if (choques?.length) return json(req, { error: `${nuevo.nombre} ya tiene otra sesión a esa hora.` }, 409);
  if ((bloqueos ?? []).some((b: { anfitrion: string | null }) => !b.anfitrion || b.anfitrion === nuevo.id)) {
    return json(req, { error: `${nuevo.nombre} tiene esa hora bloqueada.` }, 409);
  }

  const zoomViejo = cita.zoom_id;
  let z: { id: string | null; url: string } | null = null;
  try {
    z = await crearZoom({ ...cita, anfitrion: nuevo.id }, a, nuevo);
  } catch (e) {
    console.error("[agenda] zoom al asignar", e);
  }
  const cambios = { anfitrion: nuevo.id, zoom_id: z?.id ?? null, zoom_url: z?.url ?? null, aviso_1h: false };
  const { error } = await db.from("hgg_citas").update(cambios).eq("id", cita.id);
  if (error) {
    if ((error as { code?: string }).code === "23P01") return json(req, { error: `${nuevo.nombre} ya tiene otra sesión a esa hora.` }, 409);
    throw error;
  }
  try {
    await borrarZoom(zoomViejo, cita.anfitrion ?? "holman");
  } catch (e) {
    console.error("[agenda] borrar zoom viejo", e);
  }

  const actual = { ...cita, ...cambios } as Cita;
  const tz = actual.zona_cliente || a.zona;
  const primer = actual.nombre.trim().split(/\s+/)[0] ?? "";
  const fallos: string[] = [];
  if (actual.zoom_url !== cita.zoom_url) {
    const e = await enviar(actual.email, `Tu enlace de Zoom para el ${cuando(actual.inicio, tz)}`, marco(`
      <h1 style="margin:0 0 18px;font-size:22px;color:#111111;font-weight:normal;">${esc(primer)}, tu sesión sigue en pie</h1>
      ${bloqueSesion(actual, a, tz)}
      ${quienAtiende(nuevo)}
      <p>Cambió el enlace de Zoom. Usa este (el anterior ya no sirve):</p>
      ${enlaceZoom(actual)}
      <p>Nos vemos pronto,<br/>${firma(actual.tipo)}</p>
      ${enlaceCancelar(actual)}`), ics(actual, a, a.correo_avisos));
    if (e) fallos.push(e);
  }
  if (nuevo.correo.trim().toLowerCase() !== a.correo_avisos.trim().toLowerCase()) {
    const e = await enviar(nuevo.correo, `Te asignaron: ${actual.nombre} · ${cuando(actual.inicio, a.zona)}`, marco(`
      <h1 style="margin:0 0 18px;font-size:22px;color:#111111;font-weight:normal;">Tienes una ${esc(a.tipos[actual.tipo]?.nombre ?? "sesión")}</h1>
      ${bloqueSesion(actual, a, a.zona)}
      <p><strong>Con:</strong> ${esc(actual.nombre)} · ${esc(actual.email)}<br/>
         <strong>WhatsApp:</strong> ${esc(actual.whatsapp || "—")}<br/>
         ${actual.ref_code ? `<strong>La trajo:</strong> código ${esc(actual.ref_code)}<br/>` : ""}
         ${actual.motivo ? `<strong>Qué quiere trabajar:</strong> ${esc(actual.motivo)}` : ""}</p>
      ${actual.zoom_url ? `<p>${boton(actual.zoom_url, "Enlace de Zoom")}</p>` : `<p style="color:#b8860b;">Sin Zoom todavía: Holman lo pega en la Torre.</p>`}`),
      ics(actual, a, a.correo_avisos), actual.email);
    if (e) fallos.push(e);
  }
  if (fallos.length) console.error("[agenda] correos al asignar", fallos);
  return json(req, { ok: true, zoom_url: actual.zoom_url });
}

/** Qué anfitriones tienen su Zoom conectado (para la Torre). Nunca devuelve las claves. */
async function zoomEstado(req: Request) {
  if (!(await esAdmin(req))) return json(req, { error: "No autorizado" }, 401);
  const { data } = await db.from("hgg_agenda_anfitriones").select("id");
  const ids = [...new Set(["holman", ...((data ?? []) as { id: string }[]).map((x) => x.id)])];
  return json(req, { conectado: Object.fromEntries(ids.map((id) => [id, !!zoomCred(id)])) });
}

async function secretoValido(cabecera: string | null): Promise<boolean> {
  const recibido = (cabecera ?? "").trim();
  if (!recibido) return false;
  const deEnv = (Deno.env.get("ECOS_CRON_SECRET") ?? "").trim();
  if (deEnv && recibido === deEnv) return true;
  const { data } = await db.from("ecos_privado").select("value").eq("key", "cron_secret").maybeSingle();
  return !!data?.value && recibido === String(data.value).trim();
}

async function zoomEcos(req: Request, cuerpo: Record<string, unknown>) {
  if (!(await secretoValido(req.headers.get("x-ecos-cron")))) return json(req, { error: "No autorizado" }, 401);
  if (!zoomListo()) return json(req, { error: "Falta conectar Zoom." }, 400);
  const { data: clase } = await db.from("ecos_sessions").select("id, title, starts_at, zoom_url")
    .eq("id", String(cuerpo.session_id ?? "")).maybeSingle();
  if (!clase) return json(req, { error: "No encontramos esa clase." }, 404);
  if (clase.zoom_url) return json(req, { ok: true, ya_tenia: true });
  const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: { Authorization: `Bearer ${await zoomToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: `ECOS · ${clase.title}`,
      type: 2,
      start_time: new Date(clase.starts_at).toISOString().replace(/\.\d{3}Z$/, "Z"),
      duration: Math.min(Math.max(Number(cuerpo.duracion) || 120, 30), 300),
      timezone: "America/New_York",
      // Muchos invitados a la vez: sin sala de espera, y nadie entra antes que Holman.
      settings: { join_before_host: false, waiting_room: false, mute_upon_entry: true },
    }),
  });
  if (!res.ok) throw new Error(`Zoom ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const m = await res.json();
  await db.from("ecos_sessions").update({ zoom_url: String(m.join_url) }).eq("id", clase.id);
  return json(req, { ok: true });
}

async function recordatorios(req: Request) {
  if (!(await secretoValido(req.headers.get("x-ecos-cron")))) return json(req, { error: "No autorizado" }, 401);
  const ahora = Date.now();
  const { data, error } = await db.from("hgg_citas").select("*").eq("estado", "agendada")
    .gt("inicio", new Date(ahora).toISOString()).lt("inicio", new Date(ahora + 25 * HORA).toISOString());
  if (error) throw error;
  const a = await ajustes();
  let enviados = 0;
  for (const c of (data ?? []) as Cita[]) {
    const falta = Date.parse(c.inicio) - ahora;
    let cual: Aviso | null = null;
    // La tarea corre cada 5 minutos: sale entre 16 y 11 minutos antes.
    if (!c.aviso_1h && falta <= 16 * MIN) cual = "15min";
    else if (!c.aviso_24h && tocaAvisoDia(c, a, ahora)) cual = "dia";
    if (!cual) continue;
    // Se marca antes de enviar: si la tarea corre dos veces, no se repite.
    const marca = cual === "15min" ? { aviso_1h: true, aviso_24h: true } : { aviso_24h: true };
    const { data: tomada } = await db.from("hgg_citas").update(marca).eq("id", c.id)
      .eq(cual === "15min" ? "aviso_1h" : "aviso_24h", false).select("id");
    if (!tomada?.length) continue;
    const m = correoRecordatorio(c, a, cual, ahora);
    const e = await enviar(c.email, m.asunto, m.html);
    if (e) {
      console.error("[agenda] recordatorio", c.id, e);
      await db.from("hgg_citas").update(cual === "15min" ? { aviso_1h: false } : { aviso_24h: false }).eq("id", c.id);
    } else {
      enviados++;
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return json(req, { ok: true, enviados });
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { error: "Método no permitido" }, 405);
  const cuerpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    switch (cuerpo.accion) {
      case "horarios": return await horarios(req, cuerpo);
      case "reservar": return await reservar(req, cuerpo);
      case "cancelar": return await cancelar(req, cuerpo);
      case "zoom": return await reintentarZoom(req, cuerpo);
      case "asignar": return await asignar(req, cuerpo);
      case "zoom_estado": return await zoomEstado(req);
      case "recordatorios": return await recordatorios(req);
      case "zoom_ecos": return await zoomEcos(req, cuerpo);
      default: return json(req, { error: "Acción no válida." }, 400);
    }
  } catch (e) {
    console.error("[agenda]", e);
    return json(req, { error: "Algo falló de nuestro lado. Intenta de nuevo en un momento." }, 500);
  }
});
