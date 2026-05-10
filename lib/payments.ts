export const PAYMENT_CURRENCY = (
  process.env.NEXT_PUBLIC_PAYMENT_CURRENCY || "USD"
).toUpperCase();

export const PAYPAL_CLIENT_ID =
  process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

export type WiseBank = {
  holder: string;
  iban: string;
  swift: string;
  bank: string;
};

export type WiseConfig = {
  paymentLink: string;
  bank: WiseBank | null;
  referencePrefix: string;
};

function readWiseBank(): WiseBank | null {
  const holder = process.env.NEXT_PUBLIC_WISE_HOLDER || "";
  const iban = process.env.NEXT_PUBLIC_WISE_IBAN || "";
  const swift = process.env.NEXT_PUBLIC_WISE_SWIFT || "";
  const bank = process.env.NEXT_PUBLIC_WISE_BANK || "";
  if (!holder || !iban) return null;
  return { holder, iban, swift, bank };
}

export const WISE: WiseConfig = {
  paymentLink: process.env.NEXT_PUBLIC_WISE_PAYMENT_LINK || "",
  bank: readWiseBank(),
  referencePrefix:
    process.env.NEXT_PUBLIC_WISE_REFERENCE_PREFIX || "HGG",
};

export type CheckoutItem = {
  productId: string;
  title: string;
  amount: number; // entero o decimal en la moneda de PAYMENT_CURRENCY
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

export function buildOrderReference(productId: string, prefix = WISE.referencePrefix) {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const id = productId.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return `${prefix}-${id}-${stamp}`;
}
