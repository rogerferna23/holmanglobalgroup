// ecos-acceso — «Entrar sin contraseña» al panel de ECOS.
//
// POST { email } (público). Si el correo es de un miembro del club, le manda un
// correo con un botón que lo deja dentro de su panel de un toque:
//   holmanglobalgroup.com/ecos/entrar?acceso=<token>
// La página canjea el token con supabase.auth.verifyOtp (type magiclink) y
// queda la sesión abierta. Así no dependemos de las plantillas ni del correo
// de Supabase Auth, y el correo sale con la marca y el remitente del club.
//
// Responde siempre lo mismo, exista o no la cuenta: que nadie pueda averiguar
// quién es miembro probando correos. El enlace sirve una vez y vence según la
// configuración de Auth (1 hora por defecto).
//
// Variables: RESEND_API_KEY, SITE_URL, ALLOWED_ORIGINS (+ las de Supabase).
// Verify JWT: NO.

import { adminClient, env, json, preflight } from "../_shared/ecos.ts";

const db = adminClient();

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function correo(primer: string, enlace: string): string {
  return `<div style="margin:0;padding:32px 16px;background:#f4f2ee;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:36px 32px;color:#333333;font-size:15px;line-height:1.7;">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:3px;color:#b8860b;text-transform:uppercase;">ECOS · Business Club</p>
    <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#111111;font-weight:normal;">${primer ? `${esc(primer)}, aquí` : "Aquí"} está tu acceso</h1>
    <p>Toca el botón y entras directo a tu panel, sin contraseña:</p>
    <p style="margin:24px 0 18px;"><a href="${esc(enlace)}" style="display:inline-block;padding:13px 26px;background:#e8b923;color:#111111;text-decoration:none;border-radius:999px;font-weight:bold;">Entrar a mi panel</a></p>
    <p style="font-size:13px;color:#777777;">El botón sirve una sola vez y durante la próxima hora. Si vence, pide otro en holmanglobalgroup.com/panel.</p>
    <p style="font-size:13px;color:#777777;"><strong>Tip:</strong> guarda ECOS en la pantalla de inicio de tu celular y entras con un toque siempre. Al abrir tu panel te mostramos cómo.</p>
    <p style="font-size:13px;color:#999999;">¿No pediste este correo? Ignóralo: nadie puede entrar sin este botón.</p>
    <p style="margin:28px 0 0;font-size:12px;color:#999999;">Holman Global Group</p>
  </div>
</div>`;
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { error: "Método no permitido" }, 405);
  const cuerpo = (await req.json().catch(() => ({}))) as { email?: string };
  const email = String(cuerpo.email ?? "").trim().toLowerCase().slice(0, 200);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(req, { error: "Revisa tu correo." }, 400);

  try {
    const { data: ficha } = await db.from("ecos_members").select("name")
      .ilike("email", email.replace(/[\\%_]/g, "\\$&")).limit(1).maybeSingle();
    if (ficha) {
      const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
      const token = data?.properties?.hashed_token;
      if (error || !token) {
        console.error("[ecos-acceso] generateLink", error);
      } else {
        const site = env("SITE_URL", "https://holmanglobalgroup.com");
        const primer = String(ficha.name ?? "").trim().split(/\s+/)[0] ?? "";
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: env("ECOS_REMITENTE", "ECOS · Holman Global Group <club@mkt.holmanglobalgroup.com>"),
            reply_to: env("ECOS_RESPONDER_A", "equipo@holmanglobalgroup.com"),
            to: [email],
            subject: "Tu acceso a ECOS",
            html: correo(primer, `${site}/ecos/entrar?acceso=${encodeURIComponent(token)}`),
          }),
        });
        if (!res.ok) console.error("[ecos-acceso] Resend", res.status, (await res.text()).slice(0, 300));
      }
    }
    return json(req, { ok: true });
  } catch (e) {
    console.error("[ecos-acceso]", e);
    return json(req, { error: "Algo falló de nuestro lado. Intenta de nuevo en un momento." }, 500);
  }
});
