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
    document.title = "Sesión de Claridad · Holman Global Group";
    const t = setTimeout(() => window.location.replace(destino), 900);
    return () => clearTimeout(t);
  }, [destino]);

  return (
    <main className="agendar">
      <img src="/logo-elefante.png" alt="" width={72} height={72} className="agendar-logo" />
      <p className="club-eyebrow">Holman Global Group</p>
      <h1>Tu Sesión de Claridad</h1>
      <p>Media hora, gratis, por videollamada. Te estamos llevando a la agenda para que elijas tu horario.</p>
      <a href={destino} className="club-btn">Ir a la agenda</a>
    </main>
  );
}
