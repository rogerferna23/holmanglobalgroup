import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-guard";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { badRequest, id, isoDate, num, str } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("expenses")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("[api/admin/expenses GET]", error);
    return NextResponse.json({ error: "Error consultando gastos" }, { status: 500 });
  }
  const expenses = (data || []).map((row) => ({
    id: row.id,
    date: row.date,
    description: row.description,
    category: row.category || undefined,
    amount: Number(row.amount),
  }));
  return NextResponse.json({ expenses });
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

  const vId = id(body.id || `exp_${Date.now()}`);
  if (!vId.ok) return badRequest(vId.error);
  const vDate = isoDate(body.date);
  if (!vDate.ok) return badRequest(vDate.error);
  const vDesc = str(body.description, "description", { required: true, min: 2, max: 300 });
  if (!vDesc.ok) return badRequest(vDesc.error);
  const vCategory = str(body.category, "category", { max: 64 });
  if (!vCategory.ok) return badRequest(vCategory.error);
  const vAmount = num(body.amount, "amount", { required: true, min: 0.01, max: 1_000_000 });
  if (!vAmount.ok) return badRequest(vAmount.error);

  const row = {
    id: vId.value,
    date: vDate.value,
    description: vDesc.value,
    category: vCategory.value || null,
    amount: vAmount.value,
  };

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("expenses").insert(row);
  if (error) {
    logger.error("[api/admin/expenses POST]", error);
    return NextResponse.json({ error: "Error guardando gasto" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: row.id });
}

export async function DELETE(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const vId = id(searchParams.get("id"), "id");
  if (!vId.ok) return badRequest(vId.error);

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("expenses").delete().eq("id", vId.value);
  if (error) {
    logger.error("[api/admin/expenses DELETE]", error);
    return NextResponse.json({ error: "Error eliminando gasto" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
