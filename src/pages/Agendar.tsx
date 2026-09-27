import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { destinoAgenda } from "@/lib/catalogo";
import { guardarReferido, leerReferido } from "@/lib/referido";

/**
 * `/agendar?ref=CODIGO` — el enlace que comparten los embajadores.
 *
 * Guarda quién trajo a la persona (igual que cualquier `?ref=` del sitio) y la
 * lleva a la agenda de la Sesión de Claridad. Si la redirección tarda o el
 * navegador la frena, el botón queda a la vista.
 */
export default function Agendar() {
  const [params] = useSearchParams();
  const ref = params.get("ref");
  const destino = useMemo(() => {
    if (ref) guardarReferido(ref);
    return destinoAgenda(leerReferido());
  }, [ref]);

  useEffect(() => {
    document.title = "Holman Global Group · Sesión de Claridad";
    const t = setTimeout(() => window.location.replace(destino), 900);
    return () => clearTimeout(t);
  }, [destino]);

  return (
    <main className="agendar">
      <img src="/logo-h.png" alt="" width={72} height={72} className="agendar-logo" />
      <p className="club-eyebrow">Sentido · Marca · Sistema</p>
      <h1>Sesión de Claridad</h1>
      <p>
        Conoceremos tu historia, entenderemos tus objetivos e identificaremos el mejor camino para ayudarte a
        avanzar. Te estamos llevando a la agenda para que elijas tu horario.
      </p>
      <a href={destino} className="club-btn">Ir a la agenda</a>
    </main>
  );
}
