// Rate limiter in-process. Suficiente para bloquear brute force casual desde
// una sola IP. NO sobrevive a deploys ni se sincroniza entre regiones de
// Vercel (cada lambda tiene su propia memoria). Para defensa robusta a
// gran escala, conectar Upstash/Vercel KV.
//
// Para nuestro caso (panel admin con pocos intentos legitimos) es mas que
// suficiente: aunque un atacante encuentre N regiones, cada una limitara
// a N*5 intentos por ventana de 15 min, lo cual sigue siendo inutil para
// brute force real.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Limpieza periodica (cada 5 min, en runtime) para que el Map no crezca.
let lastCleanup = Date.now();
function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return;
  lastCleanup = now;
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Comprueba si la clave ha excedido el limite.
 * Devuelve `ok: false` cuando se sobrepasa y NO suma al contador.
 * Devuelve `ok: true` y suma al contador cuando todavia esta dentro.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  maybeCleanup();
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }
  existing.count += 1;
  return {
    ok: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/**
 * Extrae la IP del cliente desde los headers comunes (Vercel pone
 * x-forwarded-for). Si no hay, devuelve "unknown" para que el limite
 * funcione igual aunque agrupando a todos los anonimos.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
