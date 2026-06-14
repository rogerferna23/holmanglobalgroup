import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Currency = "USD" | "EUR";

// USD es la moneda BASE de la tienda (amountValue está en USD).
// 1 EUR = EUR_TO_USD USD  →  importe en EUR = USD / EUR_TO_USD.
// IMPORTANTE: mantener este valor en sync con las Edge Functions de pago
// (create-payment-intent / stripe-webhook).
export const EUR_TO_USD = 1.08;

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  code: Currency; // 'USD' | 'EUR' (para Stripe y etiquetas)
  symbol: string; // '$' | '€'
  /** Convierte un importe en USD (base) a la moneda activa (entero redondeado). */
  convert: (usd: number) => number;
  /** Formatea un importe en USD (base) en la moneda activa: "$648" / "€600". */
  formatMoney: (usd: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(
  undefined
);

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx)
    throw new Error("useCurrency debe usarse dentro de <CurrencyProvider>");
  return ctx;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  // Por defecto USD; el cliente puede cambiar a EUR.
  const [currency, setCurrency] = useState<Currency>(() => {
    try {
      return sessionStorage.getItem("hgg_currency") === "EUR" ? "EUR" : "USD";
    } catch {
      return "USD";
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem("hgg_currency", currency);
    } catch {
      /* sessionStorage no disponible */
    }
  }, [currency]);

  const symbol = currency === "EUR" ? "€" : "$";

  const convert = (usd: number): number =>
    currency === "EUR" ? Math.round(usd / EUR_TO_USD) : Math.round(usd);

  const formatMoney = (usd: number): string =>
    symbol +
    convert(usd).toLocaleString(currency === "EUR" ? "es-ES" : "en-US");

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, code: currency, symbol, convert, formatMoney }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
