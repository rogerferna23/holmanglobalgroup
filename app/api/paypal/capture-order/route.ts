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
    console.error("[paypal/capture-order]", err);
    const status = err instanceof PayPalError ? err.status : 500;
    const safeMessage =
      status >= 400 && status < 500
        ? "No se pudo confirmar el pago. Inténtalo de nuevo."
        : "Hubo un problema al confirmar tu pago. Si el cargo aparece en tu cuenta, escríbenos por WhatsApp.";
    return NextResponse.json({ error: safeMessage }, { status });
  }
}
