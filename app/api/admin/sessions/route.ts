import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-guard";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { enforceOriginCheck } from "@/lib/origin-check";
import { badRequest, id } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/sessions
 *
 * Lista sesiones activas:
 * - Super admins: ven todas las sesiones del sistema
 * - Admin / vendor: solo las suyas propias
 *
 * Marca la sesion "actual" para que la UI la pueda destacar.
 */
export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const sb = getSupabaseAdmin();
  let query = sb
    .from("admin_sessions")
    .select(
      "id, user_id, user_email, created_at, last_used_at, expires_at, ip, user_agent, revoked_at"
    )
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("last_used_at", { ascending: false, nullsFirst: false });

  if (auth.session.role !== "super") {
    query = query.eq("user_id", auth.session.userId);
  }

  const { data, error } = await query;
  if (error) {
    logger.error("[api/admin/sessions GET]", error);
    return NextResponse.json(
      { error: "Error consultando sesiones" },
      { status: 500 }
    );
  }

  const sessions = (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    ip: row.ip,
    userAgent: row.user_agent,
    isCurrent: row.id === auth.session.sessionId,
  }));
  return NextResponse.json({ sessions });
}

/**
 * DELETE /api/admin/sessions?id=xxx   — revocar una sesion especifica
 * DELETE /api/admin/sessions?all=true — revocar TODAS las del usuario (excepto la actual)
 *
 * Super admin puede revocar cualquier sesion.
 * Otros usuarios solo las suyas.
 */
export async function DELETE(req: Request) {
  const csrf = enforceOriginCheck(req);
  if (csrf) return csrf;
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";

  const sb = getSupabaseAdmin();
  const revoke = { revoked_at: new Date().toISOString() };

  if (all) {
    // Revocar todas las sesiones del usuario actual EXCEPTO la actual
    const { error, count } = await sb
      .from("admin_sessions")
      .update(revoke, { count: "exact" })
      .eq("user_id", auth.session.userId)
      .neq("id", auth.session.sessionId)
      .is("revoked_at", null);
    if (error) {
      logger.error("[api/admin/sessions DELETE all]", error);
      return NextResponse.json(
        { error: "Error revocando sesiones" },
        { status: 500 }
      );
    }
    void audit({
      action: "session_revoked",
      userId: auth.session.userId,
      userEmail: auth.session.email,
      metadata: { scope: "all_others", count: count || 0 },
    });
    return NextResponse.json({ ok: true, revoked: count || 0 });
  }

  const vId = id(searchParams.get("id"), "id");
  if (!vId.ok) return badRequest(vId.error);

  // Buscar la sesion para verificar permiso
  const { data: target, error: getErr } = await sb
    .from("admin_sessions")
    .select("user_id")
    .eq("id", vId.value)
    .maybeSingle();
  if (getErr || !target) {
    return NextResponse.json(
      { error: "Sesión no encontrada" },
      { status: 404 }
    );
  }
  if (
    auth.session.role !== "super" &&
    target.user_id !== auth.session.userId
  ) {
    return NextResponse.json(
      { error: "No puedes revocar sesiones de otros usuarios" },
      { status: 403 }
    );
  }

  const { error } = await sb
    .from("admin_sessions")
    .update(revoke)
    .eq("id", vId.value);
  if (error) {
    logger.error("[api/admin/sessions DELETE]", error);
    return NextResponse.json(
      { error: "Error revocando sesión" },
      { status: 500 }
    );
  }
  void audit({
    action: "session_revoked",
    userId: auth.session.userId,
    userEmail: auth.session.email,
    metadata: { revokedSessionId: vId.value, targetUserId: target.user_id },
  });
  return NextResponse.json({ ok: true });
}
