"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PAYMENT_CURRENCY,
  PAYPAL_CLIENT_ID,
  buildOrderReference,
  formatAmount,
  type CheckoutItem,
} from "@/lib/payments";

type Method = "paypal" | "card";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; msg?: string }
  | { kind: "error"; msg: string }
  | { kind: "success"; msg: string; reference?: string };

type Props = {
  item: CheckoutItem | null;
  onClose: () => void;
};

let sdkCache: { currency: string; promise: Promise<unknown> } | null = null;

function loadPayPalSdk(clientId: string, currency: string) {
  if (typeof window === "undefined") return Promise.reject(new Error("no-window"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (sdkCache && sdkCache.currency === currency) return sdkCache.promise;
  if (sdkCache) {
    document
      .querySelectorAll('script[data-hgg-paypal-sdk="1"]')
      .forEach((s) => s.remove());
    delete w.paypal;
  }
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.dataset.hggPaypalSdk = "1";
    const params = new URLSearchParams({
      "client-id": clientId,
      currency,
      intent: "capture",
      components: "buttons",
      "enable-funding": "card",
      "disable-funding": "paylater,venmo",
    });
    script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
    script.async = true;
    script.onload = () => resolve(w.paypal);
    script.onerror = () => {
      sdkCache = null;
      reject(new Error("No se pudo cargar el SDK de PayPal."));
    };
    document.head.appendChild(script);
  });
  sdkCache = { currency, promise };
  return promise;
}

export function CheckoutModal({ item, onClose }: Props) {
  const [method, setMethod] = useState<Method>("paypal");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const paypalRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const lastRenderedRef = useRef<string | null>(null);
  const renderTokenRef = useRef(0);

  const reference = useMemo(
    () => (item ? buildOrderReference(item.productId) : ""),
    [item]
  );
  const currency = (item?.currency || PAYMENT_CURRENCY).toUpperCase();

  const isOpen = !!item;

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

  const renderButtons = useCallback(
    async (target: "paypal" | "card") => {
      if (!item) return;
      const container = target === "paypal" ? paypalRef.current : cardRef.current;
      if (!container) return;
      if (!PAYPAL_CLIENT_ID) {
        setStatus({
          kind: "error",
          msg: "Configuración de PayPal incompleta. Contáctanos por WhatsApp.",
        });
        return;
      }
      const renderKey = `${target}|${currency}|${item.productId}|${reference}`;
      if (lastRenderedRef.current === renderKey && container.childElementCount > 0) {
        return;
      }
      const myToken = ++renderTokenRef.current;
      container.innerHTML = "";
      setStatus({ kind: "loading", msg: "Cargando PayPal…" });
      try {
        const paypal = (await loadPayPalSdk(
          PAYPAL_CLIENT_ID,
          currency
        )) as {
          Buttons: (config: unknown) => {
            isEligible: () => boolean;
            render: (selector: HTMLElement) => Promise<void>;
          };
          FUNDING: { PAYPAL: string; CARD: string };
        };

        if (myToken !== renderTokenRef.current) return;

        const buttons = paypal.Buttons({
          style: {
            layout: "vertical",
            color: target === "card" ? "black" : "gold",
            shape: "rect",
            label: target === "card" ? "pay" : "paypal",
            height: 48,
          },
          fundingSource:
            target === "card" ? paypal.FUNDING.CARD : paypal.FUNDING.PAYPAL,
          createOrder: async () => {
            const res = await fetch("/api/paypal/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: item.productId,
                productTitle: item.title,
                amount: item.amount,
                currency,
                reference,
              }),
            });
            const data = await res.json();
            if (!res.ok || !data.id) {
              throw new Error(data?.error || "No se pudo crear la orden.");
            }
            return data.id as string;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onApprove: async (data: any) => {
            setStatus({ kind: "loading", msg: "Confirmando pago…" });
            const res = await fetch("/api/paypal/capture-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderID }),
            });
            const result = await res.json();
            if (!res.ok) {
              throw new Error(result?.error || "No se pudo capturar el pago.");
            }
            setStatus({
              kind: "success",
              msg: `¡Pago confirmado! Te contactaremos en breve.`,
              reference: result.reference || reference,
            });
          },
          onCancel: () => setStatus({ kind: "idle" }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onError: (err: any) => {
            setStatus({
              kind: "error",
              msg: err?.message || "Error procesando el pago con PayPal.",
            });
          },
        });

        if (!buttons.isEligible()) {
          setStatus({
            kind: "error",
            msg:
              target === "card"
                ? "El pago con tarjeta no está disponible para tu región/cuenta."
                : "PayPal no está disponible en este momento.",
          });
          return;
        }
        await buttons.render(container);
        if (myToken === renderTokenRef.current) {
          lastRenderedRef.current = renderKey;
          setStatus({ kind: "idle" });
        }
      } catch (err) {
        if (myToken !== renderTokenRef.current) return;
        setStatus({
          kind: "error",
          msg: err instanceof Error ? err.message : "Error cargando PayPal.",
        });
      }
    },
    [item, reference, currency]
  );

  // Resetear el render-cache cuando cambia el item o moneda (permite re-render limpio).
  useEffect(() => {
    lastRenderedRef.current = null;
  }, [item, currency]);

  useEffect(() => {
    if (!isOpen) return;
    if (method === "paypal") void renderButtons("paypal");
    if (method === "card") void renderButtons("card");
  }, [isOpen, method, renderButtons]);

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
            <span className="amount">{formatAmount(item.amount, currency)}</span>
            <span className="ref">Ref: {reference}</span>
          </div>
        </header>

        <div className="checkout-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={method === "paypal"}
            className={`checkout-tab${method === "paypal" ? " active" : ""}`}
            onClick={() => setMethod("paypal")}
          >
            PayPal
          </button>
          <button
            role="tab"
            aria-selected={method === "card"}
            className={`checkout-tab${method === "card" ? " active" : ""}`}
            onClick={() => setMethod("card")}
          >
            Tarjeta crédito/débito
          </button>
        </div>

        <div className="checkout-body">
          {status.kind === "success" ? (
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
          ) : (
            <>
              {method === "paypal" && (
                <div className="checkout-pane">
                  <p className="checkout-help">
                    Inicia sesión en PayPal o paga como invitado. Se abrirá una
                    ventana segura.
                  </p>
                  <div ref={paypalRef} className="paypal-buttons" />
                </div>
              )}

              {method === "card" && (
                <div className="checkout-pane">
                  <p className="checkout-help">
                    Pago con tarjeta de crédito o débito procesado de forma segura.
                    No necesitas cuenta PayPal.
                  </p>
                  <div ref={cardRef} className="paypal-buttons" />
                </div>
              )}

              {status.kind === "loading" && (
                <p className="checkout-status checkout-status-loading">
                  {status.msg || "Cargando…"}
                </p>
              )}
              {status.kind === "error" && (
                <p className="checkout-status checkout-status-error">
                  {status.msg}
                </p>
              )}
            </>
          )}
        </div>

        <footer className="checkout-foot">
          <span>Pago protegido · transmisión cifrada</span>
        </footer>
      </div>
    </div>
  );
}
