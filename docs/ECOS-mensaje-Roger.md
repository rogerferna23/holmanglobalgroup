Roger, resumen de dónde va ECOS y qué falta.

**Lo que ya está:** el SQL que corriste quedó bien — las 14 tablas, los permisos
y el contador de cupos responden. Stripe también quedó configurado completo
(webhook, portal del cliente, reintentos y correos).

**Lo único que falta son las tres Edge Functions.** Hoy las tres dan 404:

- `ecos-checkout` — crea la sesión de pago
- `ecos-portal` — abre el portal de Stripe (cambiar tarjeta / cancelar)
- `ecos-webhook` — recibe los avisos de Stripe y es lo único que escribe el
  estado de un miembro y registra los pagos

Sin ellas el botón de pago no hace nada.

---

## 1. Desplegar

Ya está todo en `main`. Desde la raíz del repo:

```bash
git pull
supabase link --project-ref ugaqokaqxyvuecyfcgso
supabase functions deploy ecos-checkout
supabase functions deploy ecos-portal
supabase functions deploy ecos-webhook --no-verify-jwt
```

⚠️ **El `--no-verify-jwt` de la última no es opcional.** Stripe no manda JWT de
Supabase, manda su propia firma. Si queda con verificación de JWT, Stripe recibe
401 en cada aviso y no se registra ni un pago.

Si prefieres hacerlo desde el dashboard, en `docs/funciones-para-pegar/` dejé
cada función en **un solo archivo**, con las utilidades compartidas ya adentro,
para pegarla directo en el editor (Edge Functions → Deploy a new function → Via
Editor). Ahí el equivalente del `--no-verify-jwt` es **desactivar el switch
«Verify JWT»** en `ecos-webhook`, y solo en esa.

Los nombres tienen que ser exactos: el nombre es la URL.

## 2. Los secrets

Supabase → Project Settings → Edge Functions → Secrets. Son ocho. Los valores
que te mandé por aparte van así:

| Variable | Qué va |
|---|---|
| `STRIPE_SECRET_KEY` | la `sk_live_…` |
| `ECOS_STRIPE_PRICE_ID` | el price del plan **mensual** ($47) |
| `ECOS_STRIPE_PRICE_ID_ANUAL` | el price del plan **anual** ($470) |
| `ECOS_STRIPE_WEBHOOK_SECRET` | el `whsec_…` — **usa el último que te mandé**, el anterior lo rotamos |
| `ECOS_TRIAL_END` | `2026-10-31T23:59:59-05:00` |
| `ECOS_FOUNDER_CAP` | `50` |
| `SITE_URL` | `https://holmanglobalgroup.com` |
| `ALLOWED_ORIGINS` | `https://holmanglobalgroup.com,https://www.holmanglobalgroup.com` |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` las pone
Supabase solo, no hay que tocarlas.

Las dos últimas (`ECOS_TRIAL_END` y `ECOS_FOUNDER_CAP`) son solo de respaldo:
manda lo que esté en `ecos_settings`, que Holman edita desde el panel sin tocar
nada de esto. Van igual por si la tabla queda vacía.

## 3. Comprobar

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://ugaqokaqxyvuecyfcgso.supabase.co/functions/v1/ecos-checkout
```

- `404` → no quedó desplegada
- `401` → **quedó bien** (contesta que falta sesión, que es lo correcto)

Y para el webhook:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://ugaqokaqxyvuecyfcgso.supabase.co/functions/v1/ecos-webhook
```

- `400` → **quedó bien** (falta la firma de Stripe)
- `401` → quedó con verify-jwt activado, hay que volver a desplegarla con
  `--no-verify-jwt`

Cuando el webhook conteste 400, en Stripe → Webhooks → «Enviar evento de prueba»
debería aparecer una entrega exitosa.

---

Si algo no cuadra, avísame y lo miramos. El detalle completo está en
`docs/ECOS-desplegar-funciones.md`.
