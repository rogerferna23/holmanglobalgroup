// Analítica vía Google Tag Manager con Consent Mode v2.
//
// El código SOLO carga GTM; GA4 y Meta Pixel se configuran como tags DENTRO de
// GTM (en su interfaz). No hay scripts inline → compatible con la CSP estricta
// del .htaccess. Nada de tracking se activa hasta que el usuario da su
// consentimiento (opt-in RGPD); GTM se carga con todo en "denied" por defecto.

const GTM_ID = (import.meta.env.VITE_GTM_ID as string | undefined)?.trim();
const CONSENT_KEY = "hgg-consent-v2";

export type Consent = { analytics: boolean; marketing: boolean };

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

function dataLayer(): unknown[] {
  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

// gtag estándar de Google: empuja el objeto `arguments` al dataLayer (es lo que
// espera el Consent Mode; NO es equivalente a empujar un array normal).
const gtag: (...args: unknown[]) => void = function () {
  dataLayer().push(arguments);
};

let gtmLoaded = false;

function loadGtm() {
  if (gtmLoaded || !GTM_ID || typeof document === "undefined") return;
  gtmLoaded = true;
  dataLayer().push({ "gtm.start": Date.now(), event: "gtm.js" });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(s);
}

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Consent>;
    return { analytics: !!v.analytics, marketing: !!v.marketing };
  } catch {
    return null;
  }
}

function saveConsent(c: Consent) {
  try {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ ...c, at: new Date().toISOString() })
    );
  } catch {
    /* localStorage no disponible */
  }
}

function applyConsent(c: Consent) {
  gtag("consent", "update", {
    analytics_storage: c.analytics ? "granted" : "denied",
    ad_storage: c.marketing ? "granted" : "denied",
    ad_user_data: c.marketing ? "granted" : "denied",
    ad_personalization: c.marketing ? "granted" : "denied",
  });
  // Evento para que los triggers de GTM (p. ej. Meta Pixel) puedan engancharse.
  dataLayer().push({
    event: "consent_update",
    analytics_consent: c.analytics ? "granted" : "denied",
    marketing_consent: c.marketing ? "granted" : "denied",
  });
}

/**
 * Llamar UNA vez al arrancar la app (antes de render). Fija los valores por
 * defecto de Consent Mode en `denied` y, si el visitante ya consintió en una
 * visita previa, carga GTM y aplica su elección.
 */
export function initConsent() {
  if (typeof window === "undefined") return;
  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });
  gtag("set", "ads_data_redaction", true);

  const stored = readConsent();
  if (stored && (stored.analytics || stored.marketing)) {
    loadGtm();
    applyConsent(stored);
  }
}

/** ¿Ya hay una decisión guardada? (para decidir si mostrar el banner) */
export function hasConsentDecision(): boolean {
  return readConsent() !== null;
}

/** El usuario acepta. Carga GTM si hace falta y concede el consentimiento. */
export function grantConsent(
  consent: Consent = { analytics: true, marketing: true }
) {
  saveConsent(consent);
  loadGtm();
  applyConsent(consent);
  // En la primera carga el tracker de ruta ya disparó (sin efecto) antes de
  // aceptar; lanzamos aquí el primer page_view real.
  trackPageView(window.location.pathname + window.location.search);
}

/** El usuario rechaza. Guarda la decisión y mantiene todo en denied. */
export function denyConsent() {
  const consent: Consent = { analytics: false, marketing: false };
  saveConsent(consent);
  applyConsent(consent);
}

/** Page view para SPA — se llama en cada cambio de ruta. No-op sin consentimiento. */
export function trackPageView(path: string) {
  if (!gtmLoaded) return;
  dataLayer().push({ event: "page_view", page_path: path });
}

/** Evento genérico (conversiones, clics…). No-op sin consentimiento. */
export function trackEvent(event: string, params: Record<string, unknown> = {}) {
  if (!gtmLoaded) return;
  dataLayer().push({ event, ...params });
}
