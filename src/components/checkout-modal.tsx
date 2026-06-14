import { useCallback, useEffect, useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  STRIPE_PUBLISHABLE_KEY,
  buildOrderReference,
  type CheckoutItem,
} from "@/lib/payments";
import { trackEvent } from "@/lib/analytics";
import { useCurrency } from "@/contexts/CurrencyContext";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; msg?: string }
  | { kind: "error"; msg: string }
  | { kind: "success"; msg: string; reference?: string };

type Props = {
  item: CheckoutItem | null;
  onClose: () => void;
};

// Cache del cliente Stripe (no recargamos el script cada vez).
let stripePromiseCache: Promise<Stripe | null> | null = null;
function getStripePromise(): Promise<Stripe | null> {
  if (!STRIPE_PUBLISHABLE_KEY) return Promise.resolve(null);
  if (!stripePromiseCache) {
    stripePromiseCache = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromiseCache;
}

export function CheckoutModal({ item, onClose }: Props) {
  const reference = useMemo(
    () => (item ? buildOrderReference(item.productId) : ""),
    [item]
  );
  const { formatMoney } = useCurrency();
  const isOpen = !!item;

  // Cerrar con Escape + bloquear scroll del body cuando esta abierto
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  return (
    <div
      className="checkout-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="checkout-modal">
        <button
          type="button"
          className="checkout-close"
          aria-label="Cerrar"
          onClick={onClose}
        >
          ×
        </button>

        <header className="checkout-head">
          <span className="checkout-eyebrow">Pago seguro</span>
          <h2 id="checkout-title" className="display checkout-title">
            {item.title}
          </h2>
          <div className="checkout-amount">
            <span className="amount">{formatMoney(item.amount)}</span>
            <span className="ref">Ref: {reference}</span>
          </div>
        </header>

        <StripeCheckout item={item} reference={reference} onClose={onClose} />
        {/* item se propaga a StripeForm para el evento de conversión purchase */}

        <footer className="checkout-foot">
          <span>Pago protegido · transmisión cifrada</span>
        </footer>
      </div>
    </div>
  );
}

// ----------- Stripe wrapper -----------

function StripeCheckout({
  item,
  reference,
  onClose,
}: {
  item: CheckoutItem;
  reference: string;
  onClose: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { code: currency } = useCurrency();

  useEffect(() => {
    let aborted = false;
    setError(null);
    setClientSecret(null);

    if (!STRIPE_PUBLISHABLE_KEY) {
      setError(
        "Configuración de pagos incompleta. Contáctanos por WhatsApp."
      );
      return;
    }

    (async () => {
      try {
        // Llamar a Supabase Edge Function (reemplaza a /api/stripe/create-payment-intent)
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/create-payment-intent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseAnon}`,
              apikey: supabaseAnon,
            },
            body: JSON.stringify({
              productId: item.productId,
              currency,
              reference,
            }),
          }
        );
        const data = await res.json();
        if (aborted) return;
        if (!res.ok || !data.clientSecret) {
          throw new Error(data?.error || "No se pudo crear el pago.");
        }
        setClientSecret(data.clientSecret);
      } catch (err) {
        if (aborted) return;
        setError(err instanceof Error ? err.message : "Error inesperado.");
      }
    })();

    return () => {
      aborted = true;
    };
  }, [item.productId, currency, reference]);

  if (error) {
    return (
      <div className="checkout-body">
        <p className="checkout-status checkout-status-error">{error}</p>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="checkout-body">
        <p className="checkout-status checkout-status-loading">
          Cargando opciones de pago…
        </p>
      </div>
    );
  }

  return (
    <Elements
      stripe={getStripePromise()}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#F0B800",
            colorBackground: "#0E141C",
            colorText: "#FFFFFF",
            colorDanger: "#FF7A7A",
            fontFamily: "system-ui, sans-serif",
            spacingUnit: "4px",
            borderRadius: "8px",
          },
          rules: {
            ".Input": {
              backgroundColor: "#131B25",
              border: "1px solid #2A323C",
            },
            ".Input:focus": {
              borderColor: "#F0B800",
              boxShadow: "0 0 0 1px #F0B800",
            },
            ".Label": {
              color: "#B8BEC7",
            },
            ".Tab": {
              backgroundColor: "#131B25",
              border: "1px solid #2A323C",
            },
            ".Tab--selected": {
              backgroundColor: "#F0B800",
              color: "#0B1016",
            },
          },
        },
      }}
    >
      <StripeForm item={item} reference={reference} onClose={onClose} />
    </Elements>
  );
}

// ----------- Formulario que renderiza el PaymentElement -----------

function StripeForm({
  item,
  reference,
  onClose,
}: {
  item: CheckoutItem;
  reference: string;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const { code, convert } = useCurrency();

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stripe || !elements) return;
      setStatus({ kind: "loading", msg: "Procesando pago…" });

      // return_url limpio (sin query string del navegador actual) para
      // evitar que datos sensibles del querystring viajen via Stripe.
      const cleanReturn = `${window.location.origin}${window.location.pathname}`;
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: cleanReturn,
        },
      });

      if (error) {
        setStatus({
          kind: "error",
          msg: error.message || "Error procesando el pago.",
        });
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        trackEvent("purchase", {
          transaction_id: reference,
          value: convert(item.amount),
          currency: code,
          item_id: item.productId,
          item_name: item.title,
        });
        setStatus({
          kind: "success",
          msg: "¡Pago confirmado! Te contactaremos en breve.",
          reference,
        });
      } else if (paymentIntent?.status === "processing") {
        setStatus({
          kind: "success",
          msg: "Tu pago está procesándose. Te confirmaremos por email.",
          reference,
        });
      } else {
        setStatus({
          kind: "error",
          msg: "El pago no se completó. Inténtalo de nuevo.",
        });
      }
    },
    [stripe, elements, reference, item, code, convert]
  );

  if (status.kind === "success") {
    return (
      <div className="checkout-body">
        <div className="checkout-success">
          <div className="checkout-success-icon" aria-hidden="true">
            ✓
          </div>
          <h3 className="display">{status.msg}</h3>
          {status.reference && (
            <p className="checkout-success-ref">
              Referencia: <strong>{status.reference}</strong>
            </p>
          )}
          <button type="button" className="checkout-cta" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-body">
      <form onSubmit={submit} className="checkout-pane">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
        <button
          type="submit"
          className="checkout-cta checkout-pay-btn"
          disabled={!stripe || !elements || status.kind === "loading"}
        >
          {status.kind === "loading" ? "Procesando…" : "Pagar ahora"}
        </button>
        {status.kind === "error" && (
          <p className="checkout-status checkout-status-error">{status.msg}</p>
        )}
      </form>
    </div>
  );
}
