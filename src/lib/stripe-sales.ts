// Helper para insertar venta Stripe en manual_sales.
// Llamado desde /api/stripe/webhook cuando llega payment_intent.succeeded.
// Idempotente: usa id = "stripe_<paymentIntentId>" como primary key.

import { getSupabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { encryptPII } from "@/lib/pii";
import { ADMIN_PRODUCTS } from "@/lib/admin-products";

// Zona horaria por defecto (Colombia / latino). Override con NEXT_PUBLIC_TIMEZONE.
const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || "America/Bogota";

function localDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export type StripeSaleInput = {
  paymentIntentId: string;
  chargeId?: string;
  amount: number; // en moneda principal (no cents)
  currency: string;
  productId: string;
  productTitle?: string;
  customerEmail?: string;
  customerName?: string;
  reference?: string;
  paidAt?: string;
};

export async function recordStripeSale(
  input: StripeSaleInput
): Promise<{ created: boolean; id: string }> {
  const product = ADMIN_PRODUCTS.find((p) => p.id === input.productId);
  const id = `stripe_${input.paymentIntentId}`;
  const date = localDate(input.paidAt);

  const row = {
    id,
    date,
    service_id: input.productId,
    service_title: input.productTitle || product?.title || "Pago Stripe",
    client_name: encryptPII(input.customerName || "Cliente Stripe") as string,
    client_email: encryptPII(input.customerEmail || "—") as string,
    client_phone: null,
    origin: "Stripe",
    notes: `Pago automático · Intent ${input.paymentIntentId}${
      input.chargeId ? ` · Charge ${input.chargeId}` : ""
    }${input.reference ? ` · Ref ${input.reference}` : ""}`,
    amount: input.amount,
    status: "Aprobado" as const,
  };

  try {
    const sb = getSupabaseAdmin();
    const { error, data } = await sb
      .from("manual_sales")
      .upsert(row, { onConflict: "id", ignoreDuplicates: true })
      .select("id");
    if (error) {
      logger.error("[stripe-sales] upsert failed", error);
      return { created: false, id };
    }
    return { created: (data?.length || 0) > 0, id };
  } catch (err) {
    logger.error("[stripe-sales] exception", err);
    return { created: false, id };
  }
}
