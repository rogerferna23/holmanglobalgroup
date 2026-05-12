// Helpers de validacion para API routes. Sin Zod (mantiene bundle ligero).
// Cada funcion devuelve { ok: true, value } o { ok: false, error }.
//
// REGLA: TODAS las API routes validan inputs aqui antes de tocar la BD.
// El cliente NUNCA es fuente de verdad.

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[a-zA-Z0-9_-]+$/;

export function str(
  value: unknown,
  field: string,
  opts: { required?: boolean; min?: number; max: number; pattern?: RegExp } = {
    max: 500,
  }
): Result<string> {
  if (value === undefined || value === null || value === "") {
    if (opts.required) return { ok: false, error: `${field} es obligatorio` };
    return { ok: true, value: "" };
  }
  if (typeof value !== "string") {
    return { ok: false, error: `${field} debe ser texto` };
  }
  const trimmed = value.trim();
  if (opts.min !== undefined && trimmed.length < opts.min) {
    return { ok: false, error: `${field} muy corto (mín ${opts.min})` };
  }
  if (trimmed.length > opts.max) {
    return { ok: false, error: `${field} muy largo (máx ${opts.max})` };
  }
  if (opts.pattern && !opts.pattern.test(trimmed)) {
    return { ok: false, error: `${field} con formato inválido` };
  }
  return { ok: true, value: trimmed };
}

export function email(value: unknown, field = "email"): Result<string> {
  const s = str(value, field, { required: true, max: 254 });
  if (!s.ok) return s;
  if (!EMAIL_RE.test(s.value)) {
    return { ok: false, error: `${field} no es un email válido` };
  }
  return { ok: true, value: s.value.toLowerCase() };
}

export function num(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number; required?: boolean } = {}
): Result<number> {
  if (value === undefined || value === null || value === "") {
    if (opts.required) return { ok: false, error: `${field} es obligatorio` };
    return { ok: true, value: 0 };
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return { ok: false, error: `${field} debe ser un número` };
  }
  if (opts.min !== undefined && n < opts.min) {
    return { ok: false, error: `${field} debe ser ≥ ${opts.min}` };
  }
  if (opts.max !== undefined && n > opts.max) {
    return { ok: false, error: `${field} debe ser ≤ ${opts.max}` };
  }
  return { ok: true, value: n };
}

export function isoDate(value: unknown, field = "fecha"): Result<string> {
  const s = str(value, field, { required: true, max: 10, pattern: ISO_DATE_RE });
  if (!s.ok) return s;
  // Verificar que es una fecha real (no 2024-13-45)
  const d = new Date(s.value + "T00:00:00Z");
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s.value) {
    return { ok: false, error: `${field} no es una fecha válida` };
  }
  return { ok: true, value: s.value };
}

export function id(value: unknown, field = "id"): Result<string> {
  return str(value, field, {
    required: true,
    min: 1,
    max: 64,
    pattern: ID_RE,
  });
}

export function oneOf<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
  opts: { required?: boolean; fallback?: T } = {}
): Result<T> {
  if (value === undefined || value === null || value === "") {
    if (opts.fallback) return { ok: true, value: opts.fallback };
    if (opts.required) return { ok: false, error: `${field} es obligatorio` };
    return { ok: true, value: "" as T };
  }
  const v = String(value);
  if (!(allowed as readonly string[]).includes(v)) {
    return {
      ok: false,
      error: `${field} debe ser uno de: ${allowed.join(", ")}`,
    };
  }
  return { ok: true, value: v as T };
}

// Helper para construir respuesta de error 400 desde un Result<*>
export function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}
