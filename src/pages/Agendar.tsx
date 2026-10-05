import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { destinoAgenda } from "@/lib/catalogo";
import { guardarReferido, leerReferido } from "@/lib/referido";
import { SESION_RESERVADA } from "@/lib/routes";

/**
 * `/agendar?ref=CODIGO` — el enlace de agenda de Holman y de los embajadores.
 *
 * Guarda quién trajo a la persona (igual que cualquier `?ref=` del sitio) y
 * muestra dos pasos: abrir la agenda de DelegaWork EN OTRA PESTAÑA y, al
 * volver, ir a `/sesion-reservada` (el video y cómo prepararse). Va en otra
 * pestaña porque DelegaWork no se deja incrustar ni redirige al terminar:
 * así, cuando la persona cierra la agenda, esta página sigue ahí esperándola.
 */
export default function Agendar() {
  const [params] = useSearchParams();
  const ref = params.get("ref");
  const destino = useMemo(() => {
    if (ref) guardarReferido(ref);
    return destinoAgenda(leerReferido());
  }, [ref]);
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    document.title = "Holman Global Group · Sesión de Claridad";
  }, []);

  return (
    <main className="sr ag">
      <div className="sr-glow" aria-hidden />

      <header className="sr-marca">
        <img src="/logo-h.png" alt="" width={36} height={36} />
        <span>Holman Global Group</span>
      </header>

      <section className="sr-hero ag-hero">
        <p className="sr-eyebrow">De regalo · 30 minutos por Zoom</p>
        <h1>Tu Sesión de Claridad</h1>
        <p className="sr-lede">
          Conoceremos tu historia, entenderemos tus objetivos e identificaremos el mejor camino para ayudarte a
          avanzar. Son dos pasos.
        </p>

        <ol className="ag-pasos">
          <li className={`ag-paso${abierta ? " is-hecho" : ""}`}>
            <span className="ag-num">{abierta ? "✓" : "1"}</span>
            <div>
              <h2>Elige tu horario</h2>
              <p>La agenda se abre en otra pestaña. Cuando reserves, vuelve a esta página.</p>
              <a
                className="ag-btn"
                href={destino}
                target="_blank"
                rel="noopener"
                onClick={() => {
                  setAbierta(true);
                  trackEvent("agendar_abrir_agenda", { ref: ref ?? undefined });
                }}
              >
                {abierta ? "Abrir la agenda de nuevo" : "Abrir la agenda"}
                <span aria-hidden>↗</span>
              </a>
            </div>
          </li>
          <li className={`ag-paso${abierta ? " is-activo" : ""}`}>
            <span className="ag-num">2</span>
            <div>
              <h2>¿Ya reservaste?</h2>
              <p>Mira el video de bienvenida y cómo prepararte para aprovechar al máximo tu sesión.</p>
              <Link
                className="ag-btn ag-btn-2"
                to={SESION_RESERVADA}
                onClick={() => trackEvent("agendar_siguiente_paso")}
              >
                Ver mi siguiente paso
                <span aria-hidden>→</span>
              </Link>
            </div>
          </li>
        </ol>
      </section>

      <footer className="sr-pie">
        <a href="/">holmanglobalgroup.com</a>
      </footer>
    </main>
  );
}
