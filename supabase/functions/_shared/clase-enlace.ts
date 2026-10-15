// El enlace personal para entrar a una clase de ECOS desde el correo.
//
// Lleva la clase y la persona, firmados con una clave que solo conoce el
// servidor (sacada del secreto de las tareas, ecos_privado.cron_secret). Nadie
// puede fabricar uno para otra persona u otra clase. Lo firma ecos-clases y lo
// revisa ecos-entrar, que en el momento del clic mira si la persona sigue con
// acceso y solo entonces la manda al Zoom.

const cod = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function clave(secreto: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw", cod.encode(`ecos-clase:${secreto}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"],
  );
}

/** «t» del enlace: clase y persona + firma. */
export async function firmarEnlace(secreto: string, sessionId: string, memberId: string): Promise<string> {
  const datos = cod.encode(`${sessionId}|${memberId}`);
  const firma = new Uint8Array(await crypto.subtle.sign("HMAC", await clave(secreto), datos));
  return `${b64url(datos)}.${b64url(firma.slice(0, 18))}`;
}

/** La clase y la persona del enlace, o null si no es auténtico. */
export async function leerEnlace(
  secreto: string, t: string,
): Promise<{ sessionId: string; memberId: string } | null> {
  const [d, f] = t.split(".");
  if (!d || !f) return null;
  try {
    const datos = deB64url(d);
    const firma = new Uint8Array(await crypto.subtle.sign("HMAC", await clave(secreto), datos)).slice(0, 18);
    const recibida = deB64url(f);
    if (recibida.length !== firma.length) return null;
    let dif = 0;
    for (let i = 0; i < firma.length; i++) dif |= firma[i] ^ recibida[i];
    if (dif !== 0) return null;
    const [sessionId, memberId] = new TextDecoder().decode(datos).split("|");
    return sessionId && memberId ? { sessionId, memberId } : null;
  } catch {
    return null;
  }
}

/** Lo que hace falta de una ficha para saber si hoy tiene acceso. */
export type FichaAcceso = {
  status: string; teacher: boolean; cortesia: boolean; founder: boolean; prueba_hasta: string | null;
};

/** La misma regla que is_ecos_member(): activo, profesor, cortesía o en su prueba. */
export function tieneAcceso(m: FichaAcceso, finFundadores: number, ahora: number): boolean {
  if (m.status === "activo" || m.teacher || m.cortesia) return true;
  if (m.status !== "pendiente") return false;
  return (m.founder && ahora < finFundadores) || (!!m.prueba_hasta && ahora < new Date(m.prueba_hasta).getTime());
}

/** Fin del cupo fundador (ecos_settings.trial_end). */
export function finFundadoresDe(valor: string | null | undefined): number {
  return new Date(valor?.trim() || "2026-11-05T12:00:00-05:00").getTime();
}
