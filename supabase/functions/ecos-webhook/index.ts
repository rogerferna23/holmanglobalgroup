// ecos-webhook — Stripe avisa aqui de todo lo que pasa con las suscripciones
// de ECOS, y esta funcion es la UNICA que escribe el estado de un miembro.
// El navegador nunca toca `status`, `price_usd` ni las fechas.
//
// Endpoint en Stripe: https://<proyecto>.supabase.co/functions/v1/ecos-webhook
// Eventos a suscribir:
//   checkout.session.completed
//   customer.subscription.updated
//   customer.subscription.deleted
//   invoice.paid
//   invoice.payment_failed
//
// Variables: STRIPE_SECRET_KEY, ECOS_STRIPE_WEBHOOK_SECRET (+ las de Supabase)
// Desplegar con --no-verify-jwt: Stripe no manda JWT de Supabase, manda su firma.

import {
  adminClient,
  env,
  invoiceSubscriptionId,
  periodEnd,
  statusFromStripe,
  Stripe,
  stripeClient,
} from "../_shared/ecos.ts";

const stripe = stripeClient();
const db = adminClient();

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Sin firma", { status: 400 });

  // deno-lint-ignore no-explicit-any
  let event: any;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      sig,
      env("ECOS_STRIPE_WEBHOOK_SECRET"),
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (err) {
    console.error("[ecos-webhook] firma inválida", err);
    return new Response("Firma inválida", { status: 400 });
  }

  // Idempotencia: Stripe reintenta; cada evento se aplica una sola vez.
  const { error: dupe } = await db
    .from("ecos_webhook_events")
    .insert({ id: event.id, type: event.type });
  if (dupe) return new Response("ya procesado", { status: 200 });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        if (s.mode !== "subscription" || !s.subscription) break;
        const userId = s.client_reference_id ?? (s.metadata?.user_id as string | undefined);
        if (!userId) break;
        const sub = await stripe.subscriptions.retrieve(s.subscription as string);
        await applySubscription(userId, sub);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const userId = (sub.metadata?.user_id as string | undefined) ?? (await userIdFromCustomer(sub.customer as string));
        if (userId) await applySubscription(userId, sub);
        break;
      }
      case "invoice.paid": {
        await recordPayment(event.data.object);
        await creditReferrerIfDue(event.data.object);
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object;
        const userId = await userIdFromCustomer(inv.customer as string);
        if (userId) {
          const { data: cur } = await db.from("ecos_members").select("inactive_since").eq("id", userId).maybeSingle();
          await db.from("ecos_members").update({
            status: "pausado",
            inactive_since: cur?.inactive_since ?? new Date().toISOString(),
          }).eq("id", userId);
        }
        break;
      }
    }
  } catch (err) {
    console.error("[ecos-webhook] error aplicando", event.type, err);
    // 500 para que Stripe reintente; el registro de idempotencia se borra.
    await db.from("ecos_webhook_events").delete().eq("id", event.id);
    return new Response("error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});

async function userIdFromCustomer(customerId: string): Promise<string | null> {
  const { data } = await db
    .from("ecos_members")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.id ?? null;
}

// deno-lint-ignore no-explicit-any
async function applySubscription(userId: string, sub: any) {
  const price = sub.items.data[0]?.price;
  const priceUsd = price?.unit_amount ? price.unit_amount / 100 : null;
  const status = statusFromStripe(sub.status);

  const { data: current } = await db
    .from("ecos_members")
    .select("started_at, status, inactive_since, email")
    .eq("id", userId)
    .maybeSingle();

  const wasActive = current?.status === "activo";
  const plan = (sub.metadata?.plan as string | undefined) === "anual" ? "anual" : undefined;

  // Gracia de 14 dias: al volver a estar activo, si paso el plazo, el avance se borra.
  if (status === "activo" && current?.inactive_since) {
    await db.rpc("ecos_apply_grace", { p_member: userId });
  }

  await db
    .from("ecos_members")
    .update({
      status,
      stripe_customer_id: sub.customer as string,
      stripe_subscription_id: sub.id,
      ...(priceUsd ? { price_usd: priceUsd } : {}),
      ...(plan ? { plan } : {}),
      // started_at se fija una sola vez: es la base del desbloqueo por permanencia.
      started_at: current?.started_at ?? new Date(sub.start_date * 1000).toISOString(),
      current_period_end: periodEnd(sub),
      cancelled_at: status === "cancelado" ? new Date().toISOString() : null,
      // Deja de estar activo → empieza a correr la gracia. Vuelve → se limpia.
      inactive_since: status === "activo" ? null : (wasActive || !current?.inactive_since ? new Date().toISOString() : current.inactive_since),
    })
    .eq("id", userId);

  // Si entro como invitado a una masterclass, queda marcado como convertido.
  if (status === "activo" && current?.email) {
    await db.from("ecos_guests").update({ converted_id: userId }).eq("email", current.email).is("converted_id", null);
  }
}

/** Cada factura pagada queda registrada: es la base del reparto historico real. */
// deno-lint-ignore no-explicit-any
async function recordPayment(inv: any) {
  if (inv.amount_paid <= 0) return;
  const userId = await userIdFromCustomer(inv.customer as string);
  const subId = invoiceSubscriptionId(inv);
  let plan: string | null = null;
  if (subId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      plan = (sub.metadata?.plan as string | undefined) ?? null;
    } catch { /* sin plan */ }
  }
  await db.from("ecos_payments").upsert({
    stripe_invoice_id: inv.id,
    member_id: userId,
    amount_usd: inv.amount_paid / 100,
    plan,
    paid_at: new Date((inv.status_transitions?.paid_at ?? inv.created) * 1000).toISOString(),
  }, { onConflict: "stripe_invoice_id" });
}

/**
 * Referidos: cuando el referido paga su SEGUNDO mes, quien lo trajo recibe XP
 * en las tres habilidades (una sola vez). La comision del 10% por productos
 * de HGG la gestiona Delega Work (NETWORK) a partir de referred_by.
 */
// deno-lint-ignore no-explicit-any
async function creditReferrerIfDue(inv: any) {
  const subId = invoiceSubscriptionId(inv);
  if (!subId || inv.amount_paid <= 0) return;
  const userId = await userIdFromCustomer(inv.customer as string);
  if (!userId) return;

  const { data: m } = await db.from("ecos_members").select("referred_by, referral_credited").eq("id", userId).maybeSingle();
  if (!m?.referred_by || m.referral_credited) return;

  const paid = await stripe.invoices.list({ subscription: subId, status: "paid", limit: 10 });
  // deno-lint-ignore no-explicit-any
  const realPayments = paid.data.filter((i: any) => i.amount_paid > 0).length;
  if (realPayments < 2) return;

  await db.from("ecos_members").update({ referral_credited: true }).eq("id", userId);
  const pts = 30;
  await db.from("ecos_xp_events").insert([
    { member_id: m.referred_by, skill: "ventas", points: pts, reason: "referido", note: "Trajiste a alguien que se quedó" },
    { member_id: m.referred_by, skill: "marketing", points: pts, reason: "referido", note: "Trajiste a alguien que se quedó" },
    { member_id: m.referred_by, skill: "oratoria", points: pts, reason: "referido", note: "Trajiste a alguien que se quedó" },
  ]);
  await db.rpc("ecos_refresh_badges", { m: m.referred_by });
}
