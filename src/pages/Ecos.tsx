import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Seo } from "@/components/seo";
import { Reveal } from "@/components/reveal";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { ECOS, isFounderWindowOpen } from "@/lib/ecos";
import { useFounderSpots } from "@/lib/club-store";
import { CLUB } from "@/lib/routes";
import { PAGE_SEO } from "@/lib/seo";

/* Las tres materias. La frase de cada una sale del mismo lugar que el resto
   del negocio: comunicar para decidir, para encontrar, para creer. */
const MATERIAS = [
  {
    label: "Ventas",
    claim: "Comunicar para que alguien decida.",
    body: "La estructura de una oferta que se entiende, la conversación que llega al sí, y qué hacer cuando escuchas «déjame pensarlo».",
  },
  {
    label: "Marketing",
    claim: "Comunicar para que te encuentren.",
    body: "Talleres, no cátedra: sales del martes con la pieza hecha y publicada. El contenido que hace que te escriban primero.",
  },
  {
    label: "Oratoria",
    claim: "Comunicar para que te crean.",
    body: "Respiración, ritmo, presencia y la estructura de una charla. El poder de la música aplicado a tu propia voz.",
  },
];

/* El mes como de verdad está armado en el calendario del club. Si aquí dice
   una cosa y el panel otra, quien se suscribe lo nota el primer martes. */
const MES = [
  ["Semana 1", "Clase de oratoria", "Práctica de oratoria"],
  ["Semana 2", "—", "Taller de marketing"],
  ["Semana 3", "Clase de ventas", "Práctica de ventas"],
  ["Semana 4", "—", "Masterclass"],
];

/* Reemplaza al viejo bloque «lo que te llevas»: en vez de una lista de promesas,
   el contraste entre el punto de partida y el punto de llegada. */
const CAMBIO: { antes: string; despues: string }[] = [
  {
    antes: "Explicas lo que haces y la otra persona se queda con cara de duda.",
    despues: "Dices lo tuyo en 90 segundos y la otra persona pregunta el precio.",
  },
  {
    antes: "Publicas cuando te acuerdas, y casi nunca te acuerdas.",
    despues: "Sales de cada taller con la pieza hecha y publicada ese mismo día.",
  },
  {
    antes: "Escuchas «déjame pensarlo» y ahí se acaba la conversación.",
    despues: "Escuchas «déjame pensarlo» y sabes exactamente qué decir después.",
  },
  {
    antes: "Te invitan a hablar y buscas una excusa para no ir.",
    despues: "Tienes una charla de cinco minutos lista para un escenario o un live.",
  },
  {
    antes: "Bajas el precio antes de que te lo pidan.",
    despues: "Nombras tu precio completo y te quedas tranquilo en el silencio.",
  },
  {
    antes: "Nadie de tu entorno entiende del todo a qué te dedicas.",
    despues: "Tienes una comunidad que sabe qué haces y te recomienda.",
  },
];

/* Valor apilado. `ref` es un valor de referencia en dólares: lo que cuesta algo
   equivalente por separado en el mercado, no un precio de HGG. Se suma en
   pantalla para que la comparación con el precio real la haga el lector. */
const STACK: { title: string; body: string; ref: number }[] = [
  {
    title: "3 clases en vivo al mes",
    body: "Ventas, marketing y oratoria, cada una con su especialista.",
    ref: 180,
  },
  {
    title: "2 prácticas donde hablas y te escuchan",
    body: "Hablas frente a la sala y recibes devolución en el momento.",
    ref: 150,
  },
  {
    title: "Masterclass mensual con Holman",
    body: "Un tema a fondo, con preguntas abiertas al final.",
    ref: 90,
  },
  {
    title: "Todo grabado en tu panel",
    body: "Las clases quedan el mismo día. Las repasas cuando te queda bien.",
    ref: 60,
  },
  {
    title: "Tu avance en modo RPG",
    body: "Niveles por habilidad, racha semanal, retos e insignias.",
    ref: 40,
  },
  {
    title: "Comunidad y directorio de miembros",
    body: "Gente que sabe qué haces, te presenta y te recomienda.",
    ref: 50,
  },
];

const STACK_TOTAL = STACK.reduce((suma, i) => suma + i.ref, 0);

/* Las fotos llegan a /profesores/. Mientras no existan, la tarjeta muestra las
   iniciales sobre el fondo de marca: la página nunca se ve rota. */
const PROFES: { nombre: string; materia: string; foto: string; iniciales: string; bio: string }[] = [
  {
    nombre: "Zack",
    materia: "Ventas",
    foto: "/profesores/zack.jpg",
    iniciales: "Z",
    bio: "Da la clase y la práctica de ventas: la estructura de la oferta, la conversación que llega al sí y el manejo de objeciones reales.",
  },
  {
    nombre: "Ingrid",
    materia: "Marketing",
    foto: "/profesores/ingrid.jpg",
    iniciales: "I",
    bio: "Da el taller de marketing: se trabaja en vivo sobre tu contenido y sales con la pieza publicada, no con apuntes.",
  },
  {
    nombre: "Holman",
    materia: "Oratoria",
    foto: "/profesores/holman.jpg",
    iniciales: "H",
    bio: "Da la clase y la práctica de oratoria, y la masterclass del mes: respiración, ritmo, presencia y estructura de una charla.",
  },
];

const FAQ = [
  ["¿Necesito tener un negocio ya?", "Necesitas tener algo valioso que dar y ganas de vivir de ello. Muchos entran con una idea; salen con una oferta que saben decir, vender y presentar."],
  ["¿Y si no puedo ir a una clase?", "Queda grabada en tu panel el mismo día, así que puedes verla cuando te quede bien. Las prácticas del viernes no se graban: ahí cada quien habla y recibe devolución de la sala, y eso solo pasa en vivo."],
  ["¿Cuánto tiempo me toma a la semana?", "Dos encuentros por semana, de hora y media cada uno, y solo en las semanas que tienen práctica. En un mes son 6 encuentros. Si una semana no puedes, ves la grabación y sigues."],
  ["¿Qué es eso del modo RPG?", "Cada habilidad tiene un nivel. Cada clase, práctica o reto que haces te da experiencia y sube tu nivel. Hay racha semanal e insignias. Es la forma de ver que estás mejorando aunque los temas cambien cada mes."],
  ["¿Es coaching individual?", "No. ECOS es grupal: formación y práctica. Si en algún momento quieres un proceso individual, eso es el Programa Sentido, y como miembro tendrás prioridad."],
  ["¿Puedo cancelar cuando quiera?", "Sí, desde tu cuenta, sin llamar a nadie. Tu acceso sigue hasta el final del período pagado."],
  ["¿Cómo funciona el 10% de comisión?", "Cada miembro tiene su enlace. Si alguien entra por ahí y compra cualquier producto de Holman Global Group —el club incluido—, te corresponde el 10% de esa compra, y se mantiene mientras sigas activo en el club. Un solo nivel: ganas por quien tú traes, nunca por lo que traigan ellos."],
  ["¿El 10% de descuento en qué aplica?", "En todos los productos de Holman Global Group: programas de coaching, marca, web y lo que se sume después. Mientras seas miembro activo, el descuento está disponible."],
];

/** Foto de profesor con respaldo de iniciales si la imagen todavía no existe. */
function ProfeFoto({ src, alt, iniciales }: { src: string; alt: string; iniciales: string }) {
  const [falla, setFalla] = useState(false);
  return (
    <div className="ecos-profe-foto">
      {!falla && (
        <img src={src} alt={alt} loading="lazy" onError={() => setFalla(true)} />
      )}
      {falla && (
        <span className="ecos-profe-iniciales" aria-hidden="true">{iniciales}</span>
      )}
    </div>
  );
}

export default function Ecos() {
  const { search } = useLocation();
  const founder = isFounderWindowOpen();
  const spots = useFounderSpots();
  // Solo se anuncia mientras de verdad queden lugares.
  const quedan = founder && spots && spots.left > 0 ? spots.left : null;
  const cap = spots?.cap ?? ECOS.founderCap;
  const tomados = quedan !== null ? cap - quedan : null;

  // ?ref=CODIGO — se guarda para el checkout, aunque la persona cree cuenta más tarde.
  useEffect(() => {
    const ref = new URLSearchParams(search).get("ref");
    if (ref) sessionStorage.setItem("ecos_ref", ref.trim().toUpperCase());
  }, [search]);

  return (
    <>
      <Seo {...PAGE_SEO.ecos} />

      <section className="ecos-hero">
        <img className="ecos-hero-img" src="/hero-elefante-bg.jpg" alt="" />
        <div className="ecos-hero-veil" aria-hidden="true" />
        <Reveal className="shell ecos-hero-content">
          <div className="ecos-lockup">
            <span className="ecos-lockup-brand">{ECOS.brand}</span>
            <span className="ecos-lockup-cat">{ECOS.category}</span>
            <span className="ecos-lockup-desc">{ECOS.descriptor}</span>
          </div>
          <h1 className="display ecos-hero-title">
            Las habilidades necesarias para un negocio,<br />
            <span className="gold">rodeado de las personas correctas.</span>
          </h1>
          <p className="ecos-hero-sub">
            Ventas, marketing y oratoria en vivo, todas las semanas, con práctica frente a gente real.
            Seis encuentros al mes por <strong>${ECOS.priceUsd} al mes</strong>, y cancelas cuando quieras.
          </p>
          <div className="ecos-hero-cta">
            <Link to={CLUB.entrar} className="btn btn-primary btn-xl">
              Quiero entrar a ECOS <ArrowRightIcon className="arrow" />
            </Link>
            <span className="ecos-hero-price">
              <strong>${ECOS.priceUsd}</strong> al mes
              {founder && (
                <em>
                  {" · "}octubre gratis
                  {quedan !== null ? ` · quedan ${quedan} de ${cap} lugares fundadores` : ` para los primeros ${ECOS.founderCap}`}
                </em>
              )}
            </span>
          </div>
        </Reveal>
        <div className="ecos-hero-strip">
          <div className="shell ecos-hero-strip-row">
            <span><b>Ventas · Marketing · Oratoria</b>Las tres materias</span>
            <span><b>6 encuentros al mes</b>En vivo, y todo queda grabado</span>
            <span><b>Martes y viernes</b>Se aprende y se practica</span>
          </div>
        </div>
      </section>

      {/* ---------- 01 · El problema que resuelve ---------- */}
      <section className="ecos-section">
        <div className="shell">
          <Reveal className="section-head">
            <div className="meta">
              <div className="eyebrow-row"><span className="num">01</span><span className="bar" /><span className="eyebrow">Por qué existe</span></div>
              <h2 className="display">Tu negocio no se frena por falta de talento.</h2>
            </div>
            <p className="lede">
              Se frena en el momento de decirlo. Tienes algo valioso que dar y, cuando toca explicarlo,
              venderlo o presentarlo en público, se pierde la mitad por el camino. Eso no se arregla leyendo:
              se arregla practicando cada semana, con alguien que te corrija y una sala que te escuche.
            </p>
          </Reveal>
          <Reveal stagger className="ecos-dolores">
            <article className="ecos-dolor">
              <h3>Cursos que nunca terminas</h3>
              <p>Ochenta videos guardados y ninguna conversación de ventas distinta. Aquí se viene en vivo y se practica el mismo mes.</p>
            </article>
            <article className="ecos-dolor">
              <h3>Consejos sueltos de internet</h3>
              <p>Cada quien dice una cosa y nadie mira lo tuyo. Aquí trabajas sobre tu oferta, tu contenido y tu voz.</p>
            </article>
            <article className="ecos-dolor">
              <h3>Aprender solo</h3>
              <p>Sin una sala que te devuelva lo que ve, no sabes qué estás haciendo bien. Aquí lo sabes el mismo viernes.</p>
            </article>
          </Reveal>
        </div>
      </section>

      {/* ---------- 02 · Las tres materias ---------- */}
      <section className="ecos-section alt">
        <div className="shell">
          <Reveal className="section-head">
            <div className="meta">
              <div className="eyebrow-row"><span className="num">02</span><span className="bar" /><span className="eyebrow">Una sola idea</span></div>
              <h2 className="display">Las tres materias, basadas en la comunicación.</h2>
            </div>
            <p className="lede">Vender es comunicar para que alguien decida. Marketing es comunicar para que te encuentren. Oratoria es comunicar para que te crean. Por eso en ECOS se aprenden juntas: cada mes, las tres trabajan sobre el mismo reto.</p>
          </Reveal>
          <Reveal stagger className="ecos-materias">
            {MATERIAS.map((m) => (
              <article key={m.label} className="ecos-materia">
                <span className="ecos-materia-label">{m.label}</span>
                <h3>{m.claim}</h3>
                <p>{m.body}</p>
              </article>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------- 03 · Cómo funciona ---------- */}
      <section className="ecos-section">
        <div className="shell">
          <Reveal className="section-head">
            <div className="meta">
              <div className="eyebrow-row"><span className="num">03</span><span className="bar" /><span className="eyebrow">Cómo funciona</span></div>
              <h2 className="display">Martes se aprende. Viernes se practica.</h2>
            </div>
            <p className="lede">Mismo día y misma hora, cada semana. Seis encuentros al mes, en vivo, y todo queda grabado. Los temas cambian cada mes — lo que no cambia es que cada vez que vienes, tu nivel sube. Las prácticas son donde hablas y la sala te devuelve lo que ve.</p>
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

      {/* ---------- 04 · Los profesores ---------- */}
      <section className="ecos-section alt">
        <div className="shell">
          <Reveal className="section-head">
            <div className="meta">
              <div className="eyebrow-row"><span className="num">04</span><span className="bar" /><span className="eyebrow">Quién enseña</span></div>
              <h2 className="display">Una materia, un especialista.</h2>
            </div>
            <p className="lede">Nadie da las tres. Cada materia la dicta quien la vive todos los días, y por eso la clase se parece a la realidad y no a un manual.</p>
          </Reveal>
          <Reveal stagger className="ecos-profes">
            {PROFES.map((p) => (
              <article key={p.nombre} className="ecos-profe">
                <ProfeFoto src={p.foto} alt={`${p.nombre}, profesor de ${p.materia.toLowerCase()} en ECOS`} iniciales={p.iniciales} />
                <div className="ecos-profe-datos">
                  <span className="ecos-profe-materia">{p.materia}</span>
                  <h3>{p.nombre}</h3>
                  <p>{p.bio}</p>
                </div>
              </article>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------- 05 · El cambio (reemplaza «lo que te llevas») ---------- */}
      <section className="ecos-section">
        <div className="shell">
          <Reveal className="section-head">
            <div className="meta">
              <div className="eyebrow-row"><span className="num">05</span><span className="bar" /><span className="eyebrow">El cambio</span></div>
              <h2 className="display">Dónde estás hoy. Dónde vas a estar.</h2>
            </div>
            <p className="lede">No se mide en horas de clase. Se mide en lo que pasa la próxima vez que alguien te pregunta a qué te dedicas.</p>
          </Reveal>
          <Reveal className="ecos-cambio">
            <div className="ecos-cambio-head" aria-hidden="true">
              <span>Hoy</span>
              <span className="gold">Con ECOS</span>
            </div>
            {CAMBIO.map((c) => (
              <div key={c.despues} className="ecos-cambio-fila">
                <p className="ecos-cambio-antes"><span className="ecos-cambio-tag">Hoy</span>{c.antes}</p>
                <p className="ecos-cambio-despues">
                  <span className="ecos-cambio-tag gold">Con ECOS</span>
                  <CheckIcon width={15} height={15} />
                  {c.despues}
                </p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------- 06 · Valor apilado + precio ---------- */}
      <section className="ecos-section alt">
        <div className="shell">
          <Reveal className="section-head">
            <div className="meta">
              <div className="eyebrow-row"><span className="num">06</span><span className="bar" /><span className="eyebrow">La oferta</span></div>
              <h2 className="display">Todo lo que entra por ${ECOS.priceUsd} al mes.</h2>
            </div>
            <p className="lede">Esto es lo que recibes cada mes y lo que costaría conseguirlo por separado. Los valores de la derecha son de referencia del mercado, para que la cuenta la hagas tú.</p>
          </Reveal>

          <div className="ecos-oferta">
            <Reveal className="ecos-stack">
              {STACK.map((s) => (
                <div key={s.title} className="ecos-stack-fila">
                  <CheckIcon width={16} height={16} />
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                  <span className="ecos-stack-ref">${s.ref}</span>
                </div>
              ))}
              <div className="ecos-stack-total">
                <span>Valor de referencia</span>
                <strong>${STACK_TOTAL} / mes</strong>
              </div>
              <div className="ecos-stack-total ecos-stack-total-real">
                <span>Lo que pagas</span>
                <strong className="gold">${ECOS.priceUsd} / mes</strong>
              </div>
              <p className="ecos-stack-nota">
                Y encima, dos cosas que van en la dirección contraria al gasto: <strong>{ECOS.descuentoMiembroPct}% de descuento</strong> en
                todos los productos de HGG y <strong>{ECOS.comisionReferidoPct}% de comisión</strong> por cada persona que traigas.
              </p>
            </Reveal>

            <Reveal className="ecos-price-card">
              <span className="eyebrow">Membresía mensual</span>
              <div className="ecos-price"><span>$</span>{ECOS.priceUsd}<small>/ mes</small></div>
              {founder ? (
                <p className="ecos-price-note">
                  <strong>Cohorte fundadora:</strong>{" "}
                  {quedan !== null
                    ? `quedan ${quedan} de ${cap} lugares. `
                    : `octubre es gratis para los primeros ${ECOS.founderCap}. `}
                  Octubre no se cobra: registras tu tarjeta al entrar y el primer cobro es el {ECOS.primerCobroTexto}. Cancelas cuando quieras.
                </p>
              ) : (
                <p className="ecos-price-note">Sin permanencia. Cancelas cuando quieras desde tu cuenta.</p>
              )}
              <p className="ecos-price-anual">O <strong>${ECOS.priceAnualUsd} al año</strong> — dos meses gratis.</p>
              <ul className="ecos-includes">
                <li>3 clases al mes: ventas, marketing y oratoria</li>
                <li>2 prácticas donde hablas y te escuchan</li>
                <li>Masterclass mensual de Holman</li>
                <li>Todo grabado y guardado en tu panel</li>
                <li>Tu avance en modo RPG: niveles, racha e insignias</li>
                <li>{ECOS.descuentoMiembroPct}% de descuento en todos los productos de HGG</li>
                <li>{ECOS.comisionReferidoPct}% de comisión por cada persona que traigas</li>
              </ul>
              <Link to={CLUB.entrar} className="btn btn-primary ecos-price-cta">
                Entrar a ECOS <ArrowRightIcon className="arrow" />
              </Link>
              <p className="ecos-price-foot">Pago seguro con Stripe · Clases por Zoom</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- 07 · Beneficios de miembro ---------- */}
      <section className="ecos-section">
        <div className="shell">
          <Reveal className="section-head">
            <div className="meta">
              <div className="eyebrow-row"><span className="num">07</span><span className="bar" /><span className="eyebrow">Ventajas de miembro</span></div>
              <h2 className="display">La membresía también te devuelve dinero.</h2>
            </div>
            <p className="lede">Dos beneficios que siguen contigo mientras estés activo en el club. No hay que pedirlos: vienen con la membresía.</p>
          </Reveal>
          <Reveal stagger className="ecos-ventajas">
            <article className="ecos-ventaja">
              <span className="ecos-ventaja-cifra">{ECOS.descuentoMiembroPct}%</span>
              <h3>de descuento en todo HGG</h3>
              <p>
                En todos los productos de Holman Global Group: coaching, marca, web y lo que se sume después.
                Mientras seas miembro activo, el precio de miembro es el tuyo.
              </p>
            </article>
            <article className="ecos-ventaja">
              <span className="ecos-ventaja-cifra">{ECOS.comisionReferidoPct}%</span>
              <h3>de comisión por quien traigas</h3>
              <p>
                Por cada persona que entre con tu enlace, al club o a cualquier producto de HGG, te corresponde
                el {ECOS.comisionReferidoPct}% de esa compra. Es vitalicia mientras sigas activo en el club, y de un solo nivel:
                ganas por quien tú traes, nunca por lo que traigan ellos.
              </p>
            </article>
          </Reveal>
        </div>
      </section>

      {/* ---------- 08 · Razón para actuar ahora ---------- */}
      {founder && (
        <section className="ecos-ahora">
          <Reveal className="shell ecos-ahora-content">
            <div className="eyebrow-row"><span className="num">08</span><span className="bar" /><span className="eyebrow">Cohorte fundadora</span></div>
            <h2 className="display">Octubre no se cobra para los primeros {ECOS.founderCap}.</h2>
            <p>
              Entras ahora, registras tu tarjeta y usas el club todo octubre sin pagar. El primer cobro es
              el {ECOS.primerCobroTexto}, y si antes de esa fecha decides que no es para ti, cancelas desde tu cuenta y no se cobra nada.
            </p>
            {quedan !== null && (
              <div className="ecos-contador" role="status">
                <div className="ecos-contador-barra">
                  <span style={{ width: `${Math.round(((tomados ?? 0) / cap) * 100)}%` }} />
                </div>
                <p>
                  <strong>{quedan}</strong> de {cap} lugares fundadores disponibles
                  {tomados !== null && tomados > 0 ? ` · ${tomados} ya adentro` : ""}
                </p>
              </div>
            )}
            <Link to={CLUB.entrar} className="btn btn-primary btn-xl">
              Tomar mi lugar <ArrowRightIcon className="arrow" />
            </Link>
          </Reveal>
        </section>
      )}

      {/* ---------- 09 · Quién está detrás ---------- */}
      <section className="ecos-section alt">
        <div className="shell ecos-quien">
          <Reveal className="ecos-quien-foto">
            <img src="/holman.webp" alt="Holman Orjuela" loading="lazy" />
          </Reveal>
          <Reveal>
            <div className="eyebrow-row"><span className="num">09</span><span className="bar" /><span className="eyebrow">Quién está detrás</span></div>
            <h2 className="display">Holman Orjuela</h2>
            <p className="ecos-quien-rol">Coach expansivo · Coach musical · Estratega de marca</p>
            <p className="ecos-quien-body">
              Fundador de Holman Global Group. Lleva más de <strong>170 procesos</strong> de claridad y transformación con emprendedores latinos que sabían que tenían algo valioso que dar y no sabían cómo hacer que el mundo lo viera.
            </p>
            <p className="ecos-quien-body">
              En ECOS dicta la oratoria y la masterclass del mes, y trae a especialistas en ventas y en marketing para las otras dos materias. La idea es simple: que nadie tenga que aprender solo lo que se aprende mejor acompañado.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- 10 · Preguntas ---------- */}
      <section className="ecos-section">
        <div className="shell">
          <Reveal className="section-head">
            <div className="meta">
              <div className="eyebrow-row"><span className="num">10</span><span className="bar" /><span className="eyebrow">Preguntas</span></div>
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
