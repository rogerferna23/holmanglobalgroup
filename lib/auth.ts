// Auth multi-usuario con sesiones server-side revocables.
//
// Arquitectura:
// 1. Login -> verifica credenciales (admin_users con bcrypt, fallback a env owner)
// 2. Login OK -> crea fila en admin_sessions con token aleatorio
// 3. Cookie con HMAC(sessionId) para verificacion rapida en middleware
// 4. APIs sensibles consultan admin_sessions para revocacion en tiempo real
//
// Esto da:
// - Multi-usuario real (BD)
// - Revocacion server-side (logout = delete from admin_sessions)
// - Cierre forzoso de todas las sesiones de un usuario (delete where user_id=x)
// - Sin DB hit en cada request (middleware solo verifica HMAC del cookie)

const SESSION_COOKIE = "hgg_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "ADMIN_SESSION_SECRET no configurado (debe tener al menos 16 caracteres)."
    );
  }
  return s;
}

function bufToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function toBase64Url(input: string): string {
  const b64 =
    typeof btoa !== "undefined"
      ? btoa(input)
      : Buffer.from(input, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  if (typeof atob !== "undefined") return atob(padded);
  return Buffer.from(padded, "base64").toString("utf8");
}

async function hmacSign(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return bufToHex(sig);
}

// Genera un id de sesion criptograficamente aleatorio (256 bits) hex-encoded.
export function generateSessionId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

// Token firmado con HMAC que incluye el sessionId. El middleware verifica
// la firma sin DB hit. El sessionId se usa luego para consultar revocacion.
export async function createSessionToken(
  sessionId: string,
  email: string
): Promise<string> {
  const issued = Date.now();
  const payload = `${sessionId}|${email}|${issued}`;
  const sig = await hmacSign(payload);
  return `${toBase64Url(payload)}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<{ sessionId: string; email: string; issuedAt: number } | null> {
  if (!token) return null;
  const [encodedPayload, sig] = token.split(".");
  if (!encodedPayload || !sig) return null;
  let payload: string;
  try {
    payload = fromBase64Url(encodedPayload);
  } catch {
    return null;
  }
  let expectedSig: string;
  try {
    expectedSig = await hmacSign(payload);
  } catch {
    return null;
  }
  if (!timingSafeEqualStr(sig, expectedSig)) return null;
  const parts = payload.split("|");
  // Compatibilidad: tokens viejos solo tienen email|issuedAt (sin sessionId).
  // Los rechazamos: forzamos re-login para que se cree sesion en BD.
  if (parts.length !== 3) return null;
  const [sessionId, email, issuedAtStr] = parts;
  const issuedAt = Number(issuedAtStr);
  if (!sessionId || !email || !Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > SESSION_MAX_AGE * 1000) return null;
  return { sessionId, email, issuedAt };
}

/**
 * Verifica credenciales del "owner" via env vars (fallback, no requiere BD).
 * Esto garantiza que SIEMPRE puedas entrar al panel aunque la BD este caida.
 */
export function checkOwnerCredentials(
  email: string,
  password: string
): { matches: boolean; role: "super" } | null {
  const expectedEmail = process.env.ADMIN_EMAIL || "";
  const expectedPassword = process.env.ADMIN_PASSWORD || "";
  if (!expectedEmail || !expectedPassword) return null;
  const matches =
    timingSafeEqualStr(
      email.toLowerCase().trim(),
      expectedEmail.toLowerCase().trim()
    ) && timingSafeEqualStr(password, expectedPassword);
  return { matches, role: "super" };
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE;
export const OWNER_USER_ID = "owner";
