// Origin check (CSRF lite). Combinado con `SameSite=Lax` en la cookie de
// sesion, esto basta para bloquear CSRF en la mayoria de casos reales.
//
// Por que funciona:
// - SameSite=Lax: el navegador NO envia la cookie de sesion en POSTs cross-site.
// - Origin header: en estado POST/PUT/PATCH/DELETE, el navegador SIEMPRE
//   envia el Origin. Si no coincide con nuestro dominio, rechazamos.
//
// Esto no requiere tokens CSRF explicitos (mas simple, sin storage extra).
// Para state-changing routes (POST/PUT/PATCH/DELETE):
//   const csrf = enforceOriginCheck(req);
//   if (csrf) return csrf;

import { NextResponse } from "next/server";

/**
 * Dominios aceptados como origen. En produccion: tu dominio + previews.
 * Lee de NEXT_PUBLIC_SITE_URL si esta seteado, sino acepta el host del request.
 */
function getAllowedOrigins(req: Request): Set<string> {
  const allowed = new Set<string>();
  // Permitir el propio host del request (cubre custom domains).
  const url = new URL(req.url);
  allowed.add(url.origin);
  // Permitir el SITE_URL si esta configurado.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      allowed.add(new URL(siteUrl).origin);
    } catch {
      // ignore url invalida
    }
  }
  // En dev tambien aceptamos localhost en cualquier puerto.
  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://localhost:3000");
    allowed.add("http://localhost:3001");
    allowed.add("http://localhost:3002");
  }
  return allowed;
}

/**
 * Devuelve NextResponse 403 si el Origin/Referer del request NO coincide
 * con dominios aceptados. Devuelve null si todo OK.
 */
export function enforceOriginCheck(req: Request): NextResponse | null {
  // GET/HEAD son safe methods, no necesitan check (no cambian estado).
  if (req.method === "GET" || req.method === "HEAD") return null;

  const allowed = getAllowedOrigins(req);
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // Caso 1: hay Origin header — verificarlo (lo mas comun).
  if (origin) {
    if (!allowed.has(origin)) {
      return NextResponse.json(
        { error: "Origen no permitido" },
        { status: 403 }
      );
    }
    return null;
  }

  // Caso 2: no hay Origin (raro en navegadores modernos, pero algunos clientes
  // server-to-server lo omiten). Verificar Referer como fallback.
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (!allowed.has(refOrigin)) {
        return NextResponse.json(
          { error: "Referer no permitido" },
          { status: 403 }
        );
      }
      return null;
    } catch {
      return NextResponse.json(
        { error: "Referer inválido" },
        { status: 403 }
      );
    }
  }

  // Caso 3: ni Origin ni Referer. Esto puede pasar con curl/postman; si la
  // sesion es valida (cookie httpOnly), aceptamos. La cookie SameSite=Lax
  // ya bloquea cross-site automaticamente.
  return null;
}
