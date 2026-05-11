import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-guard";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/sales — lista todas las ventas (orden: fecha desc)
export async function GET() {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("manual_sales")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api/admin/sales GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Transformar snake_case → camelCase para el cliente
  const sales = (data || []).map((row) => ({
    id: row.id,
    date: row.date,
    serviceId: row.service_id,
    serviceTitle: row.service_title,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone || "",
    origin: row.origin,
    notes: row.notes || "",
    amount: Number(row.amount),
    status: row.status,
  }));
  return NextResponse.json({ sales });
}

// POST /api/admin/sales — crear nueva venta
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
    id: String(body.id || `sale_${Date.now()}`),
    date: String(body.date || new Date().toISOString().slice(0, 10)),
    service_id: String(body.serviceId || ""),
    service_title: String(body.serviceTitle || ""),
    client_name: String(body.clientName || ""),
    client_email: String(body.clientEmail || ""),
    client_phone: body.clientPhone ? String(body.clientPhone) : null,
    origin: String(body.origin || "Directo"),
    notes: body.notes ? String(body.notes) : null,
    amount: Number(body.amount) || 0,
    status: String(body.status || "Aprobado"),
  };

  if (!row.service_id || !row.client_name || !row.client_email) {
    return NextResponse.json(
      { error: "serviceId, clientName y clientEmail son obligatorios" },
      { status: 400 }
    );
  }

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("manual_sales").insert(row);
  if (error) {
    console.error("[api/admin/sales POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: row.id });
}

// DELETE /api/admin/sales?id=xxx — eliminar
export async function DELETE(req: Request) {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("manual_sales").delete().eq("id", id);
  if (error) {
    console.error("[api/admin/sales DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
