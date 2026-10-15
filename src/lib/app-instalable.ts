import { ADMIN_BASE, CLUB } from "@/lib/routes";

/**
 * La Torre y ECOS como apps del celular («Agregar a inicio» en iPhone,
 * «Instalar app» en Android). Mientras se está dentro de una de ellas, la
 * cabeza de la página apunta a su propio manifiesto e ícono, así el acceso
 * directo abre su panel y no la home. Al salir se devuelve todo como estaba.
 *
 * Cada manifiesto (`public/torre-app/`, `public/ecos-app/`) repite su ruta:
 * si cambia `ADMIN_BASE` o la del panel del club, cambia también ahí.
 */
export type AppInstalable = { manifest: string; icono: string; titulo: string };

export const TORRE: AppInstalable = {
  manifest: "/torre-app/manifest.webmanifest",
  icono: "/torre-app/apple-touch-icon.png",
  titulo: "Torre",
};

/** ECOS: el panel del miembro. También en la puerta (/ecos/entrar), por si guarda el acceso desde ahí. */
export const ECOS_APP: AppInstalable = {
  manifest: "/ecos-app/manifest.webmanifest",
  icono: "/ecos-app/apple-touch-icon.png",
  titulo: "ECOS",
};

const originales = new Map<Element, string | null>();

function poner(selector: string, crear: () => HTMLElement, attr: string, valor: string) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = crear();
    el.setAttribute("data-torre", "nuevo");
    document.head.appendChild(el);
  } else if (!originales.has(el)) {
    originales.set(el, el.getAttribute(attr));
  }
  el.setAttribute(attr, valor);
}

function link(rel: string) {
  return () => Object.assign(document.createElement("link"), { rel });
}

function meta(name: string) {
  return () => Object.assign(document.createElement("meta"), { name });
}

const dentro = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

/** Qué app corresponde a esta ruta, o null si es el sitio. */
export function appDe(pathname: string): AppInstalable | null {
  if (dentro(pathname, ADMIN_BASE)) return TORRE;
  if (dentro(pathname, CLUB.panel) || pathname === CLUB.entrar) return ECOS_APP;
  return null;
}

export function activarApp(app: AppInstalable) {
  poner('link[rel="manifest"]', link("manifest"), "href", app.manifest);
  poner('link[rel="apple-touch-icon"]', link("apple-touch-icon"), "href", app.icono);
  poner('meta[name="apple-mobile-web-app-title"]', meta("apple-mobile-web-app-title"), "content", app.titulo);
  poner('meta[name="apple-mobile-web-app-capable"]', meta("apple-mobile-web-app-capable"), "content", "yes");
  poner('meta[name="mobile-web-app-capable"]', meta("mobile-web-app-capable"), "content", "yes");
  poner(
    'meta[name="apple-mobile-web-app-status-bar-style"]',
    meta("apple-mobile-web-app-status-bar-style"),
    "content",
    "black-translucent",
  );
}

export function desactivarApp() {
  document.head.querySelectorAll('[data-torre="nuevo"]').forEach((el) => el.remove());
  originales.forEach((valor, el) => {
    const attr = el.tagName === "LINK" ? "href" : "content";
    if (valor === null) el.removeAttribute(attr);
    else el.setAttribute(attr, valor);
  });
  originales.clear();
}

// ---------------------------------------------------------------------------
// «Instalar app» en Android/Chrome: el navegador avisa una sola vez, a veces
// antes de que se pinte el panel. Se guarda el aviso desde el arranque.
// ---------------------------------------------------------------------------

type AvisoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let avisoInstalar: AvisoInstalar | null = null;
const oyentes = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    avisoInstalar = e as AvisoInstalar;
    oyentes.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => {
    avisoInstalar = null;
    oyentes.forEach((f) => f());
  });
}

/** ¿El navegador ofrece instalar con un botón (Android/Chrome)? */
export function puedeInstalarDirecto(): boolean {
  return avisoInstalar !== null;
}

/** Avisa cuando cambia si se puede instalar directo. Devuelve cómo dejar de escuchar. */
export function alCambiarInstalable(f: () => void): () => void {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

/** Abre el cuadro de instalación del navegador. true si la persona aceptó. */
export async function instalarDirecto(): Promise<boolean> {
  if (!avisoInstalar) return false;
  const aviso = avisoInstalar;
  avisoInstalar = null;
  await aviso.prompt();
  const { outcome } = await aviso.userChoice;
  oyentes.forEach((f) => f());
  return outcome === "accepted";
}

/** Ya se abrió como app (desde el ícono de inicio). */
export function abiertaComoApp(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
