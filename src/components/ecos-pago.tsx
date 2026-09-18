import { useEffect, useRef, useState } from "react";
import { loadStripe, type Stripe, type StripeEmbeddedCheckout } from "@stripe/stripe-js";
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/payments";

let stripePromise: Promise<Stripe | null> | null = null;
function stripeJs() {
  if (!STRIPE_PUBLISHABLE_KEY) return Promise.resolve(null);
  if (!stripePromise) stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  return stripePromise;
}

/**
 * El pago, dentro del sitio. Es el Checkout de Stripe montado aquí en vez de
 * mandar a la gente a otra página: los datos de la tarjeta nunca pasan por
 * nuestro servidor, pero nadie sale de holmanglobalgroup.com.
 *
 * Al terminar, Stripe lleva solo al panel (return_url de la sesión).
 */
export function EcosPago({ clientSecret, onCerrar, aviso }: { clientSecret: string; onCerrar?: () => void; aviso?: string }) {
  const caja = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    let checkout: StripeEmbeddedCheckout | null = null;

    (async () => {
      const stripe = await stripeJs();
      if (!vivo) return;
      if (!stripe) {
        setError("Falta la clave publicable de Stripe en el sitio.");
        return;
      }
      try {
        const montado = await stripe.createEmbeddedCheckoutPage({ clientSecret });
        checkout = montado;
        if (!vivo || !caja.current) { montado.destroy(); return; }
        montado.mount(caja.current);
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : "No se pudo abrir el pago.");
      }
    })();

    return () => { vivo = false; checkout?.destroy(); };
  }, [clientSecret]);

  return (
    <div className="ecos-pago">
      <div className="ecos-pago-head">
        <h2 className="ecos-pago-title">Tu pago</h2>
        {onCerrar && (
          <button type="button" className="ecos-pago-volver" onClick={onCerrar}>
            Volver
          </button>
        )}
      </div>
      {error ? (
        <p className="ecos-pago-error">{error}</p>
      ) : (
        <>
          {aviso && <p className="ecos-pago-aviso">{aviso}</p>}
          <p className="ecos-pago-sub">
            Pago seguro con Stripe, sin salir de aquí. Tu tarjeta no pasa por nuestros servidores.
          </p>
        </>
      )}
      <div ref={caja} className="ecos-pago-caja" />
    </div>
  );
}
