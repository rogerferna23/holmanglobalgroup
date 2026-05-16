import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { getStripe } from "@/lib/stripe";
import { recordStripeSale } from "@/lib/stripe-sales";
import { ADMIN_PRODUCTS } from "@/lib/admin-products";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook receiver. Verifica la firma con STRIPE_WEBHOOK_SECRET
 * antes de procesar cualquier evento.
 *
 * Setup:
 * 1. En Stripe Dashboard → Developers → Webhooks → Add endpoint
 * 2. URL: https://hgg.studio/api/stripe/webhook (o tu dominio Vercel)
 * 3. Eventos a escuchar:
 *    - payment_intent.succeeded
 *    - payment_intent.payment_failed
 *    - charge.refunded
 *    - charge.dispute.created
 * 4. Copiar el "Signing secret" (whsec_...) → env var STRIPE_WEBHOOK_SECRET
 *
 * Esto cierra el gap entre lo que Stripe sabe y lo que nosotros sabemos.
 */

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    logger.warn("[stripe/webhook] missing signature or secret");
    return NextResponse.json({ error: "Firma faltante" }, { status: 401 });
  }

  // Leer el body raw para verificacion de firma.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    logger.warn("[stripe/webhook] signature verification failed", {
      err: String(err),
    });
    void audit({
      action: "paypal.capture_failed", // reusamos el action; mejor crear "stripe.failed"
      metadata: { reason: "invalid_webhook_signature" },
      status: "failure",
    });
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(intent);
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        void audit({
          action: "paypal.capture_failed",
          resource: "stripe_payment",
          resourceId: intent.id,
          metadata: {
            eventType: event.type,
            amount: intent.amount / 100,
            currency: intent.currency,
            failureReason: intent.last_payment_error?.message,
          },
          status: "failure",
        });
        break;
      }
      case "charge.refunded":
      case "charge.dispute.created": {
        const charge = event.data.object as Stripe.Charge;
        void audit({
          action: "paypal.capture_failed",
          resource: "stripe_charge",
          resourceId: charge.id,
          metadata: {
            eventType: event.type,
            amount: charge.amount / 100,
            currency: charge.currency,
            paymentIntentId: charge.payment_intent,
          },
          status: "failure",
        });
        break;
      }
      default:
        // Eventos no manejados — Stripe envia muchos, ignoramos los que no nos importan.
        logger.info("[stripe/webhook] unhandled event", { type: event.type });
    }
  } catch (err) {
    logger.error("[stripe/webhook] handler error", err);
  }

  // Stripe espera 200 OK rapido.
  return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
  const productId = intent.metadata?.productId;
  const productTitle = intent.metadata?.productTitle;
  const reference = intent.metadata?.reference;

  if (!productId) {
    logger.warn("[stripe/webhook] payment succeeded sin productId en metadata", {
      intentId: intent.id,
    });
    return;
  }

  const product = ADMIN_PRODUCTS.find((p) => p.id === productId);
  if (!product) {
    logger.warn("[stripe/webhook] producto no encontrado en catalogo", { productId });
    return;
  }

  const amountInUnits = intent.amount / 100;
  if (Math.abs(amountInUnits - product.basePrice) > 0.01) {
    logger.warn("[stripe/webhook] amount mismatch", {
      intentId: intent.id,
      captured: amountInUnits,
      expected: product.basePrice,
    });
    return;
  }

  // Obtener email/nombre del cliente desde el charge.
  let customerEmail: string | undefined;
  let customerName: string | undefined;
  const latestChargeId =
    typeof intent.latest_charge === "string"
      ? intent.latest_charge
      : intent.latest_charge?.id;

  if (latestChargeId) {
    try {
      const stripe = getStripe();
      const charge = await stripe.charges.retrieve(latestChargeId);
      customerEmail = charge.billing_details?.email || undefined;
      customerName = charge.billing_details?.name || undefined;
    } catch (err) {
      logger.warn("[stripe/webhook] charge lookup failed", { err: String(err) });
    }
  }
  // Fallback al receipt_email del intent.
  if (!customerEmail && intent.receipt_email) {
    customerEmail = intent.receipt_email;
  }

  const saleResult = await recordStripeSale({
    paymentIntentId: intent.id,
    chargeId: latestChargeId,
    amount: amountInUnits,
    currency: intent.currency.toUpperCase(),
    productId: product.id,
    productTitle: productTitle || product.title,
    customerEmail,
    customerName,
    reference,
    paidAt: new Date(intent.created * 1000).toISOString(),
  });

  void audit({
    action: "paypal.capture", // reusamos el action existente; "stripe.capture" se podria anadir luego
    resource: "sale",
    resourceId: saleResult.id,
    userEmail: customerEmail,
    metadata: {
      provider: "stripe",
      amount: amountInUnits,
      currency: intent.currency.toUpperCase(),
      productId: product.id,
      paymentIntentId: intent.id,
      recorded: saleResult.created,
    },
  });
}
