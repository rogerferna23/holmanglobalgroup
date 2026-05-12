import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-guard";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { hashPassword } from "@/lib/password";
import { audit } from "@/lib/audit";
import { enforceOriginCheck } from "@/lib/origin-check";
import { badRequest, email, id, oneOf, str } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES = ["super", "admin", "vendor"] as const;

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("admin_users")
    .select("id, name, email, role, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    logger.error("[api/admin/users GET]", error);
    return NextResponse.json(
      { error: "Error procesando la solicitud" },
      { status: 500 }
    );
  }
  const users = (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
  }));
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const csrf = enforceOriginCheck(req);
  if (csrf) return csrf;
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  // Solo super admins pueden crear otros usuarios.
  if (auth.session.role !== "super") {
    return NextResponse.json(
      { error: "Solo super admins pueden crear usuarios" },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const vName = str(body.name, "name", { required: true, min: 2, max: 120 });
  if (!vName.ok) return badRequest(vName.error);
  const vEmail = email(body.email);
  if (!vEmail.ok) return badRequest(vEmail.error);
  const vRole = oneOf(body.role, "role", ROLES, { fallback: "admin" });
  if (!vRole.ok) return badRequest(vRole.error);
  const password = String(body.password || "");
  if (password.length < 6 || password.length > 200) {
    return badRequest("password debe tener entre 6 y 200 caracteres");
  }
  const vId = id(body.id || `usr_${Date.now()}`);
  if (!vId.ok) return badRequest(vId.error);

  let password_hash: string;
  try {
    password_hash = await hashPassword(password);
  } catch (err) {
    logger.error("[api/admin/users POST] hash failed", err);
    return badRequest("Password inválida");
  }

  const row = {
    id: vId.value,
    name: vName.value,
    email: vEmail.value,
    password_hash,
    role: vRole.value,
  };

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("admin_users").insert(row);
  if (error) {
    logger.error("[api/admin/users POST]", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Error procesando la solicitud" },
      { status: 500 }
    );
  }

  void audit({
    action: "user.create",
    resource: "user",
    resourceId: row.id,
    userId: auth.session.userId,
    userEmail: auth.session.email,
    metadata: { newUserEmail: row.email, role: row.role },
  });

  return NextResponse.json({ ok: true, id: row.id });
}

export async function DELETE(req: Request) {
  const csrf = enforceOriginCheck(req);
  if (csrf) return csrf;
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  if (auth.session.role !== "super") {
    return NextResponse.json(
      { error: "Solo super admins pueden eliminar usuarios" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const vId = id(searchParams.get("id"), "id");
  if (!vId.ok) return badRequest(vId.error);

  // No permitir auto-eliminacion (evita lockout accidental).
  if (vId.value === auth.session.userId) {
    return NextResponse.json(
      { error: "No puedes eliminar tu propio usuario" },
      { status: 400 }
    );
  }

  const sb = getSupabaseAdmin();
  // Revocar todas las sesiones del usuario eliminado.
  await sb
    .from("admin_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", vId.value);

  const { error } = await sb.from("admin_users").delete().eq("id", vId.value);
  if (error) {
    logger.error("[api/admin/users DELETE]", error);
    return NextResponse.json(
      { error: "Error procesando la solicitud" },
      { status: 500 }
    );
  }

  void audit({
    action: "user.delete",
    resource: "user",
    resourceId: vId.value,
    userId: auth.session.userId,
    userEmail: auth.session.email,
  });

  return NextResponse.json({ ok: true });
}
