// ecos-bienvenida — dos correos cuando alguien se registra en el club:
//   1. Bienvenida para la persona: qué hacer hoy y cómo sigue su mes.
//   2. Aviso para Holman con sus datos, para escribirle.
//
// La llama el panel la primera vez que la persona entra (ClubRoute). Se manda
// UNA sola vez por persona: ecos_avisos guarda a quién ya se le envió, y solo
// esta función (service_role) puede escribir ahí. Como usa el JWT de quien
// llama, nadie puede pedir correos a nombre de otro.
//
// Variables (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY     clave de Resend (Sending access, dominio mkt.holmanglobalgroup.com)
//   ECOS_AVISO_EMAIL   a dónde llega el aviso de cada registro (el correo de Holman)
//   ECOS_REMITENTE     opcional. Por defecto «ECOS · Holman Global Group <club@mkt.holmanglobalgroup.com>»
//   ECOS_RESPONDER_A   opcional. Por defecto equipo@holmanglobalgroup.com
//   SITE_URL, ALLOWED_ORIGINS (+ las de Supabase)
//
// Verify JWT: SÍ.

import { adminClient, callerFrom, env, json, preflight } from "../_shared/ecos.ts";

const db = adminClient();

/** Lo que escribe la persona va dentro de un correo HTML: se escapa. */
function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function fecha(iso: string): string {
  return new Date(iso).toLocaleString("es-US", {
    weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit",
    timeZone: "America/New_York", timeZoneName: "short",
  });
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

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;

  const user = await callerFrom(req);
  if (!user?.email) return json(req, { error: "Inicia sesión para continuar." }, 401);

  try {
    const { data: m } = await db.from("ecos_members").select("*").eq("id", user.id).maybeSingle();
    // Sin ficha todavía (el panel aún no la creó): no hay a quién dar la bienvenida.
    if (!m) return json(req, { ok: false, motivo: "sin-ficha" });

    // Se aparta el envío ANTES de mandar: si dos pestañas llaman a la vez, la
    // segunda choca con la llave primaria y no manda nada.
    const { error: yaEsta } = await db.from("ecos_avisos").insert({ member_id: user.id });
    if (yaEsta) return json(req, { ok: true, ya: true });

    const site = env("SITE_URL", "https://holmanglobalgroup.com");
    const nombre = String(m.name || user.user_metadata?.name || "").trim();
    const primer = nombre.split(" ")[0] || "";

    const [{ data: ajustes }, { data: proxima }, { data: cupo }] = await Promise.all([
      db.from("ecos_settings").select("key, value").in("key", ["whatsapp_group_url", "trial_end"]),
      db.from("ecos_sessions").select("title, starts_at, teacher").eq("published", true)
        .gt("starts_at", new Date().toISOString()).order("starts_at").limit(1).maybeSingle(),
      db.rpc("ecos_founder_spots"),
    ]);
    const ajuste = (k: string) => ajustes?.find((a: { key: string; value: string }) => a.key === k)?.value?.trim() || "";
    const finPrueba = new Date(ajuste("trial_end") || "2026-11-01T12:00:00-05:00");
    const enPrueba = m.status === "pendiente" && m.founder && Date.now() < finPrueba.getTime();
    const activo = m.status === "activo" || m.teacher || m.cortesia;
    const whatsapp = ajuste("whatsapp_group_url");

    // ---- 1. Bienvenida -----------------------------------------------------
    const estado = activo
      ? `<p>Tu membresía está activa. Cancelas cuando quieras desde <strong>Mi cuenta</strong>, sin llamar a nadie.</p>`
      : enPrueba
      ? `<p><strong>Tu mes gratis ya empezó.</strong> Usas todo el club, sin tarjeta, hasta el 31 de octubre. Si decides quedarte, activas tu membresía desde tu panel antes del 1 de noviembre y sigues sin cortes.</p>`
      : `<p>Los lugares con el mes gratis ya se llenaron. Activa tu membresía desde tu panel y entras hoy mismo.</p>`;

    const pasos = [
      `<li style="margin-bottom:10px;"><strong>Entra a tu panel.</strong> Ahí están el calendario, las grabaciones y tu avance.</li>`,
      whatsapp ? `<li style="margin-bottom:10px;"><strong>Únete al grupo de WhatsApp</strong>, donde sigue la conversación entre clase y clase: <a href="${esc(whatsapp)}" style="color:#b8860b;">entrar al grupo</a>.</li>` : "",
      proxima
        ? `<li style="margin-bottom:10px;"><strong>Aparta tu primera clase:</strong> ${esc(proxima.title)}, ${esc(fecha(proxima.starts_at))}${proxima.teacher ? `, con ${esc(proxima.teacher)}` : ""}. El enlace de Zoom está en tu panel.</li>`
        : "",
    ].join("");

    const bienvenida = marco(`
      <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#111111;font-weight:normal;">¡Felicitaciones${primer ? `, ${esc(primer)}` : ""}! Ya eres parte de ECOS Business Club</h1>
      <p>Qué alegría tenerte aquí. Desde hoy aprendes ventas, marketing y oratoria en vivo, con una comunidad que practica contigo.</p>
      ${estado}
      <p style="margin:22px 0 8px;"><strong>Para empezar hoy</strong> (ninguna toma más de cinco minutos):</p>
      <ol style="padding-left:20px;margin:0 0 24px;">${pasos}</ol>
      <p style="margin:0 0 26px;">${boton(`${site}/ecos/panel`, "Ir a mi panel")}</p>
      <p>En ventas y oratoria, cada clase son unos quince minutos de teoría y el resto práctica. Ahí es donde más avanzas.</p>
      <p>Nos vemos en clase,<br/>Holman</p>`);

    const err1 = await enviar(user.email, `${primer ? `${primer}, te` : "Te"} damos la bienvenida a ECOS Business Club`, bienvenida);
    if (err1) {
      // No salió: se libera para que el próximo ingreso lo intente de nuevo.
      await db.from("ecos_avisos").delete().eq("member_id", user.id);
      console.error("[ecos-bienvenida]", err1);
      return json(req, { error: "No se pudo enviar la bienvenida." }, 502);
    }

    // ---- 2. Aviso para Holman ----------------------------------------------
    const aviso = Deno.env.get("ECOS_AVISO_EMAIL");
    if (aviso) {
      let refirio = "";
      if (m.referred_by) {
        const { data: r } = await db.from("ecos_members").select("name, referral_code").eq("id", m.referred_by).maybeSingle();
        refirio = r ? `${r.name ?? "—"} (${r.referral_code ?? ""})` : "sí";
      }
      const fila = (k: string, v: unknown) =>
        v ? `<tr><td style="padding:6px 12px 6px 0;color:#777777;vertical-align:top;">${k}</td><td style="padding:6px 0;">${esc(v)}</td></tr>` : "";
      const situacion = activo ? "Membresía activa" : enPrueba ? "Mes gratis (sin tarjeta)" : "Sin lugar gratis: tiene que activar";
      const html = marco(`
        <h1 style="margin:0 0 16px;font-size:22px;color:#111111;font-weight:normal;">Nuevo registro en ECOS</h1>
        <table style="border-collapse:collapse;font-size:14px;">
          ${fila("Nombre", nombre || "—")}
          ${fila("Correo", user.email)}
          ${fila("WhatsApp", m.whatsapp)}
          ${fila("Ciudad", [m.city, m.country].filter(Boolean).join(", "))}
          ${fila("A qué se dedica", m.business)}
          ${fila("Qué quiere lograr", m.goal)}
          ${fila("Situación", situacion)}
          ${fila("Lo trajo", refirio)}
          ${fila("Su código", m.referral_code)}
          ${fila("Cupo de fundadores", cupo ? `${cupo.taken} de ${cupo.cap}` : "")}
        </table>
        <p style="margin:24px 0 0;">${boton(`${site}/torre/ecos`, "Ver en el admin")}</p>`);
      const err2 = await enviar(aviso, `Nuevo en ECOS: ${nombre || user.email}`, html);
      // El aviso a Holman no bloquea: la persona ya recibió su bienvenida.
      if (err2) console.error("[ecos-bienvenida] aviso:", err2);
    }

    return json(req, { ok: true });
  } catch (e) {
    console.error("[ecos-bienvenida]", e);
    return json(req, { error: "No se pudo enviar la bienvenida." }, 500);
  }
});
