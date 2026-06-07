import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { denyConsent, grantConsent, hasConsentDecision } from "@/lib/analytics";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasConsentDecision()) setVisible(true);
  }, []);

  function accept() {
    grantConsent({ analytics: true, marketing: true });
    setVisible(false);
  }

  function reject() {
    denyConsent();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Aviso de cookies">
      <div className="cookie-banner-inner">
        <p className="cookie-banner-text">
          Usamos cookies propias y de terceros (analítica y marketing) para
          mejorar tu experiencia y medir resultados. Puedes aceptarlas todas o
          rechazarlas.{" "}
          <Link to="/cookies" className="cookie-banner-link">
            Más información
          </Link>
          .
        </p>
        <div className="cookie-banner-actions">
          <button
            type="button"
            className="cookie-banner-btn cookie-banner-btn-ghost"
            onClick={reject}
          >
            Rechazar
          </button>
          <button type="button" className="cookie-banner-btn" onClick={accept}>
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
