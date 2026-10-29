// ecos-invitado — registro a la masterclass abierta (el lead magnet del sitio).
//
// Acciones (POST, cuerpo JSON con «accion»), públicas:
//   · proxima    { session_id? } → la masterclass abierta a invitados: la pedida
//                o, sin id, la próxima que venga
//   · registrar  { session_id?, nombre, email, whatsapp, by?, zona? }
//                → guarda al invitado (ligado al miembro que lo invitó, si trae
//                  su código) y le manda la confirmación con la invitación de
//                  calendario. Si ya estaba registrado, no duplica: solo le
//                  vuelve a mandar la confirmación.
//
// Los avisos de después (día antes, 1 hora antes, en punto con el Zoom) los
// manda ecos-clases. Aquí NUNCA va el enlace de Zoom.
//
// Cada registro nuevo le avisa a Holman por correo (nombre, WhatsApp, quién lo
// invitó y cuántos van). Va al correo de avisos de la agenda
// (hgg_agenda_ajustes.correo_avisos) o a MASTERCLASS_AVISO_A si está puesto.
//
// Variables: RESEND_API_KEY, SITE_URL, ALLOWED_ORIGINS (+ las de Supabase).
//            MASTERCLASS_REMITENTE y MASTERCLASS_AVISO_A (opcionales).
// Verify JWT: NO (la usan visitantes sin cuenta).

import { adminClient, env, json, preflight } from "../_shared/ecos.ts";
import { faltaColumnaCampana, limpiarCampana } from "../_shared/campana.ts";

const db = adminClient();
const MIAMI = "America/New_York";

type Clase = { id: string; title: string; starts_at: string; teacher: string | null; description: string | null };

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

const dia = (iso: string, tz: string) =>
  new Date(iso).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", timeZone: tz });
const hora = (iso: string, tz: string) =>
  new Date(iso).toLocaleTimeString("es-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
const lugar = (tz: string) => {
  const c = tz.split("/").pop() ?? tz;
  const nombres: Record<string, string> = { Bogota: "Bogotá", Mexico_City: "Ciudad de México", New_York: "Miami" };
  return nombres[c] ?? c.replace(/_/g, " ");
};

/** La masterclass pedida, o la próxima abierta a invitados. */
async function buscar(sessionId: string): Promise<Clase | null> {
  let q = db.from("ecos_sessions").select("id, title, starts_at, teacher, description")
    .eq("published", true).eq("open_to_guests", true).gt("starts_at", new Date().toISOString());
  q = sessionId ? q.eq("id", sessionId) : q.order("starts_at").limit(1);
  const { data } = await q.maybeSingle();
  return (data as Clase | null) ?? null;
}

function base64(texto: string): string {
  let bin = "";
  for (const b of new TextEncoder().encode(texto)) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Invitación de calendario, sin Zoom: el enlace llega por correo a la hora. */
function ics(c: Clase): string {
  const f = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ini = new Date(c.starts_at).getTime();
  const linea = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Holman Global Group//Masterclass//ES", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:masterclass-${c.id}@holmanglobalgroup.com`,
    `DTSTAMP:${f(Date.now())}`, `DTSTART:${f(ini)}`, `DTEND:${f(ini + 2 * 3_600_000)}`,
    `SUMMARY:${linea(`Masterclass: ${c.title}`)}`,
    `DESCRIPTION:${linea("Masterclass gratuita de Holman Orjuela por Zoom. El enlace para entrar te llega por correo a la hora de empezar.")}`,
    "LOCATION:Zoom (el enlace llega por correo)",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

function correoConfirmacion(c: Clase, primer: string, tz: string): string {
  const site = env("SITE_URL", "https://holmanglobalgroup.com");
  const suHora = tz === MIAMI
    ? `${dia(c.starts_at, MIAMI)} · <strong>${hora(c.starts_at, MIAMI)}</strong> (hora de Miami)`
    : `${dia(c.starts_at, tz)} · <strong>${hora(c.starts_at, tz)}</strong> (hora de ${esc(lugar(tz))})<br/><span style="color:#999999;font-size:13px;">${hora(c.starts_at, MIAMI)} en Miami</span>`;
  return `<div style="margin:0;padding:32px 16px;background:#f4f2ee;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:36px 32px;color:#333333;font-size:15px;line-height:1.7;">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:3px;color:#b8860b;text-transform:uppercase;">Masterclass gratuita</p>
    <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#111111;font-weight:normal;">${primer ? `${esc(primer)}, tu lugar` : "Tu lugar"} está reservado</h1>
    <p style="margin:0 0 20px;padding:16px 18px;background:#faf7ef;border-left:3px solid #e8b923;border-radius:6px;">
      <strong>${esc(c.title)}</strong><br/>
      <span style="color:#444444;">${suHora}</span><br/>
      <span style="color:#666666;">En vivo por Zoom · con Holman Orjuela</span>
    </p>
    <p><strong>Lo que te llevas:</strong></p>
    <ul style="margin:0 0 18px;padding-left:20px;">
      <li>Convierte lo que sabes en una oferta por la que te paguen.</li>
      <li>Consigue tus primeros clientes sin pagar publicidad.</li>
      <li>Vende con naturalidad, sin sentirte vendedor.</li>
    </ul>
    <p>Te escribo el día antes y una hora antes. <strong>El enlace para entrar te llega a este correo a la hora de empezar.</strong> Adjunto va la invitación para tu calendario.</p>
    <p>Mientras tanto, si quieres ir calentando motores, escucha el episodio donde nació esta masterclass:</p>
    <p style="margin:20px 0 12px;"><a href="https://www.youtube.com/watch?v=4z_CYlkgi9E" style="display:inline-block;padding:13px 26px;background:#e8b923;color:#111111;text-decoration:none;border-radius:999px;font-weight:bold;">¿Se puede vivir de lo que amas desde internet?</a></p>
    <p>Nos vemos en vivo,<br/>Holman</p>
    <p style="margin:28px 0 0;font-size:12px;color:#999999;">Holman Global Group · <a href="${esc(site)}" style="color:#999999;">holmanglobalgroup.com</a><br/>Recibes este correo porque te registraste a la masterclass.</p>
  </div>
</div>`;
}

async function enviar(to: string, subject: string, html: string, adjunto?: string): Promise<string | null> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env("MASTERCLASS_REMITENTE", "Holman Orjuela <holman@mkt.holmanglobalgroup.com>"),
      reply_to: env("ECOS_RESPONDER_A", "equipo@holmanglobalgroup.com"),
      to: [to],
      subject,
      html,
      ...(adjunto ? { attachments: [{ filename: "masterclass.ics", content: base64(adjunto), content_type: "text/calendar; charset=utf-8" }] } : {}),
    }),
  });
  if (res.ok) return null;
  return `Resend ${res.status}: ${(await res.text()).slice(0, 300)}`;
}

/** El aviso a Holman de cada registro nuevo. Si falla, el registro sigue igual. */
async function avisarAHolman(c: Clase, g: { nombre: string; email: string; whatsapp: string | null; invitedBy: string | null; campana: string | null }) {
  let destino = Deno.env.get("MASTERCLASS_AVISO_A") ?? "";
  if (!destino) {
    const { data } = await db.from("hgg_agenda_ajustes").select("correo_avisos").eq("id", 1).maybeSingle();
    destino = (data as { correo_avisos?: string } | null)?.correo_avisos ?? "equipo@holmanglobalgroup.com";
  }
  let quien = "";
  if (g.invitedBy) {
    const { data } = await db.from("ecos_members").select("name").eq("id", g.invitedBy).maybeSingle();
    quien = (data as { name?: string } | null)?.name ?? "un miembro del club";
  }
  const { count } = await db.from("ecos_guests").select("id", { count: "exact", head: true }).eq("session_id", c.id);
  const total = count ?? 0;
  const wa = (g.whatsapp ?? "").replace(/\D/g, "");
  const origen = quien ? `Invitado por <strong>${esc(quien)}</strong>` : g.campana ? `Llegó por la campaña <strong>${esc(g.campana)}</strong>` : "Llegó directo";
  const site = env("SITE_URL", "https://holmanglobalgroup.com");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#333333;max-width:520px;">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:3px;color:#b8860b;text-transform:uppercase;">Nuevo registro · masterclass</p>
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:normal;color:#111111;">${esc(g.nombre)} se registró</h1>
    <p style="margin:0 0 16px;padding:14px 16px;background:#faf7ef;border-left:3px solid #e8b923;border-radius:6px;">
      ${esc(g.email)}<br/>
      ${wa ? `<a href="https://wa.me/${wa}" style="color:#111111;">${esc(g.whatsapp)}</a> (WhatsApp)<br/>` : ""}
      ${origen}
    </p>
    <p>Ya van <strong>${total}</strong> ${total === 1 ? "persona registrada" : "personas registradas"} a «${esc(c.title)}» (${dia(c.starts_at, MIAMI)}).</p>
    <p style="font-size:13px;color:#999999;">La lista completa está en la Torre → ECOS → Clases. <a href="${esc(site)}" style="color:#999999;">holmanglobalgroup.com</a></p>
  </div>`;
  const e = await enviar(destino, `Nuevo registro a la masterclass: ${g.nombre} (van ${total})`, html);
  if (e) console.error("[ecos-invitado] aviso a Holman", e);
}

async function registrar(req: Request, cuerpo: Record<string, unknown>) {
  const nombre = String(cuerpo.nombre ?? "").trim().slice(0, 120);
  const email = String(cuerpo.email ?? "").trim().toLowerCase().slice(0, 200);
  const whatsapp = String(cuerpo.whatsapp ?? "").trim().slice(0, 40) || null;
  const zona = zonaValida(cuerpo.zona) ?? MIAMI;
  if (nombre.length < 2) return json(req, { error: "Escribe tu nombre." }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(req, { error: "Revisa tu correo." }, 400);
  if (!whatsapp || whatsapp.replace(/\D/g, "").length < 8) {
    return json(req, { error: "Escribe tu WhatsApp con el código de país, por ejemplo +57 300 000 0000." }, 400);
  }

  const clase = await buscar(String(cuerpo.session_id ?? ""));
  if (!clase) return json(req, { error: "Esta masterclass ya no está abierta." }, 404);

  let invitedBy: string | null = null;
  const by = String(cuerpo.by ?? "").trim().toUpperCase().slice(0, 40);
  if (by) {
    const { data } = await db.rpc("ecos_resolve_referral", { code: by });
    invitedBy = (data as string | null) ?? null;
  }

  const { data: previo } = await db.from("ecos_guests").select("id")
    .eq("session_id", clase.id).eq("email", email).maybeSingle();
  // Ya registrado: no se reenvía el correo. Si no, cualquiera podría mandar
  // correos sin límite a cualquier dirección y gastar el cupo diario de Resend.
  if (previo) {
    return json(req, { ok: true, ya_estaba: true, clase: { id: clase.id, title: clase.title, starts_at: clase.starts_at } });
  }
  // Freno contra bots: más de 40 registros nuevos en 10 minutos no es gente.
  const { count: recientes } = await db.from("ecos_guests").select("id", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());
  if ((recientes ?? 0) > 40) {
    return json(req, { error: "Hay muchos registros en este momento. Intenta de nuevo en unos minutos." }, 429);
  }
  const fila = { session_id: clase.id, name: nombre, email, whatsapp, invited_by: invitedBy, zona };
  // La campaña por la que llegó (tablero de /torre). Si la columna aún no
  // existe, el registro se guarda igual sin ese dato.
  const campana = limpiarCampana(cuerpo.campana);
  let { error } = await db.from("ecos_guests").insert(campana ? { ...fila, campana } : fila);
  if (error && campana && faltaColumnaCampana(error)) {
    ({ error } = await db.from("ecos_guests").insert(fila));
  }
  // Dos clics seguidos: el índice único frena el segundo, y ese no reenvía.
  const repetido = error?.code === "23505";
  if (error && !repetido) throw error;

  if (!repetido) {
    const primer = nombre.split(/\s+/)[0] ?? "";
    const e = await enviar(email, `Tu lugar en la masterclass: ${clase.title}`, correoConfirmacion(clase, primer, zona), ics(clase));
    if (e) console.error("[ecos-invitado] confirmación", e);
    await avisarAHolman(clase, { nombre, email, whatsapp, invitedBy, campana: campana ? (campana.utm_source ?? campana.utm_campaign ?? null) : null })
      .catch((err) => console.error("[ecos-invitado] aviso a Holman", err));
  }
  return json(req, { ok: true, ya_estaba: repetido, clase: { id: clase.id, title: clase.title, starts_at: clase.starts_at } });
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { error: "Método no permitido" }, 405);
  const cuerpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    switch (cuerpo.accion) {
      case "proxima": return json(req, { clase: await buscar(String(cuerpo.session_id ?? "")) });
      case "registrar": return await registrar(req, cuerpo);
      default: return json(req, { error: "Acción no válida." }, 400);
    }
  } catch (e) {
    console.error("[ecos-invitado]", e);
    return json(req, { error: "Algo falló de nuestro lado. Intenta de nuevo en un momento." }, 500);
  }
});
