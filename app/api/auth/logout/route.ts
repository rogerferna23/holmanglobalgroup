import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  // Revocar la sesion server-side ANTES de borrar la cookie. Esto garantiza
  // que aunque alguien tenga una copia del token, ya no funcione.
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE_NAME)?.value;
    const parsed = await verifySessionToken(token);
    if (parsed) {
      const sb = getSupabaseAdmin();
      await sb
        .from("admin_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", parsed.sessionId);
      void audit({
        action: "logout",
        userEmail: parsed.email,
      });
    }
  } catch (err) {
    // No bloquear el logout aunque falle la revocacion en BD.
    logger.warn("[auth/logout] revoke failed", { err: String(err) });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
