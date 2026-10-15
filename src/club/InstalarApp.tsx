import { useEffect, useState } from "react";
import { abiertaComoApp, alCambiarInstalable, instalarDirecto, puedeInstalarDirecto } from "@/lib/app-instalable";

/**
 * Aviso en Inicio: «Guarda ECOS en tu celular». Solo en celular, solo si no se
 * abrió ya como app y hasta que la persona lo cierre (la marca vive en el
 * navegador). En Android con Chrome trae un botón que instala directo; en
 * iPhone explica los dos toques (Compartir → Agregar a inicio).
 */
const CERRADO = "ecos-app-aviso-cerrado";

function cerradoAntes(): boolean {
  try {
    return localStorage.getItem(CERRADO) === "1";
  } catch {
    return false;
  }
}

export function InstalarApp() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const iphone = /iPhone|iPad|iPod/i.test(ua);
  const android = /Android/i.test(ua);
  const [visible, setVisible] = useState(() => (iphone || android) && !abiertaComoApp() && !cerradoAntes());
  const [directo, setDirecto] = useState(puedeInstalarDirecto);

  useEffect(() => alCambiarInstalable(() => setDirecto(puedeInstalarDirecto())), []);

  function cerrar() {
    try { localStorage.setItem(CERRADO, "1"); } catch { /* sin almacenamiento */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="club-toast club-instalar" role="status">
      <span>
        <strong>Guarda ECOS en tu celular</strong> y entra a tu panel con un toque, sin escribir nada.{" "}
        {directo ? (
          <button type="button" className="club-link" onClick={async () => { if (await instalarDirecto()) cerrar(); }}>
            Instalar ECOS
          </button>
        ) : iphone ? (
          <>En Safari, toca <b>Compartir</b> (el cuadro con la flecha hacia arriba) y elige <b>Agregar a inicio</b>.</>
        ) : (
          <>Abre el menú <b>⋮</b> del navegador y toca <b>Instalar app</b> o <b>Agregar a la pantalla de inicio</b>.</>
        )}
      </span>
      <button type="button" aria-label="Cerrar" onClick={cerrar}>×</button>
    </div>
  );
}
