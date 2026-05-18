// Supabase Edge Function: borra un usuario de auth.users (y por cascade, de profiles).
// Requiere que el caller sea super_admin (verificado server-side via JWT + tabla profiles).
//
// Deploy:
//   supabase functions deploy admin-delete-user
//
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-expect-error npm specifier
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  // 1) Validar JWT del caller
  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const admin = getAdmin();
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Token inválido" }), {
      status: 401,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  // 2) Verificar que el caller es super_admin
  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (pErr || !profile || profile.role !== "super") {
    return new Response(JSON.stringify({ error: "Solo super admin" }), {
      status: 403,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  // 3) Validar input
  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
  const targetId = (body.userId || "").trim();
  if (!targetId || !/^[0-9a-f-]{36}$/i.test(targetId)) {
    return new Response(JSON.stringify({ error: "userId inválido" }), {
      status: 400,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
  if (targetId === userData.user.id) {
    return new Response(JSON.stringify({ error: "No puedes eliminarte" }), {
      status: 400,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  // 4) Borrar de auth.users (cascade -> profiles)
  const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  // 5) Audit log
  try {
    await admin.from("audit_log").insert({
      action: "user.delete",
      resource: "auth_user",
      resource_id: targetId,
      user_email: userData.user.email,
      metadata: { deleted_by: userData.user.id },
      status: "success",
    });
  } catch (err) {
    console.warn("[admin-delete-user] audit failed", err);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
});
