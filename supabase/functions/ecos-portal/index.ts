// ecos-portal — abre el portal de facturacion de Stripe para que el miembro
// cambie su tarjeta, vea sus recibos o cancele. Nadie lo hace a mano.
//
// Variables: STRIPE_SECRET_KEY, SITE_URL, ALLOWED_ORIGINS (+ las de Supabase)

import { adminClient, callerFrom, env, json, preflight, stripeClient } from "../_shared/ecos.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { error: "Método no permitido" }, 405);

  const user = await callerFrom(req);
  if (!user) return json(req, { error: "Inicia sesión para continuar." }, 401);

  const db = adminClient();
  const { data: member } = await db
    .from("ecos_members")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!member?.stripe_customer_id) {
    return json(req, { error: "Todavía no tienes una suscripción." }, 404);
  }

  const stripe = stripeClient();
  const portal = await stripe.billingPortal.sessions.create({
    customer: member.stripe_customer_id,
    return_url: `${env("SITE_URL", "https://holmanglobalgroup.com")}/ecos/panel/cuenta`,
    locale: "es",
  });

  return json(req, { url: portal.url });
});
