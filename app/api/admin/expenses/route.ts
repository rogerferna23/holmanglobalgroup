import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-guard";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("expenses")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api/admin/expenses GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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
  const guard = await requireAdminApi();
  if (guard) return guard;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const row = {
    id: String(body.id || `exp_${Date.now()}`),
    date: String(body.date || new Date().toISOString().slice(0, 10)),
    description: String(body.description || ""),
    category: body.category ? String(body.category) : null,
    amount: Number(body.amount) || 0,
  };

  if (!row.description || row.amount <= 0) {
    return NextResponse.json(
      { error: "description y amount > 0 son obligatorios" },
      { status: 400 }
    );
  }

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("expenses").insert(row);
  if (error) {
    console.error("[api/admin/expenses POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: row.id });
}

export async function DELETE(req: Request) {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("expenses").delete().eq("id", id);
  if (error) {
    console.error("[api/admin/expenses DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
