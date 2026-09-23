/**
 * Quién trajo a esta persona.
 *
 * El enlace de un embajador es `holmanglobalgroup.com/?ref=CODIGO` y sirve para
 * todo: el club y la tienda. Por eso el código se captura en cualquier página,
 * no solo en la del club.
 *
 * Se guarda en localStorage y no en la sesión: entre que alguien ve el enlace y
 * decide comprar pueden pasar días, y si se pierde al cerrar el navegador, el
 * embajador pierde una comisión que sí se ganó. Caduca a los 60 días para que
 * un enlace viejo no se lleve el crédito de una venta que ya no trajo.
 */
const CLAVE = "hgg_ref";
const DIAS = 60;

type Guardado = { code: string; ts: number };

export function guardarReferido(code: string | null | undefined): void {
  const limpio = (code ?? "").trim().toUpperCase().slice(0, 32);
  if (!limpio) return;
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ code: limpio, ts: Date.now() } satisfies Guardado));
    // El flujo del club lee esta otra clave desde antes.
    sessionStorage.setItem("ecos_ref", limpio);
    sessionStorage.setItem(CLAVE, limpio);
  } catch {
    /* navegación privada o almacenamiento bloqueado: se sigue sin atribución */
  }
}

export function leerReferido(): string | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const g = JSON.parse(crudo) as Guardado;
      if (g?.code && Date.now() - g.ts < DIAS * 86_400_000) return g.code;
      localStorage.removeItem(CLAVE);
    }
    return sessionStorage.getItem(CLAVE) || sessionStorage.getItem("ecos_ref");
  } catch {
    return null;
  }
}
