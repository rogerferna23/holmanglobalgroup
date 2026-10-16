// agenda — la agenda propia de HGG (reemplaza a DelegaMeet, oct 2026).
//
// Acciones (POST, cuerpo JSON con «accion»):
//   · horarios      { tipo }                       → las horas libres de los próximos días (público)
//   · reservar      { tipo, inicio, nombre, email, whatsapp?, motivo?, zona?, ref?, campana? } (público)
//                   → aparta la hora, crea la reunión de Zoom y manda los correos
//   · cancelar      { token }  (público, desde el correo)   o   { id } con JWT de admin (Torre)
//   · zoom          { id } con JWT de admin → vuelve a intentar crear el Zoom de una cita
//   · zoom_ecos     { session_id, duracion? } (cabecera x-ecos-cron) → crea un Zoom
//                   propio para una clase de ECOS (p. ej. la masterclass con
//                   invitados, que no debe usar el Zoom fijo del club)
//   · recordatorios (tarea programada, cabecera x-ecos-cron) → aviso del día (8 a. m.
//                   de la persona, o la noche antes si la sesión es temprano) y
//                   aviso 15 min antes con el Zoom
//
// El horario lo pone Holman en Torre → Agenda (hgg_agenda_ajustes) en SU zona;
// aquí se convierte a instantes reales. La persona ve las horas en la suya.
// La base impide que dos citas se pisen (restricción hgg_citas_sin_choque).
//
// Zoom: app «Server-to-Server OAuth» de la cuenta de Holman. Sin esas
// variables la reserva igual se hace; el correo dice que el enlace llega
// aparte y Holman lo pega en la Torre.
//
// Variables: RESEND_API_KEY, SITE_URL, ALLOWED_ORIGINS (+ las de Supabase).
//            ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET (opcionales).
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
  // aviso_24h = el aviso del día; aviso_1h = el de 15 minutos antes (los
  // nombres vienen de la primera versión, cuando eran 24 h y 1 h).
  aviso_24h: boolean; aviso_1h: boolean; created_at: string;
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

/** Las horas de inicio libres (ms) para un tipo, de ahora a `dias_adelante`. */
async function libres(a: Ajustes, tipo: TipoId, ahora = Date.now()): Promise<number[]> {
  const cfg = a.tipos[tipo];
  if (!cfg?.activo) return [];
  const bloque = Math.max(15, Number(cfg.bloque) || 60) * MIN;
  const desde = ahora + Math.max(0, a.aviso_horas) * HORA;
  const hasta = ahora + a.dias_adelante * DIA;

  const [{ data: citas }, { data: bloqueos }] = await Promise.all([
    db.from("hgg_citas").select("inicio, bloque_fin").neq("estado", "cancelada")
      .lt("inicio", new Date(hasta + DIA).toISOString()).gt("bloque_fin", new Date(ahora).toISOString()),
    db.from("hgg_agenda_bloqueos").select("desde, hasta")
      .lt("desde", new Date(hasta + DIA).toISOString()).gt("hasta", new Date(ahora).toISOString()),
  ]);
  const ocupado = [
    ...(citas ?? []).map((c: { inicio: string; bloque_fin: string }) => [Date.parse(c.inicio), Date.parse(c.bloque_fin)]),
    ...(bloqueos ?? []).map((b: { desde: string; hasta: string }) => [Date.parse(b.desde), Date.parse(b.hasta)]),
  ];
  const choca = (i: number, f: number) => ocupado.some(([oi, of]) => i < of && f > oi);

  const salida: number[] = [];
  const vistos = new Set<string>();
  for (let t = ahora; t <= hasta + DIA; t += DIA) {
    const { fecha, dow } = fechaEn(t, a.zona);
    if (vistos.has(fecha)) continue;
    vistos.add(fecha);
    for (const [ini, fin] of a.horario[String(dow)] ?? []) {
      const tramoFin = instante(fecha, fin, a.zona);
      for (let s = instante(fecha, ini, a.zona); s + bloque <= tramoFin; s += bloque) {
        if (s < desde || s > hasta) continue;
        if (!choca(s, s + bloque)) salida.push(s);
      }
    }
  }
  return salida.sort((x, y) => x - y);
}

// ---------------------------------------------------------------------------
// Zoom (Server-to-Server OAuth)
// ---------------------------------------------------------------------------

const zoomListo = () =>
  !!(Deno.env.get("ZOOM_ACCOUNT_ID") && Deno.env.get("ZOOM_CLIENT_ID") && Deno.env.get("ZOOM_CLIENT_SECRET"));

async function zoomToken(): Promise<string> {
  const basic = btoa(`${env("ZOOM_CLIENT_ID")}:${env("ZOOM_CLIENT_SECRET")}`);
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(env("ZOOM_ACCOUNT_ID"))}`,
    { method: "POST", headers: { Authorization: `Basic ${basic}` } },
  );
  if (!res.ok) throw new Error(`Zoom token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).access_token as string;
}

async function crearZoom(c: Cita, a: Ajustes): Promise<{ id: string; url: string } | null> {
  if (!zoomListo()) return null;
  const cfg = a.tipos[c.tipo];
  const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: { Authorization: `Bearer ${await zoomToken()}`, "Content-Type": "application/json" },
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

async function borrarZoom(id: string | null): Promise<void> {
  if (!id || !zoomListo()) return;
  const res = await fetch(`https://api.zoom.us/v2/meetings/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${await zoomToken()}` },
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

async function correosReserva(c: Cita, a: Ajustes): Promise<string[]> {
  const fallos: string[] = [];
  const tz = c.zona_cliente || a.zona;
  const primer = c.nombre.trim().split(/\s+/)[0] ?? "";
  const esClaridad = c.tipo === "claridad";
  const invitacion = ics(c, a, a.correo_avisos);

  const paraCliente = marco(`
    <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#111111;font-weight:normal;">${esc(primer)}, tu sesión quedó reservada</h1>
    ${bloqueSesion(c, a, tz)}
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
    <p><strong>Correo:</strong> ${esc(c.email)}<br/>
       <strong>WhatsApp:</strong> ${esc(c.whatsapp || "—")}<br/>
       <strong>Su zona:</strong> ${esc(c.zona_cliente || "—")}<br/>
       ${c.ref_code ? `<strong>La trajo:</strong> código ${esc(c.ref_code)}<br/>` : ""}
       ${c.motivo ? `<strong>Qué quiere trabajar:</strong> ${esc(c.motivo)}` : ""}</p>
    ${c.zoom_url ? `<p><a href="${esc(c.zoom_url)}" style="color:#b8860b;">Enlace de Zoom</a></p>` : `<p style="color:#b8860b;">No se creó el Zoom: pégalo en Torre → Agenda.</p>`}
    <p style="margin:22px 0 0;">${boton(`${SITE()}/torre/agenda`, "Abrir la agenda en la Torre")}</p>`);
  const e2 = await enviar(a.correo_avisos, `Nueva reserva · ${c.nombre} · ${cuando(c.inicio, a.zona)}`, paraHolman, invitacion, c.email);
  if (e2) fallos.push(e2);
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
  const lista = await libres(a, tipo);
  return json(req, {
    tipo: { id: tipo, nombre: cfg?.nombre, duracion: cfg?.duracion, activo: !!cfg?.activo },
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
  if (!(await libres(a, tipo)).includes(inicioMs)) {
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
  let { data: fila, error } = await db.from("hgg_citas").insert(campana ? { ...nueva, campana } : nueva).select("*").single();
  if (error && campana && faltaColumnaCampana(error)) {
    ({ data: fila, error } = await db.from("hgg_citas").insert(nueva).select("*").single());
  }
  if (error) {
    // 23P01: otra persona tomó la hora en el mismo instante.
    if ((error as { code?: string }).code === "23P01") {
      return json(req, { error: "Esa hora acaba de ocuparse. Elige otra, por favor.", ocupada: true }, 409);
    }
    throw error;
  }
  const cita = fila as Cita;

  try {
    const z = await crearZoom(cita, a);
    if (z) {
      cita.zoom_id = z.id;
      cita.zoom_url = z.url;
      await db.from("hgg_citas").update({ zoom_id: z.id, zoom_url: z.url }).eq("id", cita.id);
    }
  } catch (e) {
    console.error("[agenda] zoom", e);
  }

  const fallos = await correosReserva(cita, a);
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
    await borrarZoom(cita.zoom_id);
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
    await enviar(a.correo_avisos, `Canceló: ${cita.nombre} · ${cuando(cita.inicio, a.zona)}`, marco(`
      <p><strong>${esc(cita.nombre)}</strong> (${esc(cita.email)}) canceló su ${esc(a.tipos[cita.tipo]?.nombre ?? "sesión")} del ${esc(cuando(cita.inicio, a.zona))}.</p>
      <p>La hora quedó libre otra vez en la agenda.</p>`), undefined, cita.email);
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
  if (!zoomListo()) return json(req, { error: "Falta conectar Zoom (ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET)." }, 400);
  const { data } = await db.from("hgg_citas").select("*").eq("id", String(cuerpo.id ?? "")).maybeSingle();
  const cita = data as Cita | null;
  if (!cita) return json(req, { error: "No encontramos esa cita." }, 404);
  const a = await ajustes();
  const z = await crearZoom(cita, a);
  if (!z) return json(req, { error: "No se pudo crear el Zoom." }, 500);
  await db.from("hgg_citas").update({ zoom_id: z.id, zoom_url: z.url }).eq("id", cita.id);
  return json(req, { ok: true, zoom_url: z.url });
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
      case "recordatorios": return await recordatorios(req);
      case "zoom_ecos": return await zoomEcos(req, cuerpo);
      default: return json(req, { error: "Acción no válida." }, 400);
    }
  } catch (e) {
    console.error("[agenda]", e);
    return json(req, { error: "Algo falló de nuestro lado. Intenta de nuevo en un momento." }, 500);
  }
});
