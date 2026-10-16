/**
 * La campaña que manda el navegador (src/lib/campana.ts) llega tal cual del
 * público: aquí se queda solo con los campos conocidos, cortos y en texto.
 * Devuelve null si no hay nada que guardar.
 */
const CAMPOS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "clic", "pagina"] as const;

export function limpiarCampana(v: unknown): Record<string, string> | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const k of CAMPOS) {
    const t = typeof o[k] === "string" ? (o[k] as string).trim().slice(0, 80) : "";
    if (t) out[k] = t;
  }
  return Object.keys(out).length ? out : null;
}

/** La columna `campana` todavía no existe (migración 20261027 sin correr). */
export function faltaColumnaCampana(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "PGRST204" || /campana/i.test(error.message ?? "");
}
