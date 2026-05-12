import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-guard";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("approval_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    logger.error("[api/admin/requests GET]", error);
    return NextResponse.json({ error: "Error procesando la solicitud" }, { status: 500 });
  }
  const requests = (data || []).map((row) => ({
    id: row.id,
    type: row.type,
    payload: row.payload,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }));
  return NextResponse.json({ requests });
}

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (guard) return guard;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const row = {
    id: String(body.id || `req_${Date.now()}`),
    type: String(body.type || "manual_sale"),
    payload: (body.payload as Record<string, unknown>) || {},
    status: String(body.status || "pendiente"),
  };
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("approval_requests").insert(row);
  if (error) {
    logger.error("[api/admin/requests POST]", error);
    return NextResponse.json({ error: "Error procesando la solicitud" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: row.id });
}

// PATCH /api/admin/requests?id=xxx — actualizar status (aprobar/rechazar)
export async function PATCH(req: Request) {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const status = String(body.status || "");
  if (!["pendiente", "aprobado", "rechazado"].includes(status)) {
    return NextResponse.json({ error: "status invalido" }, { status: 400 });
  }
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("approval_requests").update({ status }).eq("id", id);
  if (error) {
    logger.error("[api/admin/requests PATCH]", error);
    return NextResponse.json({ error: "Error procesando la solicitud" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("approval_requests").delete().eq("id", id);
  if (error) {
    logger.error("[api/admin/requests DELETE]", error);
    return NextResponse.json({ error: "Error procesando la solicitud" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
