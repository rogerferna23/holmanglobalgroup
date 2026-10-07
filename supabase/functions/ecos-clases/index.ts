// ecos-clases — recuerda a los miembros cada clase publicada del calendario.
//
//   · «previo»: el día antes (o la mañana del mismo día, si ya es tarde),
//     entre las 9 a. m. y las 9 p. m. de Nueva York, para no escribir de
//     madrugada. Solo si faltan más de 3 horas.
//   · «1hora»: cuando falta una hora o menos.
//
// Cada quien ve la hora de la clase en su zona (sacada de su país y ciudad),
// con Miami de referencia.
//
// El correo NO lleva el enlace de Zoom: lleva al panel, donde está. Así el
// enlace no circula reenviado y solo entra quien tiene acceso al club.
//
// Le escribe a todo el que hoy tiene acceso (activo, profesor, cortesía o en
// su prueba gratis), la misma regla de is_ecos_member(). Cada correo sale UNA
// vez por persona y clase: ecos_avisos_clase guarda cuál se mandó a quién.
//
// La llama cada 15 minutos una tarea programada de la base (pg_cron, ver la
// migración 20261018_ecos_avisos_clase.sql), con el mismo secreto que
// ecos-recordatorios (cabecera x-ecos-cron, tabla ecos_privado).
//
// Cuerpo opcional:
//   { "simular": true }          → devuelve a quién le escribiría ahora, sin enviar
//   { "probar": "correo@..." }   → manda los dos correos de ejemplo con la próxima clase
//
// Variables: RESEND_API_KEY, SITE_URL (+ las de Supabase). ECOS_CRON_SECRET opcional.
// Verify JWT: NO.

import { adminClient, env } from "../_shared/ecos.ts";

const db = adminClient();
const HORA = 3_600_000;

/** Lo que viene de la base va dentro de un correo HTML: se escapa. */
function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function enviar(to: string, subject: string, html: string): Promise<string | null> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env("ECOS_REMITENTE", "ECOS · Holman Global Group <club@mkt.holmanglobalgroup.com>"),
      reply_to: env("ECOS_RESPONDER_A", "equipo@holmanglobalgroup.com"),
      to: [to],
      subject,
      html,
    }),
  });
  if (res.ok) return null;
  return `Resend ${res.status}: ${(await res.text()).slice(0, 300)}`;
}

function marco(contenido: string): string {
  return `<div style="margin:0;padding:32px 16px;background:#f4f2ee;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:36px 32px;color:#333333;font-size:15px;line-height:1.7;">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:3px;color:#b8860b;text-transform:uppercase;">ECOS · Business Club</p>
    ${contenido}
    <p style="margin:28px 0 0;font-size:12px;color:#999999;">Holman Global Group</p>
  </div>
</div>`;
}

const boton = (href: string, texto: string) =>
  `<a href="${esc(href)}" style="display:inline-block;padding:13px 26px;background:#e8b923;color:#111111;text-decoration:none;border-radius:999px;font-weight:bold;">${esc(texto)}</a>`;

type Tipo = "previo" | "1hora";
type Sesion = { id: string; starts_at: string; kind: string; subject: string; title: string; teacher: string | null };

const MIAMI = "America/New_York";

/** «7:00 p. m.» en la zona que se pida. */
function hora(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString("es-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
}
/** «martes 6 de octubre» en la zona que se pida. */
function dia(iso: string, tz: string): string {
  return new Date(iso).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", timeZone: tz });
}
/** Fecha y hora de una zona como números, para comparar días y horas. */
function enZona(ms: number, tz: string): { fecha: string; hora: number } {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { fecha: `${v("year")}-${v("month")}-${v("day")}`, hora: Number(v("hour")) };
}

const enNY = (ms: number) => enZona(ms, MIAMI);

/** Sin tildes ni mayúsculas, para comparar lo que escribió cada persona. */
const norm = (s: string | null) =>
  String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const POR_PAIS: Record<string, string> = {
  colombia: "America/Bogota", ecuador: "America/Guayaquil", peru: "America/Lima", panama: "America/Panama",
  venezuela: "America/Caracas", bolivia: "America/La_Paz", paraguay: "America/Asuncion", chile: "America/Santiago",
  argentina: "America/Argentina/Buenos_Aires", uruguay: "America/Montevideo", brasil: "America/Sao_Paulo",
  brazil: "America/Sao_Paulo", mexico: "America/Mexico_City", espana: "Europe/Madrid", spain: "Europe/Madrid",
  "republica dominicana": "America/Santo_Domingo", "puerto rico": "America/Puerto_Rico",
  "costa rica": "America/Costa_Rica", guatemala: "America/Guatemala", honduras: "America/Tegucigalpa",
  "el salvador": "America/El_Salvador", nicaragua: "America/Managua", cuba: "America/Havana",
  canada: "America/Toronto", italia: "Europe/Rome", francia: "Europe/Paris", alemania: "Europe/Berlin",
  "reino unido": "Europe/London", portugal: "Europe/Lisbon",
};
/** Ciudades de EE. UU. fuera de la hora del Este (la de Miami, que es la de por defecto). */
const EEUU: [string[], string][] = [
  [["chicago", "houston", "dallas", "austin", "san antonio", "saint paul", "st paul", "st. paul", "minneapolis",
    "nashville", "new orleans", "kansas", "oklahoma", "memphis", "milwaukee", "fort worth", "omaha"], "America/Chicago"],
  [["denver", "salt lake", "albuquerque", "el paso", "boise"], "America/Denver"],
  [["phoenix", "tucson", "scottsdale"], "America/Phoenix"],
  [["los angeles", "san francisco", "san diego", "seattle", "portland", "las vegas", "sacramento", "san jose", "oakland"], "America/Los_Angeles"],
];

/** La zona horaria de cada persona según su país y ciudad, o null si no se sabe. */
function zonaDe(pais: string | null, ciudad: string | null): string | null {
  const p = norm(pais), c = norm(ciudad);
  if (["estados unidos", "usa", "eeuu", "ee.uu.", "ee. uu.", "united states", "us"].includes(p)) {
    return EEUU.find(([lista]) => lista.some((x) => c.includes(x)))?.[1] ?? MIAMI;
  }
  if (p === "mexico" && /cancun|playa del carmen|tulum|quintana|cozumel/.test(c)) return "America/Cancun";
  if (p === "mexico" && /tijuana|mexicali|ensenada/.test(c)) return "America/Tijuana";
  if ((p === "espana" || p === "spain") && /canaria|tenerife|las palmas/.test(c)) return "Atlantic/Canary";
  return POR_PAIS[p] ?? null;
}

/** Para quién es el correo: su nombre y, si se sabe, su hora. */
type Para = { primer: string; tz: string | null; lugar: string };

/** «clase de oratoria», «masterclass»… lo que va en el asunto. */
function nombreClase(s: Sesion): string {
  const materia = s.subject && s.subject !== "abierta" ? s.subject : "";
  if (s.kind === "masterclass") return "masterclass";
  if (s.kind === "practica") return materia ? `práctica de ${materia}` : "práctica";
  if (s.kind === "mesa") return "mesa de trabajo";
  return materia ? `clase de ${materia}` : "clase";
}

function correo(tipo: Tipo, s: Sesion, para: Para, ahora: number): { asunto: string; html: string } {
  const { primer, tz, lugar } = para;
  const site = env("SITE_URL", "https://holmanglobalgroup.com");
  const nombre = nombreClase(s);
  const Nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1);
  // Primero su hora (y su día: en España la clase cae de madrugada del día
  // siguiente); Miami queda de referencia. Sin zona conocida, Miami y Colombia.
  const cuandoClase = !tz
    ? `${dia(s.starts_at, MIAMI)} · ${hora(s.starts_at, MIAMI)} Miami · ${hora(s.starts_at, "America/Bogota")} Colombia`
    : tz === MIAMI
    ? `${dia(s.starts_at, MIAMI)} · ${hora(s.starts_at, MIAMI)} hora de Miami`
    : `${dia(s.starts_at, tz)} · <strong>${hora(s.starts_at, tz)} en ${esc(lugar)}</strong> (${hora(s.starts_at, MIAMI)} en Miami)`;
  // El título solo se muestra si dice algo más que «Clase de oratoria».
  const tema = s.title && s.title.trim().toLowerCase() !== nombre.toLowerCase() ? s.title.trim() : "";
  const detalle = `<p style="margin:0 0 20px;padding:16px 18px;background:#faf7ef;border-left:3px solid #e8b923;border-radius:6px;">
      <strong>${esc(Nombre)}</strong>${s.teacher ? ` con ${esc(s.teacher)}` : ""}${tema ? `<br/>${esc(tema)}` : ""}<br/>
      <span style="color:#666666;">${cuandoClase}</span>
    </p>`;
  const panel = boton(`${site}/ecos/panel/clases`, "Ver la clase en mi panel");
  const saludo = primer ? `${esc(primer)}, ` : "";

  if (tipo === "previo") {
    const z = tz ?? MIAMI;
    const esHoy = enZona(ahora, z).fecha === enZona(new Date(s.starts_at).getTime(), z).fecha;
    const cuando = esHoy ? "hoy" : "mañana";
    return {
      asunto: `${esHoy ? "Hoy" : "Mañana"} es tu ${nombre} en ECOS`,
      html: marco(`
        <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#111111;font-weight:normal;">${saludo}${cuando} nos vemos en clase</h1>
        ${detalle}
        <p>Ven con ganas de practicar: el 80% de la clase es tuyo. Hablas, la sala te escucha y te llevas feedback para mejorar en el momento.</p>
        <p>El enlace de Zoom te espera en tu panel, en <strong>Clases</strong>. Entra unos minutos antes con cámara y micrófono listos.</p>
        <p style="margin:24px 0 10px;">${panel}</p>
        <p>Nos vemos ${cuando},<br/>Holman</p>`),
    };
  }
  return {
    asunto: `En una hora empezamos: ${nombre}${s.teacher ? ` con ${s.teacher}` : ""}`,
    html: marco(`
      <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#111111;font-weight:normal;">${saludo}en una hora empezamos</h1>
      ${detalle}
      <p>Busca un lugar tranquilo, ten a mano cámara y micrófono, y entra desde tu panel unos minutos antes.</p>
      <p style="margin:24px 0 10px;">${panel}</p>
      <p>Te espero en la sala,<br/>Holman</p>`),
  };
}

/** Mismo secreto que ecos-recordatorios: vive en ecos_privado. */
async function secretoValido(cabecera: string | null): Promise<boolean> {
  const recibido = (cabecera ?? "").trim();
  if (!recibido) return false;
  const deEnv = (Deno.env.get("ECOS_CRON_SECRET") ?? "").trim();
  if (deEnv && recibido === deEnv) return true;
  const { data } = await db.from("ecos_privado").select("value").eq("key", "cron_secret").maybeSingle();
  return !!data?.value && recibido === String(data.value).trim();
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

const responder = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Qué aviso le toca a la clase en este momento, o null. */
function tipoPara(s: Sesion, ahora: number): Tipo | null {
  const falta = new Date(s.starts_at).getTime() - ahora;
  if (falta <= 0) return null;
  if (falta <= HORA + 5 * 60_000) return "1hora";
  const { hora: h } = enNY(ahora);
  if (falta > 3 * HORA && falta <= 30 * HORA && h >= 9 && h < 21) return "previo";
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);
  if (!(await secretoValido(req.headers.get("x-ecos-cron")))) return responder({ error: "No autorizado" }, 401);

  const cuerpo = (await req.json().catch(() => ({}))) as { simular?: boolean; probar?: string };
  const ahora = Date.now();

  try {
    const { data: sesiones, error: e1 } = await db
      .from("ecos_sessions")
      .select("id, starts_at, kind, subject, title, teacher")
      .eq("published", true)
      .gt("starts_at", new Date(ahora).toISOString())
      .lt("starts_at", new Date(ahora + 31 * HORA).toISOString())
      .order("starts_at");
    if (e1) throw e1;

    // Muestra de los dos correos con la próxima clase publicada.
    if (cuerpo.probar) {
      const { data: proxima } = await db.from("ecos_sessions")
        .select("id, starts_at, kind, subject, title, teacher").eq("published", true)
        .gt("starts_at", new Date(ahora).toISOString()).order("starts_at").limit(1).maybeSingle();
      if (!proxima) return responder({ ok: false, motivo: "No hay clases publicadas por delante." });
      const errores: string[] = [];
      for (const t of ["previo", "1hora"] as Tipo[]) {
        const c = correo(t, proxima as Sesion, { primer: "Holman", tz: "America/Bogota", lugar: "Bogotá" }, ahora);
        const e = await enviar(cuerpo.probar, `[Prueba] ${c.asunto}`, c.html);
        if (e) errores.push(e);
        await esperar(700);
      }
      return responder({ ok: errores.length === 0, clase: proxima.id, errores });
    }

    const tocan = ((sesiones ?? []) as Sesion[])
      .map((s) => ({ s, tipo: tipoPara(s, ahora) }))
      .filter((x): x is { s: Sesion; tipo: Tipo } => x.tipo !== null);
    if (!tocan.length) return responder({ ok: true, enviados: 0, motivo: "Ninguna clase en ventana de aviso." });

    // Quién tiene acceso hoy: la misma regla que is_ecos_member().
    const [{ data: gente, error: e2 }, { data: ajuste }] = await Promise.all([
      db.from("ecos_members").select("id, email, name, status, teacher, cortesia, founder, prueba_hasta, city, country"),
      db.from("ecos_settings").select("value").eq("key", "trial_end").maybeSingle(),
    ]);
    if (e2) throw e2;
    const finFundadores = new Date(ajuste?.value?.trim() || "2026-11-05T12:00:00-05:00").getTime();
    type Fila = { id: string; email: string | null; name: string | null; status: string; teacher: boolean; cortesia: boolean; founder: boolean; prueba_hasta: string | null; city: string | null; country: string | null };
    const conAcceso = ((gente ?? []) as Fila[]).filter((m) => {
      if (!m.email) return false;
      if (m.status === "activo" || m.teacher || m.cortesia) return true;
      if (m.status !== "pendiente") return false;
      return (m.founder && ahora < finFundadores) || (!!m.prueba_hasta && ahora < new Date(m.prueba_hasta).getTime());
    });

    const { data: yaEnviados } = await db.from("ecos_avisos_clase")
      .select("session_id, member_id, tipo").in("session_id", tocan.map((t) => t.s.id));
    const enviados = new Set((yaEnviados ?? []).map((r: { session_id: string; member_id: string; tipo: string }) => `${r.session_id}:${r.member_id}:${r.tipo}`));

    const pendientes = tocan.flatMap(({ s, tipo }) =>
      conAcceso.filter((m) => !enviados.has(`${s.id}:${m.id}:${tipo}`)).map((m) => ({ s, tipo, m })));

    if (cuerpo.simular) {
      return responder({ ok: true, destinatarios: pendientes.map((p) => ({ correo: p.m.email, clase: p.s.id, tipo: p.tipo })) });
    }

    let ok = 0;
    const fallos: string[] = [];
    for (const { s, tipo, m } of pendientes) {
      // Se aparta antes de enviar: si la tarea corriera dos veces, no se repite.
      const { error: yaEsta } = await db.from("ecos_avisos_clase").insert({ session_id: s.id, member_id: m.id, tipo });
      if (yaEsta) continue;
      // El de una hora cubre al previo: a quien no le llegó a tiempo no le cae después.
      if (tipo === "1hora") await db.from("ecos_avisos_clase").insert({ session_id: s.id, member_id: m.id, tipo: "previo" });

      const primer = String(m.name ?? "").trim().split(" ")[0] ?? "";
      const lugar = String(m.city || m.country || "").trim();
      const c = correo(tipo, s, { primer, tz: zonaDe(m.country, m.city), lugar }, ahora);
      const e = await enviar(m.email as string, c.asunto, c.html);
      if (e) {
        await db.from("ecos_avisos_clase").delete().eq("session_id", s.id).eq("member_id", m.id).eq("tipo", tipo);
        fallos.push(`${m.email}: ${e}`);
      } else {
        ok++;
      }
      // Resend admite unos pocos envíos por segundo.
      await esperar(600);
    }
    if (fallos.length) console.error("[ecos-clases]", fallos);
    return responder({ ok: true, enviados: ok, fallos: fallos.length });
  } catch (e) {
    console.error("[ecos-clases]", e);
    return responder({ error: "No se pudieron enviar los avisos de clase." }, 500);
  }
});
