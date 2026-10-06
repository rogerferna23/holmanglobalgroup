import { useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/seo";
import { Reveal } from "@/components/reveal";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { ECOS, isFounderWindowOpen } from "@/lib/ecos";
import { useFounderSpots } from "@/lib/club-store";
import { CLUB } from "@/lib/routes";
import { useQuienInvita } from "@/lib/referido";
import { PAGE_SEO } from "@/lib/seo";

/* El antes y el después, uno por materia. La materia ya no tiene sección
   propia (está en el hero); aquí sirve de etiqueta de cada resultado. */
const CAMBIO: { materia: string; antes: string; despues: string }[] = [
  {
    materia: "Ventas",
    antes: "Las personas se interesan en lo tuyo, pero la conversación no termina en venta.",
    despues: "Guías la conversación hasta el sí y cierras con seguridad.",
  },
  {
    materia: "Marketing",
    antes: "Tu mensaje no deja claro qué haces ni para quién.",
    despues: "Tu mensaje es claro y atrae a las personas correctas.",
  },
  {
    materia: "Oratoria",
    antes: "Te invitan a hablar y buscas una excusa para no ir.",
    despues: "Tienes un discurso de cinco minutos listo para un escenario o un live.",
  },
];

/* La metodología: cómo se aprende en ECOS, sin importar la materia. */
const METODO = { teoria: 20, practica: 80 };
const PILARES: { titulo: string; texto: string }[] = [
  {
    titulo: "Aprendes haciendo",
    texto: "Unos minutos de teoría y el resto practicas sobre tu propio negocio, frente a la sala. Así lo de la clase se queda contigo.",
  },
  {
    titulo: "Con la comunidad correcta",
    texto: "Emprendedores que también están construyendo algo. Aprendes de cómo hablan, venden y presentan los demás, y ellos de ti.",
  },
  {
    titulo: "Feedback en el momento",
    texto: "El profesor te da retroalimentación ahí mismo. Lo que le dice a uno le sirve a todos, y la sala entera mejora junta.",
  },
];

/* Lo que recibe el miembro cada mes. Sin precios de referencia a propósito:
   la lista sola se lee más limpia. */
const STACK: { title: string; body: string }[] = [
  {
    title: "Clases en vivo de ventas, marketing y oratoria",
    body: "Cada materia con su especialista.",
  },
  {
    title: "Práctica en cada clase",
    body: "Unos quince minutos de teoría y el resto practicas frente a la sala, con devolución en el momento.",
  },
  {
    title: "Masterclass mensual con Holman",
    body: "Un tema a fondo, con preguntas abiertas al final.",
  },
  {
    title: "Todo grabado en tu panel",
    body: "Las clases quedan el mismo día. Las repasas cuando te queda bien.",
  },
  {
    title: "Tu avance en modo RPG",
    body: "Niveles por habilidad, racha semanal, retos e insignias.",
  },
  {
    title: "Comunidad y directorio de miembros",
    body: "Gente que sabe qué haces, te presenta y te recomienda.",
  },
];

/* Holman va primero y con la foto de siempre; Julio va a su lado porque se
   turnan la oratoria (un martes cada uno). Las demás fotos viven en
   /profesores/; mientras no existan, la tarjeta muestra la inicial sobre el
   fondo de marca y la página nunca se ve rota. La bio va en el reverso de la
   tarjeta (se voltea al pasar encima), igual que el Equipo de la home: por eso
   es corta. */
const PROFES: { nombre: string; materia: string; foto: string; iniciales: string; bio: string }[] = [
  {
    nombre: "Holman Orjuela",
    materia: "Oratoria · Masterclass",
    foto: "/holman.webp",
    iniciales: "H",
    bio: "Coach expansivo, coach musical y estratega de marca. Fundador de Holman Global Group y creador del método Corazón de Elefante, con más de 180 procesos acompañados. En ECOS enseña oratoria con el poder de la música: respiración, ritmo y presencia.",
  },
  {
    nombre: "Julio Ballén",
    materia: "Oratoria",
    foto: "/profesores/julio.webp",
    iniciales: "J",
    bio: "Escritor, conferencista y coach en relaciones humanas; publica sus libros como Bobbie J. En ECOS enseña oratoria desde lo humano: conectar con quien te escucha para que tu mensaje llegue con propósito y coherencia.",
  },
  {
    nombre: "Zack",
    materia: "Ventas",
    foto: "/profesores/zack.webp",
    iniciales: "Z",
    bio: "Encargado de ventas en Holman Global Group, coach ejecutivo y ontológico. Une experiencia comercial real con herramientas de coaching para que vendas con estructura y confianza, con resultados que aplicas desde la primera clase.",
  },
  {
    nombre: "Ingrid",
    materia: "Marketing",
    foto: "/profesores/ingrid.webp",
    iniciales: "I",
    bio: "Comunicadora social, periodista y especialista en marketing digital, con experiencia en contenido, relaciones públicas y producción de radio, televisión y podcast. En ECOS te enseña a crear contenido que hace que las personas correctas te encuentren.",
  },
];

/* Video del hero: Holman dando una charla, grabado en vertical.
   - En celular llena la pantalla (el vertical es justo su formato).
   - En computador hay dos formas de mostrarlo sin deformarlo:
       "ventana": el video en un marco vertical a la derecha del texto.
       "relleno": el video a la derecha y, detrás, una copia desenfocada que
                  rellena el ancho (archivo aparte, ya compuesto).
   Para cambiar de una a otra basta con esta constante. */
/* La versión va en la dirección de cada archivo: al cambiar un video se sube
   el número y ningún navegador se queda con la copia vieja guardada. */
const V = "?v=3";
const HERO = {
  modo: "relleno" as "ventana" | "relleno",
  vertical: `/ecos/hero-holman.mp4${V}`,
  relleno: `/ecos/hero-holman-relleno.mp4${V}`,
  portada: `/ecos/hero-holman.jpg${V}`,
  portadaRelleno: `/ecos/hero-holman-relleno.jpg${V}`,
};

/**
 * La portada (lo que se ve mientras carga el video) tiene que ser del mismo
 * formato que el video que va a salir: en computador, la horizontal. Antes se
 * usaba la vertical en todas partes y, estirada a lo ancho, se veía muy cerca
 * hasta que el video terminaba de cargar.
 */
function portadaHero(modo: "ventana" | "relleno"): string {
  if (modo === "ventana" || typeof window === "undefined") return HERO.portada;
  try {
    return window.matchMedia("(min-width: 900px)").matches ? HERO.portadaRelleno : HERO.portada;
  } catch {
    return HERO.portada;
  }
}

/** ?hero=relleno o ?hero=ventana cambia el modo, para comparar en el sitio real. */
function modoHero(): "ventana" | "relleno" {
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search).get("hero");
    if (q === "ventana" || q === "relleno") return q;
  }
  return HERO.modo;
}

/** Quien pidió menos movimiento en su sistema no recibe un video en bucle. */
function prefiereQuieto(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

const FAQ = [
  ["¿Necesito tener un negocio ya?", "Necesitas tener algo valioso que dar y ganas de vivir de ello. Muchos entran con una idea; salen con una oferta que saben decir, vender y presentar."],
  ["¿Cuánto tiempo me toma y si no puedo ir a una clase?", "Los encuentros son semanales, en vivo, de hora y media aproximadamente. Si una semana no puedes, la clase queda grabada en tu panel el mismo día. Eso sí: lo que más te hace avanzar es la práctica, y esa se aprovecha en vivo."],
  ["¿Qué es eso del modo RPG?", "Cada habilidad tiene un nivel. Cada clase, práctica o reto que haces te da experiencia y sube tu nivel. Hay racha semanal e insignias. Es la forma de ver que estás mejorando aunque los temas cambien cada mes."],
  ["¿Es coaching individual?", "No. ECOS es grupal: formación y práctica. Si en algún momento quieres un proceso individual, eso es el Programa Sentido, y como miembro tendrás prioridad."],
  ["¿Tengo que poner tarjeta para entrar?", `No. Creas tu cuenta y usas todo el club ${ECOS.pruebaDias} días gratis, sin tarjeta: te alcanza para vivir las clases y las prácticas. Si decides quedarte, activas tu membresía desde tu panel: ahí registras la tarjeta y el primer cobro es cuando termina tu prueba.`],
  ["¿Puedo cancelar cuando quiera?", "Sí, desde tu cuenta, sin llamar a nadie. Tu acceso sigue hasta el final del período pagado."],
  ["¿Cómo funcionan el descuento y la comisión?", `Mientras seas miembro activo tienes ${ECOS.descuentoMiembroPct}% de descuento en todos los productos de Holman Global Group: coaching, marca, web y lo que se sume después. Además tienes tu enlace de embajador: si alguien entra por ahí y compra cualquier producto —el club incluido—, te corresponde el ${ECOS.comisionReferidoPct}% de esa compra, de por vida mientras sigas activo.`],
];

/** Tarjeta de profesor con volteo: foto delante, bio detrás. Usa las mismas
    clases que el Equipo de la home para que las dos se sientan iguales. */
function ProfeCard({ p }: { p: (typeof PROFES)[number] }) {
  const [fotoOk, setFotoOk] = useState(true);
  return (
    <article className="equipo-card">
      <div className="equipo-flip" tabIndex={0} aria-label={`${p.nombre}, ${p.materia}. ${p.bio}`}>
        <div className="equipo-flip-inner">
          <div className="equipo-face equipo-front">
            {fotoOk ? (
              <img
                src={p.foto}
                alt={`${p.nombre}, profesor de ${p.materia.toLowerCase()} en ECOS`}
                loading="lazy"
                onError={() => setFotoOk(false)}
              />
            ) : (
              <span className="equipo-initials" aria-hidden="true">{p.iniciales}</span>
            )}
          </div>
          <div className="equipo-face equipo-back">
            <span className="equipo-back-name">{p.nombre}</span>
            <p className="equipo-bio">{p.bio}</p>
          </div>
        </div>
      </div>
      <span className="equipo-pos">{p.materia}</span>
      <h3 className="equipo-name display">{p.nombre}</h3>
    </article>
  );
}

export default function Ecos() {
  const modo = modoHero();
  const invita = useQuienInvita();
  const founder = isFounderWindowOpen();
  const spots = useFounderSpots();
  // Solo se anuncia mientras de verdad queden lugares.
  const quedan = founder && spots && spots.left > 0 ? spots.left : null;
  // Octubre gratis solo mientras de verdad quede lugar de fundador; con el cupo
  // lleno o pasado octubre, lo que hay es la prueba de 14 días para todos.
  const gratis = founder && (!spots || spots.left > 0);
  const probar = gratis ? "Probar octubre gratis" : `Probar ${ECOS.pruebaDias} días gratis`;
  const cap = spots?.cap ?? ECOS.founderCap;
  const tomados = quedan !== null ? cap - quedan : null;

  return (
    <>
      <Seo {...PAGE_SEO.ecos} />

      <section className={`ecos-hero ecos-hero--${modo}`}>
        {modo === "ventana" ? (
          // Un solo video: en celular es el fondo; en computador, el marco vertical.
          <video
            className="ecos-hero-img ecos-hero-ventana"
            src={HERO.vertical}
            poster={HERO.portada}
            autoPlay={!prefiereQuieto()}
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          />
        ) : (
          <video
            className="ecos-hero-img"
            poster={portadaHero(modo)}
            autoPlay={!prefiereQuieto()}
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
          >
            <source media="(min-width: 900px)" src={HERO.relleno} />
            <source src={HERO.vertical} />
          </video>
        )}
        <div className="ecos-hero-veil" aria-hidden="true" />
        <Reveal className="shell ecos-hero-content">
          <div className="ecos-lockup">
            <span className="ecos-lockup-brand">{ECOS.brand}</span>
            <span className="ecos-lockup-cat">{ECOS.category}</span>
            <span className="ecos-lockup-desc">{ECOS.descriptor}</span>
          </div>
          <h1 className="display ecos-hero-title">
            Aprende las habilidades que hacen crecer<br />
            <span className="gold">tu carrera y tu negocio.</span>
          </h1>
          <p className="ecos-hero-sub">
            ECOS es el club donde aprendes ventas, marketing y oratoria en vivo, todas las semanas, con práctica frente a personas reales.
          </p>
          {invita && (
            <p className="ecos-hero-invita">
              <span aria-hidden>✦</span>
              <span>Te invitó <b>{invita}</b>. Te esperamos en la próxima clase.</span>
            </p>
          )}
          <div className="ecos-hero-cta">
            <Link to={CLUB.entrar} className="btn btn-primary btn-xl">
              {probar} <ArrowRightIcon className="arrow" />
            </Link>
          </div>
        </Reveal>
        <div className="ecos-hero-strip">
          <div className="shell ecos-hero-strip-row">
            <span><b>Ventas · Marketing · Oratoria</b>Las tres materias</span>
            <span><b>Encuentros todas las semanas</b>En vivo, y todo queda grabado</span>
            <span><b>20% teoría · 80% práctica</b>Aprendes haciendo</span>
          </div>
        </div>
      </section>

      {/* ---------- 01 · Lo que cambia: el resultado, antes que el cómo ---------- */}
      <section className="ecos-section">
        <div className="shell">
          <Reveal className="section-head">
            <div className="meta">
              <div className="eyebrow-row"><span className="num">01</span><span className="bar" /><span className="eyebrow">Resultados</span></div>
              <h2 className="display">Lo que cambia cuando comunicas bien.</h2>
            </div>
          </Reveal>
          <Reveal stagger className="ecos-logros">
            {CAMBIO.map((c) => (
              <article key={c.materia} className="ecos-logro">
                <span className="ecos-logro-materia">{c.materia}</span>
                <p className="ecos-logro-antes">{c.antes}</p>
                <span className="ecos-logro-flecha" aria-hidden="true"><ArrowRightIcon /></span>
                <h3 className="ecos-logro-despues">{c.despues}</h3>
              </article>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------- 02 · Metodología: cómo se aprende, no qué materias hay ---------- */}
      <section className="ecos-section alt">
        <div className="shell">
          <Reveal className="section-head">
            <div className="meta">
              <div className="eyebrow-row"><span className="num">02</span><span className="bar" /><span className="eyebrow">Metodología</span></div>
              <h2 className="display">{METODO.teoria}% teoría. {METODO.practica}% práctica.</h2>
            </div>
          </Reveal>
          <Reveal className="ecos-ratio" aria-label={`${METODO.teoria}% teoría y ${METODO.practica}% práctica`}>
            <div className="ecos-ratio-teoria" style={{ flexBasis: `${METODO.teoria}%` }}>
              <strong>{METODO.teoria}%</strong><span>Teoría</span>
            </div>
            <div className="ecos-ratio-practica" style={{ flexBasis: `${METODO.practica}%` }}>
              <strong>{METODO.practica}%</strong><span>Práctica</span>
            </div>
          </Reveal>
          <Reveal stagger className="ecos-pilares">
            {PILARES.map((pl, i) => (
              <article key={pl.titulo} className="ecos-pilar">
                <span className="ecos-pilar-num">0{i + 1}</span>
                <h3>{pl.titulo}</h3>
                <p>{pl.texto}</p>
              </article>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------- 03 · Quién enseña ---------- */}
      <section className="ecos-section">
        <div className="shell">
          <Reveal className="section-head">
            <div className="meta">
              <div className="eyebrow-row"><span className="num">03</span><span className="bar" /><span className="eyebrow">Quién enseña</span></div>
              <h2 className="display">Cada materia, con quien la vive.</h2>
            </div>
          </Reveal>
          <Reveal stagger className="ecos-profes">
            {PROFES.map((p) => <ProfeCard key={p.nombre} p={p} />)}
          </Reveal>
        </div>
      </section>

      {/* ---------- 04 · La membresía: lo que recibes, precio y ventajas ---------- */}
      <section className="ecos-section alt">
        <div className="shell">
          <Reveal className="section-head">
            <div className="meta">
              <div className="eyebrow-row"><span className="num">04</span><span className="bar" /><span className="eyebrow">La membresía</span></div>
              <h2 className="display">Lo que recibes cada mes.</h2>
            </div>
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
                </div>
              ))}
            </Reveal>

            <div className="ecos-oferta-lado">
              <Reveal className="ecos-price-card">
                <span className="eyebrow">Membresía mensual</span>
                <div className="ecos-price"><span>$</span>{ECOS.priceUsd}<small>/ mes</small></div>
                {founder ? (
                  <p className="ecos-price-note">
                    <strong>Octubre gratis</strong> para los primeros {cap} fundadores
                    {quedan !== null ? ` (quedan ${quedan})` : ""}. Sin tarjeta: el primer cobro es el {ECOS.primerCobroTexto}.
                  </p>
                ) : (
                  <p className="ecos-price-note">
                    <strong>{ECOS.pruebaDias} días gratis</strong>, sin tarjeta. Sin permanencia: cancelas cuando quieras.
                  </p>
                )}
                <p className="ecos-price-anual">O <strong>${ECOS.priceAnualUsd} al año</strong> — dos meses gratis.</p>
                <Link to={CLUB.entrar} className="btn btn-primary ecos-price-cta">
                  {gratis ? "Empezar mi mes gratis" : `Empezar mis ${ECOS.pruebaDias} días gratis`} <ArrowRightIcon className="arrow" />
                </Link>
                <p className="ecos-price-foot">Pago seguro con Stripe · Clases por Zoom</p>
              </Reveal>

              {/* Los dos beneficios de miembro, debajo del precio: llenan la columna
                  y quedan a la altura de la lista. */}
              <Reveal className="ecos-ventajas-lado">
                <span className="ecos-ventajas-lado-titulo">Y además, por ser miembro</span>
                <div className="ecos-ventaja-lado">
                  <strong>{ECOS.descuentoMiembroPct}%</strong>
                  <p>de descuento en todos los productos de Holman Global Group.</p>
                </div>
                <div className="ecos-ventaja-lado">
                  <strong>{ECOS.comisionReferidoPct}%</strong>
                  <p>de comisión como embajador por cada persona que entre con tu enlace. Vitalicia mientras sigas activo.</p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 05 · Miembros fundadores: razón para entrar ahora ---------- */}
      {founder && (
        <section className="ecos-ahora">
          <Reveal className="shell ecos-ahora-content">
            <div className="eyebrow-row"><span className="num">05</span><span className="bar" /><span className="eyebrow">Miembros fundadores</span></div>
            <h2 className="display">Octubre de regalo para los primeros {cap}.</h2>
            <p>
              Creas tu cuenta, sin tarjeta, y usas todo el club en octubre: clases, grabaciones y comunidad.
              Si te quedas, activas tu membresía antes del {ECOS.primerCobroTexto}, que es el primer cobro. Si no,
              no pasa nada: no se te cobra.
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

      {/* ---------- 06 · Preguntas ---------- */}
      <section className="ecos-section">
        <div className="shell">
          <Reveal className="section-head">
            <div className="meta">
              <div className="eyebrow-row"><span className="num">06</span><span className="bar" /><span className="eyebrow">Preguntas</span></div>
              <h2 className="display">Preguntas frecuentes.</h2>
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
