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
    const status = err instanceof PayPalError ? err.status : 500;
    const message =
      err instanceof Error ? err.message : "Error creando la orden de PayPal.";
    return NextResponse.json({ error: message }, { status });
  }
}
