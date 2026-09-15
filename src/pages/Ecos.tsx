import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Seo } from "@/components/seo";
import { Reveal } from "@/components/reveal";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { ECOS, isFounderWindowOpen } from "@/lib/ecos";
import { CLUB } from "@/lib/routes";
import { PAGE_SEO } from "@/lib/seo";

const MATERIAS = [
  {
    label: "Ventas",
    who: "con Zack",
    claim: "Comunicar para que alguien decida.",
    body: "La estructura de una oferta que se entiende, la conversación que llega al sí, y qué hacer cuando escuchas «déjame pensarlo».",
  },
  {
    label: "Marketing",
    who: "con Nati",
    claim: "Comunicar para que te encuentren.",
    body: "Talleres, no cátedra: sales del martes con la pieza hecha y publicada. El contenido que hace que te escriban primero.",
  },
  {
    label: "Oratoria",
    who: "con Holman",
    claim: "Comunicar para que te crean.",
    body: "Respiración, ritmo, presencia y la estructura de una charla. El poder de la música aplicado a tu propia voz.",
  },
];

const MES = [
  ["Semana 1", "Clase de ventas · Zack", "Práctica de ventas"],
  ["Semana 2", "Taller de marketing · Nati", "—"],
  ["Semana 3", "Clase de oratoria · Holman", "Práctica de oratoria"],
  ["Semana 4", "Masterclass · Holman", "—"],
];

const SALES = [
  "Tu nivel en Ventas, Marketing y Oratoria subiendo cada semana que vienes",
  "Tu oferta dicha en 90 segundos, probada frente a gente real",
  "Piezas publicadas, hechas en los talleres",
  "Una conversación de ventas que sostienes, con las objeciones practicadas",
  "Una charla de cinco minutos lista para un escenario o un live",
  "Una comunidad que sabe qué haces y lo recomienda",
];

const INCLUYE = [
  "3 clases al mes: ventas, marketing y oratoria",
  "2 prácticas donde te paras y te ven",
  "Masterclass mensual de Holman",
  "Tu avance en modo RPG: niveles, racha e insignias",
  "Todo grabado y guardado en tu panel",
  "10% de descuento en todos los productos de HGG",
  "10% de comisión si alguien que traes compra un producto de HGG",
];

const FAQ = [
  ["¿Necesito tener un negocio ya?", "Necesitas tener algo valioso que dar y ganas de vivir de ello. Muchos entran con una idea; salen con una oferta que saben decir, vender y presentar."],
  ["¿Y si no puedo ir a una clase?", "Todo queda grabado en tu panel el mismo día. Lo que se pierde es la práctica del viernes — esa no se graba, porque es tuya — y la semana de racha."],
  ["¿Qué es eso del modo RPG?", "Cada habilidad tiene un nivel. Cada clase, práctica o reto que haces te da experiencia y sube tu nivel. Hay racha semanal e insignias. Es la forma de ver que estás mejorando aunque los temas cambien cada mes."],
  ["¿Es coaching individual?", "No. ECOS es grupal: formación y práctica. Si en algún momento quieres un proceso individual, eso es el Programa Sentido, y como miembro tendrás prioridad."],
  ["¿Puedo cancelar cuando quiera?", "Sí, desde tu cuenta, sin llamar a nadie. Tu acceso sigue hasta el final del período pagado."],
  ["¿Qué gano si traigo a alguien?", "Si esa persona compra un producto de Holman Global Group, te llevas el 10%. Y por ser del club, tú tienes 10% de descuento en todos los productos. Un solo nivel: ganas por quien tú traes, nunca por lo que traigan ellos."],
];

export default function Ecos() {
  const { search } = useLocation();
  const founder = isFounderWindowOpen();

  // ?ref=CODIGO — se guarda para el checkout, aunque la persona cree cuenta más tarde.
  useEffect(() => {
    const ref = new URLSearchParams(search).get("ref");
    if (ref) sessionStorage.setItem("ecos_ref", ref.trim().toUpperCase());
  }, [search]);

  return (
    <>
      <Seo {...PAGE_SEO.ecos} />

      <section className="ecos-hero">
        <div className="ecos-hero-glow" aria-hidden="true" />
        <Reveal className="shell ecos-hero-content">
          <div className="ecos-lockup">
            <span className="ecos-lockup-brand">{ECOS.brand}</span>
            <span className="ecos-lockup-cat">{ECOS.category}</span>
            <span className="ecos-lockup-desc">{ECOS.descriptor}</span>
          </div>
          <h1 className="display ecos-hero-title">
            Las habilidades que sostienen un negocio,<br />
            <span className="gold">rodeado de las personas correctas.</span>
          </h1>
          <p className="ecos-hero-lede">
            Vender, comunicar y hablar en público. Tres materias, tres profesores, seis encuentros al mes en vivo — y un nivel que sube cada semana que vienes.
          </p>
          <div className="ecos-hero-cta">
            <Link to={CLUB.entrar} className="btn btn-primary btn-xl">
              Quiero entrar a ECOS <ArrowRightIcon className="arrow" />
            </Link>
            <span className="ecos-hero-price">
              <strong>${ECOS.priceUsd}</strong> al mes
              {founder && <em> · octubre gratis para los primeros {ECOS.founderCap}</em>}
            </span>
          </div>
        </Reveal>
      </section>

      <section className="ecos-section">
        <div className="shell">
          <Reveal className="section-head">
            <div className="meta">
              <div className="eyebrow-row"><span className="num">01</span><span className="bar" /><span className="eyebrow">Una sola idea</span></div>
              <h2 className="display">Las tres materias son comunicación.</h2>
            </div>
            <p className="lede">Vender es comunicar para que alguien decida. Marketing es comunicar para que te encuentren. Oratoria es comunicar para que te crean. Por eso en ECOS se aprenden juntas: cada mes, las tres trabajan sobre el mismo reto.</p>
          </Reveal>
          <Reveal stagger className="ecos-materias">
            {MATERIAS.map((m) => (
              <article key={m.label} className="ecos-materia">
                <span className="ecos-materia-label">{m.label} <em>{m.who}</em></span>
                <h3>{m.claim}</h3>
                <p>{m.body}</p>
              </article>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="ecos-section alt">
        <div className="shell">
          <Reveal className="section-head">
            <div className="meta">
              <div className="eyebrow-row"><span className="num">02</span><span className="bar" /><span className="eyebrow">Cómo funciona</span></div>
              <h2 className="display">Martes se aprende. Viernes se practica.</h2>
            </div>
            <p className="lede">Mismo día y misma hora, cada semana. Los temas cambian cada mes — lo que no cambia es que cada vez que vienes, tu nivel sube. Las prácticas son donde te paras a hablar y te ven.</p>
          </Reveal>
          <Reveal className="ecos-table-wrap">
            <table className="ecos-table">
              <thead><tr><th></th><th>Martes</th><th>Viernes</th></tr></thead>
              <tbody>
                {MES.map(([w, m, v]) => (
                  <tr key={w}><td>{w}</td><td>{m}</td><td>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </section>

      <section className="ecos-section">
        <div className="shell ecos-two">
          <Reveal>
            <div className="eyebrow-row"><span className="num">03</span><span className="bar" /><span className="eyebrow">Lo que te llevas</span></div>
            <h2 className="display">Con qué sales.</h2>
            <ul className="ecos-checks">
              {SALES.map((s) => (
                <li key={s}><CheckIcon width={16} height={16} /> {s}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal className="ecos-price-card">
            <span className="eyebrow">Membresía mensual</span>
            <div className="ecos-price"><span>$</span>{ECOS.priceUsd}<small>/ mes</small></div>
            {founder ? (
              <p className="ecos-price-note">
                <strong>Cohorte fundadora:</strong> octubre es gratis para los primeros {ECOS.founderCap}. Registras tu tarjeta al entrar y el primer cobro es el 1 de noviembre. Cancelas cuando quieras.
              </p>
            ) : (
              <p className="ecos-price-note">Sin permanencia. Cancelas cuando quieras desde tu cuenta.</p>
            )}
            <p className="ecos-price-anual">O <strong>${ECOS.priceAnualUsd} al año</strong> — dos meses gratis.</p>
            <ul className="ecos-includes">
              {INCLUYE.map((i) => <li key={i}>{i}</li>)}
            </ul>
            <Link to={CLUB.entrar} className="btn btn-primary ecos-price-cta">
              Entrar a ECOS <ArrowRightIcon className="arrow" />
            </Link>
            <p className="ecos-price-foot">Pago seguro con Stripe · Clases por Zoom</p>
          </Reveal>
        </div>
      </section>

      <section className="ecos-section alt">
        <div className="shell">
          <Reveal className="section-head">
            <div className="meta">
              <div className="eyebrow-row"><span className="num">04</span><span className="bar" /><span className="eyebrow">Preguntas</span></div>
              <h2 className="display">Lo que la gente pregunta antes de entrar.</h2>
            </div>
          </Reveal>
          <Reveal className="ecos-faq">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="ecos-final">
        <Reveal className="shell ecos-final-content">
          <h2 className="display">La vida no es una línea.<br /><span className="gold">Es una partitura.</span></h2>
          <p>Y una partitura se toca mejor acompañado. Entra a ECOS y empieza a decir lo tuyo con claridad, en voz alta, frente a gente que te escucha.</p>
          <Link to={CLUB.entrar} className="btn btn-primary btn-xl">
            Quiero entrar <ArrowRightIcon className="arrow" />
          </Link>
          <p className="ecos-final-firma">ECOS · Business Club — Holman Global Group</p>
        </Reveal>
      </section>
    </>
  );
}
