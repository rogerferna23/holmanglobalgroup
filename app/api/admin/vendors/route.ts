import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-guard";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("vendors")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    logger.error("[api/admin/vendors GET]", error);
    return NextResponse.json({ error: "Error procesando la solicitud" }, { status: 500 });
  }
  const vendors = (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    initials: row.initials || "",
    specialty: row.specialty || "",
    phone: row.phone || "",
    email: row.email || "",
    active: !!row.active,
  }));
  return NextResponse.json({ vendors });
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const row = {
    id: String(body.id || `vd_${Date.now()}`),
    name: String(body.name || ""),
    initials: body.initials ? String(body.initials) : null,
    specialty: body.specialty ? String(body.specialty) : null,
    phone: body.phone ? String(body.phone) : null,
    email: body.email ? String(body.email) : null,
    active: body.active !== false,
  };
  if (!row.name) {
    return NextResponse.json({ error: "name es obligatorio" }, { status: 400 });
  }
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("vendors").insert(row);
  if (error) {
    logger.error("[api/admin/vendors POST]", error);
    return NextResponse.json({ error: "Error procesando la solicitud" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: row.id });
}

export async function DELETE(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("vendors").delete().eq("id", id);
  if (error) {
    logger.error("[api/admin/vendors DELETE]", error);
    return NextResponse.json({ error: "Error procesando la solicitud" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
