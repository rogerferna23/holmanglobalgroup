import { NextResponse } from "next/server";
import { PAYMENT_CURRENCY } from "@/lib/payments";
import { createPayPalOrder, PayPalError } from "@/lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  productId?: string;
  productTitle?: string;
  amount?: number;
  currency?: string;
  reference?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const productId = (body.productId || "").trim();
  const productTitle = (body.productTitle || "").trim();
  const amount = typeof body.amount === "number" ? body.amount : NaN;
  const currency = (body.currency || PAYMENT_CURRENCY).toUpperCase();
  const reference = (body.reference || `HGG-${Date.now()}`).slice(0, 64);

  if (!productId || !productTitle) {
    return NextResponse.json(
      { error: "productId y productTitle son obligatorios." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "amount debe ser un número positivo." },
      { status: 400 }
    );
  }

  try {
    const order = await createPayPalOrder({
      amount,
      currency,
      productId,
      productTitle,
      reference,
    });
    return NextResponse.json(order);
  } catch (err) {
    // Loggear detalles internos en server, devolver mensaje generico al cliente.
    console.error("[paypal/create-order]", err);
    const status = err instanceof PayPalError ? err.status : 500;
    // Solo propagamos mensajes de errores 4xx esperados (validacion). Para 5xx,
    // mensaje generico que no expone debug_id, IDs internos ni stack traces.
    const safeMessage =
      status >= 400 && status < 500
        ? "No se pudo crear la orden de pago. Verifica los datos e inténtalo de nuevo."
        : "Hubo un problema al procesar tu pago. Inténtalo en unos minutos.";
    return NextResponse.json({ error: safeMessage }, { status });
  }
}
