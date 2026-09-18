# Edge Functions de ECOS

Tres funciones, versionadas aquí y desplegadas en Supabase.

| Función | Qué hace | JWT |
|---|---|---|
| `ecos-checkout` | Crea la sesión de pago (suscripción) para un usuario logueado | sí |
| `ecos-portal` | Abre el portal de Stripe para cambiar tarjeta o cancelar | sí |
| `ecos-webhook` | Recibe los avisos de Stripe y actualiza `ecos_members` | **no** (firma de Stripe) |

## Secrets (Supabase → Edge Functions → Secrets)

```
STRIPE_SECRET_KEY            sk_test_… / sk_live_…
ECOS_STRIPE_PRICE_ID         price_…   (producto "ECOS Business Club", $47/mes recurrente)
ECOS_STRIPE_PRICE_ID_ANUAL   price_…   (mismo producto, $470/año recurrente)
ECOS_STRIPE_WEBHOOK_SECRET   whsec_…   (del endpoint ecos-webhook — distinto al de la tienda)
ECOS_TRIAL_END               2026-10-31T23:59:59-05:00
ECOS_FOUNDER_CAP             50
SITE_URL                     https://holmanglobalgroup.com
ALLOWED_ORIGINS              https://holmanglobalgroup.com,https://www.holmanglobalgroup.com
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` las inyecta Supabase.

## Desplegar

```bash
supabase functions deploy ecos-checkout
supabase functions deploy ecos-portal
supabase functions deploy ecos-webhook --no-verify-jwt
```

## Stripe

1. Producto **ECOS Business Club** → dos precios recurrentes: **USD 47 / mes** → `ECOS_STRIPE_PRICE_ID`, y **USD 470 / año** → `ECOS_STRIPE_PRICE_ID_ANUAL`.
   Cuando el precio de lista suba, se crea un Price nuevo y se cambia el secret. Quien ya está suscrito sigue en su Price anterior mientras no se le migre a mano: es una decisión abierta, no una promesa hecha a nadie.
2. Developers → Webhooks → Add endpoint: `https://<proyecto>.supabase.co/functions/v1/ecos-webhook`
   Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
   Copiar el signing secret a `ECOS_STRIPE_WEBHOOK_SECRET`.
3. Settings → Billing → Customer portal: activar cambio de método de pago y cancelación.
4. Settings → Billing → Subscriptions and emails → **"Cancel the subscription"** cuando fallen todos los reintentos (dentro de 2 semanas). Así nunca se acumulan dos cobros y la gracia de 14 días del avance coincide con los reintentos.

## Probar sin cobrar

- Tarjeta `4242 4242 4242 4242` (éxito) · `4000 0000 0000 0341` (falla al cobrar) · `4000 0025 0000 3155` (pide confirmación del banco).
- **Test clocks** (Developers → Test clocks): crear un reloj, un cliente dentro del reloj, suscribirlo con `trial_end` y adelantar al 1 de noviembre para ver el primer cobro y el webhook.
- `stripe listen --forward-to https://<proyecto>.supabase.co/functions/v1/ecos-webhook` en local para ver los eventos llegar.
