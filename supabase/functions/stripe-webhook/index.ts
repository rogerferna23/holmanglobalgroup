// Supabase Edge Function: receptor de webhooks de Stripe.
// Verifica firma y registra ventas exitosas en manual_sales.
//
// Deploy:
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// Env vars:
//   STRIPE_SECRET_KEY        - sk_live_... o sk_test_...
//   STRIPE_WEBHOOK_SECRET    - whsec_... (de Stripe Dashboard -> Webhooks)
//   SUPABASE_URL             - automaticamente disponible
//   SUPABASE_SERVICE_ROLE_KEY - automaticamente disponible
//   PRODUCTS_JSON            - mismo array que create-payment-intent

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-expect-error npm specifier
import Stripe from "npm:stripe@22.1.1";
// @ts-expect-error npm specifier
import { createClient } from "npm:@supabase/supabase-js@2.105.4";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, stripe-signature",
};

type Product = { id: string; title: string; basePrice: number };

function loadProducts(): Product[] {
  const raw = Deno.env.get("PRODUCTS_JSON") || "[]";
  try {
    return JSON.parse(raw) as Product[];
  } catch {
    return [];
  }
}

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function localDate(iso?: string): string {
  const tz = Deno.env.get("TIMEZONE") || "America/Bogota";
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response("Método no permitido", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");

  if (!signature || !webhookSecret || !stripeSecret) {
    return new Response(JSON.stringify({ error: "No configurado" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const stripe = new Stripe(stripeSecret, { apiVersion: "2026-04-22.dahlia" });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.warn("[stripe-webhook] signature failed", err);
    return new Response(JSON.stringify({ error: "Firma inválida" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await handleSuccess(stripe, intent);
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await logAudit({
          action: "payment_failed",
          resource: "stripe_payment",
          resource_id: intent.id,
          metadata: {
            amount: intent.amount / 100,
            failureReason: intent.last_payment_error?.message,
          },
          status: "failure",
        });
        break;
      }
      case "charge.refunded":
      case "charge.dispute.created": {
        const charge = event.data.object as Stripe.Charge;
        await logAudit({
          action: event.type,
          resource: "stripe_charge",
          resource_id: charge.id,
          metadata: { amount: charge.amount / 100 },
          status: "failure",
        });
        break;
      }
    }
  } catch (err) {
    console.error("[stripe-webhook] handler error", err);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});

async function handleSuccess(stripe: Stripe, intent: Stripe.PaymentIntent) {
  const productId = intent.metadata?.productId;
  const productTitle = intent.metadata?.productTitle;
  const reference = intent.metadata?.reference;

  if (!productId) return;

  const products = loadProducts();
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  const amount = intent.amount / 100;
  if (Math.abs(amount - product.basePrice) > 0.01) {
    console.warn("[stripe-webhook] amount mismatch", { amount, expected: product.basePrice });
    return;
  }

  // Obtener email del cliente desde el charge
  let customerEmail: string | undefined;
  let customerName: string | undefined;
  const chargeId =
    typeof intent.latest_charge === "string"
      ? intent.latest_charge
      : intent.latest_charge?.id;

  if (chargeId) {
    try {
      const charge = await stripe.charges.retrieve(chargeId);
      customerEmail = charge.billing_details?.email || undefined;
      customerName = charge.billing_details?.name || undefined;
    } catch (err) {
      console.warn("[stripe-webhook] charge retrieve failed", err);
    }
  }
  if (!customerEmail && intent.receipt_email) {
    customerEmail = intent.receipt_email;
  }

  const sb = getSupabaseAdmin();
  const id = `stripe_${intent.id}`;
  const row = {
    id,
    date: localDate(new Date(intent.created * 1000).toISOString()),
    service_id: productId,
    service_title: productTitle || product.title,
    client_name: customerName || "Cliente Stripe",
    client_email: customerEmail || "—",
    client_phone: null,
    origin: "Stripe",
    notes: `Pago automático · Intent ${intent.id}${chargeId ? ` · Charge ${chargeId}` : ""}${reference ? ` · Ref ${reference}` : ""}`,
    amount,
    status: "Aprobado",
  };

  const { error } = await sb
    .from("manual_sales")
    .upsert(row, { onConflict: "id", ignoreDuplicates: true });

  if (error) {
    console.error("[stripe-webhook] insert sale failed", error);
  }

  await logAudit({
    action: "stripe.capture",
    resource: "sale",
    resource_id: id,
    user_email: customerEmail,
    metadata: { amount, productId, intentId: intent.id },
    status: "success",
  });
}

async function logAudit(entry: {
  action: string;
  resource: string;
  resource_id: string;
  user_email?: string;
  metadata?: Record<string, unknown>;
  status: "success" | "failure";
}) {
  try {
    const sb = getSupabaseAdmin();
    await sb.from("audit_log").insert({
      ...entry,
      user_email: entry.user_email || null,
      metadata: entry.metadata || null,
    });
  } catch (err) {
    console.warn("[audit] failed", err);
  }
}
