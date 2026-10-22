import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { CURSOS, type Curso } from "@/lib/cursos";

/**
 * La colección de cursos en la marca clara (base .em de emociones.css), de
 * /cursos. Devuelve secciones sueltas: el contenedor `.em cu` lo pone la
 * página, porque los estilos van por `.em > …`.
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

export function CursosColeccion() {
  const [destacado, ...resto] = CURSOS;
  return (
    <>
      {/* Hero: texto + el paquete en computador y celular */}
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
        <div className="cu-paquete">
          <img
            src="/cursos/paquete-emociones.webp"
            alt="El curso Gestión de las emociones en computador y celular, con su workbook impreso"
            width={1100}
            height={822}
          />
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
    </>
  );
}
