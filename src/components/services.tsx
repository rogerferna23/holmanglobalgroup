import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon, CheckIcon } from "./icons";
import { Reveal } from "./reveal";

type Service = {
  id: string;
  num: string;
  /** "hgg" → dorado · "delegaweb" → azul · "nexco" → ámbar (marcas aliadas). */
  brand: "hgg" | "delegaweb" | "nexco";
  brandLabel: string;
  titlePre: string;
  titleAccent: string;
  titleSuffix?: string;
  body: string;
  features: string[];
};

// Home más corta (oct 2026): una tarjeta por etapa del camino (Sentido · Marca ·
// Sistema). LLC, webs, campañas y redes viven en la Tienda; aquí solo se nombran
// en la línea de abajo.
// Cuando un `feature` nombra un producto o un tier, debe coincidir literalmente
// con el catálogo de components/tienda.tsx (esta sección enlaza a la tienda).
const SERVICES: Service[] = [
  {
    id: "sesiones",
    num: "— 01",
    brand: "hgg",
    brandLabel: "HGG",
    // Brief 13-ago-2026: cambia SOLO el título de esta tarjeta; la descripción,
    // los bullets y el botón se quedan exactamente igual.
    titlePre: "Programa ",
    titleAccent: "Sentido",
    titleSuffix: ".",
    body:
      "Espacios uno-a-uno para encontrar claridad, propósito y dirección creativa. Donde la mente y el corazón se alinean. Con herramientas de coaching musical y técnicas basadas en neurociencia aplicada.",
    features: ["Coaching expansivo", "Coaching musical", "Claridad de propósito"],
  },
  {
    id: "marca",
    num: "— 02",
    brand: "hgg",
    brandLabel: "HGG",
    titlePre: "Creación de ",
    titleAccent: "marca",
    titleSuffix: ".",
    body:
      "Tres niveles para construir una identidad que te represente: desde la huella esencial hasta un universo de marca completo.",
    features: [
      "Marca con Huella Starter",
      "Marca con Huella Pro",
      "Marca con Huella Elite",
    ],
  },
  {
    id: "sistema",
    num: "— 03",
    brand: "hgg",
    brandLabel: "HGG",
    titlePre: "Software ",
    titleAccent: "a medida",
    titleSuffix: ".",
    body:
      "La tecnología que tu negocio necesita para vender y organizarse: tu sitio web, un CRM para darle seguimiento a cada cliente y herramientas hechas a la medida de cómo trabajas.",
    features: ["Sitios web", "CRM", "Software a medida"],
  },
];

function onMouseMove(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  const mx = ((e.clientX - r.left) / r.width) * 100;
  const my = ((e.clientY - r.top) / r.height) * 100;
  e.currentTarget.style.setProperty("--mx", `${mx}%`);
  e.currentTarget.style.setProperty("--my", `${my}%`);
}

export function Services() {
  return (
    <section id="servicios" className="services">
      <div className="shell">
        <div className="section-head">
          <div className="meta">
            <div className="eyebrow-row">
              <span className="num">03</span>
              <span className="bar" />
              <span className="eyebrow eyebrow-w">Soluciones</span>
            </div>
            <h2 className="display">
              Nuestras
              <br />
              soluciones.
            </h2>
          </div>
          <p className="lede">
            Una solución para cada etapa del camino.
          </p>
        </div>

        <Reveal stagger className="services-grid">
          {SERVICES.map((s) => (
            <article
              key={s.id}
              className="service"
              data-svc={s.id}
              data-brand={s.brand}
              onMouseMove={onMouseMove}
            >
              <div className="service-tag">
                <span className="num">{s.num}</span>
                <span className="service-brand">{s.brandLabel}</span>
              </div>
              <h3>
                {s.titlePre}
                <span className="accent">{s.titleAccent}</span>
                {s.titleSuffix}
              </h3>
              <p>{s.body}</p>
              <ul>
                {s.features.map((f) => (
                  <li key={f}>
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/tienda" className="service-cta">
                Más información
                <ArrowRightIcon width={14} height={14} />
              </Link>
            </article>
          ))}
        </Reveal>

        <p className="services-mas">
          También creamos tu LLC y, con nuestras marcas aliadas, lanzamos tus
          campañas y manejamos tus redes sociales.{" "}
          <Link to="/tienda">
            Ver todas las soluciones
            <ArrowRightIcon width={14} height={14} />
          </Link>
        </p>
      </div>
    </section>
  );
}
