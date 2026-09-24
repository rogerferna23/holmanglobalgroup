// ecos-checkout — crea la sesion de Stripe Checkout (suscripcion) para un
// usuario autenticado. NO crea la ficha de miembro: eso lo hace el webhook
// cuando el cobro se confirma.
//
// Variables (Supabase -> Edge Functions -> Secrets):
//   STRIPE_SECRET_KEY, ECOS_STRIPE_PRICE_ID, SITE_URL, ALLOWED_ORIGINS
//   ECOS_TRIAL_END   (ISO, ej. 2026-11-01T12:00:00-05:00) — solo de respaldo:
//   ECOS_FOUNDER_CAP (ej. 20)                                manda ecos_settings
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (las pone Supabase)
//
// Body: { ref?: string, plan?: 'mensual' | 'anual' }
// Respuesta: { clientSecret } -> para montar el pago dentro del sitio
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
    .select("id, status, founder, stripe_customer_id, stripe_subscription_id, referred_by")
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
  //
  // El cupo y la fecha viven en ecos_settings para que Holman los cambie desde
  // el panel de administracion sin tocar secrets. Los secrets quedan solo como
  // respaldo por si la fila no existe. Asi el contador de la landing —que lee
  // de la misma tabla— nunca se descuadra con lo que hace el checkout.
  const { data: ajustes } = await db
    .from("ecos_settings")
    .select("key, value")
    .in("key", ["founder_cap", "trial_end"]);
  const ajuste = (k: string) => ajustes?.find((a) => a.key === k)?.value?.trim() || "";

  const trialEnd = new Date(ajuste("trial_end") || env("ECOS_TRIAL_END", "2026-11-01T12:00:00-05:00"));
  const founderCap = Number(ajuste("founder_cap") || env("ECOS_FOUNDER_CAP", "20"));
  // El lugar de fundador se gana al REGISTRARSE (ecos_unirse_prueba): quien ya
  // lo tiene conserva el mes gratis al activar, aunque el cupo se haya llenado
  // despues. Quien no lo tiene lo gana aqui solo si todavia queda cupo. Misma
  // regla que ecos_founder_spots(), para que no se descuadren.
  const { count: founders } = await db
    .from("ecos_members")
    .select("id", { count: "exact", head: true })
    .eq("founder", true)
    .or("status.in.(activo,pendiente),cortesia.eq.true,teacher.eq.true");
  const founderWindow = Date.now() < trialEnd.getTime() &&
    (existing?.founder === true || (founders ?? 0) < founderCap);

  // Aqui NO se crea la ficha de miembro: la crea ecos_unirse_prueba() al abrir
  // el panel, o el webhook cuando Stripe confirma. Lo que hace falta para
  // armarla viaja en la metadata de la suscripcion.

  // Anual: sin prueba, cobra hoy y cubre doce meses. Mensual fundador: prueba
  // hasta el 31 de octubre. Quien entra queda en el Price vigente ese dia.
  const priceId = plan === "anual" ? env("ECOS_STRIPE_PRICE_ID_ANUAL") : env("ECOS_STRIPE_PRICE_ID");
  const withTrial = plan === "mensual" && founderWindow;

  // Embebido: el pago ocurre DENTRO del sitio, no en una pagina de Stripe.
  // Es el mismo Checkout de siempre —prueba gratuita, cupones, impuestos—,
  // solo que montado en /ecos/entrar. Nadie sale de holmanglobalgroup.com.
  //
  // Si Stripe rechaza algo, se responde con el motivo y con cabeceras CORS. Sin
  // este try el error tumbaba la funcion, Supabase devolvia un 500 pelado y el
  // navegador lo mostraba como "sin conexion" — un mensaje que manda a revisar
  // el wifi cuando el problema esta aqui.
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      // «embedded_page», no «embedded»: Stripe renombro el valor y la version de
      // API que usamos (2026-04-22.dahlia) ya solo acepta el nuevo. Hace juego
      // con createEmbeddedCheckoutPage, que es lo que monta el navegador.
      ui_mode: "embedded_page",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      // Siempre se pide la tarjeta, aunque el primer mes sea gratis: el 1 de
      // noviembre se cobra solo y se queda quien no cancela.
      payment_method_collection: "always",
      subscription_data: {
        metadata: { user_id: user.id, empresa: "HGG", producto: "ECOS", founder: String(founderWindow), plan, ref: referredBy ?? "" },
        ...(withTrial ? { trial_end: Math.floor(trialEnd.getTime() / 1000) } : {}),
      },
      allow_promotion_codes: true,
      locale: "es",
      // En modo embebido no hay success/cancel: Stripe devuelve a esta unica URL
      // cuando termina. Quien se arrepiente simplemente cierra el pago.
      return_url: `${siteUrl}/ecos/panel?bienvenida=1&pago={CHECKOUT_SESSION_ID}`,
      metadata: { user_id: user.id, ref: body.ref ?? "", plan },
    });

    if (!session.client_secret) {
      return json(req, { error: "Stripe no devolvio la sesion de pago. Intentalo de nuevo." }, 502);
    }
    return json(req, { clientSecret: session.client_secret });
  } catch (e) {
    const detalle = e instanceof Error ? e.message : String(e);
    console.error("ecos-checkout / stripe:", detalle);
    return json(req, { error: `Stripe rechazo la sesion de pago: ${detalle}` }, 502);
  }
});
