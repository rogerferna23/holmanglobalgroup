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
// @ts-expect-error npm specifier
import { createClient } from "npm:@supabase/supabase-js@2.105.4";

// Allow-list de origenes desde env var ALLOWED_ORIGINS (CSV).
// Ej: "https://holmanglobalgroup.com,https://www.holmanglobalgroup.com,http://localhost:5173"
// Mantener en sync con EUR_TO_USD del front (src/contexts/CurrencyContext.tsx).
// base_price está en USD; si el cobro es en EUR -> round(base_price / EUR_TO_USD).
const EUR_TO_USD = 1.08;

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

/** Descuento de miembro de ECOS, en porcentaje. Tiene que coincidir con lo que
 *  promete el sitio (ECOS.descuentoMiembroPct). Nov 2026 (Holman): sin
 *  descuento; con los precios de lanzamiento ya no tiene lógica. */
const DESCUENTO_MIEMBRO_PCT = 0;

/**
 * Quien compra, si viene con su sesion abierta, y si es miembro activo del club.
 * Se identifica a cualquier comprador con sesion, no solo a los miembros: asi
 * tampoco un afiliado puede cobrarse comision por su propia compra.
 *
 * El descuento se decide AQUI y no en el navegador: el navegador solo lo
 * muestra. Si lo decidiera la pagina, cualquiera podria pagar menos cambiando
 * un numero en su consola.
 */
async function quienCompra(req: Request): Promise<{ userId: string | null; miembro: boolean }> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const nadie = { userId: null, miembro: false };
  if (!url || !key || !jwt) return nadie;
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  // Con la clave anonima esto no devuelve usuario: sin sesion, sin descuento.
  const { data, error } = await sb.auth.getUser(jwt);
  if (error || !data?.user) return nadie;
  const { data: m } = await sb
    .from("ecos_members")
    .select("status, cortesia, teacher")
    .eq("id", data.user.id)
    .maybeSingle();
  // Quien paga, quien tiene cortesía y quien da clase: todos con los mismos beneficios.
  return { userId: data.user.id, miembro: m?.status === "activo" || m?.cortesia === true || m?.teacher === true };
}

/**
 * Productos en cuotas que se cobran solos cada mes (nov 2026). El primer pago
 * se hace aquí, en la misma ventana de siempre; Stripe cobra los siguientes y
 * stripe-webhook cancela la suscripción al llegar a la última cuota. La
 * cuota que se cobra es el base_price del producto `*-cuota`.
 */
const CUOTAS: Record<string, number> = {
  "sentido-pro-cuota": 3,
  "sentido-elite-cuota": 6,
  "marca-esencial-cuota": 3,
  "marca-pro-cuota": 3,
  "marca-360-cuota": 3,
};

/** El producto de Stripe de cada plan en cuotas, con id fijo para reusarlo. */
async function productoStripe(stripe: Stripe, id: string, nombre: string): Promise<string> {
  const sid = `hgg_${id}`;
  try {
    await stripe.products.retrieve(sid);
  } catch {
    await stripe.products.create({ id: sid, name: nombre });
  }
  return sid;
}

async function loadProduct(id: string): Promise<Product | null> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb
    .from("products")
    .select("id, title, base_price, active")
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    title: data.title,
    basePrice: Number(data.base_price),
  };
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

  let body: { productId?: string; currency?: string; reference?: string; ref?: string };
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

  const product = await loadProduct(productId);
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
    // base_price está en USD; convertir si el cobro es en EUR.
    const amountMajor =
      currency === "eur"
        ? Math.round(product.basePrice / EUR_TO_USD)
        : Math.round(product.basePrice);
    const comprador = await quienCompra(req);
    const miembro = comprador.miembro;
    const factor = miembro ? (100 - DESCUENTO_MIEMBRO_PCT) / 100 : 1;
    const centavos = Math.round(amountMajor * 100 * factor);
    const usdCobrado = Math.round(product.basePrice * factor * 100) / 100;
    const metadata = {
      productId: product.id,
      productTitle: product.title.slice(0, 500),
      currency: currency.toUpperCase(),
      basePriceUsd: String(product.basePrice),
      // Lo que de verdad se cobra, en USD. Es la base de la comision.
      amountUsd: String(usdCobrado),
      descuentoMiembro: miembro ? String(DESCUENTO_MIEMBRO_PCT) : "0",
      buyerId: comprador.userId ?? "",
      reference,
      ref: (body.ref || "").trim().slice(0, 32),
    };

    // En cuotas: una suscripción mensual que cobra la primera ya mismo. La
    // ventana de pago confirma su primera factura igual que un pago normal.
    const nCuotas = CUOTAS[product.id];
    if (nCuotas) {
      const nombre = product.title.replace(/\s+—\s+1 de \d+ pagos$/, "");
      const sid = await productoStripe(stripe, product.id, `${nombre} — ${nCuotas} cuotas`);
      const customer = await stripe.customers.create({
        description: `${nombre} en ${nCuotas} cuotas (${reference})`,
        metadata: { reference, buyerId: comprador.userId ?? "" },
      });
      const sub = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price_data: { currency, product: sid, unit_amount: centavos, recurring: { interval: "month" } },
        }],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        description: `${nombre} — ${nCuotas} cuotas (${reference})`,
        // stripe-webhook la reconoce por hgg_tipo; ecos-webhook la ignora.
        metadata: { ...metadata, hgg_tipo: "cuotas", cuotas: String(nCuotas) },
        expand: ["latest_invoice.confirmation_secret"],
      });
      // deno-lint-ignore no-explicit-any
      const secreto = (sub.latest_invoice as any)?.confirmation_secret?.client_secret;
      if (!secreto) throw new Error("La suscripción no devolvió el secreto de su primera factura");
      return new Response(
        JSON.stringify({
          clientSecret: secreto,
          reference,
          amount: centavos / 100,
          currency: currency.toUpperCase(),
          descuentoMiembro: miembro ? DESCUENTO_MIEMBRO_PCT : 0,
          cuotas: nCuotas,
        }),
        { status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const intent = await stripe.paymentIntents.create({
      amount: centavos,
      currency,
      automatic_payment_methods: { enabled: true },
      // buyerId: para que nadie cobre comision por su propia compra con su
      // propio enlace. ref: codigo de quien lo trajo (el webhook lo resuelve).
      metadata,
      description: `${product.title} (${reference})`,
      statement_descriptor_suffix: "HGG",
    });

    return new Response(
      JSON.stringify({
        clientSecret: intent.client_secret,
        reference,
        // Lo que de verdad se cobra, ya con descuento si aplica. La pagina lo
        // muestra tal cual, para que no diga un precio y Stripe cobre otro.
        amount: centavos / 100,
        currency: currency.toUpperCase(),
        descuentoMiembro: miembro ? DESCUENTO_MIEMBRO_PCT : 0,
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
