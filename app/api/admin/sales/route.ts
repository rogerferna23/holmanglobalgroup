import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-guard";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { enforceOriginCheck } from "@/lib/origin-check";
import { decryptPII, encryptPII } from "@/lib/pii";
import { badRequest, email, id, isoDate, num, oneOf, str } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SALE_STATUSES = ["Aprobado", "Pendiente", "Cancelado"] as const;

// GET /api/admin/sales — lista todas las ventas
export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("manual_sales")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("[api/admin/sales GET]", error);
    return NextResponse.json({ error: "Error consultando ventas" }, { status: 500 });
  }
  const sales = (data || []).map((row) => ({
    id: row.id,
    date: row.date,
    serviceId: row.service_id,
    serviceTitle: row.service_title,
    clientName: decryptPII(row.client_name) || "",
    clientEmail: decryptPII(row.client_email) || "",
    clientPhone: decryptPII(row.client_phone) || "",
    origin: row.origin,
    notes: row.notes || "",
    amount: Number(row.amount),
    status: row.status,
  }));
  return NextResponse.json({ sales });
}

// POST /api/admin/sales — crear venta con validacion estricta
export async function POST(req: Request) {
  const csrf = enforceOriginCheck(req);
  if (csrf) return csrf;
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // Validacion campo por campo.
  const vId = id(body.id || `sale_${Date.now()}`);
  if (!vId.ok) return badRequest(vId.error);
  const vDate = isoDate(body.date);
  if (!vDate.ok) return badRequest(vDate.error);
  const vServiceId = id(body.serviceId, "serviceId");
  if (!vServiceId.ok) return badRequest(vServiceId.error);
  const vServiceTitle = str(body.serviceTitle, "serviceTitle", { required: true, max: 200 });
  if (!vServiceTitle.ok) return badRequest(vServiceTitle.error);
  const vClientName = str(body.clientName, "clientName", { required: true, min: 2, max: 120 });
  if (!vClientName.ok) return badRequest(vClientName.error);
  const vClientEmail = email(body.clientEmail, "clientEmail");
  if (!vClientEmail.ok) return badRequest(vClientEmail.error);
  const vClientPhone = str(body.clientPhone, "clientPhone", { max: 32 });
  if (!vClientPhone.ok) return badRequest(vClientPhone.error);
  const vOrigin = str(body.origin, "origin", { max: 32 });
  if (!vOrigin.ok) return badRequest(vOrigin.error);
  const vNotes = str(body.notes, "notes", { max: 1000 });
  if (!vNotes.ok) return badRequest(vNotes.error);
  const vAmount = num(body.amount, "amount", { required: true, min: 0, max: 1_000_000 });
  if (!vAmount.ok) return badRequest(vAmount.error);
  const vStatus = oneOf(body.status, "status", SALE_STATUSES, { fallback: "Aprobado" });
  if (!vStatus.ok) return badRequest(vStatus.error);

  // Encriptar PII si PII_ENCRYPTION_KEY esta seteado; si no, se guarda en
  // plano (backward-compat). decryptPII() maneja ambos formatos al leer.
  const row = {
    id: vId.value,
    date: vDate.value,
    service_id: vServiceId.value,
    service_title: vServiceTitle.value,
    client_name: encryptPII(vClientName.value) as string,
    client_email: encryptPII(vClientEmail.value) as string,
    client_phone: encryptPII(vClientPhone.value || null),
    origin: vOrigin.value || "Directo",
    notes: vNotes.value || null,
    amount: vAmount.value,
    status: vStatus.value,
  };

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("manual_sales").insert(row);
  if (error) {
    logger.error("[api/admin/sales POST]", error);
    return NextResponse.json({ error: "Error guardando venta" }, { status: 500 });
  }
  void audit({
    action: "sale.create",
    resource: "sale",
    resourceId: row.id,
    userId: auth.session.userId,
    userEmail: auth.session.email,
    // No incluimos clientEmail/clientName en metadata para no duplicar PII
    // fuera del registro encriptado. resourceId basta para forense.
    metadata: { amount: row.amount, serviceId: row.service_id },
  });
  return NextResponse.json({ ok: true, id: row.id });
}

// DELETE /api/admin/sales?id=xxx
export async function DELETE(req: Request) {
  const csrf = enforceOriginCheck(req);
  if (csrf) return csrf;
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const vId = id(searchParams.get("id"), "id");
  if (!vId.ok) return badRequest(vId.error);

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("manual_sales").delete().eq("id", vId.value);
  if (error) {
    logger.error("[api/admin/sales DELETE]", error);
    return NextResponse.json({ error: "Error eliminando venta" }, { status: 500 });
  }
  void audit({
    action: "sale.delete",
    resource: "sale",
    resourceId: vId.value,
    userId: auth.session.userId,
    userEmail: auth.session.email,
  });
  return NextResponse.json({ ok: true });
}
