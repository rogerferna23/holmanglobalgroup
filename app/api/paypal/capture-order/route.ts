import { NextResponse } from "next/server";
import { capturePayPalOrder, PayPalError } from "@/lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { orderId?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const orderId = (body.orderId || "").trim();
  if (!orderId) {
    return NextResponse.json(
      { error: "orderId es obligatorio." },
      { status: 400 }
    );
  }

  try {
    const result = await capturePayPalOrder(orderId);
    const capture = result?.purchase_units?.[0]?.payments?.captures?.[0];
    return NextResponse.json({
      orderId: result.id,
      status: result.status,
      payerEmail: result.payer?.email_address,
      captureId: capture?.id,
      amount: capture?.amount,
      reference: result?.purchase_units?.[0]?.reference_id,
    });
  } catch (err) {
    const status = err instanceof PayPalError ? err.status : 500;
    const message =
      err instanceof Error ? err.message : "Error capturando el pago.";
    return NextResponse.json({ error: message }, { status });
  }
}
