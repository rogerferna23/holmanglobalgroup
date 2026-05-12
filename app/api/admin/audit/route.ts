import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-guard";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { num, str } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/audit
 *
 * Query params:
 *   - limit: numero de resultados (default 100, max 500)
 *   - offset: paginacion
 *   - action: filtro por accion (ej. "login", "sale.create")
 *   - user: filtro por user_email
 *   - status: "success" | "failure"
 *   - since: ISO date (lower bound)
 *   - until: ISO date (upper bound)
 *
 * Solo super admins pueden consultar el audit log.
 */
export async function GET(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  if (auth.session.role !== "super") {
    return NextResponse.json(
      { error: "Solo super admins pueden consultar la auditoría" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const limitR = num(searchParams.get("limit") || 100, "limit", {
    min: 1,
    max: 500,
  });
  const limit = limitR.ok ? Math.floor(limitR.value) : 100;
  const offsetR = num(searchParams.get("offset") || 0, "offset", {
    min: 0,
    max: 100000,
  });
  const offset = offsetR.ok ? Math.floor(offsetR.value) : 0;

  const action = str(searchParams.get("action"), "action", { max: 64 });
  const user = str(searchParams.get("user"), "user", { max: 254 });
  const status = str(searchParams.get("status"), "status", { max: 16 });
  const since = str(searchParams.get("since"), "since", { max: 32 });
  const until = str(searchParams.get("until"), "until", { max: 32 });

  const sb = getSupabaseAdmin();
  let query = sb
    .from("audit_log")
    .select(
      "id, created_at, user_id, user_email, action, resource, resource_id, ip, user_agent, metadata, status",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (action.ok && action.value) query = query.eq("action", action.value);
  if (user.ok && user.value) query = query.ilike("user_email", `%${user.value}%`);
  if (status.ok && (status.value === "success" || status.value === "failure")) {
    query = query.eq("status", status.value);
  }
  if (since.ok && since.value) query = query.gte("created_at", since.value);
  if (until.ok && until.value) query = query.lte("created_at", until.value);

  const { data, count, error } = await query;
  if (error) {
    logger.error("[api/admin/audit GET]", error);
    return NextResponse.json(
      { error: "Error consultando auditoría" },
      { status: 500 }
    );
  }
  const entries = (data || []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    userId: row.user_id,
    userEmail: row.user_email,
    action: row.action,
    resource: row.resource,
    resourceId: row.resource_id,
    ip: row.ip,
    userAgent: row.user_agent,
    metadata: row.metadata,
    status: row.status,
  }));
  return NextResponse.json({ entries, total: count || 0 });
}
