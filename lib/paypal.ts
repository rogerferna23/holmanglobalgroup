// Este módulo solo debe importarse desde código server-side (API routes / RSC).
// Usa NEXT_PUBLIC_PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET (este último nunca se expone al navegador).

const isLive = (process.env.PAYPAL_ENV || "sandbox").toLowerCase() === "live";

export const PAYPAL_API_BASE = isLive
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

export class PayPalError extends Error {
  status: number;
  details: unknown;
  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function requireCredentials() {
  const id = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) {
    throw new PayPalError(
      "Faltan credenciales de PayPal (NEXT_PUBLIC_PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET).",
      500,
      null
    );
  }
  return { id, secret };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getPayPalAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }
  const { id, secret } = requireCredentials();
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new PayPalError(
      data.error_description || "No se pudo obtener el access token de PayPal.",
      res.status,
      data
    );
  }
  // Validar expires_in numerico positivo; fallback corto (60s) si viene mal,
  // para forzar refresh en lugar de cachear un token con TTL inflado.
  const expiresIn =
    typeof data.expires_in === "number" && data.expires_in > 0
      ? data.expires_in
      : 60;
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  return data.access_token;
}

type CreateOrderInput = {
  amount: number;
  currency: string;
  productId: string;
  productTitle: string;
  reference: string;
};

export async function createPayPalOrder(input: CreateOrderInput) {
  const token = await getPayPalAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.reference,
          description: input.productTitle.slice(0, 127),
          custom_id: input.productId,
          amount: {
            currency_code: input.currency,
            value: input.amount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: input.currency,
                value: input.amount.toFixed(2),
              },
            },
          },
          items: [
            {
              name: input.productTitle.slice(0, 127),
              quantity: "1",
              category: "DIGITAL_GOODS",
              unit_amount: {
                currency_code: input.currency,
                value: input.amount.toFixed(2),
              },
            },
          ],
        },
      ],
      application_context: {
        brand_name: "Holman Global Group",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
      },
    }),
  });
  const data = (await res.json()) as {
    id?: string;
    status?: string;
    name?: string;
    message?: string;
  };
  if (!res.ok || !data.id) {
    throw new PayPalError(
      data.message || "No se pudo crear la orden de PayPal.",
      res.status,
      data
    );
  }
  return { id: data.id, status: data.status };
}

export async function capturePayPalOrder(orderId: string) {
  const token = await getPayPalAccessToken();
  const res = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new PayPalError(
      data?.message || "No se pudo capturar el pago en PayPal.",
      res.status,
      data
    );
  }
  return data;
}
