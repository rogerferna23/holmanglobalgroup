// ecos-cortesia — acceso sin pagar: cortesia o profesor. Lo da o lo quita un
// administrador.
//
// Las dos cosas pasan por aqui y no por el navegador porque hacen lo mismo en
// Stripe: si la persona tenia una suscripcion, se cancela en el acto. Sin eso,
// Stripe le cobraria igual cuando termine la prueba.
//
//   cortesia  Invitado por Holman. Miembro fundador y embajador: 10% de
//             descuento y 10% de comision. No suma ingresos.
//   profesor  Da una materia. Miembro fundador, entra sin pagar y prepara sus
//             clases desde «Mis clases».
//
// Variables: STRIPE_SECRET_KEY, ALLOWED_ORIGINS (+ las de Supabase)
// Body: { member_id: string, activar: boolean, tipo?: "cortesia" | "profesor" }

import { adminClient, callerFrom, json, preflight, stripeClient } from "../_shared/ecos.ts";

// Solo super y admin, igual que is_admin() en la base: un vendedor de la tienda
// no regala membresias.
const ROLES_ADMIN = ["super", "admin"];

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
    return json(req, { error: "Solo un administrador puede hacer esto." }, 403);
  }

  const body = (await req.json().catch(() => ({}))) as { member_id?: string; activar?: boolean; tipo?: string };
  const memberId = (body.member_id || "").trim();
  const activar = body.activar === true;
  const campo = body.tipo === "profesor" ? "teacher" : "cortesia";
  if (!memberId) return json(req, { error: "Falta la persona." }, 400);

  const { data: ficha } = await db
    .from("ecos_members")
    .select("id, status, stripe_subscription_id")
    .eq("id", memberId)
    .maybeSingle();

  if (!activar) {
    if (!ficha) return json(req, { ok: true });
    const { error } = await db.from("ecos_members").update({ [campo]: false }).eq("id", memberId);
    if (error) return json(req, { error: error.message }, 500);
    return json(req, { ok: true });
  }

  // Quien se registró y nunca pagó no tiene ficha: se crea con su perfil.
  if (!ficha) {
    const { data: p } = await db.from("profiles").select("email, name").eq("id", memberId).maybeSingle();
    if (!p) return json(req, { error: "No existe esa cuenta." }, 404);
    const { error } = await db.from("ecos_members").insert({
      id: memberId, email: p.email, name: p.name, [campo]: true, founder: true,
    });
    if (error) return json(req, { error: error.message }, 500);
    return json(req, { ok: true, suscripcionCancelada: false });
  }

  const { error: e1 } = await db.from("ecos_members")
    .update({ [campo]: true, founder: true, inactive_since: null })
    .eq("id", memberId);
  if (e1) return json(req, { error: e1.message }, 500);

  let cancelada = false;
  if (ficha.stripe_subscription_id && ficha.status !== "cancelado") {
    try {
      await stripeClient().subscriptions.cancel(ficha.stripe_subscription_id);
      cancelada = true;
    } catch (e) {
      const detalle = e instanceof Error ? e.message : String(e);
      return json(req, {
        ok: false,
        error: `El acceso quedó activo, pero Stripe no dejó cancelar la suscripción: ${detalle}. Cancélala desde Stripe para que no se le cobre.`,
      }, 502);
    }
  }

  return json(req, { ok: true, suscripcionCancelada: cancelada });
});
