import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  OWNER_USER_ID,
  checkOwnerCredentials,
  createSessionToken,
  generateSessionId,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { getSupabaseAdmin } from "@/lib/supabase";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { email?: string; password?: string };

// Rate limits anti brute-force:
// - 5 intentos por IP / 15 min
// - 10 intentos por email / 15 min (mata enumeration con muchas IPs)
const MAX_PER_IP = 5;
const MAX_PER_EMAIL = 10;
const WINDOW = 15 * 60;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const userAgent = (req.headers.get("user-agent") || "").slice(0, 500);

  const ipLimit = rateLimit(`login:ip:${ip}`, MAX_PER_IP, WINDOW);
  if (!ipLimit.ok) {
    return NextResponse.json(
      {
        error: `Demasiados intentos. Vuelve a intentarlo en ${Math.ceil(
          ipLimit.retryAfterSeconds / 60
        )} minutos.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(ipLimit.retryAfterSeconds) },
      }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y contrasena son obligatorios." },
      { status: 400 }
    );
  }
  if (email.length > 254 || password.length > 200 || !email.includes("@")) {
    return NextResponse.json(
      { error: "Credenciales invalidas." },
      { status: 401 }
    );
  }

  const emailLimit = rateLimit(`login:email:${email}`, MAX_PER_EMAIL, WINDOW);
  if (!emailLimit.ok) {
    return NextResponse.json(
      {
        error: `Demasiados intentos. Vuelve a intentarlo en ${Math.ceil(
          emailLimit.retryAfterSeconds / 60
        )} minutos.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(emailLimit.retryAfterSeconds) },
      }
    );
  }

  // ----- Resolver credenciales -----
  // 1. Primero intentar admin_users (BD)
  // 2. Si no encontrado/no coincide, intentar owner (env vars) como fallback
  //
  // Razon del fallback: si BD se cae o admin_users esta vacio, el owner
  // sigue pudiendo entrar. Esto es el "ultimo acceso garantizado".

  let userId = "";
  let role: "super" | "admin" | "vendor" | null = null;

  // Intento 1: admin_users en Supabase
  try {
    const sb = getSupabaseAdmin();
    const { data: user } = await sb
      .from("admin_users")
      .select("id, email, password_hash, role")
      .eq("email", email)
      .maybeSingle();

    if (user && user.password_hash) {
      const passwordOk = await verifyPassword(password, user.password_hash);
      if (passwordOk) {
        userId = user.id;
        role = (user.role as typeof role) || "admin";
      }
    }
  } catch (err) {
    // Si BD falla, no impedir el login del owner. Solo loguear.
    logger.warn("[auth/login] supabase lookup failed", { err: String(err) });
  }

  // Intento 2: owner via env vars (fallback)
  if (!role) {
    const owner = checkOwnerCredentials(email, password);
    if (owner && owner.matches) {
      userId = OWNER_USER_ID;
      role = "super";
    }
  }

  // Sin match en ningun lado
  if (!role) {
    void audit({
      action: "login_failed",
      userEmail: email,
      ip,
      userAgent,
      status: "failure",
    });
    return NextResponse.json(
      { error: "Credenciales invalidas." },
      { status: 401 }
    );
  }

  // ----- Crear sesion server-side -----
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  try {
    const sb = getSupabaseAdmin();
    const { error } = await sb.from("admin_sessions").insert({
      id: sessionId,
      user_id: userId,
      user_email: email,
      expires_at: expiresAt.toISOString(),
      ip,
      user_agent: userAgent,
    });
    if (error) {
      logger.error("[auth/login] session insert failed", error);
      return NextResponse.json(
        { error: "No se pudo iniciar sesión. Inténtalo de nuevo." },
        { status: 500 }
      );
    }
  } catch (err) {
    logger.error("[auth/login] session insert exception", err);
    return NextResponse.json(
      { error: "No se pudo iniciar sesión. Inténtalo de nuevo." },
      { status: 500 }
    );
  }

  // ----- Firmar cookie con HMAC(sessionId|email|issuedAt) -----
  let token: string;
  try {
    token = await createSessionToken(sessionId, email);
  } catch {
    return NextResponse.json(
      { error: "Configuracion de sesion incompleta." },
      { status: 500 }
    );
  }

  void audit({
    action: "login",
    userId,
    userEmail: email,
    ip,
    userAgent,
    metadata: { role },
  });

  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
