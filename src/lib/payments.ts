// Variables Vite — se inyectan en build vía import.meta.env (NO usar process.env).
export const PAYMENT_CURRENCY = (
  import.meta.env.VITE_PAYMENT_CURRENCY || "USD"
).toUpperCase();

// Stripe publishable key (cliente). Empieza con pk_test_ o pk_live_.
export const STRIPE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

// Prefijo para las referencias de orden (ej. HGG-COACHI-A1B2C3)
const REFERENCE_PREFIX = (
  import.meta.env.VITE_REFERENCE_PREFIX || "HGG"
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

/**
 * Qué hace la persona justo después de pagar en la tienda. Sentido y Marca
 * empiezan con una sesión, así que la mandamos directo a agendarla; el resto
 * (LLC, webs, campañas) arranca con una conversación por WhatsApp.
 *
 * El correo de confirmación (supabase/functions/stripe-webhook) usa la misma
 * regla: si cambias una, cambia la otra.
 */
export type SiguientePaso = { tipo: "agendar" | "whatsapp"; texto: string };

export function siguientePaso(productId: string): SiguientePaso {
  if (productId.startsWith("sentido-") || productId.startsWith("marca-") || productId.startsWith("mc-")) {
    return {
      tipo: "agendar",
      texto: "Tu siguiente paso es agendar tu primera sesión con Holman.",
    };
  }
  return {
    tipo: "whatsapp",
    texto: "Te escribimos por WhatsApp en menos de 24 horas para arrancar. Si prefieres, escríbenos tú ahora.",
  };
}
