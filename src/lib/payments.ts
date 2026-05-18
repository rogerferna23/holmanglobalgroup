export const PAYMENT_CURRENCY = (
  process.env.NEXT_PUBLIC_PAYMENT_CURRENCY || "USD"
).toUpperCase();

// Stripe publishable key (cliente). Empieza con pk_test_ o pk_live_.
export const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

// Prefijo para las referencias de orden (ej. HGG-COACHI-A1B2C3)
const REFERENCE_PREFIX = (
  process.env.NEXT_PUBLIC_REFERENCE_PREFIX || "HGG"
).toUpperCase();

export type CheckoutItem = {
  productId: string;
  title: string;
  amount: number; // entero o decimal en la moneda especificada
  currency?: string; // ISO 4217 (USD, EUR…). Si no se pasa, usa PAYMENT_CURRENCY.
};

export function formatAmount(amount: number, currency = PAYMENT_CURRENCY) {
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function buildOrderReference(productId: string, prefix = REFERENCE_PREFIX) {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const id = productId.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return `${prefix}-${id}-${stamp}`;
}
