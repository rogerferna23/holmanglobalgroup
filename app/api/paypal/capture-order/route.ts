import { NextResponse } from "next/server";
import { ADMIN_PRODUCTS } from "@/lib/admin-products";
import {
  capturePayPalOrder,
  getPayPalOrder,
  PayPalError,
} from "@/lib/paypal";
import { recordPayPalSale } from "@/lib/paypal-sales";
import { audit } from "@/lib/audit";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { orderId?: string };

// Rate limit anti-abuso: 30 captures por IP en 10 min. Una venta legitima
// captura 1 sola vez, asi que esto es generoso pero corta scripts maliciosos.
const MAX_CAPTURES = 30;
const WINDOW = 10 * 60;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`paypal:capture:${ip}`, MAX_CAPTURES, WINDOW);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Inténtalo en unos minutos." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const orderId = (body.orderId || "").trim();
  // Validacion del formato de orderId (PayPal usa IDs alfanumericos).
  if (!orderId || orderId.length > 64 || !/^[A-Z0-9]+$/i.test(orderId)) {
    return NextResponse.json(
      { error: "orderId inválido." },
      { status: 400 }
    );
  }

  try {
    // 1. Antes de capturar, consultamos la orden en PayPal para verificar
    //    que el monto coincide con un producto real de nuestro catalogo.
    //    Esto bloquea el ataque clasico: atacante crea orden de $1 y manda
    //    ese ID aqui esperando que registremos venta normal.
    const orderInfo = await getPayPalOrder(orderId);
    const unit = orderInfo?.purchase_units?.[0];
    const claimedAmount = parseFloat(unit?.amount?.value || "0");
    const productId = unit?.custom_id;
    const product = ADMIN_PRODUCTS.find((p) => p.id === productId);

    if (!product) {
      return NextResponse.json(
        { error: "Producto no reconocido en la orden." },
        { status: 400 }
      );
    }
    // Aceptamos +/- 1 centavo de diferencia por redondeo PayPal.
    if (Math.abs(claimedAmount - product.basePrice) > 0.01) {
      logger.warn("[paypal/capture-order] suspicious amount", {
        orderId,
        claimed: claimedAmount,
        productId,
        expected: product.basePrice,
      });
      return NextResponse.json(
        { error: "El monto de la orden no coincide con el producto." },
        { status: 400 }
      );
    }

    // 2. Solo entonces capturamos.
    const result = await capturePayPalOrder(orderId);
    const capture = result?.purchase_units?.[0]?.payments?.captures?.[0];
    const capturedAmount = parseFloat(capture?.amount?.value || "0");
    // 3. Verificacion final: lo capturado debe seguir coincidiendo.
    if (Math.abs(capturedAmount - product.basePrice) > 0.01) {
      logger.warn("[paypal/capture-order] captured amount mismatch", {
        captured: capturedAmount,
        expected: product.basePrice,
        orderId,
      });
      return NextResponse.json(
        { error: "Discrepancia en el monto capturado." },
        { status: 400 }
      );
    }
    // 4. Registrar la venta en manual_sales (idempotente).
    //    Si el webhook ya la creo, este insert no duplica.
    if (capture?.id) {
      const payerName = [
        result.payer?.name?.given_name,
        result.payer?.name?.surname,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      const saleResult = await recordPayPalSale({
        captureId: capture.id,
        orderId: result.id,
        amount: capturedAmount,
        currency: capture?.amount?.currency_code || "USD",
        productId: product.id,
        productTitle: product.title,
        payerEmail: result.payer?.email_address,
        payerName: payerName || undefined,
        reference: result?.purchase_units?.[0]?.reference_id,
        capturedAt: capture?.create_time,
      });
      void audit({
        action: "paypal.capture",
        resource: "sale",
        resourceId: saleResult.id,
        userEmail: result.payer?.email_address,
        metadata: {
          amount: capturedAmount,
          productId: product.id,
          orderId: result.id,
          captureId: capture.id,
          recorded: saleResult.created,
        },
      });
    }

    return NextResponse.json({
      orderId: result.id,
      status: result.status,
      payerEmail: result.payer?.email_address,
      captureId: capture?.id,
      amount: capture?.amount,
      reference: result?.purchase_units?.[0]?.reference_id,
    });
  } catch (err) {
    logger.error("[paypal/capture-order]", err);
    const status = err instanceof PayPalError ? err.status : 500;
    const safeMessage =
      status >= 400 && status < 500
        ? "No se pudo confirmar el pago. Inténtalo de nuevo."
        : "Hubo un problema al confirmar tu pago. Si el cargo aparece en tu cuenta, escríbenos por WhatsApp.";
    return NextResponse.json({ error: safeMessage }, { status });
  }
}
