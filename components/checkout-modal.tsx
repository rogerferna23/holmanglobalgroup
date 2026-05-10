"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PAYMENT_CURRENCY,
  PAYPAL_CLIENT_ID,
  WISE,
  buildOrderReference,
  formatAmount,
  type CheckoutItem,
} from "@/lib/payments";

type Method = "paypal" | "card" | "wise";

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
  // Si cambia la moneda, eliminamos el script anterior y recargamos.
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
      "enable-funding": "card,venmo",
      "disable-funding": "paylater",
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
  const [copied, setCopied] = useState<string | null>(null);
  const paypalRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
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
          msg: "Falta NEXT_PUBLIC_PAYPAL_CLIENT_ID en el servidor.",
        });
        return;
      }
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
        setStatus({ kind: "idle" });
      } catch (err) {
        setStatus({
          kind: "error",
          msg: err instanceof Error ? err.message : "Error cargando PayPal.",
        });
      }
    },
    [item, reference, currency]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (method === "paypal") void renderButtons("paypal");
    if (method === "card") void renderButtons("card");
  }, [isOpen, method, renderButtons]);

  const copy = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
    } catch {
      // ignore
    }
  }, []);

  if (!isOpen || !item) return null;

  const showWiseLink = !!WISE.paymentLink;
  const showWiseBank = !!WISE.bank;
  const wiseHasAny = showWiseLink || showWiseBank;

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
            Tarjeta
          </button>
          <button
            role="tab"
            aria-selected={method === "wise"}
            className={`checkout-tab${method === "wise" ? " active" : ""}`}
            onClick={() => setMethod("wise")}
          >
            Wise
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
                    Pago con tarjeta de crédito o débito procesado por PayPal —
                    no se necesita cuenta.
                  </p>
                  <div ref={cardRef} className="paypal-buttons" />
                </div>
              )}

              {method === "wise" && (
                <div className="checkout-pane">
                  {!wiseHasAny ? (
                    <p className="checkout-help">
                      Wise aún no está configurado. Por ahora puedes pagar con
                      PayPal o tarjeta.
                    </p>
                  ) : (
                    <>
                      <p className="checkout-help">
                        Elige cómo prefieres pagar con Wise. Te confirmaremos al
                        recibir la transferencia.
                      </p>

                      {showWiseLink && (
                        <a
                          href={WISE.paymentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="wise-card wise-card-link"
                          onClick={() =>
                            setStatus({
                              kind: "success",
                              msg: "Abrimos Wise. Cuando completes el pago, te confirmamos.",
                              reference,
                            })
                          }
                        >
                          <div>
                            <div className="wise-card-title">
                              Pagar con link de Wise
                            </div>
                            <div className="wise-card-sub">
                              Se abre Wise.com para completar el pago →
                            </div>
                          </div>
                        </a>
                      )}

                      {showWiseBank && WISE.bank && (
                        <div className="wise-card">
                          <div className="wise-card-title">
                            Transferencia bancaria
                          </div>
                          <ul className="wise-bank">
                            <WiseRow
                              label="Titular"
                              value={WISE.bank.holder}
                              copyKey="holder"
                              copied={copied}
                              onCopy={copy}
                            />
                            <WiseRow
                              label="IBAN"
                              value={WISE.bank.iban}
                              copyKey="iban"
                              copied={copied}
                              onCopy={copy}
                              mono
                            />
                            {WISE.bank.swift && (
                              <WiseRow
                                label="SWIFT/BIC"
                                value={WISE.bank.swift}
                                copyKey="swift"
                                copied={copied}
                                onCopy={copy}
                                mono
                              />
                            )}
                            {WISE.bank.bank && (
                              <WiseRow
                                label="Banco"
                                value={WISE.bank.bank}
                                copyKey="bank"
                                copied={copied}
                                onCopy={copy}
                              />
                            )}
                            <WiseRow
                              label="Importe"
                              value={formatAmount(item.amount, currency)}
                              copyKey="amount"
                              copied={copied}
                              onCopy={copy}
                            />
                            <WiseRow
                              label="Concepto / Referencia"
                              value={reference}
                              copyKey="ref"
                              copied={copied}
                              onCopy={copy}
                              mono
                            />
                          </ul>
                          <p className="wise-note">
                            Importante: incluye la referencia en el concepto de
                            la transferencia para identificar tu pago.
                          </p>
                        </div>
                      )}
                    </>
                  )}
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

type RowProps = {
  label: string;
  value: string;
  copyKey: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
  mono?: boolean;
};

function WiseRow({ label, value, copyKey, copied, onCopy, mono }: RowProps) {
  return (
    <li className="wise-bank-row">
      <div>
        <div className="wise-bank-label">{label}</div>
        <div className={`wise-bank-value${mono ? " mono" : ""}`}>{value}</div>
      </div>
      <button
        type="button"
        className="wise-copy"
        onClick={() => onCopy(value, copyKey)}
        aria-label={`Copiar ${label}`}
      >
        {copied === copyKey ? "Copiado" : "Copiar"}
      </button>
    </li>
  );
}
