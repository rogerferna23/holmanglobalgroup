import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export type AdminSession = {
  sessionId: string;
  email: string;
  userId: string; // 'owner' o admin_users.id
  role: "super" | "admin" | "vendor";
};

export type GuardResult =
  | { ok: true; session: AdminSession }
  | { ok: false; response: NextResponse };

/**
 * Verifica que la peticion tiene sesion valida:
 * 1. Verifica firma HMAC del cookie (rapido, sin DB)
 * 2. Verifica que la sesion existe y NO esta revocada en admin_sessions
 * 3. Actualiza last_used_at
 *
 * Devuelve la sesion para que el handler la use en audit log.
 *
 * Uso en handlers:
 *   const auth = await requireAdminApi();
 *   if (!auth.ok) return auth.response;
 *   // ahora auth.session.email, etc
 */
export async function requireAdminApi(): Promise<GuardResult> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  const parsed = await verifySessionToken(token);
  if (!parsed) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  // Consultar la sesion en BD (revocacion en tiempo real)
  const sb = getSupabaseAdmin();
  const { data: sessionRow, error } = await sb
    .from("admin_sessions")
    .select("id, user_id, user_email, expires_at, revoked_at")
    .eq("id", parsed.sessionId)
    .maybeSingle();

  if (error || !sessionRow) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sesión inválida" },
        { status: 401 }
      ),
    };
  }
  if (sessionRow.revoked_at) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sesión revocada" },
        { status: 401 }
      ),
    };
  }
  if (new Date(sessionRow.expires_at).getTime() < Date.now()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sesión expirada" },
        { status: 401 }
      ),
    };
  }

  // Resolver el rol consultando admin_users si no es owner
  let role: AdminSession["role"] = "super";
  if (sessionRow.user_id !== "owner") {
    const { data: user } = await sb
      .from("admin_users")
      .select("role")
      .eq("id", sessionRow.user_id)
      .maybeSingle();
    role = (user?.role as AdminSession["role"]) || "admin";
  }

  // Actualizar last_used_at (fire-and-forget, no esperamos)
  void sb
    .from("admin_sessions")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", parsed.sessionId);

  return {
    ok: true,
    session: {
      sessionId: parsed.sessionId,
      email: sessionRow.user_email,
      userId: sessionRow.user_id,
      role,
    },
  };
}

/**
 * Compat shim para handlers viejos que esperan NextResponse | null.
 * Si la sesion es valida devuelve null; si no, devuelve la response 401.
 */
export async function requireAdminApiLegacy(): Promise<NextResponse | null> {
  const r = await requireAdminApi();
  return r.ok ? null : r.response;
}

/**
 * Extrae IP y User-Agent del request para audit log.
 * Pasar `req` o usar headers() de next/headers en RSC.
 */
export async function getRequestContext(): Promise<{
  ip: string;
  userAgent: string;
}> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const ip = xff
    ? xff.split(",")[0].trim()
    : h.get("x-real-ip")?.trim() || "unknown";
  const userAgent = (h.get("user-agent") || "").slice(0, 500);
  return { ip, userAgent };
}
