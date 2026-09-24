// ecos-cortesia — Holman invita a alguien al club sin cobrarle, o se lo quita.
//
// Solo la puede usar un administrador. Al activar la cortesia:
//   - se crea o marca la ficha en ecos_members con cortesia = true, y queda
//     como miembro fundador: tiene los mismos beneficios que quien paga (10% de
//     descuento y 10% de comision), solo que no suma ingresos
//   - si la persona tenia una suscripcion en Stripe, se cancela en el acto,
//     para que no le llegue ningun cobro (tampoco el del 1 de noviembre)
//
// Al quitarla solo se apaga la marca. Si esa persona quiere seguir, se
// suscribe y paga como cualquiera.
//
// Variables: STRIPE_SECRET_KEY, ALLOWED_ORIGINS (+ las de Supabase)
// Body: { member_id: string, activar: boolean }

import { adminClient, callerFrom, json, preflight, stripeClient } from "../_shared/ecos.ts";

const ROLES_ADMIN = ["super", "admin", "vendor"];

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { error: "Método no permitido" }, 405);

  const user = await callerFrom(req);
  if (!user) return json(req, { error: "Inicia sesión para continuar." }, 401);

  const db = adminClient();

  // El rol se lee de la base, nunca de lo que diga el navegador.
  const { data: perfil } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!perfil || !ROLES_ADMIN.includes(perfil.role)) {
    return json(req, { error: "Solo un administrador puede dar cortesías." }, 403);
  }

  const body = (await req.json().catch(() => ({}))) as { member_id?: string; activar?: boolean };
  const memberId = (body.member_id || "").trim();
  const activar = body.activar === true;
  if (!memberId) return json(req, { error: "Falta la persona." }, 400);

  const { data: ficha } = await db
    .from("ecos_members")
    .select("id, status, stripe_subscription_id")
    .eq("id", memberId)
    .maybeSingle();

  if (!activar) {
    if (!ficha) return json(req, { ok: true });
    const { error } = await db.from("ecos_members").update({ cortesia: false }).eq("id", memberId);
    if (error) return json(req, { error: error.message }, 500);
    return json(req, { ok: true });
  }

  // Quien se registró y nunca pagó no tiene ficha: se crea con su perfil.
  if (!ficha) {
    const { data: p } = await db.from("profiles").select("email, name").eq("id", memberId).maybeSingle();
    if (!p) return json(req, { error: "No existe esa cuenta." }, 404);
    const { error } = await db.from("ecos_members").insert({
      id: memberId, email: p.email, name: p.name, cortesia: true, founder: true,
    });
    if (error) return json(req, { error: error.message }, 500);
    return json(req, { ok: true, suscripcionCancelada: false });
  }

  const { error: e1 } = await db.from("ecos_members")
    .update({ cortesia: true, founder: true, inactive_since: null })
    .eq("id", memberId);
  if (e1) return json(req, { error: e1.message }, 500);

  // Si ya tenía suscripción, se cancela ya: la cortesía no sirve de nada si
  // Stripe le cobra igual el día que termina la prueba.
  let cancelada = false;
  if (ficha.stripe_subscription_id && ficha.status !== "cancelado") {
    try {
      await stripeClient().subscriptions.cancel(ficha.stripe_subscription_id);
      cancelada = true;
    } catch (e) {
      const detalle = e instanceof Error ? e.message : String(e);
      // La marca ya quedó; lo que falló es Stripe. Se avisa para cancelarla a mano.
      return json(req, {
        ok: false,
        error: `La cortesía quedó activa, pero Stripe no dejó cancelar la suscripción: ${detalle}. Cancélala desde Stripe para que no se le cobre.`,
      }, 502);
    }
  }

  return json(req, { ok: true, suscripcionCancelada: cancelada });
});
