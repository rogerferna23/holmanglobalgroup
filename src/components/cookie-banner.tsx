import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "hgg-cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      /* localStorage no disponible */
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        accepted: true,
        at: new Date().toISOString(),
      }));
    } catch {
      /* localStorage no disponible */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Aviso de cookies">
      <div className="cookie-banner-inner">
        <p className="cookie-banner-text">
          Usamos cookies propias y de terceros para mejorar tu experiencia. Si
          continúas navegando, consideramos que aceptas su uso.{" "}
          <Link to="/cookies" className="cookie-banner-link">
            Más información
          </Link>
          .
        </p>
        <button
          type="button"
          className="cookie-banner-btn"
          onClick={accept}
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
