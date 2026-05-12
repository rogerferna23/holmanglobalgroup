import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { getPayPalAccessToken, PAYPAL_API_BASE } from "@/lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PayPal webhook receiver. Verifica la firma del webhook contra PayPal
 * antes de procesar cualquier evento.
 *
 * Setup:
 * 1. En PayPal Developer dashboard, crear webhook apuntando a:
 *    https://hgg.studio/api/paypal/webhook
 * 2. Suscribirse a eventos:
 *    - CHECKOUT.ORDER.COMPLETED
 *    - PAYMENT.CAPTURE.COMPLETED
 *    - PAYMENT.CAPTURE.DENIED
 *    - PAYMENT.CAPTURE.REFUNDED
 * 3. Copiar el Webhook ID y ponerlo en env var PAYPAL_WEBHOOK_ID
 *
 * Esto cierra el gap entre lo que PayPal sabe y lo que nosotros sabemos:
 * - Si PayPal procesa un pago pero nuestro capture-order se cayo a mitad,
 *   el webhook nos avisa.
 * - Refunds, denies, disputes — todos vienen aqui.
 */

type WebhookEvent = {
  id?: string;
  event_type?: string;
  resource_type?: string;
  resource?: {
    id?: string;
    status?: string;
    amount?: { value?: string; currency_code?: string };
    custom_id?: string;
    invoice_id?: string;
    [k: string]: unknown;
  };
  create_time?: string;
};

async function verifyWebhookSignature(
  headers: Headers,
  rawBody: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    logger.warn("[paypal/webhook] PAYPAL_WEBHOOK_ID no configurado — rechazando todos los webhooks");
    return false;
  }

  // Headers que PayPal envia con cada webhook (case-insensitive)
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");
  const transmissionSig = headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return false;
  }

  // Validacion adicional: el cert_url debe ser de PayPal (anti-SSRF).
  try {
    const url = new URL(certUrl);
    if (!url.hostname.endsWith(".paypal.com")) {
      logger.warn("[paypal/webhook] cert_url sospechosa", { certUrl });
      return false;
    }
  } catch {
    return false;
  }

  let webhookEvent: unknown;
  try {
    webhookEvent = JSON.parse(rawBody);
  } catch {
    return false;
  }

  try {
    const token = await getPayPalAccessToken();
    const res = await fetch(
      `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: webhookId,
          webhook_event: webhookEvent,
        }),
        cache: "no-store",
      }
    );
    const data = (await res.json()) as { verification_status?: string };
    return data.verification_status === "SUCCESS";
  } catch (err) {
    logger.error("[paypal/webhook] verify failed", err);
    return false;
  }
}

export async function POST(req: Request) {
  // Leer el body raw — necesario para la verificacion de firma.
  const rawBody = await req.text();

  const ok = await verifyWebhookSignature(req.headers, rawBody);
  if (!ok) {
    // Auditamos el intento — un webhook con firma invalida es muy sospechoso.
    void audit({
      action: "paypal.capture_failed",
      metadata: { reason: "invalid_webhook_signature" },
      status: "failure",
    });
    return NextResponse.json(
      { error: "Firma inválida" },
      { status: 401 }
    );
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const eventType = event.event_type || "unknown";
  const resourceId = event.resource?.id || event.id || "unknown";
  const amount = event.resource?.amount?.value;

  // Mapeo de evento → audit action
  let action: "paypal.capture" | "paypal.capture_failed" | "paypal.create_order" =
    "paypal.create_order";
  let status: "success" | "failure" = "success";

  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    action = "paypal.capture";
  } else if (
    eventType === "PAYMENT.CAPTURE.DENIED" ||
    eventType === "PAYMENT.CAPTURE.REVERSED" ||
    eventType === "PAYMENT.CAPTURE.REFUNDED"
  ) {
    action = "paypal.capture_failed";
    status = "failure";
  }

  void audit({
    action,
    resource: "paypal_event",
    resourceId,
    metadata: {
      eventType,
      amount,
      currency: event.resource?.amount?.currency_code,
      customId: event.resource?.custom_id,
      invoiceId: event.resource?.invoice_id,
      paypalEventId: event.id,
    },
    status,
  });

  // PayPal espera 200 OK rapido. Si tardamos > 10s, reintenta.
  return NextResponse.json({ ok: true });
}
