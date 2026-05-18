// Hashing y verificacion de passwords con bcrypt.
// bcryptjs = implementacion pura JS, sin bindings nativos (corre en Edge y Node).
//
// Cost factor 10 → ~100ms por verificacion en Node. Suficiente para defender
// contra brute force offline (en caso de dump de BD) sin ser intolerablemente
// lento en uso normal.

import bcrypt from "bcryptjs";

const COST = 10;

export async function hashPassword(plain: string): Promise<string> {
  if (!plain || plain.length < 6) {
    throw new Error("Password debe tener al menos 6 caracteres");
  }
  if (plain.length > 200) {
    throw new Error("Password demasiado larga");
  }
  return bcrypt.hash(plain, COST);
}

/**
 * Verifica password contra hash. Devuelve false en cualquier error para
 * evitar information leak (siempre toma tiempo similar).
 */
export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  if (!plain || !hash) {
    // Hacer un compare dummy para tiempo constante
    await bcrypt.compare(
      "dummy-string",
      "$2a$10$abcdefghijklmnopqrstuv0123456789abcdef0123456789abcdef0123"
    ).catch(() => false);
    return false;
  }
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
