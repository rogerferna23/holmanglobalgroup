import { NextResponse } from "next/server";
import { ADMIN_PRODUCTS } from "@/lib/admin-products";
import { PAYMENT_CURRENCY } from "@/lib/payments";
import { getStripe, StripeError } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { badRequest, id, str } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  productId?: string;
  currency?: string;
  reference?: string;
};

// Rate limit: 20 intentos por IP cada 10 min.
const MAX_INTENTS = 20;
const WINDOW = 10 * 60;

const SUPPORTED_CURRENCIES = ["usd", "eur"] as const;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`stripe:intent:${ip}`, MAX_INTENTS, WINDOW);
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

  // CRITICO: NO confiamos en el amount del cliente. Buscamos el producto en
  // nuestro catalogo server-side y usamos SU precio. Anti-tampering basico.
  const vProductId = id(body.productId, "productId");
  if (!vProductId.ok) return badRequest(vProductId.error);
  const product = ADMIN_PRODUCTS.find((p) => p.id === vProductId.value);
  if (!product) {
    return NextResponse.json(
      { error: "Producto no encontrado en catálogo." },
      { status: 404 }
    );
  }
  if (product.basePrice <= 0) {
    return NextResponse.json(
      { error: "Este producto no se cobra online." },
      { status: 400 }
    );
  }

  const currency = (body.currency || PAYMENT_CURRENCY).toLowerCase();
  if (!SUPPORTED_CURRENCIES.includes(currency as (typeof SUPPORTED_CURRENCIES)[number])) {
    return NextResponse.json(
      { error: "Moneda no soportada." },
      { status: 400 }
    );
  }

  const vReference = str(body.reference, "reference", {
    max: 64,
    pattern: /^[A-Z0-9_-]+$/i,
  });
  if (!vReference.ok) return badRequest(vReference.error);
  const reference = vReference.value || `HGG-${Date.now()}`;

  // Stripe trabaja con la unidad minima (cents en USD/EUR, no decimales).
  const amountInCents = Math.round(product.basePrice * 100);

  try {
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      // Habilitar TODOS los metodos relevantes que tengas activos en tu
      // dashboard. Stripe filtra los disponibles segun pais/dispositivo.
      automatic_payment_methods: { enabled: true },
      metadata: {
        productId: product.id,
        productTitle: product.title.slice(0, 500),
        reference,
      },
      description: `${product.title} (${reference})`,
      statement_descriptor_suffix: "HGG",
    });

    return NextResponse.json({
      clientSecret: intent.client_secret,
      reference,
      amount: product.basePrice,
      currency: currency.toUpperCase(),
    });
  } catch (err) {
    logger.error("[stripe/create-payment-intent]", err);
    const status = err instanceof StripeError ? err.status : 500;
    const safeMessage =
      status >= 400 && status < 500
        ? "No se pudo crear el pago. Verifica los datos e inténtalo de nuevo."
        : "Hubo un problema al procesar tu pago. Inténtalo en unos minutos.";
    return NextResponse.json({ error: safeMessage }, { status });
  }
}
