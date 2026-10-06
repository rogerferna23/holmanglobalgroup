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

/* Las tres materias. La frase de cada una sale del mismo lugar que el resto
   del negocio: comunicar para decidir, para encontrar, para creer. */
const MATERIAS = [
  {
    label: "Ventas",
    claim: "Comunicar para que alguien decida.",
    body: "Una oferta que se entiende, la conversación que llega al sí y qué responder cuando te dicen «déjame pensarlo».",
  },
  {
    label: "Marketing",
    claim: "Comunicar para que te encuentren.",
    body: "Un mensaje claro y contenido que hace que las personas correctas te escriban primero. Trabajas sobre lo tuyo.",
  },
  {
    label: "Oratoria",
    claim: "Comunicar de la forma correcta.",
    body: "Respiración, ritmo, presencia y estructura: el poder de la música aplicado a tu propia voz.",
  },
];

/* Reemplaza al viejo bloque «lo que te llevas»: en vez de una lista de promesas,
   el contraste entre el punto de partida y el punto de llegada. */
const CAMBIO: { antes: string; despues: string }[] = [
  // Una por materia: ventas, marketing y oratoria.
  {
    antes: "Las personas se interesan en lo tuyo, pero la conversación no termina en venta.",
    despues: "Guías la conversación hasta el sí y cierras con seguridad.",
  },
  {
    antes: "Tu mensaje no deja claro qué haces ni para quién.",
    despues: "Tu mensaje es claro y atrae a las personas correctas.",
  },
  {
    antes: "Te invitan a hablar y buscas una excusa para no ir.",
    despues: "Tienes un discurso de cinco minutos listo para un escenario o un live.",
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
    title: "Práctica en cada clase de ventas y oratoria",
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
   fondo de marca y la página nunca se ve rota. */
const PROFES: { nombre: string; materia: string; foto: string; iniciales: string; bio: string }[] = [
  {
    nombre: "Holman Orjuela",
    materia: "Oratoria · Masterclass",
    foto: "/holman.webp",
    iniciales: "H",
    bio: "Coach expansivo, coach musical y estratega de marca. Fundador de Holman Global Group y creador del método Corazón de Elefante, ha acompañado más de 180 procesos de claridad y transformación con emprendedores latinos que tenían algo valioso que dar. En ECOS enseña oratoria con el poder de la música: respiración, ritmo y presencia para que tu voz transmita todo lo que eres y la sala quiera seguir escuchándote.",
  },
  {
    nombre: "Julio Ballén",
    materia: "Oratoria",
    foto: "/profesores/julio.webp",
    iniciales: "J",
    bio: "Escritor, conferencista y coach en relaciones humanas; publica sus libros como Bobbie J. Su obra explora la comunicación, la conciencia emocional y el valor de las conexiones auténticas, con un enfoque profundo y cercano que une experiencia práctica, reflexión y una visión espiritual no dogmática. En ECOS enseña oratoria desde lo humano: conectar con quien te escucha para que tu mensaje llegue con propósito, sabiduría y coherencia.",
  },
  {
    nombre: "Zack",
    materia: "Ventas",
    foto: "/profesores/zack.webp",
    iniciales: "Z",
    bio: "Encargado de ventas en Holman Global Group, coach ejecutivo y ontológico. Forma y acompaña a dueños de marca personal para que vendan con estructura y confianza, combinando experiencia comercial real con herramientas de coaching. Diseña e imparte programas de venta consultiva enfocados en resultados concretos que aplicas desde la primera clase.",
  },
  {
    nombre: "Ingrid",
    materia: "Marketing",
    foto: "/profesores/ingrid.webp",
    iniciales: "I",
    bio: "Comunicadora social con énfasis en periodismo y especialista en marketing digital. Tiene experiencia en creación de contenido, estrategia digital, relaciones públicas y producción de medios, y estudios en producción de radio, televisión y podcast. En ECOS te enseña a unir narrativa, video y estrategia para crear contenido que la gente quiere ver y que hace que las personas correctas te encuentren.",
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
  ["¿Y si no puedo ir a una clase?", "Queda grabada en tu panel el mismo día, así que puedes verla cuando te quede bien. Lo que más te hace avanzar es la práctica, y esa se aprovecha en vivo: hablas, la sala te escucha y recibes devolución."],
  ["¿Cuánto tiempo me toma a la semana?", "Los encuentros son semanales, en vivo, de hora y media aproximadamente. Si una semana no puedes, ves la grabación y sigues."],
  ["¿Qué es eso del modo RPG?", "Cada habilidad tiene un nivel. Cada clase, práctica o reto que haces te da experiencia y sube tu nivel. Hay racha semanal e insignias. Es la forma de ver que estás mejorando aunque los temas cambien cada mes."],
  ["¿Es coaching individual?", "No. ECOS es grupal: formación y práctica. Si en algún momento quieres un proceso individual, eso es el Programa Sentido, y como miembro tendrás prioridad."],
  ["¿Tengo que poner tarjeta para entrar?", `No. Creas tu cuenta y usas todo el club ${ECOS.pruebaDias} días gratis, sin tarjeta: te alcanza para vivir las clases y las prácticas. Si decides quedarte, activas tu membresía desde tu panel: ahí registras la tarjeta y el primer cobro es cuando termina tu prueba.`],
  ["¿Puedo cancelar cuando quiera?", "Sí, desde tu cuenta, sin llamar a nadie. Tu acceso sigue hasta el final del período pagado."],
  ["¿Cómo funciona el 10% de comisión?", "Cada miembro tiene su enlace. Si alguien entra por ahí y compra cualquier producto de Holman Global Group —el club incluido—, te corresponde el 10% de esa compra, y es vitalicia mientras sigas activo en el club."],
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
            <span><b>Poca teoría, mucha práctica</b>Aprendes haciendo</span>
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
            <p className="lede">Un cambio por materia, y se nota en tu negocio y en tu día a día.</p>
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

      {/* ---------- 02 · Cómo lo logras: materias, método y comunidad en una ---------- */}
      <section className="ecos-section alt">
        <div className="shell">
          <Reveal className="section-head">
            <div className="meta">
              <div className="eyebrow-row"><span className="num">02</span><span className="bar" /><span className="eyebrow">Cómo lo logras</span></div>
              <h2 className="display">Tres materias. Una habilidad: comunicar.</h2>
            </div>
            <p className="lede">Poca teoría y mucha práctica: aplicas cada clase sobre tu negocio y recibes devolución en el momento.</p>
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

      {/* ---------- 04 · La oferta: valor apilado, bonos y precio ---------- */}
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
          </div>

          {/* Los dos beneficios de miembro, en su propio cuadro: dentro de la lista
              de la oferta quedaban apretados contra el borde. */}
          <Reveal className="ecos-bonos">
            <span className="ecos-bonos-titulo">Y además, por ser miembro</span>
            <div className="ecos-bonos-grid">
              <div className="ecos-bono">
                <strong>{ECOS.descuentoMiembroPct}%</strong>
                <h3>de descuento</h3>
                <p>En todos los productos de Holman Global Group, mientras seas miembro.</p>
              </div>
              <div className="ecos-bono">
                <strong>{ECOS.comisionReferidoPct}%</strong>
                <h3>de comisión</h3>
                <p>En marketing de afiliados por ser embajador: por cada persona que entre con tu enlace, al club o a cualquier producto. Vitalicia mientras sigas activo.</p>
              </div>
            </div>
          </Reveal>
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
