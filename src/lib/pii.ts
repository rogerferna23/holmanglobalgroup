// PII (Personally Identifiable Information) encryption helper.
//
// Estrategia: opt-in con backward-compat.
// - Si PII_ENCRYPTION_KEY esta seteado: nuevos valores se encriptan al insertar.
// - Si no esta seteado: valores se guardan en plano (comportamiento actual).
// - decrypt() siempre acepta ambos formatos (encriptado o plano).
//
// Esto permite:
// 1. Activar encryption sin romper datos existentes (los plainos quedan plainos)
// 2. Desactivar encryption sin perder acceso (los encriptados con la key vieja
//    siguen siendo descifrables mientras la key existe en otro lado)
// 3. Migrar gradualmente: nuevas filas encriptadas, viejas en plano hasta que
//    se editen.
//
// Para activar:
//   1. Generar key:  node -e "console.log(crypto.randomBytes(32).toString('base64'))"
//   2. Anadir a Vercel:  PII_ENCRYPTION_KEY=<la-base64-key>
//   3. Redeploy. Listo.
//
// IMPORTANTE: si pierdes la key, los datos encriptados son irrecuperables.
// Guardala donde guardas otros secretos criticos.

import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "enc:v1:"; // Marca para distinguir de texto plano

function getKey(): Buffer | null {
  const raw = process.env.PII_ENCRYPTION_KEY;
  if (!raw) return null;
  try {
    const buf = Buffer.from(raw, "base64");
    if (buf.length !== 32) return null; // AES-256 requiere 32 bytes
    return buf;
  } catch {
    return null;
  }
}

/**
 * Encripta un string con AES-256-GCM.
 * Si la key no esta configurada, devuelve el plain como-esta (no encripta).
 * Formato output: enc:v1:<iv-base64>:<authTag-base64>:<ciphertext-base64>
 */
export function encryptPII(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined || plain === "") return plain ?? null;
  const key = getKey();
  if (!key) return plain; // sin key → devolver plano (modo no-encrypt)

  const iv = crypto.randomBytes(12); // GCM recomienda 96 bits
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return (
    PREFIX +
    iv.toString("base64") +
    ":" +
    authTag.toString("base64") +
    ":" +
    enc.toString("base64")
  );
}

/**
 * Desencripta un valor. Si NO empieza con el prefijo, devuelve tal cual
 * (backward compat con datos plain pre-encryption).
 */
export function decryptPII(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (!value.startsWith(PREFIX)) return value; // texto plano
  const key = getKey();
  if (!key) {
    // Key fue desactivada — no podemos descifrar. Devolver marker para que
    // la UI sepa que hay datos encriptados pero no se pueden mostrar.
    return "[encrypted: key not available]";
  }
  try {
    const [, ivB64, tagB64, ctB64] = value.split(":");
    if (!ivB64 || !tagB64 || !ctB64) return "[encrypted: malformed]";
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(tagB64, "base64");
    const ct = Buffer.from(ctB64, "base64");
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    const dec = Buffer.concat([decipher.update(ct), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return "[encrypted: decryption failed]";
  }
}

/**
 * Helper para encriptar un objeto de campos PII en una fila.
 * Uso: row.client_email = encryptPII(row.client_email);
 */
export const isEncryptionEnabled = () => getKey() !== null;
