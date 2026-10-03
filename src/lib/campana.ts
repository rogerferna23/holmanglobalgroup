/**
 * Visitas que llegan por una campaña pagada (pauta de Roger).
 *
 * Roger cobra su parte solo sobre los miembros que trajo una campaña, así que
 * el sitio tiene que reconocer esa visita y recordarla hasta que la persona
 * cree su cuenta (puede tardar días). Va en el metadata del registro y la base
 * marca la ficha con `de_campana` (migración 20261014_ecos_origen_campana).
 *
 * Cuenta como campaña:
 *  - un clic de anuncio: gclid / gbraid / wbraid (Google), ttclid (TikTok),
 *    msclkid (Microsoft);
 *  - o `utm_medium` de pauta: paid, cpc, ppc, cpm, ads, paid_social, display, pauta.
 * El fbclid solo NO cuenta: Facebook lo pega a cualquier enlace compartido, también
 * al que manda un embajador. En los anuncios de Meta hay que poner utm_medium=paid.
 *
 * Gana la primera campaña (no se pisa con otra visita) y caduca a los 60 días.
 */
const CLAVE = "hgg_campana";
const DIAS = 60;

const CLICS = ["gclid", "gbraid", "wbraid", "ttclid", "msclkid"] as const;
const MEDIO_PAGADO = /^(paid|paid[_-]?social|paid[_-]?search|cpc|ppc|cpm|cpv|ads?|display|pauta|sponsored)$/i;

export type Campana = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  clic?: string;
  pagina?: string;
  ts: number;
};

function corto(v: string | null): string | undefined {
  const t = (v ?? "").trim().slice(0, 80);
  return t || undefined;
}

/** Si los parámetros de la URL son de una campaña pagada, la guarda. */
export function guardarCampana(search: string, pathname: string): void {
  const p = new URLSearchParams(search);
  const clic = CLICS.find((k) => p.get(k));
  const medio = corto(p.get("utm_medium"));
  if (!clic && !(medio && MEDIO_PAGADO.test(medio))) return;
  if (leerCampana()) return; // gana la primera
  const c: Campana = {
    utm_source: corto(p.get("utm_source")),
    utm_medium: medio,
    utm_campaign: corto(p.get("utm_campaign")),
    utm_content: corto(p.get("utm_content")),
    clic,
    pagina: pathname.slice(0, 80),
    ts: Date.now(),
  };
  try {
    localStorage.setItem(CLAVE, JSON.stringify(c));
  } catch {
    /* navegación privada: se sigue sin marcar la campaña */
  }
}

export function leerCampana(): Campana | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const c = JSON.parse(crudo) as Campana;
    if (c?.ts && Date.now() - c.ts < DIAS * 86_400_000) return c;
    localStorage.removeItem(CLAVE);
  } catch {
    /* almacenamiento bloqueado o dato roto */
  }
  return null;
}
