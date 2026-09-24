// ecos-cortesia — acceso sin pagar: cortesia o profesor. Lo da o lo quita un
// administrador.
//
// Las dos cosas pasan por aqui y no por el navegador porque hacen lo mismo en
// Stripe: si la persona tenia una suscripcion, se cancela en el acto. Sin eso,
// Stripe le cobraria igual cuando termine la prueba.
//
//   cortesia  Invitado por Holman. Miembro fundador y embajador: 10% de
//             descuento y 10% de comision. No suma ingresos.
//   profesor  Da una materia. Miembro fundador, entra sin pagar y prepara sus
//             clases desde «Mis clases».
//
// Variables: STRIPE_SECRET_KEY, ALLOWED_ORIGINS (+ las de Supabase)
// Body: { member_id: string, activar: boolean, tipo?: "cortesia" | "profesor" }
//
// ARCHIVO PARA PEGAR EN EL EDITOR DE SUPABASE. Un solo archivo.
// Verify JWT: SÍ (déjalo activado). La llama el admin con su sesión.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-expect-error npm specifier resuelto en Deno runtime
import Stripe from "npm:stripe@22.1.1";
// @ts-expect-error npm specifier
import { createClient } from "npm:@supabase/supabase-js@2.105.4";

// --- utilidades compartidas ------------------------------------------------

// Utilidades compartidas por las tres Edge Functions de ECOS.
// Mismas versiones y misma forma que create-payment-intent / stripe-webhook.


function env(name: string, fallback?: string): string {
  const v = Deno.env.get(name) ?? fallback;
  if (v === undefined) throw new Error(`Falta la variable ${name}`);
  return v;
}

function stripeClient() {
  return new Stripe(env("STRIPE_SECRET_KEY"), { apiVersion: "2026-04-22.dahlia" });
}

/** Cliente con service_role: salta RLS. Solo se usa dentro de la funcion. */
function adminClient() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Quien llama, a partir del JWT del usuario. null si no hay sesion valida. */
async function callerFrom(req: Request) {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await adminClient().auth.getUser(jwt);
  if (error || !data.user) return null;
  return data.user;
}

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",")
  .map((s: string) => s.trim())
  .filter(Boolean);

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || "";
  return {
    "Access-Control-Allow-Origin": allow,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, X-Client-Info",
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  return null;
}

/** Estado interno a partir del estado de la suscripcion en Stripe. */
function statusFromStripe(s: string): "activo" | "pausado" | "cancelado" {
  switch (s) {
    case "trialing":
    case "active":
      return "activo";
    case "past_due":
    case "unpaid":
    case "paused":
      return "pausado";
    default:
      return "cancelado";
  }
}

/**
 * Fin del periodo actual. En las versiones nuevas de la API vive en el item
 * de la suscripcion; en las viejas, en la suscripcion. Se leen las dos.
 */
// deno-lint-ignore no-explicit-any
function periodEnd(sub: any): string | null {
  const ts = sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

/** Id de suscripcion de una factura (cambio de sitio entre versiones de la API). */
// deno-lint-ignore no-explicit-any
function invoiceSubscriptionId(inv: any): string | null {
  const direct = inv?.subscription;
  if (typeof direct === "string") return direct;
  if (direct?.id) return direct.id;
  const nested = inv?.parent?.subscription_details?.subscription;
  if (typeof nested === "string") return nested;
  return nested?.id ?? null;
}

// --- la funcion ------------------------------------------------------------

// Solo super y admin, igual que is_admin() en la base: un vendedor de la tienda
// no regala membresias.
const ROLES_ADMIN = ["super", "admin"];

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { error: "Método no permitido" }, 405);

  const user = await callerFrom(req);
  if (!user) return json(req, { error: "Inicia sesión para continuar." }, 401);

  const db = adminClient();

  // El rol se lee de la base, nunca de lo que diga el navegador.
  const { data: perfil } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!perfil || !ROLES_ADMIN.includes(perfil.role)) {
    return json(req, { error: "Solo un administrador puede hacer esto." }, 403);
  }

  const body = (await req.json().catch(() => ({}))) as { member_id?: string; activar?: boolean; tipo?: string };
  const memberId = (body.member_id || "").trim();
  const activar = body.activar === true;
  const campo = body.tipo === "profesor" ? "teacher" : "cortesia";
  if (!memberId) return json(req, { error: "Falta la persona." }, 400);

  const { data: ficha } = await db
    .from("ecos_members")
    .select("id, status, stripe_subscription_id")
    .eq("id", memberId)
    .maybeSingle();

  if (!activar) {
    if (!ficha) return json(req, { ok: true });
    const { error } = await db.from("ecos_members").update({ [campo]: false }).eq("id", memberId);
    if (error) return json(req, { error: error.message }, 500);
    return json(req, { ok: true });
  }

  // Quien se registró y nunca pagó no tiene ficha: se crea con su perfil.
  if (!ficha) {
    const { data: p } = await db.from("profiles").select("email, name").eq("id", memberId).maybeSingle();
    if (!p) return json(req, { error: "No existe esa cuenta." }, 404);
    const { error } = await db.from("ecos_members").insert({
      id: memberId, email: p.email, name: p.name, [campo]: true, founder: true,
    });
    if (error) return json(req, { error: error.message }, 500);
    return json(req, { ok: true, suscripcionCancelada: false });
  }

  const { error: e1 } = await db.from("ecos_members")
    .update({ [campo]: true, founder: true, inactive_since: null })
    .eq("id", memberId);
  if (e1) return json(req, { error: e1.message }, 500);

  let cancelada = false;
  if (ficha.stripe_subscription_id && ficha.status !== "cancelado") {
    try {
      await stripeClient().subscriptions.cancel(ficha.stripe_subscription_id);
      cancelada = true;
    } catch (e) {
      const detalle = e instanceof Error ? e.message : String(e);
      return json(req, {
        ok: false,
        error: `El acceso quedó activo, pero Stripe no dejó cancelar la suscripción: ${detalle}. Cancélala desde Stripe para que no se le cobre.`,
      }, 502);
    }
  }

  return json(req, { ok: true, suscripcionCancelada: cancelada });
});
