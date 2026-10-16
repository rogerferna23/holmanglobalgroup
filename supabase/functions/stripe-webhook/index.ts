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
//   RESEND_API_KEY           - correo de confirmación al cliente (el mismo de ECOS)
//   HGG_REMITENTE            - opcional; por defecto "Holman Global Group <equipo@mkt.holmanglobalgroup.com>"
//   HGG_AVISO_VENTAS         - opcional; a quién le llega el aviso de cada venta
//                              (por defecto equipo@holmanglobalgroup.com). "no" lo apaga.
//   SITE_URL                 - opcional; por defecto https://holmanglobalgroup.com

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-expect-error npm specifier
import Stripe from "npm:stripe@22.1.1";
// @ts-expect-error npm specifier
import { createClient } from "npm:@supabase/supabase-js@2.105.4";

// Webhook: solo Stripe lo llama (server-to-server). CORS irrelevante,
// pero respondemos vacio para evitar abuso desde browsers.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://api.stripe.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, stripe-signature",
};

type Product = { id: string; title: string; basePrice: number };

async function loadProduct(sb: ReturnType<typeof getSupabaseAdmin>, id: string): Promise<Product | null> {
  const { data, error } = await sb
    .from("products")
    .select("id, title, base_price")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, title: data.title, basePrice: Number(data.base_price) };
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

  // Idempotencia: si ya procesamos este event.id antes, salir 200.
  try {
    const sb = getSupabaseAdmin();
    const { error: dupErr } = await sb
      .from("stripe_processed_events")
      .insert({ event_id: event.id, event_type: event.type });
    if (dupErr) {
      // Si la insercion falla por PK duplicada -> ya procesado.
      if (dupErr.code === "23505") {
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      // Otro error: log y continuar (mejor procesar 2 veces que perder un pago).
      console.warn("[stripe-webhook] idempotency insert failed", dupErr);
    }
  } catch (err) {
    console.warn("[stripe-webhook] idempotency check error", err);
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

  const sbForLookup = getSupabaseAdmin();
  const product = await loadProduct(sbForLookup, productId);
  if (!product) return;

  // base_price está en USD. Si el cobro fue en EUR, el importe esperado es
  // round(base_price / EUR_TO_USD). Mantener EUR_TO_USD en sync con el front.
  const EUR_TO_USD = 1.08;
  const cur = (intent.currency || "usd").toLowerCase();
  const amountCharged = intent.amount / 100;
  // Con el descuento de miembro de ECOS se cobra menos que el precio de lista:
  // el esperado se calcula igual que en create-payment-intent. (Antes se
  // comparaba contra el precio de lista y estas ventas se descartaban.)
  const pctMiembro = Number(intent.metadata?.descuentoMiembro) || 0;
  const listaMayor =
    cur === "eur"
      ? Math.round(product.basePrice / EUR_TO_USD)
      : Math.round(product.basePrice);
  const expected = Math.round(listaMayor * 100 * ((100 - pctMiembro) / 100)) / 100;
  if (Math.abs(amountCharged - expected) > 1) {
    console.warn("[stripe-webhook] amount mismatch", { amountCharged, expected, cur });
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
    notes: `Pago automático · Intent ${intent.id}${chargeId ? ` · Charge ${chargeId}` : ""}${reference ? ` · Ref ${reference}` : ""} · Cobrado ${amountCharged} ${cur.toUpperCase()}`,
    // Lo cobrado de verdad: con el descuento de miembro, no es el precio de lista.
    amount: Number(intent.metadata?.amountUsd) || product.basePrice,
    status: "Aprobado",
  };

  // Quien trajo a este comprador, si llego por el enlace de alguien. Se guarda
  // en la venta y se causa la comision. La regla de si cobra siempre o solo la
  // primera vez vive en la base, no aqui.
  const refCode = (intent.metadata?.ref || "").trim();
  let referrerId: string | null = null;
  if (refCode) {
    const { data } = await sb.rpc("hgg_resolve_code", { p_code: refCode });
    referrerId = (data as string | null) ?? null;
  }

  // La venta se guarda SIEMPRE. La atribucion es un extra: si falla (por
  // ejemplo porque la migracion de referidos aun no corrio y la columna no
  // existe), se reintenta sin ella. Perder un credito de referido es malo;
  // perder el registro de una venta es mucho peor.
  let { error } = await sb
    .from("manual_sales")
    .upsert(refCode ? { ...row, ref_code: refCode, referred_by: referrerId } : row,
            { onConflict: "id", ignoreDuplicates: true });

  if (error && refCode) {
    console.warn("[stripe-webhook] venta sin atribucion:", error.message);
    ({ error } = await sb
      .from("manual_sales")
      .upsert(row, { onConflict: "id", ignoreDuplicates: true }));
  }

  if (error) {
    console.error("[stripe-webhook] insert sale failed", error);
  }

  if (referrerId) {
    const { error: comErr } = await sb.rpc("hgg_award_commission", {
      p_referrer: referrerId,
      p_source: "producto",
      p_source_id: id,
      // Si compro con su sesion, se sabe quien es: asi nadie cobra comision
      // por su propia compra con su propio enlace.
      p_buyer_id: intent.metadata?.buyerId || null,
      p_buyer_email: customerEmail || null,
      p_buyer_name: customerName || null,
      p_concept: productTitle || product.title,
      p_base: Number(intent.metadata?.amountUsd) || product.basePrice,
      p_pct: 10.0,
    });
    if (comErr) console.error("[stripe-webhook] comision:", comErr.message);
  }

  // Confirmación al cliente con su siguiente paso, y aviso de la venta. Si el
  // correo falla, la venta ya quedó guardada: solo se anota en el log.
  if (customerEmail) {
    const e = await enviarCorreo(
      customerEmail,
      `Tu compra está confirmada: ${productTitle || product.title}`,
      correoCliente({
        nombre: customerName,
        producto: productTitle || product.title,
        productId,
        monto: `${amountCharged.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${cur.toUpperCase()}`,
        reference,
      }),
    );
    if (e) console.error("[stripe-webhook] correo cliente:", e);
  }
  const aviso = (Deno.env.get("HGG_AVISO_VENTAS") ?? "equipo@holmanglobalgroup.com").trim();
  if (aviso && aviso !== "no") {
    const e = await enviarCorreo(
      aviso,
      `💰 Venta: ${productTitle || product.title} · ${amountCharged} ${cur.toUpperCase()}`,
      `<p><strong>${esc(productTitle || product.title)}</strong> — ${amountCharged} ${cur.toUpperCase()}${pctMiembro ? ` (con ${pctMiembro}% de miembro)` : ""}</p>
<p>Cliente: ${esc(customerName || "sin nombre")} · ${esc(customerEmail || "sin correo")}</p>
<p>Referencia: ${esc(reference || "—")}${refCode ? ` · Llegó con el código ${esc(refCode)}` : ""}</p>
<p>Siguiente paso: escríbele hoy para darle la bienvenida.</p>`,
    );
    if (e) console.error("[stripe-webhook] aviso de venta:", e);
  }

  await logAudit({
    action: "stripe.capture",
    resource: "sale",
    resource_id: id,
    user_email: customerEmail,
    metadata: { amount: product.basePrice, charged: amountCharged, currency: cur.toUpperCase(), productId, intentId: intent.id },
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

// ---------- Correos ----------

function esc(t: string): string {
  return t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

async function enviarCorreo(to: string, subject: string, html: string): Promise<string | null> {
  const clave = Deno.env.get("RESEND_API_KEY");
  if (!clave) return "Falta RESEND_API_KEY";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("HGG_REMITENTE") || "Holman Global Group <equipo@mkt.holmanglobalgroup.com>",
        reply_to: "equipo@holmanglobalgroup.com",
        to: [to],
        subject,
        html,
      }),
    });
    if (res.ok) return null;
    return `Resend ${res.status}: ${(await res.text()).slice(0, 300)}`;
  } catch (err) {
    return String(err);
  }
}

/**
 * Siguiente paso tras la compra. Misma regla que siguientePaso() en
 * src/lib/payments.ts: Sentido y Marca empiezan agendando la primera sesión;
 * lo demás, con una conversación por WhatsApp.
 */
function correoCliente(d: { nombre?: string; producto: string; productId: string; monto: string; reference?: string }): string {
  const site = (Deno.env.get("SITE_URL") || "https://holmanglobalgroup.com").replace(/\/$/, "");
  const agenda = d.productId.startsWith("sentido-") || d.productId.startsWith("marca-");
  const wa = `https://wa.me/573239103261?text=${encodeURIComponent(`Hola Holman, acabo de comprar ${d.producto}${d.reference ? ` (ref. ${d.reference})` : ""}.`)}`;
  const boton = (href: string, texto: string) =>
    `<p style="margin:22px 0;"><a href="${esc(href)}" style="display:inline-block;padding:13px 26px;background:#e8b923;color:#111111;text-decoration:none;border-radius:999px;font-weight:bold;">${esc(texto)}</a></p>`;
  const primer = (d.nombre || "").trim().split(/\s+/)[0];
  return `<div style="margin:0;padding:32px 16px;background:#f4f2ee;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:36px 32px;color:#333333;font-size:15px;line-height:1.7;">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:3px;color:#b8860b;text-transform:uppercase;">Holman Global Group</p>
    <h1 style="margin:0 0 18px;font-size:22px;color:#111111;">${primer ? `${esc(primer)}, gracias` : "Gracias"} por confiar en nosotros.</h1>
    <p>Tu compra de <strong>${esc(d.producto)}</strong> está confirmada (${esc(d.monto)}).</p>
    ${agenda
      ? `<p>Tu siguiente paso es agendar tu primera sesión con Holman. Elige el día y la hora que te queden mejor:</p>${boton(`${site}/sesion`, "Agendar mi primera sesión")}<p>¿Alguna duda antes? Escríbenos por <a href="${esc(wa)}" style="color:#b8860b;">WhatsApp</a>.</p>`
      : `<p>Te escribimos por WhatsApp en menos de 24 horas para arrancar. Si prefieres adelantarte, escríbenos tú:</p>${boton(wa, "Escribir por WhatsApp")}`}
    ${d.reference ? `<p style="font-size:13px;color:#777777;">Referencia de tu compra: <strong>${esc(d.reference)}</strong></p>` : ""}
    <p>Nos vemos pronto,<br/>Holman</p>
    <p style="margin:28px 0 0;font-size:12px;color:#999999;">Holman Global Group LLC · <a href="${esc(site)}" style="color:#999999;">holmanglobalgroup.com</a><br/>Recibes este correo porque hiciste una compra en nuestro sitio.</p>
  </div>
</div>`;
}
