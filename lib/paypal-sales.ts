// Helper compartido: inserta una venta en manual_sales cuando llega un pago
// de PayPal. Lo usan tanto /api/paypal/capture-order como /api/paypal/webhook
// para garantizar que SIEMPRE se cree la venta aunque uno de los dos falle.
//
// Idempotencia: usamos id = "pp_<captureId>". Si ya existe, no se duplica.

import { getSupabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { encryptPII } from "@/lib/pii";
import { ADMIN_PRODUCTS } from "@/lib/admin-products";

// Zona horaria por defecto. Override con NEXT_PUBLIC_TIMEZONE si quieres.
// "America/Bogota" = UTC-5 (Colombia). Para España usa "Europe/Madrid".
const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || "America/Bogota";

function localDate(iso?: string): string {
  // Devuelve YYYY-MM-DD en la zona horaria configurada (no UTC).
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export type PayPalSaleInput = {
  captureId: string;
  orderId: string;
  amount: number;
  currency: string;
  productId: string;
  productTitle?: string;
  payerEmail?: string;
  payerName?: string;
  reference?: string;
  capturedAt?: string;
};

/**
 * Inserta una venta en manual_sales con id = "pp_<captureId>".
 * Si ya existe (porque otro flujo la insertó primero), devuelve { created: false }.
 * No tira excepción si Supabase no está configurado — solo loguea.
 */
export async function recordPayPalSale(
  input: PayPalSaleInput
): Promise<{ created: boolean; id: string }> {
  const product = ADMIN_PRODUCTS.find((p) => p.id === input.productId);
  const id = `pp_${input.captureId}`;
  const date = localDate(input.capturedAt);

  const row = {
    id,
    date,
    service_id: input.productId,
    service_title: input.productTitle || product?.title || "Pago PayPal",
    client_name: encryptPII(input.payerName || "Cliente PayPal") as string,
    client_email: encryptPII(input.payerEmail || "—") as string,
    client_phone: null,
    origin: "PayPal",
    notes: `Pago automático · Order ${input.orderId} · Capture ${input.captureId}${
      input.reference ? ` · Ref ${input.reference}` : ""
    }`,
    amount: input.amount,
    status: "Aprobado" as const,
  };

  try {
    const sb = getSupabaseAdmin();
    // ignoreDuplicates evita 23505 cuando otro flujo (webhook/capture) ya inserto.
    const { error, data } = await sb
      .from("manual_sales")
      .upsert(row, { onConflict: "id", ignoreDuplicates: true })
      .select("id");
    if (error) {
      logger.error("[paypal-sales] upsert failed", error);
      return { created: false, id };
    }
    return { created: (data?.length || 0) > 0, id };
  } catch (err) {
    logger.error("[paypal-sales] exception", err);
    return { created: false, id };
  }
}
