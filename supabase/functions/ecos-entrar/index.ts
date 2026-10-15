// ecos-entrar — el botón «Entrar a la clase» de los correos de ECOS.
//
// GET ?t=<enlace personal firmado por ecos-clases>. En el momento del clic:
//   · si el enlace no es auténtico               → al panel, en Clases
//   · si la clase no está cerca (abre 75 min antes, porque el aviso de 1 hora
//     ya trae el botón, y sirve hasta 3 h después) → al panel, en Clases
//   · si la persona ya no tiene acceso           → al panel (ve el candado y
//                                                   el botón para volver)
//   · si todo está bien                          → directo al Zoom de la clase
//
// Así el miembro entra con un clic y sin iniciar sesión, pero el enlace de
// Zoom nunca va escrito en un correo y uno reenviado deja de servir al acabar
// esa clase. El sitio la expone como holmanglobalgroup.com/ecos/clase
// (rewrite en vercel.json).
//
// Variables: SITE_URL (+ las de Supabase).
// Verify JWT: NO (llega desde un correo, sin sesión).

import { adminClient, env } from "../_shared/ecos.ts";
import { finFundadoresDe, leerEnlace, tieneAcceso, type FichaAcceso } from "../_shared/clase-enlace.ts";

const db = adminClient();
const MIN = 60_000;

const ir = (url: string) =>
  new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "no-store" } });

Deno.serve(async (req: Request) => {
  const site = env("SITE_URL", "https://holmanglobalgroup.com");
  const alPanel = `${site}/ecos/panel/clases`;
  if (req.method !== "GET") return ir(alPanel);

  try {
    const t = new URL(req.url).searchParams.get("t") ?? "";
    const { data: privado } = await db.from("ecos_privado").select("value").eq("key", "cron_secret").maybeSingle();
    const secreto = String(privado?.value ?? "").trim();
    const enlace = secreto && t ? await leerEnlace(secreto, t) : null;
    if (!enlace) return ir(alPanel);

    const [{ data: clase }, { data: ficha }, { data: ajustes }] = await Promise.all([
      db.from("ecos_sessions").select("starts_at, zoom_url, published").eq("id", enlace.sessionId).maybeSingle(),
      db.from("ecos_members").select("status, teacher, cortesia, founder, prueba_hasta").eq("id", enlace.memberId).maybeSingle(),
      db.from("ecos_settings").select("key, value").in("key", ["zoom_url", "trial_end"]),
    ]);
    if (!clase?.published) return ir(alPanel);

    const ahora = Date.now();
    const inicio = new Date(clase.starts_at).getTime();
    if (ahora < inicio - 75 * MIN || ahora > inicio + 180 * MIN) return ir(alPanel);

    const ajuste = (k: string) => (ajustes ?? []).find((r: { key: string; value: string }) => r.key === k)?.value ?? "";
    if (!ficha || !tieneAcceso(ficha as FichaAcceso, finFundadoresDe(ajuste("trial_end")), ahora)) {
      return ir(`${site}/ecos/panel`);
    }

    const zoom = String(clase.zoom_url || ajuste("zoom_url") || "").trim();
    if (!/^https:\/\//.test(zoom)) return ir(alPanel);
    return ir(zoom);
  } catch (e) {
    console.error("[ecos-entrar]", e);
    return ir(alPanel);
  }
});
