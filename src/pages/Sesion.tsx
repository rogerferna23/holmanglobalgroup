import { useEffect } from "react";
import { SESION_URL } from "@/lib/catalogo";

/**
 * `/sesion` — el enlace que Holman le manda a quien ya compró sesiones de
 * coaching. Lleva a la agenda de sesiones en DelegaWork. Existe para que al
 * pegarlo en WhatsApp salga la tarjeta de HGG («Sesión de coaching») y no la de
 * la plataforma de agenda. Si la redirección tarda, el botón queda a la vista.
 */
export default function Sesion() {
  useEffect(() => {
    document.title = "Holman Global Group · Sesión de coaching";
    const t = setTimeout(() => window.location.replace(SESION_URL), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="agendar">
      <img src="/logo-h.png" alt="" width={72} height={72} className="agendar-logo" />
      <p className="club-eyebrow">Sentido · Marca · Sistema</p>
      <h1>Sesión de coaching</h1>
      <p>
        Tu espacio para avanzar con claridad. Te estamos llevando a la agenda para que elijas el día y la
        hora de tu sesión.
      </p>
      <a href={SESION_URL} className="club-btn">Ir a la agenda</a>
    </main>
  );
}
