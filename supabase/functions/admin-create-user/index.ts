// Supabase Edge Function: crea un usuario del panel (super/admin/vendor).
// Sustituye al signUp del CLIENTE para poder DESACTIVAR el registro publico en
// Supabase Auth (sin esto, cualquiera podia auto-registrarse como 'vendor' y
// leer manual_sales/profiles via RLS is_staff()).
//
// Reglas:
//   - El caller debe ser 'admin' o 'super' (verificado server-side: JWT + profiles).
//   - Un 'admin' solo puede crear 'vendor'. Crear 'admin'/'super' requiere 'super'.
//   - El usuario se crea ya confirmado: entra de inmediato con su contrasena.
//
// Deploy:
//   supabase functions deploy admin-create-user
//
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto), ALLOWED_ORIGINS.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-expect-error npm specifier resuelto en Deno runtime
import { createClient } from "npm:@supabase/supabase-js@2.105.4";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, apikey, X-Client-Info",
  };
}

function getAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

const ROLES = ["super", "admin", "vendor"];

Deno.serve(async (req: Request) => {
  const headers = { ...corsHeaders(req), "Content-Type": "application/json" };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers,
    });
  }

  // 1) Validar JWT del caller
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers });
  }

  const admin = getAdmin();
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers });
  }

  // 2) El caller debe ser admin o super
  const { data: caller, error: cErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (cErr || !caller || (caller.role !== "super" && caller.role !== "admin")) {
    return new Response(JSON.stringify({ error: "Solo administradores" }), { status: 403, headers });
  }

  // 3) Validar input
  let body: { name?: string; email?: string; password?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400, headers });
  }
  const name = (body.name || "").trim().slice(0, 120);
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const role = (body.role || "vendor").trim();

  if (!name) {
    return new Response(JSON.stringify({ error: "El nombre es obligatorio" }), { status: 400, headers });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "Email no válido" }), { status: 400, headers });
  }
  if (password.length < 8) {
    return new Response(JSON.stringify({ error: "La contraseña debe tener al menos 8 caracteres" }), { status: 400, headers });
  }
  if (!ROLES.includes(role)) {
    return new Response(JSON.stringify({ error: "Rol inválido" }), { status: 400, headers });
  }
  // Solo un super admin puede crear admins/super
  if ((role === "super" || role === "admin") && caller.role !== "super") {
    return new Response(JSON.stringify({ error: "Solo un super admin puede crear administradores" }), { status: 403, headers });
  }

  // 4) Crear el usuario ya confirmado (puede entrar de inmediato)
  const { data: created, error: cuErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (cuErr || !created.user) {
    const msg = cuErr?.message || "No se pudo crear el usuario";
    const dup = /already|exist|registered/i.test(msg);
    return new Response(
      JSON.stringify({ error: dup ? "Ya existe un usuario con ese email" : msg }),
      { status: dup ? 409 : 400, headers }
    );
  }

  // 5) Fijar perfil con el rol elegido (service_role bypassa RLS y el trigger de rol)
  const { error: pErr } = await admin.from("profiles").upsert({
    id: created.user.id,
    email,
    name,
    role,
  });
  if (pErr) {
    console.error("[admin-create-user] profile upsert failed", pErr);
    return new Response(
      JSON.stringify({ error: "Usuario creado, pero no se pudo asignar el rol. Revísalo en Configuración." }),
      { status: 500, headers }
    );
  }

  // 6) Audit log
  try {
    await admin.from("audit_log").insert({
      action: "user.create",
      resource: "auth_user",
      resource_id: created.user.id,
      user_email: userData.user.email,
      metadata: { created_email: email, role, created_by: userData.user.id },
      status: "success",
    });
  } catch (err) {
    console.warn("[admin-create-user] audit failed", err);
  }

  return new Response(JSON.stringify({ ok: true, userId: created.user.id }), { status: 200, headers });
});
