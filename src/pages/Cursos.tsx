import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CookieBanner } from "@/components/cookie-banner";
import { CursosColeccion } from "@/components/cursos-coleccion";

/**
 * `/cursos` — la colección de cursos, talleres y ebooks, con sus portadas.
 * Va en la marca clara (base .em de emociones.css), como cada curso. Se llega
 * desde «Cursos» en el menú de arriba y desde la franja de la tienda.
 */
export default function Cursos() {
  useEffect(() => {
    document.title = "Cursos · Holman Global Group";
  }, []);

  return (
    <main className="em cu">
      <header className="em-marca">
        <Link to="/" className="cu-marca">
          <img src="/marca/logo-h-claro.png" alt="" width={34} height={34} />
          <span>Holman Global Group</span>
        </Link>
        <Link to="/tienda" className="cu-volver">Tienda</Link>
      </header>

      <CursosColeccion />

      <section className="cu-cita">
        <img src="/emociones/holman-claro.webp" alt="" width={96} height={96} loading="lazy" />
        <blockquote>
          «Cada curso nace de lo que veo en mis sesiones: herramientas que funcionan, explicadas para que las uses hoy
          mismo».
        </blockquote>
        <p className="em-firma">Holman Orjuela · Coach expansivo</p>
      </section>

      <section className="em-cierre">
        <img src="/marca/logo-elefante-claro.png" alt="" width={64} height={64} loading="lazy" />
        <h2>¿Prefieres que alguien te acompañe?</h2>
        <p>Una Sesión de Claridad con Holman o alguien de su equipo: una conversación 1 a 1 para mirar dónde estás y cuál es tu siguiente paso.</p>
        <div className="em-acciones">
          <a className="em-btn" href="/claridad?desde=cursos">Agenda tu Sesión de Claridad</a>
        </div>
      </section>

      <footer className="em-pie">
        <a href="/">holmanglobalgroup.com</a>
      </footer>
      <CookieBanner />
    </main>
  );
}
