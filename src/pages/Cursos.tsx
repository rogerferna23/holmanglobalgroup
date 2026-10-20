import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CookieBanner } from "@/components/cookie-banner";
import { trackEvent } from "@/lib/analytics";
import { CURSOS, type Curso } from "@/lib/cursos";

/**
 * `/cursos` — la colección de cursos, talleres y ebooks, con sus portadas.
 * Va en la marca clara (base .em de emociones.css), como cada curso. La
 * pestaña «Cursos» de la tienda trae aquí.
 */
const precio = (usd: number) => `USD ${Number.isInteger(usd) ? usd : usd.toFixed(2).replace(".", ",")}`;

function Tarjeta({ c }: { c: Curso }) {
  const contenido = (
    <>
      <div className="cu-portada">
        <img src={c.portada} alt={`Portada de ${c.titulo}`} width={800} height={800} loading="lazy" />
      </div>
      <div className="cu-info">
        <p className="em-kicker">{c.tipo}</p>
        <h2>{c.titulo}</h2>
        <p className="cu-sub">{c.subtitulo}</p>
        <p className="cu-incluye">{c.incluye.join(" · ")}</p>
        <div className="cu-pie">
          <strong>{precio(c.precioUsd)}</strong>
          <span className="cu-ver">{c.externo ? "Comprar" : "Ver el curso"} →</span>
        </div>
      </div>
    </>
  );
  const onClick = () => trackEvent("cursos_click", { curso: c.id });
  return c.externo ? (
    <a className="cu-tarjeta" href={c.href} onClick={onClick}>{contenido}</a>
  ) : (
    <Link className="cu-tarjeta" to={c.href} onClick={onClick}>{contenido}</Link>
  );
}

export default function Cursos() {
  useEffect(() => {
    document.title = "Cursos · Holman Global Group";
  }, []);

  return (
    <main className="em cu">
      <header className="em-marca">
        <Link to="/" className="cu-marca">
          <img src="/logo-h.png" alt="" width={34} height={34} />
          <span>Holman Global Group</span>
        </Link>
        <Link to="/tienda" className="cu-volver">Tienda</Link>
      </header>

      <section className="cu-hero">
        <p className="em-kicker">Cursos · A tu ritmo</p>
        <h1>Aprende a tu ritmo, cuando quieras</h1>
        <span className="em-filete" aria-hidden />
        <p className="em-lede">
          Cursos, talleres y clases en video para entender tu mente, tus emociones y tu negocio. Los ves desde el
          celular o el computador, con garantía de 7 días.
        </p>
      </section>

      <section className="cu-grid">
        {CURSOS.map((c) => (
          <Tarjeta key={c.id} c={c} />
        ))}
      </section>

      <section className="em-cierre">
        <img src="/logo-elefante.png" alt="" width={64} height={64} loading="lazy" />
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
