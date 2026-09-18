// ecos-checkout — crea la sesion de Stripe Checkout (suscripcion) para un
// usuario autenticado y deja su ficha en ecos_members como 'pendiente'.
//
// Variables (Supabase -> Edge Functions -> Secrets):
//   STRIPE_SECRET_KEY, ECOS_STRIPE_PRICE_ID, SITE_URL, ALLOWED_ORIGINS
//   ECOS_TRIAL_END   (ISO, ej. 2026-10-31T23:59:59-05:00) — solo de respaldo:
//   ECOS_FOUNDER_CAP (ej. 50)                                manda ecos_settings
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (las pone Supabase)
//
// Body: { ref?: string, plan?: 'mensual' | 'anual' }
// Respuesta: { clientSecret } -> para montar el pago dentro del sitio
//
// Secrets extra: ECOS_STRIPE_PRICE_ID_ANUAL (price_… de $470/año)
//
// ARCHIVO PARA PEGAR EN EL EDITOR DE SUPABASE. Un solo archivo.
// Verify JWT: SÍ (déjalo activado).

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

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { error: "Método no permitido" }, 405);

  const user = await callerFrom(req);
  if (!user?.email) return json(req, { error: "Inicia sesión para continuar." }, 401);

  const body = (await req.json().catch(() => ({}))) as { ref?: string; plan?: string };
  const plan = body.plan === "anual" ? "anual" : "mensual";
  const stripe = stripeClient();
  const db = adminClient();
  const siteUrl = env("SITE_URL", "https://holmanglobalgroup.com");

  // Ficha existente (si la hay) — no se crea una suscripcion encima de otra.
  const { data: existing } = await db
    .from("ecos_members")
    .select("id, status, stripe_customer_id, stripe_subscription_id, referred_by")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.status === "activo" && existing.stripe_subscription_id) {
    return json(req, { error: "Ya tienes una membresía activa." }, 409);
  }

  // Cliente de Stripe: se reutiliza si ya existe.
  let customerId = existing?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: (user.user_metadata?.name as string | undefined) ?? undefined,
      metadata: { user_id: user.id, empresa: "HGG", producto: "ECOS" },
    });
    customerId = customer.id;
  }

  // Referido: se resuelve el codigo a un miembro activo. Un solo nivel.
  let referredBy: string | null = existing?.referred_by ?? null;
  if (!referredBy && body.ref) {
    const { data: refId } = await db.rpc("ecos_resolve_referral", { code: body.ref });
    if (refId && refId !== user.id) referredBy = refId as string;
  }

  // Cohorte fundadora: mientras haya cupo y no haya pasado la fecha, la prueba
  // termina el mismo dia para todos.
  //
  // El cupo y la fecha viven en ecos_settings para que Holman los cambie desde
  // el panel de administracion sin tocar secrets. Los secrets quedan solo como
  // respaldo por si la fila no existe. Asi el contador de la landing —que lee
  // de la misma tabla— nunca se descuadra con lo que hace el checkout.
  const { data: ajustes } = await db
    .from("ecos_settings")
    .select("key, value")
    .in("key", ["founder_cap", "trial_end"]);
  const ajuste = (k: string) => ajustes?.find((a) => a.key === k)?.value?.trim() || "";

  const trialEnd = new Date(ajuste("trial_end") || env("ECOS_TRIAL_END", "2026-10-31T23:59:59-05:00"));
  const founderCap = Number(ajuste("founder_cap") || env("ECOS_FOUNDER_CAP", "50"));
  const { count: founders } = await db
    .from("ecos_members")
    .select("id", { count: "exact", head: true })
    .eq("founder", true)
    .in("status", ["activo", "pendiente"]);
  const founderWindow = Date.now() < trialEnd.getTime() && (founders ?? 0) < founderCap;

  // El perfil viene del metadata que se guardo al crear la cuenta.
  const md = (user.user_metadata ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof md[k] === "string" && (md[k] as string).trim() ? (md[k] as string).trim() : null);
  await db.from("ecos_members").upsert(
    {
      id: user.id,
      email: user.email,
      name: str("name"),
      whatsapp: str("whatsapp"),
      city: str("city"),
      country: str("country"),
      business: str("business"),
      goal: str("goal"),
      show_in_directory: md.show_in_directory !== false,
      status: "pendiente",
      plan,
      stripe_customer_id: customerId,
      referred_by: referredBy,
      founder: founderWindow,
    },
    { onConflict: "id" }
  );

  // Anual: sin prueba, cobra hoy y cubre doce meses. Mensual fundador: prueba
  // hasta el 31 de octubre. Quien entra queda en el Price vigente ese dia.
  const priceId = plan === "anual" ? env("ECOS_STRIPE_PRICE_ID_ANUAL") : env("ECOS_STRIPE_PRICE_ID");
  const withTrial = plan === "mensual" && founderWindow;

  // Embebido: el pago ocurre DENTRO del sitio, no en una pagina de Stripe.
  // Es el mismo Checkout de siempre —prueba gratuita, cupones, impuestos—,
  // solo que montado en /ecos/entrar. Nadie sale de holmanglobalgroup.com.
  //
  // Si Stripe rechaza algo, se responde con el motivo y con cabeceras CORS. Sin
  // este try el error tumbaba la funcion, Supabase devolvia un 500 pelado y el
  // navegador lo mostraba como "sin conexion" — un mensaje que manda a revisar
  // el wifi cuando el problema esta aqui.
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      // «embedded_page», no «embedded»: Stripe renombro el valor y la version de
      // API que usamos (2026-04-22.dahlia) ya solo acepta el nuevo. Hace juego
      // con createEmbeddedCheckoutPage, que es lo que monta el navegador.
      ui_mode: "embedded_page",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      // Siempre se pide la tarjeta, aunque el primer mes sea gratis: el 1 de
      // noviembre se cobra solo y se queda quien no cancela.
      payment_method_collection: "always",
      subscription_data: {
        metadata: { user_id: user.id, empresa: "HGG", producto: "ECOS", founder: String(founderWindow), plan },
        ...(withTrial ? { trial_end: Math.floor(trialEnd.getTime() / 1000) } : {}),
      },
      allow_promotion_codes: true,
      locale: "es",
      // En modo embebido no hay success/cancel: Stripe devuelve a esta unica URL
      // cuando termina. Quien se arrepiente simplemente cierra el pago.
      return_url: `${siteUrl}/ecos/panel?bienvenida=1&pago={CHECKOUT_SESSION_ID}`,
      metadata: { user_id: user.id, ref: body.ref ?? "", plan },
    });

    if (!session.client_secret) {
      return json(req, { error: "Stripe no devolvio la sesion de pago. Intentalo de nuevo." }, 502);
    }
    return json(req, { clientSecret: session.client_secret });
  } catch (e) {
    const detalle = e instanceof Error ? e.message : String(e);
    console.error("ecos-checkout / stripe:", detalle);
    return json(req, { error: `Stripe rechazo la sesion de pago: ${detalle}` }, 502);
  }
});
