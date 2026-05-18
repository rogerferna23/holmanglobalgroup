// Supabase Edge Function (Deno runtime).
// Crea un Stripe PaymentIntent server-side validando el producto contra el catalogo.
//
// Deploy:
//   supabase functions deploy create-payment-intent --no-verify-jwt
//
// Env vars (configurar en Supabase Dashboard -> Project Settings -> Edge Functions):
//   STRIPE_SECRET_KEY     - sk_live_... o sk_test_...
//   PRODUCTS_JSON         - JSON con array de productos del catalogo (ver abajo)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-expect-error npm specifier resuelto en Deno runtime
import Stripe from "npm:stripe@22.1.1";

// Allow-list de origenes desde env var ALLOWED_ORIGINS (CSV).
// Ej: "https://holmanglobalgroup.com,https://www.holmanglobalgroup.com,http://localhost:5173"
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, apikey, X-Client-Info",
  };
}

type Product = { id: string; title: string; basePrice: number };

function loadProducts(): Product[] {
  const raw = Deno.env.get("PRODUCTS_JSON") || "[]";
  try {
    return JSON.parse(raw) as Product[];
  } catch {
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  let body: { productId?: string; currency?: string; reference?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const productId = (body.productId || "").trim();
  if (!productId || !/^[a-zA-Z0-9_-]+$/.test(productId)) {
    return new Response(JSON.stringify({ error: "productId inválido" }), {
      status: 400,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const products = loadProducts();
  const product = products.find((p) => p.id === productId);
  if (!product || product.basePrice <= 0) {
    return new Response(
      JSON.stringify({ error: "Producto no encontrado o sin precio" }),
      {
        status: 404,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }

  const currency = (body.currency || "USD").toLowerCase();
  if (!["usd", "eur"].includes(currency)) {
    return new Response(JSON.stringify({ error: "Moneda no soportada" }), {
      status: 400,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const reference = (body.reference || `HGG-${Date.now()}`).slice(0, 64);
  if (!/^[A-Z0-9_-]+$/i.test(reference)) {
    return new Response(JSON.stringify({ error: "Reference inválida" }), {
      status: 400,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secret) {
    return new Response(JSON.stringify({ error: "Stripe no configurado" }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  try {
    const stripe = new Stripe(secret, { apiVersion: "2026-04-22.dahlia" });
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(product.basePrice * 100),
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        productId: product.id,
        productTitle: product.title.slice(0, 500),
        reference,
      },
      description: `${product.title} (${reference})`,
      statement_descriptor_suffix: "HGG",
    });

    return new Response(
      JSON.stringify({
        clientSecret: intent.client_secret,
        reference,
        amount: product.basePrice,
        currency: currency.toUpperCase(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[create-payment-intent]", err);
    return new Response(
      JSON.stringify({
        error: "No se pudo crear el pago. Inténtalo de nuevo.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
