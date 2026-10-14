import { ADMIN_BASE } from "@/lib/routes";

/**
 * La Torre como app del celular («Agregar a inicio» en iPhone, «Instalar app»
 * en Android). Mientras se está dentro de la Torre, la cabeza de la página
 * apunta a su propio manifiesto e ícono (la H; el elefante es del RPG), así el acceso directo
 * abre el panel y no la home. Al salir se devuelve todo como estaba.
 *
 * El manifiesto (`public/torre-app/manifest.webmanifest`) repite la ruta
 * `/torre`: si cambia `ADMIN_BASE`, cambia también ahí.
 */
const TORRE = {
  manifest: "/torre-app/manifest.webmanifest",
  icono: "/torre-app/apple-touch-icon.png",
  titulo: "Torre",
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

export function esTorre(pathname: string) {
  return pathname === ADMIN_BASE || pathname.startsWith(`${ADMIN_BASE}/`);
}

export function activarAppTorre() {
  poner('link[rel="manifest"]', link("manifest"), "href", TORRE.manifest);
  poner('link[rel="apple-touch-icon"]', link("apple-touch-icon"), "href", TORRE.icono);
  poner('meta[name="apple-mobile-web-app-title"]', meta("apple-mobile-web-app-title"), "content", TORRE.titulo);
  poner('meta[name="apple-mobile-web-app-capable"]', meta("apple-mobile-web-app-capable"), "content", "yes");
  poner('meta[name="mobile-web-app-capable"]', meta("mobile-web-app-capable"), "content", "yes");
  poner(
    'meta[name="apple-mobile-web-app-status-bar-style"]',
    meta("apple-mobile-web-app-status-bar-style"),
    "content",
    "black-translucent",
  );
}

export function desactivarAppTorre() {
  document.head.querySelectorAll('[data-torre="nuevo"]').forEach((el) => el.remove());
  originales.forEach((valor, el) => {
    const attr = el.tagName === "LINK" ? "href" : "content";
    if (valor === null) el.removeAttribute(attr);
    else el.setAttribute(attr, valor);
  });
  originales.clear();
}
