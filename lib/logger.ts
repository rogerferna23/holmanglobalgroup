// Logger con niveles. Solo escribe a stdout/stderr en development. En
// produccion, los errores criticos van a stderr (Vercel los captura) pero
// SIN incluir datos sensibles (cuerpos completos de request, headers, etc).
//
// Uso:
//   logger.error("[paypal/create-order]", err);  // solo mensaje + stack
//   logger.debug("[admin/sales]", { sale });     // solo en dev
//
// REGLA: nunca pases PII (emails de clientes, telefonos, contrasenas) a
// estos logs. Si necesitas debuggear con datos reales, usa logger.debug
// que solo se imprime localmente.

const IS_DEV = process.env.NODE_ENV !== "production";

type ErrorLike = { message?: string; stack?: string; name?: string };

function safe(err: unknown): ErrorLike {
  if (err instanceof Error) {
    return { message: err.message, name: err.name, stack: err.stack };
  }
  if (typeof err === "object" && err !== null) {
    return { message: String((err as ErrorLike).message ?? "Unknown error") };
  }
  return { message: String(err) };
}

export const logger = {
  /** Errores serios. Siempre se loguean. NO loguear datos sensibles. */
  error(tag: string, err?: unknown, meta?: Record<string, unknown>) {
    const e = err !== undefined ? safe(err) : undefined;
    // eslint-disable-next-line no-console
    console.error(tag, { error: e, ...(meta || {}) });
  },
  /** Warnings. Siempre se loguean. */
  warn(tag: string, meta?: Record<string, unknown>) {
    // eslint-disable-next-line no-console
    console.warn(tag, meta || {});
  },
  /** Info general. Solo en development. */
  info(tag: string, meta?: Record<string, unknown>) {
    if (!IS_DEV) return;
    // eslint-disable-next-line no-console
    console.log(tag, meta || {});
  },
  /** Debug. Solo en development. */
  debug(tag: string, meta?: Record<string, unknown>) {
    if (!IS_DEV) return;
    // eslint-disable-next-line no-console
    console.debug(tag, meta || {});
  },
};
