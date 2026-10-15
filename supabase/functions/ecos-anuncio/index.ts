// ecos-anuncio — anuncios puntuales a los miembros del club, por el mismo
// canal que los avisos de clase (Resend transaccional, sin subir la lista a
// ningún otro lado). Le llega a quien hoy tiene acceso (misma regla que
// is_ecos_member()), una sola vez por anuncio: ecos_anuncios_enviados.
//
// POST con cabecera x-ecos-cron (el secreto de las tareas, ecos_privado):
//   { "anuncio": "como-entrar", "probar": "correo@..." } → solo una prueba a ese correo
//   { "anuncio": "como-entrar", "simular": true }       → cuántos lo recibirían
//   { "anuncio": "como-entrar", "enviar": true }        → lo envía a todos
//
// Los anuncios viven en ANUNCIOS (asunto + cuerpo). Para uno nuevo, se agrega
// ahí y se despliega.
//
// Variables: RESEND_API_KEY, SITE_URL (+ las de Supabase).
// Verify JWT: NO.

import { adminClient, env } from "../_shared/ecos.ts";
import { finFundadoresDe, tieneAcceso, type FichaAcceso } from "../_shared/clase-enlace.ts";

const db = adminClient();

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const P = (html: string, abajo = 18) => `<p style="margin:0 0 ${abajo}px 0;">${html}</p>`;

const boton = (href: string, texto: string) =>
  `<p style="margin:28px 0 28px 0;"><a href="${esc(href)}" style="display:inline-block; background-color:#F0B800; color:#0B1016; padding:14px 36px; border-radius:999px; font-weight:bold; font-size:15px; text-decoration:none; font-family: Arial, Helvetica, sans-serif;">${esc(texto)}</a></p>`;

type Anuncio = { asunto: string; cuerpo: (primer: string, site: string) => string };

const ANUNCIOS: Record<string, Anuncio> = {
  "como-entrar": {
    asunto: "Cómo entrar a tu panel de ECOS",
    cuerpo: (primer, site) => [
      P(`Hola${primer ? `, ${esc(primer)}` : ""}:`),
      P("Hicimos más fácil entrar a tu panel de ECOS. Ahora tienes tres caminos:"),
      P("<strong>1. Una dirección corta:</strong> holmanglobalgroup.com/panel. Guárdala en tus favoritos.", 12),
      P("<strong>2. Sin contraseña:</strong> toca «Ya soy miembro» y luego «Entrar sin contraseña». Escribe tu correo y te llega un botón para entrar de un toque.", 12),
      P("<strong>3. ECOS en tu celular:</strong> al abrir tu panel desde el celular te mostramos cómo guardarlo en tu pantalla de inicio. Queda un ícono de ECOS y entras con un toque, como cualquier app."),
      P("Y para las clases es aún más simple: a la hora de cada clase te llega un correo con el botón <strong>«Entrar a la clase»</strong>, que te lleva directo a la sala."),
      boton(`${site}/panel?utm_source=email&utm_medium=email&utm_campaign=ecos-como-entrar`, "Entrar a mi panel"),
      P("Nos vemos en clase,<br>Holman", 32),
      `<p style="margin:0; font-size:12px; line-height:1.6; color:#8a95a3;">Holman Global Group · Recibes este correo porque eres miembro de ECOS Business Club.</p>`,
    ].join("\n"),
  },
};

function marco(cuerpo: string): string {
  return `<div style="margin:0; padding:32px 20px; background-color:#ffffff; font-family: Arial, Helvetica, sans-serif;">
  <div style="max-width:560px; margin:0 auto; font-size:16px; line-height:1.7; color:#1f2933;">
${cuerpo}
  </div>
</div>`;
}

async function enviar(to: string, subject: string, html: string): Promise<string | null> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env("ANUNCIO_REMITENTE", "Holman Orjuela <holman@mkt.holmanglobalgroup.com>"),
      reply_to: env("ECOS_RESPONDER_A", "equipo@holmanglobalgroup.com"),
      to: [to],
      subject,
      html,
    }),
  });
  if (res.ok) return null;
  return `Resend ${res.status}: ${(await res.text()).slice(0, 300)}`;
}

async function secretoValido(cabecera: string | null): Promise<boolean> {
  const recibido = (cabecera ?? "").trim();
  if (!recibido) return false;
  const { data } = await db.from("ecos_privado").select("value").eq("key", "cron_secret").maybeSingle();
  return !!data?.value && recibido === String(data.value).trim();
}

const responder = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);
  if (!(await secretoValido(req.headers.get("x-ecos-cron")))) return responder({ error: "No autorizado" }, 401);
  const cuerpo = (await req.json().catch(() => ({}))) as { anuncio?: string; probar?: string; simular?: boolean; enviar?: boolean };
  const id = String(cuerpo.anuncio ?? "");
  const anuncio = ANUNCIOS[id];
  if (!anuncio) return responder({ error: "Anuncio desconocido." }, 400);
  const site = env("SITE_URL", "https://holmanglobalgroup.com");

  try {
    if (cuerpo.probar) {
      const e = await enviar(cuerpo.probar, `[Prueba] ${anuncio.asunto}`, marco(anuncio.cuerpo("Holman", site)));
      return responder({ ok: !e, error: e });
    }

    const [{ data: gente, error: e1 }, { data: ajuste }, { data: ya }] = await Promise.all([
      db.from("ecos_members").select("id, email, name, status, teacher, cortesia, founder, prueba_hasta"),
      db.from("ecos_settings").select("value").eq("key", "trial_end").maybeSingle(),
      db.from("ecos_anuncios_enviados").select("member_id").eq("anuncio", id),
    ]);
    if (e1) throw e1;
    const fin = finFundadoresDe(ajuste?.value);
    const ahora = Date.now();
    const hechos = new Set((ya ?? []).map((r: { member_id: string }) => r.member_id));
    type Fila = FichaAcceso & { id: string; email: string | null; name: string | null };
    const lista = ((gente ?? []) as Fila[]).filter((m) => !!m.email && tieneAcceso(m, fin, ahora) && !hechos.has(m.id));

    if (!cuerpo.enviar) return responder({ ok: true, recibirian: lista.length, ya_enviados: hechos.size });

    let ok = 0;
    const fallos: string[] = [];
    for (const m of lista) {
      const { error: yaEsta } = await db.from("ecos_anuncios_enviados").insert({ anuncio: id, member_id: m.id });
      if (yaEsta) continue;
      const primer = String(m.name ?? "").trim().split(/\s+/)[0] ?? "";
      const e = await enviar(m.email as string, anuncio.asunto, marco(anuncio.cuerpo(primer, site)));
      if (e) {
        await db.from("ecos_anuncios_enviados").delete().eq("anuncio", id).eq("member_id", m.id);
        fallos.push(e);
      } else {
        ok++;
      }
      await new Promise((r) => setTimeout(r, 600));
    }
    if (fallos.length) console.error("[ecos-anuncio]", fallos);
    return responder({ ok: true, enviados: ok, fallos: fallos.length });
  } catch (e) {
    console.error("[ecos-anuncio]", e);
    return responder({ error: "No se pudo enviar el anuncio." }, 500);
  }
});
