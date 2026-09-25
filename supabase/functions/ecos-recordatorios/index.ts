// ecos-recordatorios — recuerda a quien está en su mes gratis SIN activar que
// active su membresía antes de que termine la prueba.
//
//   · a 7 días del final (25 de octubre): primer recordatorio
//   · a 2 días (30 de octubre): el segundo
//
// La llama todos los días una tarea programada de la base (pg_cron, ver la
// migración 20261007_ecos_recordatorios.sql). Cada correo sale UNA vez por
// persona: ecos_recordatorios guarda cuál se mandó a quién. Quien se registra
// tarde recibe solo el que le toque. A quien ya activó no le llega nada de aquí:
// a esa persona le escribe Stripe (recordatorio de 7 días antes de la prueba).
//
// No lleva JWT de usuario: la protege un secreto que solo conocen la tarea
// programada y esta función (cabecera x-ecos-cron).
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

function correo(tipo: Tipo, primer: string, dias: number): { asunto: string; html: string } {
  const site = env("SITE_URL", "https://holmanglobalgroup.com");
  const activar = boton(`${site}/ecos/activar`, "Activar mi membresía");
  const planes = `<p style="margin:0 0 22px;font-size:14px;color:#666666;">$47 al mes, o $470 al año con dos meses de regalo. Cancelas cuando quieras desde tu cuenta.</p>`;
  const beneficios = `<p>Al activarla también se abren tu <strong>10% de descuento</strong> en todo Holman Global Group y tu <strong>10% de comisión</strong> como embajador por cada persona que traigas.</p>`;
  const saludo = primer ? `${esc(primer)}, ` : "";

  if (tipo === "7dias") {
    return {
      asunto: `${primer ? `${primer}, te` : "Te"} quedan ${dias} días de tu mes gratis en ECOS`,
      html: marco(`
        <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#111111;font-weight:normal;">${saludo}tu mes gratis sigue: te quedan ${dias} días</h1>
        <p>Qué bueno tenerte en ECOS. Tu mes gratis va hasta el <strong>1 de noviembre</strong>, y desde ya puedes asegurar que noviembre siga igual: tus clases, tus grabaciones, tu avance y tu comunidad.</p>
        <p>Activa tu membresía desde tu panel. <strong>Hoy pagas $0</strong>: registras tu tarjeta y el primer cobro es el 1 de noviembre.</p>
        ${beneficios}
        <p style="margin:24px 0 10px;">${activar}</p>
        ${planes}
        <p>Nos vemos en clase,<br/>Holman</p>`),
    };
  }
  return {
    asunto: "Tu mes gratis en ECOS termina el 1 de noviembre",
    html: marco(`
      <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#111111;font-weight:normal;">${saludo}en ${dias <= 1 ? "un día" : `${dias} días`} empieza noviembre en ECOS</h1>
      <p>Tu mes gratis termina el <strong>1 de noviembre</strong>. Si activas tu membresía hoy, ese día sigues sin cortes: la misma sala, tus clases y tu avance, justo donde los dejaste.</p>
      <p>Toma un minuto desde tu panel. Hoy pagas $0 y el primer cobro es el 1 de noviembre.</p>
      ${beneficios}
      <p style="margin:24px 0 10px;">${activar}</p>
      ${planes}
      <p>Cuento contigo en noviembre,<br/>Holman</p>`),
  };
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

const responder = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);
  // Solo la tarea programada conoce el secreto.
  const secreto = Deno.env.get("ECOS_CRON_SECRET") ?? "";
  if (!secreto || req.headers.get("x-ecos-cron") !== secreto) return responder({ error: "No autorizado" }, 401);

  const cuerpo = (await req.json().catch(() => ({}))) as { simular?: boolean; probar?: string };

  // Muestra de los dos correos, a un solo destinatario.
  if (cuerpo.probar) {
    const errores: string[] = [];
    for (const t of ["7dias", "2dias"] as Tipo[]) {
      const c = correo(t, "Holman", t === "7dias" ? 7 : 2);
      const e = await enviar(cuerpo.probar, `[Prueba] ${c.asunto}`, c.html);
      if (e) errores.push(e);
      await esperar(700);
    }
    return responder({ ok: errores.length === 0, errores });
  }

  try {
    const { data: ajuste } = await db.from("ecos_settings").select("value").eq("key", "trial_end").maybeSingle();
    const fin = new Date(ajuste?.value?.trim() || "2026-11-01T12:00:00-05:00").getTime();
    const falta = fin - Date.now();
    if (falta <= 0) return responder({ ok: true, motivo: "la prueba ya terminó" });
    // Días enteros que faltan (a las 10 a. m. del 25 de octubre faltan 7).
    const dias = Math.floor(falta / DIA);
    const tipo: Tipo | null = dias <= 2 ? "2dias" : dias <= 7 ? "7dias" : null;
    if (!tipo) return responder({ ok: true, motivo: `faltan ${dias} días: todavía no toca` });

    const { data: gente, error } = await db
      .from("ecos_members")
      .select("id, email, name")
      .eq("status", "pendiente")
      .eq("founder", true)
      .eq("teacher", false)
      .eq("cortesia", false);
    if (error) throw error;

    const { data: yaEnviados } = await db.from("ecos_recordatorios").select("member_id").eq("tipo", tipo);
    const enviados = new Set((yaEnviados ?? []).map((r: { member_id: string }) => r.member_id));
    const pendientes = (gente ?? []).filter((m: { id: string; email: string | null }) => m.email && !enviados.has(m.id));

    if (cuerpo.simular) {
      return responder({ ok: true, tipo, dias, destinatarios: pendientes.map((m: { email: string }) => m.email) });
    }

    let ok = 0;
    const fallos: string[] = [];
    for (const m of pendientes as { id: string; email: string; name: string | null }[]) {
      // Se aparta antes de enviar: si la tarea corriera dos veces, no se repite.
      const { error: yaEsta } = await db.from("ecos_recordatorios").insert({ member_id: m.id, tipo });
      if (yaEsta) continue;
      // El de 2 días cubre también al de 7: a quien llega tarde no le caen los dos juntos.
      if (tipo === "2dias") await db.from("ecos_recordatorios").insert({ member_id: m.id, tipo: "7dias" });

      const primer = String(m.name ?? "").trim().split(" ")[0] ?? "";
      const c = correo(tipo, primer, dias);
      const e = await enviar(m.email, c.asunto, c.html);
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
    return responder({ ok: true, tipo, dias, enviados: ok, fallos: fallos.length });
  } catch (e) {
    console.error("[ecos-recordatorios]", e);
    return responder({ error: "No se pudieron enviar los recordatorios." }, 500);
  }
});
