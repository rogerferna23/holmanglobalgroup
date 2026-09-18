# Poner a funcionar el cobro de ECOS

Estado verificado el 17 de septiembre de 2026.

| Parte | Cómo está |
|---|---|
| Base de datos (las 14 tablas, el contador de cupos, los permisos) | **Lista.** Roger ya corrió el SQL. No hay que volver a tocarlo. |
| Las tres Edge Functions (`ecos-checkout`, `ecos-portal`, `ecos-webhook`) | **No están.** Las tres responden 404. |
| Stripe: producto, precios, webhook, portal, reintentos y correos | **Listo.** Configurado y revisado el 17 de septiembre. |

Subir las tres funciones es **lo único** que queda. Mientras no estén, el botón
de pago no hace nada y Stripe no tiene a dónde avisar de los cobros.

Proyecto de Supabase: `ugaqokaqxyvuecyfcgso`

---

## 1. Subir las tres funciones

Se puede **desde el navegador**, sin terminal. En `docs/funciones-para-pegar/`
hay una versión de cada función en **un solo archivo**, con las utilidades ya
metidas dentro, justo para poder pegarla en el editor de Supabase.

Para cada una de las tres:

1. Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nombre exacto: `ecos-checkout`, `ecos-portal`, `ecos-webhook`.
   El nombre es la URL; si cambia, nada encuentra la función.
3. Borrar el ejemplo que trae y pegar el archivo correspondiente.
4. **`ecos-webhook`: desactivar «Verify JWT».** Las otras dos se quedan con él
   activado. Stripe no manda el token de Supabase, manda su propia firma: si
   este queda activado, Stripe recibe 401 en cada aviso y ningún pago se
   registra. Es el error más común de todos.
5. Deploy.

Quien lo haga necesita entrar al proyecto de Supabase. Si el proyecto está a
nombre de Roger, o lo hace él, o te agrega como miembro en
**Project Settings → Team**.

## 2. Cargar los secrets

Supabase → **Project Settings → Edge Functions → Secrets**. Ocho valores:

| Nombre | Qué va |
|---|---|
| `STRIPE_SECRET_KEY` | La clave secreta de Stripe (`sk_live_…`) |
| `ECOS_STRIPE_PRICE_ID` | `price_1UGlUmIy1wa6zG1wUHVzEo3C` (mensual, $47) |
| `ECOS_STRIPE_PRICE_ID_ANUAL` | `price_1UGlVRIy1wa6zG1w1ExCYrTW` (anual, $470) |
| `ECOS_STRIPE_WEBHOOK_SECRET` | El `whsec_…` del endpoint `ecos-webhook` |
| `ECOS_TRIAL_END` | `2026-10-31T23:59:59-05:00` |
| `ECOS_FOUNDER_CAP` | `50` |
| `SITE_URL` | `https://holmanglobalgroup.com` |
| `ALLOWED_ORIGINS` | `https://holmanglobalgroup.com,https://www.holmanglobalgroup.com` |

Las dos claves secretas las escribe Holman o Roger directamente en Supabase.
No pasan por el chat ni quedan en el repositorio.

`ECOS_TRIAL_END` y `ECOS_FOUNDER_CAP` son solo de respaldo: mandan los valores
de **Admin → ECOS → Ajustes**, que se pueden cambiar sin tocar nada de esto.

## 3. Comprobar que quedaron

En una terminal, o pidiéndoselo a Claude:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://ugaqokaqxyvuecyfcgso.supabase.co/functions/v1/ecos-checkout
```

- `404` → la función no está.
- `401` → **está.** Contesta que falta la sesión, que es lo correcto sin login.

Para `ecos-webhook` lo correcto es `400` (falta la firma de Stripe), no `401`.
Si da `401`, quedó con «Verify JWT» activado: hay que desactivarlo y redeployar.

---

## Stripe: cómo quedó

Todo revisado el 17 de septiembre de 2026. No hay nada pendiente aquí.

- **Webhook** → `…/functions/v1/ecos-webhook`, activo, versión de API
  `2026-04-22.dahlia` (la misma que pide el código), con los cinco eventos:
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
  El secreto de firma se rotó ese día.
- **Portal del cliente** → cambiar tarjeta, ver facturas y cancelar, sí.
  Cambiar de plan por su cuenta, **no**: un fundador podría saltar a anual y
  cambiar de precio sin querer. Esos cambios pasan por Holman.
- **Reintentos** → Smart Retries, hasta 8 intentos en 2 semanas y luego
  **cancelar la suscripción**. Coincide con los 14 días de gracia del panel:
  cuando Stripe se rinde, el avance del miembro también está por expirar.
- **Correos al cliente** → aviso 7 días antes de que acabe la prueba (lo exigen
  las redes de tarjetas y evita el cobro sorpresa del 1 de noviembre), aviso de
  pago fallido, aviso de tarjeta por vencer y enlace para confirmar pagos que
  pidan autorización del banco. Los avisos de renovación mensual quedan
  apagados a propósito: recordarle a alguien cada mes que le van a cobrar es
  invitarlo a cancelar.
- Los enlaces de esos correos van a la página de Stripe, no a la portada del
  sitio, para que quien tenga un problema de tarjeta llegue a donde se arregla.

## Lo que sigue siendo a mano

El panel calcula, no transfiere. A cada profesor le pagas tú por fuera, con la
cifra de **Reportes → Lo que hay que pagar**. También son a mano los cupones
(se crean en Stripe) y el acceso a los cursos.
