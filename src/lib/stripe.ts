// Cliente Stripe server-side. Usa STRIPE_SECRET_KEY (nunca exponer al cliente).
//
// Modo:
//   - STRIPE_SECRET_KEY que empieza con sk_test_ → modo TEST (no cobra dinero real)
//   - STRIPE_SECRET_KEY que empieza con sk_live_ → modo LIVE (cobros reales)
//
// La distincion es automatica por el prefijo de la key.

import Stripe from "stripe";

export class StripeError extends Error {
  status: number;
  details: unknown;
  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let cachedClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (cachedClient) return cachedClient;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new StripeError(
      "Falta STRIPE_SECRET_KEY en las variables de entorno.",
      500,
      null
    );
  }
  cachedClient = new Stripe(secret, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  });
  return cachedClient;
}

export function isStripeLive(): boolean {
  const secret = process.env.STRIPE_SECRET_KEY || "";
  return secret.startsWith("sk_live_");
}
