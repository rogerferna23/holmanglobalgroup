import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Sin UI. Al navegar entre rutas del sitio (react-router no lo hace por sí
 * solo) devuelve el scroll al inicio, para no aterrizar a media página.
 *
 * No actúa si la URL trae hash (#proceso, #experiencias…): en ese caso el
 * destino es un ancla concreta y el navegador ya se encarga de posicionarlo.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  // useLayoutEffect: se reposiciona ANTES de pintar la página nueva, para que
  // no se vea un fotograma con el contenido nuevo a la altura de scroll vieja.
  useLayoutEffect(() => {
    if (hash) return;
    // "instant" salta el `scroll-behavior: smooth` global: al cambiar de página
    // queremos un corte seco, no ver bajar 3.000px animados.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);

  return null;
}
