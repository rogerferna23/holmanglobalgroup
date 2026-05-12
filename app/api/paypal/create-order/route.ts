import { NextResponse } from "next/server";
import { ADMIN_PRODUCTS } from "@/lib/admin-products";
import { PAYMENT_CURRENCY } from "@/lib/payments";
import { createPayPalOrder, PayPalError } from "@/lib/paypal";
import { logger } from "@/lib/logger";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  productId?: string;
  productTitle?: string;
  amount?: number;
  currency?: string;
  reference?: string;
};

// Rate limit: 20 ordenes por IP cada 10 min. Una compra legitima crea 1
// orden, asi que esto es suficiente para uso real y bloquea abuso.
const MAX_ORDERS = 20;
const WINDOW = 10 * 60;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`paypal:create:${ip}`, MAX_ORDERS, WINDOW);
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

  const productId = (body.productId || "").trim();
  const currency = (body.currency || PAYMENT_CURRENCY).toUpperCase();
  const reference = (body.reference || `HGG-${Date.now()}`).slice(0, 64);

  // CRITICO: NO confiamos en `amount` ni `productTitle` enviados por el cliente.
  // Buscamos el producto en nuestro catalogo server-side y usamos SU precio.
  // Un atacante puede mandar `amount=1` con productId=algo-de-1900USD y sin
  // esta verificacion lo aceptariamos.
  if (!productId || !/^[a-zA-Z0-9_-]+$/.test(productId) || productId.length > 64) {
    return NextResponse.json(
      { error: "productId inválido." },
      { status: 400 }
    );
  }
  const product = ADMIN_PRODUCTS.find((p) => p.id === productId);
  if (!product) {
    return NextResponse.json(
      { error: "Producto no encontrado en catálogo." },
      { status: 404 }
    );
  }
  if (product.basePrice <= 0) {
    return NextResponse.json(
      { error: "Este producto no se cobra por PayPal." },
      { status: 400 }
    );
  }
  // Validar reference: solo alfanumerico + guion (no permitir caracteres raros).
  if (!/^[A-Z0-9_-]+$/i.test(reference)) {
    return NextResponse.json(
      { error: "Reference inválida." },
      { status: 400 }
    );
  }
  // Solo aceptar currencies whitelist.
  if (!["USD", "EUR"].includes(currency)) {
    return NextResponse.json(
      { error: "Moneda no soportada." },
      { status: 400 }
    );
  }

  const amount = product.basePrice;
  const productTitle = product.title;

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
    logger.error("[paypal/create-order]", err);
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
