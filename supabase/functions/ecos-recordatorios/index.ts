// ecos-recordatorios — recuerda a quien está en su prueba gratis SIN activar
// que active su membresía antes de que termine. Cada quien con su fecha: los
// fundadores, el fin del mes gratis; los demás, sus 14 días (prueba_hasta).
//
//   · a 7 días de su final: primer recordatorio
//   · a 2 días: el segundo
//
// La llama todos los días una tarea programada de la base (pg_cron, ver la
// migración 20261007_ecos_recordatorios.sql). Cada correo sale UNA vez por
// persona: ecos_recordatorios guarda cuál se mandó a quién. Quien se registra
// tarde recibe solo el que le toque. A quien ya activó no le llega nada de aquí:
// a esa persona le escribe Stripe (recordatorio de 7 días antes de la prueba).
//
// No lleva JWT de usuario: la protege un secreto que solo conocen la tarea
// programada y esta función (cabecera x-ecos-cron). El secreto vive en la
// tabla ecos_privado (ver 20261009_ecos_recordatorios_secreto.sql).
//
// Cuerpo opcional:
//   { "simular": true }          → devuelve a quién le escribiría hoy, sin enviar
//   { "probar": "correo@..." }   → manda los dos correos de ejemplo a ese correo
//
// Variables: RESEND_API_KEY, ECOS_CRON_SECRET, SITE_URL (+ las de Supabase)
// Verify JWT: NO.

import { adminClient, env } from "../_shared/ecos.ts";

const db = adminClient();
const DIA = 86_400_000;

/** Lo que escribe la persona va dentro de un correo HTML: se escapa. */
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

type Tipo = "7dias" | "2dias";

/** «1 de noviembre», en la hora de Nueva York (la del club). */
function fechaLarga(ms: number): string {
  return new Date(ms).toLocaleDateString("es", { day: "numeric", month: "long", timeZone: "America/New_York" });
}

/**
 * El correo según cuánto falta. `mes` distingue a los fundadores (octubre
 * gratis) de quien tiene la prueba de 14 días; `fin` es la fecha de su primer
 * cobro si activa.
 */
function correo(tipo: Tipo, primer: string, dias: number, fin: string, mes: boolean): { asunto: string; html: string } {
  const site = env("SITE_URL", "https://holmanglobalgroup.com");
  const activar = boton(`${site}/ecos/activar`, "Activar mi membresía");
  const planes = `<p style="margin:0 0 22px;font-size:14px;color:#666666;">$47 al mes, o $470 al año con dos meses de regalo. Cancelas cuando quieras desde tu cuenta.</p>`;
  const beneficios = `<p>Al activarla también se abren tu <strong>10% de descuento</strong> en todo Holman Global Group y tu <strong>10% de comisión</strong> como embajador por cada persona que traigas.</p>`;
  const saludo = primer ? `${esc(primer)}, ` : "";
  const prueba = mes ? "mes gratis" : "prueba gratis";
  // Fundadores: al activar, sus $47 quedan congelados (decidido 2026-10-07).
  const congelado = mes
    ? `<p><strong>Tu precio de fundador:</strong> si activas antes del ${esc(fin)}, tus $47 al mes quedan congelados mientras sigas activo, aunque el precio del club suba.</p>`
    : "";

  if (tipo === "7dias") {
    return {
      asunto: `${primer ? `${primer}, te` : "Te"} quedan ${dias} días de tu ${prueba} en ECOS`,
      html: marco(`
        <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#111111;font-weight:normal;">${saludo}tu ${prueba} sigue: te quedan ${dias} días</h1>
        <p>Qué bueno tenerte en ECOS. Tu ${prueba} va hasta el <strong>${esc(fin)}</strong>, y desde ya puedes asegurar que todo siga igual: tus clases, tus grabaciones, tu avance y tu comunidad.</p>
        <p>Activa tu membresía desde tu panel. <strong>Hoy pagas $0</strong>: registras tu tarjeta y el primer cobro es el ${esc(fin)}.</p>
        ${congelado}
        ${beneficios}
        <p style="margin:24px 0 10px;">${activar}</p>
        ${planes}
        <p>Nos vemos en clase,<br/>Holman</p>`),
    };
  }
  return {
    asunto: `Tu ${prueba} en ECOS termina el ${fin}`,
    html: marco(`
      <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#111111;font-weight:normal;">${saludo}tu ${prueba} termina en ${dias <= 1 ? "un día" : `${dias} días`}</h1>
      <p>Tu ${prueba} termina el <strong>${esc(fin)}</strong>. Si activas tu membresía hoy, ese día sigues sin cortes: la misma sala, tus clases y tu avance, justo donde los dejaste.</p>
      <p>Toma un minuto desde tu panel. Hoy pagas $0 y el primer cobro es el ${esc(fin)}.</p>
      ${congelado}
      ${beneficios}
      <p style="margin:24px 0 10px;">${activar}</p>
      ${planes}
      <p>Cuento contigo,<br/>Holman</p>`),
  };
}

/**
 * El secreto vive en la base (ecos_privado, que solo lee service_role): lo
 * genera la migración y de ahí lo toma la tarea programada, sin que nadie lo
 * copie a mano. Copiarlo a Secrets fallaba por un espacio o un salto de línea
 * de más. ECOS_CRON_SECRET, si existe, también sirve.
 */
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

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);
  // Solo la tarea programada conoce el secreto.
  if (!(await secretoValido(req.headers.get("x-ecos-cron")))) return responder({ error: "No autorizado" }, 401);

  const cuerpo = (await req.json().catch(() => ({}))) as { simular?: boolean; probar?: string };

  // Muestra de los dos correos, a un solo destinatario.
  if (cuerpo.probar) {
    const errores: string[] = [];
    for (const t of ["7dias", "2dias"] as Tipo[]) {
      const c = correo(t, "Holman", t === "7dias" ? 7 : 2, fechaLarga(Date.now() + (t === "7dias" ? 7 : 2) * DIA), false);
      const e = await enviar(cuerpo.probar, `[Prueba] ${c.asunto}`, c.html);
      if (e) errores.push(e);
      await esperar(700);
    }
    return responder({ ok: errores.length === 0, errores });
  }

  try {
    // Cada quien con su fecha: los fundadores, el fin del mes gratis; los
    // demás, sus 14 días (prueba_hasta).
    const { data: ajuste } = await db.from("ecos_settings").select("value").eq("key", "trial_end").maybeSingle();
    const finFundadores = new Date(ajuste?.value?.trim() || "2026-11-05T12:00:00-05:00").getTime();
    const ahora = Date.now();

    const { data: gente, error } = await db
      .from("ecos_members")
      .select("id, email, name, founder, prueba_hasta")
      .eq("status", "pendiente")
      .eq("teacher", false)
      .eq("cortesia", false);
    if (error) throw error;

    type Fila = { id: string; email: string | null; name: string | null; founder: boolean; prueba_hasta: string | null };
    const tocan: { m: Fila; tipo: Tipo; dias: number; fin: number }[] = [];
    for (const m of (gente ?? []) as Fila[]) {
      if (!m.email) continue;
      const suya = m.prueba_hasta ? new Date(m.prueba_hasta).getTime() : 0;
      const fin = Math.max(suya, m.founder ? finFundadores : 0);
      if (fin <= ahora) continue;
      // Días enteros que faltan (a las 10 a. m. del día 7 antes, faltan 7).
      const dias = Math.floor((fin - ahora) / DIA);
      const tipo: Tipo | null = dias <= 2 ? "2dias" : dias <= 7 ? "7dias" : null;
      if (tipo) tocan.push({ m, tipo, dias, fin });
    }

    const { data: yaEnviados } = await db.from("ecos_recordatorios").select("member_id, tipo");
    const enviados = new Set((yaEnviados ?? []).map((r: { member_id: string; tipo: string }) => `${r.member_id}:${r.tipo}`));
    const pendientes = tocan.filter((t) => !enviados.has(`${t.m.id}:${t.tipo}`));

    if (cuerpo.simular) {
      return responder({ ok: true, destinatarios: pendientes.map((t) => ({ correo: t.m.email, tipo: t.tipo, dias: t.dias, fin: fechaLarga(t.fin) })) });
    }

    let ok = 0;
    const fallos: string[] = [];
    for (const { m, tipo, dias, fin } of pendientes) {
      // Se aparta antes de enviar: si la tarea corriera dos veces, no se repite.
      const { error: yaEsta } = await db.from("ecos_recordatorios").insert({ member_id: m.id, tipo });
      if (yaEsta) continue;
      // El de 2 días cubre también al de 7: a quien llega tarde no le caen los dos juntos.
      if (tipo === "2dias") await db.from("ecos_recordatorios").insert({ member_id: m.id, tipo: "7dias" });

      const primer = String(m.name ?? "").trim().split(" ")[0] ?? "";
      const c = correo(tipo, primer, dias, fechaLarga(fin), m.founder && fin === finFundadores);
      const e = await enviar(m.email as string, c.asunto, c.html);
      if (e) {
        await db.from("ecos_recordatorios").delete().eq("member_id", m.id).eq("tipo", tipo);
        fallos.push(`${m.email}: ${e}`);
      } else {
        ok++;
      }
      // Resend admite unos pocos envíos por segundo.
      await esperar(600);
    }
    if (fallos.length) console.error("[ecos-recordatorios]", fallos);
    return responder({ ok: true, enviados: ok, fallos: fallos.length });
  } catch (e) {
    console.error("[ecos-recordatorios]", e);
    return responder({ error: "No se pudieron enviar los recordatorios." }, 500);
  }
});
