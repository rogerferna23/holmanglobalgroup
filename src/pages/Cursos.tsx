import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CookieBanner } from "@/components/cookie-banner";
import { trackEvent } from "@/lib/analytics";
import { CURSOS, type Curso } from "@/lib/cursos";

/**
 * `/cursos` — la colección de cursos, talleres y ebooks, con sus portadas.
 * Va en la marca clara (base .em de emociones.css), como cada curso. La
 * pestaña «Cursos» de la tienda trae aquí. El primero de CURSOS va destacado.
 */
const precio = (usd: number) => `USD ${Number.isInteger(usd) ? usd : usd.toFixed(2).replace(".", ",")}`;
const num = (i: number) => String(i + 1).padStart(2, "0");

const CONFIANZA = ["Acceso inmediato", "A tu ritmo", "Garantía de 7 días", "Pago seguro con Hotmart"];

/** Enlace a la página del curso: interno (Link) o el pago de Hotmart. */
function Ir({ c, className, children }: { c: Curso; className: string; children: React.ReactNode }) {
  const onClick = () => trackEvent("cursos_click", { curso: c.id });
  return c.externo ? (
    <a className={className} href={c.href} onClick={onClick}>{children}</a>
  ) : (
    <Link className={className} to={c.href} onClick={onClick}>{children}</Link>
  );
}

export default function Cursos() {
  useEffect(() => {
    document.title = "Cursos · Holman Global Group";
  }, []);

  const [destacado, ...resto] = CURSOS;

  return (
    <main className="em cu">
      <header className="em-marca">
        <Link to="/" className="cu-marca">
          <img src="/logo-h.png" alt="" width={34} height={34} />
          <span>Holman Global Group</span>
        </Link>
        <Link to="/tienda" className="cu-volver">Tienda</Link>
      </header>

      {/* Hero: texto + las portadas en abanico */}
      <section className="cu-hero">
        <div className="cu-hero-txt">
          <p className="em-kicker">La colección · Cursos en video</p>
          <h1>
            Aprende a tu ritmo,
            <br />
            <em>cuando quieras</em>
          </h1>
          <span className="em-filete" aria-hidden />
          <p className="em-lede">
            Cursos, talleres y clases para entender tu mente, tus emociones y tu negocio. Los ves desde el celular o el
            computador y avanzas a tu ritmo.
          </p>
          <a className="em-btn" href="#coleccion">Ver la colección</a>
        </div>
        <div className="cu-abanico" aria-hidden>
          {CURSOS.slice(0, 3).map((c, i) => (
            <img key={c.id} src={c.portada} alt="" width={800} height={800} className={`cu-carta cu-carta-${i}`} />
          ))}
        </div>
      </section>

      <ul className="cu-confianza">
        {CONFIANZA.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      {/* El curso principal, en grande */}
      <section className="cu-destacado" id="coleccion">
        <Ir c={destacado} className="cu-dest-portada">
          <img src={destacado.portada} alt={`Portada de ${destacado.titulo}`} width={800} height={800} />
        </Ir>
        <div className="cu-dest-info">
          <p className="cu-num">{num(0)} <span>· El más completo</span></p>
          <p className="em-kicker">{destacado.tipo}</p>
          <h2>{destacado.titulo}</h2>
          <p className="cu-dest-sub">{destacado.subtitulo}</p>
          <ul className="cu-dest-incluye">
            {destacado.incluye.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <div className="cu-dest-pie">
            <strong>{precio(destacado.precioUsd)}</strong>
            <Ir c={destacado} className="em-btn">{destacado.externo ? "Comprar" : "Ver el curso"}</Ir>
          </div>
        </div>
      </section>

      {/* El resto, en formato editorial */}
      <section className="cu-lista">
        {resto.map((c, i) => (
          <article key={c.id} className="cu-item">
            <Ir c={c} className="cu-item-portada">
              <img src={c.portada} alt={`Portada de ${c.titulo}`} width={800} height={800} loading="lazy" />
            </Ir>
            <p className="cu-num">{num(i + 1)}</p>
            <p className="em-kicker">{c.tipo}</p>
            <h3>{c.titulo}</h3>
            <p className="cu-item-sub">{c.subtitulo}</p>
            <div className="cu-item-pie">
              <strong>{precio(c.precioUsd)}</strong>
              <Ir c={c} className="cu-ver">{c.externo ? "Comprar" : "Ver el curso"} →</Ir>
            </div>
          </article>
        ))}
      </section>

      <section className="cu-cita">
        <img src="/emociones/holman-claro.webp" alt="" width={96} height={96} loading="lazy" />
        <blockquote>
          «Cada curso nace de lo que veo en mis sesiones: herramientas que funcionan, explicadas para que las uses hoy
          mismo».
        </blockquote>
        <p className="em-firma">Holman Orjuela · Coach expansivo</p>
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
