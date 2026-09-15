// Utilidades compartidas por las tres Edge Functions de ECOS.
// Mismas versiones y misma forma que create-payment-intent / stripe-webhook.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-expect-error npm specifier resuelto en Deno runtime
import Stripe from "npm:stripe@22.1.1";
// @ts-expect-error npm specifier
import { createClient } from "npm:@supabase/supabase-js@2.105.4";

export { Stripe };

export function env(name: string, fallback?: string): string {
  const v = Deno.env.get(name) ?? fallback;
  if (v === undefined) throw new Error(`Falta la variable ${name}`);
  return v;
}

export function stripeClient() {
  return new Stripe(env("STRIPE_SECRET_KEY"), { apiVersion: "2026-04-22.dahlia" });
}

/** Cliente con service_role: salta RLS. Solo se usa dentro de la funcion. */
export function adminClient() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Quien llama, a partir del JWT del usuario. null si no hay sesion valida. */
export async function callerFrom(req: Request) {
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

export function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || "";
  return {
    "Access-Control-Allow-Origin": allow,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, X-Client-Info",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  return null;
}

/** Estado interno a partir del estado de la suscripcion en Stripe. */
export function statusFromStripe(s: string): "activo" | "pausado" | "cancelado" {
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
export function periodEnd(sub: any): string | null {
  const ts = sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

/** Id de suscripcion de una factura (cambio de sitio entre versiones de la API). */
// deno-lint-ignore no-explicit-any
export function invoiceSubscriptionId(inv: any): string | null {
  const direct = inv?.subscription;
  if (typeof direct === "string") return direct;
  if (direct?.id) return direct.id;
  const nested = inv?.parent?.subscription_details?.subscription;
  if (typeof nested === "string") return nested;
  return nested?.id ?? null;
}
