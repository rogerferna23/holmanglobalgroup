// ecos-webhook — Stripe avisa aqui de todo lo que pasa con las suscripciones
// de ECOS, y esta funcion es la UNICA que escribe el estado de un miembro.
// El navegador nunca toca `status`, `price_usd` ni las fechas.
//
// Endpoint en Stripe: https://<proyecto>.supabase.co/functions/v1/ecos-webhook
// Eventos a suscribir:
//   checkout.session.completed
//   customer.subscription.updated
//   customer.subscription.deleted
//   invoice.paid
//   invoice.payment_failed
//
// Variables: STRIPE_SECRET_KEY, ECOS_STRIPE_WEBHOOK_SECRET (+ las de Supabase)
// Desplegar con --no-verify-jwt: Stripe no manda JWT de Supabase, manda su firma.
//
// ARCHIVO PARA PEGAR EN EL EDITOR DE SUPABASE. Un solo archivo.
// Verify JWT: **NO** — desactívalo.

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

const stripe = stripeClient();
const db = adminClient();

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Sin firma", { status: 400 });

  // deno-lint-ignore no-explicit-any
  let event: any;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      sig,
      env("ECOS_STRIPE_WEBHOOK_SECRET"),
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (err) {
    console.error("[ecos-webhook] firma inválida", err);
    return new Response("Firma inválida", { status: 400 });
  }

  // Idempotencia: Stripe reintenta; cada evento se aplica una sola vez.
  const { error: dupe } = await db
    .from("ecos_webhook_events")
    .insert({ id: event.id, type: event.type });
  if (dupe) return new Response("ya procesado", { status: 200 });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = await completo(event.data.object, "mode", (id) => stripe.checkout.sessions.retrieve(id));
        if (s.mode !== "subscription" || !s.subscription) break;
        const userId = s.client_reference_id ?? (s.metadata?.user_id as string | undefined);
        if (!userId) break;
        const sub = await stripe.subscriptions.retrieve(s.subscription as string);
        await applySubscription(userId, sub);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = await completo(event.data.object, "status", (id) => stripe.subscriptions.retrieve(id));
        const userId = (sub.metadata?.user_id as string | undefined) ?? (await userIdFromCustomer(sub.customer as string));
        if (userId) await applySubscription(userId, sub);
        break;
      }
      case "invoice.paid": {
        const inv = await completo(event.data.object, "amount_paid", (id) => stripe.invoices.retrieve(id));
        await recordPayment(inv);
        await causarComision(inv);
        await creditReferrerIfDue(inv);
        break;
      }
      case "invoice.payment_failed": {
        const inv = await completo(event.data.object, "customer", (id) => stripe.invoices.retrieve(id));
        const userId = await userIdFromCustomer(inv.customer as string);
        if (userId) {
          const { data: cur } = await db.from("ecos_members").select("inactive_since").eq("id", userId).maybeSingle();
          await db.from("ecos_members").update({
            status: "pausado",
            inactive_since: cur?.inactive_since ?? new Date().toISOString(),
          }).eq("id", userId);
        }
        break;
      }
    }
  } catch (err) {
    console.error("[ecos-webhook] error aplicando", event.type, err);
    // 500 para que Stripe reintente; el registro de idempotencia se borra.
    await db.from("ecos_webhook_events").delete().eq("id", event.id);
    return new Response("error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});


/**
 * Stripe puede mandar el objeto completo («instantánea») o solo su id
 * («resumen»), según cómo esté configurado el destino de eventos. Esto acepta
 * las dos formas: si falta el campo que se necesita, pide el objeto completo.
 */
// deno-lint-ignore no-explicit-any
async function completo(obj: any, campo: string, traer: (id: string) => Promise<any>) {
  if (obj && typeof obj === "object" && obj[campo] !== undefined) return obj;
  const id = typeof obj === "string" ? obj : obj?.id;
  if (!id) return obj;
  try {
    return await traer(id);
  } catch (err) {
    console.error("[ecos-webhook] no se pudo traer el objeto", id, err);
    return obj;
  }
}

async function userIdFromCustomer(customerId: string): Promise<string | null> {
  const { data } = await db
    .from("ecos_members")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * El perfil que la persona dio al crear su cuenta. Vive en el metadata de auth
 * y solo se copia a la ficha la primera vez, cuando el pago la crea.
 */
async function perfilDelUsuario(userId: string) {
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error || !data?.user) return {};
  const md = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof md[k] === "string" && (md[k] as string).trim() ? (md[k] as string).trim() : null);
  return {
    email: data.user.email ?? null,
    name: str("name"),
    whatsapp: str("whatsapp"),
    city: str("city"),
    country: str("country"),
    business: str("business"),
    goal: str("goal"),
    show_in_directory: md.show_in_directory !== false,
  };
}

// deno-lint-ignore no-explicit-any
async function applySubscription(userId: string, sub: any) {
  const price = sub.items.data[0]?.price;
  const priceUsd = price?.unit_amount ? price.unit_amount / 100 : null;
  const status = statusFromStripe(sub.status);

  const { data: current } = await db
    .from("ecos_members")
    .select("started_at, status, inactive_since, email, cortesia, teacher")
    .eq("id", userId)
    .maybeSingle();

  const wasActive = current?.status === "activo";
  const plan = (sub.metadata?.plan as string | undefined) === "anual" ? "anual" : undefined;

  // Gracia de 14 dias: al volver a estar activo, si paso el plazo, el avance se borra.
  if (status === "activo" && current?.inactive_since) {
    await db.rpc("ecos_apply_grace", { p_member: userId });
  }

  // upsert, no update: si es su primer pago la ficha todavia no existe. Antes se
  // creaba al abrir el checkout, y entonces cualquiera que mirara el pago y se
  // fuera quedaba registrado como miembro pendiente y ocupando cupo.
  const perfil = current ? {} : await perfilDelUsuario(userId);
  await db
    .from("ecos_members")
    .upsert({
      id: userId,
      ...perfil,
      ...(sub.metadata?.founder === "true" ? { founder: true } : {}),
      ...(sub.metadata?.ref ? { referred_by: sub.metadata.ref as string } : {}),
      status,
      stripe_customer_id: sub.customer as string,
      stripe_subscription_id: sub.id,
      ...(priceUsd ? { price_usd: priceUsd } : {}),
      ...(plan ? { plan } : {}),
      // started_at se fija una sola vez: es la base del desbloqueo por permanencia.
      started_at: current?.started_at ?? new Date(sub.start_date * 1000).toISOString(),
      current_period_end: periodEnd(sub),
      cancelled_at: status === "cancelado" ? new Date().toISOString() : null,
      // Deja de estar activo → empieza a correr la gracia. Vuelve → se limpia.
      // Con cortesía o siendo profesor no hay gracia que contar: la suscripción
      // se canceló para no cobrarle, pero sigue dentro del club.
      inactive_since: status === "activo" || current?.cortesia || current?.teacher
        ? null
        : (wasActive || !current?.inactive_since ? new Date().toISOString() : current.inactive_since),
    }, { onConflict: "id" });

  // Si entro como invitado a una masterclass, queda marcado como convertido. En
  // el primer pago la ficha no existia, asi que el correo sale del perfil.
  const correo = current?.email ?? (perfil as { email?: string | null }).email ?? null;
  if (status === "activo" && correo) {
    await db.from("ecos_guests").update({ converted_id: userId }).eq("email", correo).is("converted_id", null);
  }
}

/** Cada factura pagada queda registrada: es la base del reparto historico real. */
// deno-lint-ignore no-explicit-any
async function recordPayment(inv: any) {
  if (inv.amount_paid <= 0) return;
  const userId = await userIdFromCustomer(inv.customer as string);
  const subId = invoiceSubscriptionId(inv);
  let plan: string | null = null;
  if (subId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      plan = (sub.metadata?.plan as string | undefined) ?? null;
    } catch { /* sin plan */ }
  }
  await db.from("ecos_payments").upsert({
    stripe_invoice_id: inv.id,
    member_id: userId,
    amount_usd: inv.amount_paid / 100,
    plan,
    paid_at: new Date((inv.status_transitions?.paid_at ?? inv.created) * 1000).toISOString(),
  }, { onConflict: "stripe_invoice_id" });
}

/**
 * Comision de quien lo trajo, por cada mes que el referido paga.
 *
 * La regla de si cobra siempre (embajador) o solo la primera vez (afiliado)
 * vive en la base, en hgg_award_commission, y no se repite aqui: tenerla en
 * dos sitios es tenerla mal en uno de los dos tarde o temprano.
 */
// deno-lint-ignore no-explicit-any
async function causarComision(inv: any) {
  if (!inv?.id || inv.amount_paid <= 0) return;
  const userId = await userIdFromCustomer(inv.customer as string);
  if (!userId) return;

  const { data: m } = await db
    .from("ecos_members")
    .select("referred_by, name, email")
    .eq("id", userId)
    .maybeSingle();
  if (!m?.referred_by) return;

  const { error } = await db.rpc("hgg_award_commission", {
    p_referrer: m.referred_by,
    p_source: "club",
    p_source_id: inv.id,
    p_buyer_id: userId,
    p_buyer_email: m.email ?? null,
    p_buyer_name: m.name ?? null,
    p_concept: "Membresia de ECOS",
    p_base: inv.amount_paid / 100,
    p_pct: 10.0,
  });
  if (error) console.error("[ecos-webhook] comision:", error.message);
}

/**
 * Referidos: cuando el referido paga su SEGUNDO mes, quien lo trajo recibe XP
 * en las tres habilidades (una sola vez). La comision del 10% por productos
 * de HGG la gestiona Delega Work (NETWORK) a partir de referred_by.
 */
// deno-lint-ignore no-explicit-any
async function creditReferrerIfDue(inv: any) {
  const subId = invoiceSubscriptionId(inv);
  if (!subId || inv.amount_paid <= 0) return;
  const userId = await userIdFromCustomer(inv.customer as string);
  if (!userId) return;

  const { data: m } = await db.from("ecos_members").select("referred_by, referral_credited").eq("id", userId).maybeSingle();
  if (!m?.referred_by || m.referral_credited) return;

  const paid = await stripe.invoices.list({ subscription: subId, status: "paid", limit: 10 });
  // deno-lint-ignore no-explicit-any
  const realPayments = paid.data.filter((i: any) => i.amount_paid > 0).length;
  if (realPayments < 2) return;

  await db.from("ecos_members").update({ referral_credited: true }).eq("id", userId);
  const pts = 30;
  await db.from("ecos_xp_events").insert([
    { member_id: m.referred_by, skill: "ventas", points: pts, reason: "referido", note: "Trajiste a alguien que se quedó" },
    { member_id: m.referred_by, skill: "marketing", points: pts, reason: "referido", note: "Trajiste a alguien que se quedó" },
    { member_id: m.referred_by, skill: "oratoria", points: pts, reason: "referido", note: "Trajiste a alguien que se quedó" },
  ]);
  await db.rpc("ecos_refresh_badges", { m: m.referred_by });
}
