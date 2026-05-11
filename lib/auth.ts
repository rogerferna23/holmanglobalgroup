// Sistema de auth minimo para el panel /admin.
// Usa env vars: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SESSION_SECRET
// Implementado con Web Crypto API (compatible con Edge Runtime / middleware).

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
  // btoa funciona en Edge y en Node 18+
  const b64 = typeof btoa !== "undefined"
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

export async function createSessionToken(email: string): Promise<string> {
  const issued = Date.now();
  const payload = `${email}|${issued}`;
  const sig = await hmacSign(payload);
  return `${toBase64Url(payload)}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<{ email: string; issuedAt: number } | null> {
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
  const [email, issuedAtStr] = payload.split("|");
  const issuedAt = Number(issuedAtStr);
  if (!email || !Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > SESSION_MAX_AGE * 1000) return null;
  return { email, issuedAt };
}

export function checkCredentials(email: string, password: string): boolean {
  const expectedEmail = process.env.ADMIN_EMAIL || "";
  const expectedPassword = process.env.ADMIN_PASSWORD || "";
  if (!expectedEmail || !expectedPassword) return false;
  return (
    timingSafeEqualStr(email.toLowerCase().trim(), expectedEmail.toLowerCase().trim()) &&
    timingSafeEqualStr(password, expectedPassword)
  );
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE;
