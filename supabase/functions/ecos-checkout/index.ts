// ecos-checkout — crea la sesion de Stripe Checkout (suscripcion) para un
// usuario autenticado y deja su ficha en ecos_members como 'pendiente'.
//
// Variables (Supabase -> Edge Functions -> Secrets):
//   STRIPE_SECRET_KEY, ECOS_STRIPE_PRICE_ID, SITE_URL, ALLOWED_ORIGINS
//   ECOS_TRIAL_END   (ISO, ej. 2026-10-31T23:59:59-05:00) — misma para todos
//   ECOS_FOUNDER_CAP (ej. 50)
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (las pone Supabase)
//
// Body: { ref?: string, plan?: 'mensual' | 'anual' }
// Respuesta: { url }      -> a donde mandar al navegador
//
// Secrets extra: ECOS_STRIPE_PRICE_ID_ANUAL (price_… de $470/año)

import {
  adminClient,
  callerFrom,
  env,
  json,
  preflight,
  stripeClient,
} from "../_shared/ecos.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { error: "Método no permitido" }, 405);

  const user = await callerFrom(req);
  if (!user?.email) return json(req, { error: "Inicia sesión para continuar." }, 401);

  const body = (await req.json().catch(() => ({}))) as { ref?: string; plan?: string };
  const plan = body.plan === "anual" ? "anual" : "mensual";
  const stripe = stripeClient();
  const db = adminClient();
  const siteUrl = env("SITE_URL", "https://holmanglobalgroup.com");

  // Ficha existente (si la hay) — no se crea una suscripcion encima de otra.
  const { data: existing } = await db
    .from("ecos_members")
    .select("id, status, stripe_customer_id, stripe_subscription_id, referred_by")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.status === "activo" && existing.stripe_subscription_id) {
    return json(req, { error: "Ya tienes una membresía activa." }, 409);
  }

  // Cliente de Stripe: se reutiliza si ya existe.
  let customerId = existing?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: (user.user_metadata?.name as string | undefined) ?? undefined,
      metadata: { user_id: user.id, empresa: "HGG", producto: "ECOS" },
    });
    customerId = customer.id;
  }

  // Referido: se resuelve el codigo a un miembro activo. Un solo nivel.
  let referredBy: string | null = existing?.referred_by ?? null;
  if (!referredBy && body.ref) {
    const { data: refId } = await db.rpc("ecos_resolve_referral", { code: body.ref });
    if (refId && refId !== user.id) referredBy = refId as string;
  }

  // Cohorte fundadora: mientras haya cupo y no haya pasado la fecha, la prueba
  // termina el mismo dia para todos.
  const trialEnd = new Date(env("ECOS_TRIAL_END", "2026-10-31T23:59:59-05:00"));
  const founderCap = Number(env("ECOS_FOUNDER_CAP", "50"));
  const { count: founders } = await db
    .from("ecos_members")
    .select("id", { count: "exact", head: true })
    .eq("founder", true)
    .in("status", ["activo", "pendiente"]);
  const founderWindow = Date.now() < trialEnd.getTime() && (founders ?? 0) < founderCap;

  // El perfil viene del metadata que se guardo al crear la cuenta.
  const md = (user.user_metadata ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof md[k] === "string" && (md[k] as string).trim() ? (md[k] as string).trim() : null);
  await db.from("ecos_members").upsert(
    {
      id: user.id,
      email: user.email,
      name: str("name"),
      whatsapp: str("whatsapp"),
      city: str("city"),
      country: str("country"),
      business: str("business"),
      goal: str("goal"),
      show_in_directory: md.show_in_directory !== false,
      status: "pendiente",
      plan,
      stripe_customer_id: customerId,
      referred_by: referredBy,
      founder: founderWindow,
    },
    { onConflict: "id" }
  );

  // Anual: sin prueba, cobra hoy y cubre doce meses. Mensual fundador: prueba
  // hasta el 31 de octubre; el precio queda en su Price para siempre.
  const priceId = plan === "anual" ? env("ECOS_STRIPE_PRICE_ID_ANUAL") : env("ECOS_STRIPE_PRICE_ID");
  const withTrial = plan === "mensual" && founderWindow;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    // Siempre se pide la tarjeta, aunque el primer mes sea gratis: el 1 de
    // noviembre se cobra solo y se queda quien no cancela.
    payment_method_collection: "always",
    subscription_data: {
      metadata: { user_id: user.id, empresa: "HGG", producto: "ECOS", founder: String(founderWindow), plan },
      ...(withTrial ? { trial_end: Math.floor(trialEnd.getTime() / 1000) } : {}),
    },
    allow_promotion_codes: true,
    locale: "es",
    success_url: `${siteUrl}/ecos/panel?bienvenida=1`,
    cancel_url: `${siteUrl}/ecos/entrar?cancelado=1`,
    metadata: { user_id: user.id, ref: body.ref ?? "", plan },
  });

  return json(req, { url: session.url });
});
