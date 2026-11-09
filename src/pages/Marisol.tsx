import { useEffect, type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CookieBanner } from "@/components/cookie-banner";
import { Reveal } from "@/components/reveal";
import { guardarReferido, leerReferido } from "@/lib/referido";
import { AGENDAR } from "@/lib/routes";

/**
 * `/marisol` — presenta a Maria Soledad Alarcón (Marisol), Directora Comercial
 * de HGG desde nov 2026, y lleva a la tienda.
 *
 * Quien llega aquí sin código de embajador queda con el de Marisol (ECOS36):
 * así una compra que sale de su página le cuenta a ella. Si ya traía el de otro
 * embajador, ese se respeta.
 *
 * PENDIENTE: que Marisol confirme la bio y las habilidades.
 */
const CODIGO_MARISOL = "ECOS36";
const FOTO = "/marisol/retrato.webp";

/* Íconos de línea, del mismo trazo que el resto del sitio */
const ico = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);

const HABILIDADES = [
  {
    t: "Estrategia comercial",
    d: "Ordena tu oferta, tus precios y tu mensaje para que la persona correcta entienda en segundos por qué elegirte.",
    i: ico(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></>),
  },
  {
    t: "Embudos y landings",
    d: "Diseña el camino completo: del primer anuncio o publicación a la conversación por WhatsApp y a la venta.",
    i: ico(<path d="M4 5h16l-6 7v6l-4 2v-8L4 5z" />),
  },
  {
    t: "Campañas y redes",
    d: "Planea y lanza campañas que traen conversaciones reales con clientes, no solo seguidores.",
    i: ico(<><path d="M4 10v4l11 5V5L4 10z" /><path d="M18 9a3 3 0 0 1 0 6" /></>),
  },
  {
    t: "Contenido que vende",
    d: "Convierte lo que sabes en publicaciones y piezas que educan, generan confianza y abren la puerta a la compra.",
    i: ico(<><path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" /><path d="M14 7l3 3" /></>),
  },
  {
    t: "Crecimiento y alianzas",
    d: "Encuentra nuevos canales y socios para que tu negocio llegue a más personas de forma constante.",
    i: ico(<><path d="M4 17l5-5 4 4 7-8" /><path d="M15 8h5v5" /></>),
  },
  {
    t: "Seguimiento al cliente",
    d: "Cuida cada contacto para que nadie se quede sin respuesta y cada interesado tenga su siguiente paso claro.",
    i: ico(<><path d="M5 5h14v10H9l-4 4V5z" /><path d="M9 10h6" /></>),
  },
];

const ETAPAS = [
  {
    dias: "Días 1–30",
    t: "Marca y producto",
    d: "Definimos tu marca y una oferta vendible. Empiezas a vender a tu círculo cercano desde el primer mes.",
  },
  {
    dias: "Días 31–60",
    t: "Contenido y landing",
    d: "Tu página y tu contenido salen al mundo para que más personas te conozcan y confíen en ti.",
  },
  {
    dias: "Días 61–90",
    t: "Embudo y campañas",
    d: "Encendemos el embudo y las campañas para que lleguen nuevos clientes de forma constante.",
  },
];

const EQUIPO = [
  { quien: "Holman", t: "Claridad y marca", d: "Sesiones uno a uno para definir tu propósito, tu marca y una oferta que se siente tuya." },
  { quien: "Marisol", t: "Ventas y crecimiento", d: "Landing, embudo, contenido y campañas para que esa oferta llegue a quien la necesita." },
  { quien: "Tú", t: "Vendes", d: "Te enfocas en atender a tus clientes. El sistema trabaja contigo." },
];

const CAMINOS = [
  { nombre: "Sentido", promesa: "Claridad", d: "Para descubrir hacia dónde vas y qué quieres construir, con sesiones uno a uno.", href: "/tienda?cat=sentido" },
  {
    nombre: "Marca con Huella",
    promesa: "Marca rentable",
    d: "Programa de 90 días: marca, oferta, landing, contenido y embudo hechos por nosotros. Tú solo vendes.",
    href: "/tienda?cat=marca",
    destacado: true,
  },
  { nombre: "DelegaWork", promesa: "Sistema", d: "Para que tu negocio atienda, responda y venda con procesos que funcionan sin ti.", href: "/tienda?cat=sistema" },
];

/** El brillo dorado sigue al cursor dentro de cada tarjeta. */
function foco(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

const Flecha = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function Marisol() {
  useEffect(() => {
    document.title = "Marisol Alarcón · Directora Comercial · Holman Global Group";
    if (!leerReferido()) guardarReferido(CODIGO_MARISOL);
  }, []);

  return (
    <main className="sr ms">
      <div className="ms-aura" aria-hidden />

      <header className="ms-top">
        <Link to="/" className="ms-logo">
          <img src="/marca/logo-h-claro.png" alt="" width={32} height={32} />
          <span>Holman Global Group</span>
        </Link>
        <Link to="/tienda" className="ms-top-link">
          Tienda <Flecha />
        </Link>
      </header>

      {/* ===== Hero ===== */}
      <section className="ms-hero">
        <div className="ms-hero-copy">
          <p className="ms-badge">
            <span className="ms-dot" aria-hidden /> Directora Comercial ·{" "}
            <span className="ms-largo">Holman Global Group</span>
            <span className="ms-corto">HGG</span>
          </p>
          <h1>
            Marisol
            <br />
            <span>Alarcón</span>
          </h1>
          <p className="ms-lede">
            Marisol lidera el área comercial de HGG. Su trabajo es que lo que construyes con nosotros llegue a las personas
            correctas y se convierta en <strong>ventas</strong>: oferta clara, embudo que funciona y campañas que traen
            conversaciones reales.
          </p>
          <div className="ms-ctas">
            <Link to="/tienda" className="ms-btn">
              Ver la tienda <Flecha />
            </Link>
            <a href="#habilidades" className="ms-btn ms-btn-2">
              Lo que hace
            </a>
          </div>
        </div>

        <figure className="ms-retrato">
          <img src={FOTO} alt="Marisol Alarcón, Directora Comercial de Holman Global Group" width={800} height={1202} fetchPriority="high" />
          <figcaption className="ms-firma">
            <strong>Marisol</strong>
            <span>Ventas · Embudos · Campañas</span>
          </figcaption>
        </figure>
      </section>

      {/* ===== Enfoque ===== */}
      <Reveal as="section" className="ms-enfoque">
        <p className="ms-kicker">Enfoque</p>
        <blockquote>
          Resultados desde el primer mes,
          <br />
          <em>con proyección a escalar.</em>
        </blockquote>
        <p className="ms-enfoque-sub">
          Tu marca empieza a generar ingresos desde el inicio, y el sistema crece contigo para llevarla más lejos.
        </p>
      </Reveal>

      {/* ===== Habilidades ===== */}
      <section className="ms-sec" id="habilidades">
        <Reveal>
          <p className="ms-kicker">Lo que trae al equipo</p>
          <h2>Habilidades al servicio de tus ventas</h2>
        </Reveal>
        <Reveal stagger className="ms-habilidades">
          {HABILIDADES.map((h, i) => (
            <article key={h.t} className="ms-habilidad" onMouseMove={foco}>
              <div className="ms-habilidad-top">
                <span className="ms-ico">{h.i}</span>
                <span className="ms-num">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3>{h.t}</h3>
              <p>{h.d}</p>
            </article>
          ))}
        </Reveal>
      </section>

      {/* ===== 90 días ===== */}
      <section className="ms-sec">
        <Reveal>
          <p className="ms-kicker">Marca con Huella · 90 días</p>
          <h2>Del primer mes a un sistema que vende</h2>
        </Reveal>
        <Reveal stagger as="ol" className="ms-etapas">
          {ETAPAS.map((e, i) => (
            <li key={e.t}>
              <span className="ms-etapa-num">{i + 1}</span>
              <p className="ms-etapa-dias">{e.dias}</p>
              <h3>{e.t}</h3>
              <p>{e.d}</p>
            </li>
          ))}
        </Reveal>
      </section>

      {/* ===== Equipo ===== */}
      <section className="ms-sec">
        <Reveal>
          <p className="ms-kicker">Cómo trabajamos juntos</p>
          <h2>Cada quien en lo que mejor hace</h2>
        </Reveal>
        <Reveal stagger className="ms-equipo">
          {EQUIPO.map((e) => (
            <div key={e.quien} className={`ms-rol${e.quien === "Tú" ? " is-tu" : ""}`}>
              <span>{e.quien}</span>
              <h3>{e.t}</h3>
              <p>{e.d}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ===== A la tienda ===== */}
      <section className="ms-sec">
        <Reveal>
          <p className="ms-kicker">Por dónde empezar</p>
          <h2>Elige tu camino</h2>
        </Reveal>
        <Reveal stagger className="ms-caminos">
          {CAMINOS.map((c) => (
            <Link key={c.nombre} to={c.href} className={`ms-camino${c.destacado ? " is-destacado" : ""}`} onMouseMove={foco}>
              {c.destacado && <em>Más elegido</em>}
              <span className="ms-camino-promesa">{c.promesa}</span>
              <h3>{c.nombre}</h3>
              <p>{c.d}</p>
              <strong>
                Ver en la tienda <Flecha />
              </strong>
            </Link>
          ))}
        </Reveal>
      </section>

      {/* ===== Cierre ===== */}
      <Reveal as="section" className="ms-final">
        <img src={FOTO} alt="" width={96} height={96} className="ms-final-foto" loading="lazy" />
        <h2>Tu negocio merece que lo conozcan</h2>
        <p>
          Mira los programas y elige el que va con tu momento. Si prefieres conversarlo primero, agenda una Sesión de
          Claridad con Holman o alguien de su equipo.
        </p>
        <div className="ms-ctas ms-ctas-centro">
          <Link to="/tienda" className="ms-btn">
            Ir a la tienda <Flecha />
          </Link>
          <Link to={AGENDAR} className="ms-btn ms-btn-2">
            Agendar Sesión de Claridad
          </Link>
        </div>
      </Reveal>

      <footer className="sr-pie">
        <a href="/">holmanglobalgroup.com</a>
      </footer>
      <CookieBanner />
    </main>
  );
}
