import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  checkCredentials,
  createSessionToken,
} from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { email?: string; password?: string };

// Limites:
// - 5 intentos por IP en 15 min (anti brute force)
// - 10 intentos por email en 15 min (anti enumeration)
const MAX_PER_IP = 5;
const MAX_PER_EMAIL = 10;
const WINDOW = 15 * 60; // 15 min

export async function POST(req: Request) {
  const ip = clientIp(req);
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
  const email = (body.email || "").trim();
  const password = body.password || "";
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y contrasena son obligatorios." },
      { status: 400 }
    );
  }
  // Validacion basica de email para evitar payloads basura.
  if (email.length > 254 || password.length > 200 || !email.includes("@")) {
    return NextResponse.json(
      { error: "Credenciales invalidas." },
      { status: 401 }
    );
  }

  // Rate limit por email (case-insensitive) — mata enumeration usando muchas IPs.
  const emailKey = email.toLowerCase();
  const emailLimit = rateLimit(`login:email:${emailKey}`, MAX_PER_EMAIL, WINDOW);
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

  if (!checkCredentials(email, password)) {
    return NextResponse.json(
      { error: "Credenciales invalidas." },
      { status: 401 }
    );
  }
  let token: string;
  try {
    token = await createSessionToken(email);
  } catch {
    return NextResponse.json(
      {
        error:
          "Configuracion de sesion incompleta. Contacta al administrador del sitio.",
      },
      { status: 500 }
    );
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
