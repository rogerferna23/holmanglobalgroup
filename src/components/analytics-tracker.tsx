import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent, trackPageView } from "@/lib/analytics";

/**
 * Sin UI. Reporta page_view en cada cambio de ruta (SPA) y, por delegación,
 * un evento whatsapp_click para cualquier CTA de WhatsApp del sitio.
 * Ambos son no-op hasta que el usuario da su consentimiento.
 */
export function AnalyticsTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    trackPageView(pathname + search);
  }, [pathname, search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      const link = el?.closest<HTMLAnchorElement>(
        'a[href*="wa.me"], a[href*="api.whatsapp.com"]'
      );
      if (link) trackEvent("whatsapp_click", { link_url: link.href });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
