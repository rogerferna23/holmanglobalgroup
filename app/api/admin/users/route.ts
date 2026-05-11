import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-guard";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hash basico SHA-256 de la password (sin sal — para mejor seguridad usar bcrypt o argon2,
// pero requiere dependencia. Para login real ademas habria que comparar hashes en login).
async function hashPassword(pw: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(pw));
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return `sha256:${hex}`;
}

export async function GET() {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("admin_users")
    .select("id, name, email, role, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[api/admin/users GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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
  const guard = await requireAdminApi();
  if (guard) return guard;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = String(body.role || "admin");

  if (!name || !email.includes("@") || password.length < 6) {
    return NextResponse.json(
      { error: "name, email valido y password (>=6) requeridos" },
      { status: 400 }
    );
  }
  if (!["super", "admin", "vendor"].includes(role)) {
    return NextResponse.json({ error: "role invalido" }, { status: 400 });
  }

  const password_hash = await hashPassword(password);
  const row = {
    id: String(body.id || `usr_${Date.now()}`),
    name,
    email,
    password_hash,
    role,
  };

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("admin_users").insert(row);
  if (error) {
    console.error("[api/admin/users POST]", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 409 }
      );
    }
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
  const { error } = await sb.from("admin_users").delete().eq("id", id);
  if (error) {
    console.error("[api/admin/users DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
