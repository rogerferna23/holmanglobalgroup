import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  checkCredentials,
  createSessionToken,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { email?: string; password?: string };

export async function POST(req: Request) {
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
