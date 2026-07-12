import type { MouseEvent } from "react";
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

// Fila 1 (HGG, dorado) + Fila 2 (Delegaweb, azul) + Fila 3 (Nexco, ámbar).
// El layout 3+2+2 lo resuelve el CSS (.services-grid) por orden de aparición.
const SERVICES: Service[] = [
  {
    id: "sesiones",
    num: "— 01",
    brand: "hgg",
    brandLabel: "HGG",
    titlePre: "Sesiones de ",
    titleAccent: "Coaching",
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
      "Marca con Huella Esencial",
      "Marca con Huella PRO",
      "Marca con Huella 360",
    ],
  },
  {
    id: "estructuracion",
    num: "— 03",
    brand: "hgg",
    brandLabel: "HGG",
    titlePre: "Estructura con ",
    titleAccent: "propósito",
    titleSuffix: ".",
    body:
      "LLC y estrategia integral para que tu negocio tenga una base sólida desde el día uno. Lo ejecutamos directamente, sin intermediarios.",
    features: ["Estructura Global", "Acompañamiento Estratégico Anual"],
  },
  {
    id: "sistema",
    num: "— 04",
    brand: "delegaweb",
    brandLabel: "Delegaweb",
    titlePre: "Escala con ",
    titleAccent: "sistema",
    titleSuffix: ".",
    body:
      "Para marcas que ya existen y necesitan generar clientes de forma constante. Ejecutado por Delegaweb, nuestra marca aliada de sistemas digitales.",
    features: ["Sistema 360", "Acompañamiento mensual", "Optimización continua"],
  },
  {
    id: "web",
    num: "— 05",
    brand: "delegaweb",
    brandLabel: "Delegaweb",
    titlePre: "Sitios ",
    titleAccent: "web",
    titleSuffix: " premium.",
    body:
      "Landing pages, sitios cinemáticos y ecommerce que convierten. Diseño hecho a mano, sin plantillas ni atajos. Ejecutado por Delegaweb, parte del ecosistema HGG.",
    features: ["Landing pages", "Sitios premium", "Ecommerce"],
  },
  {
    id: "nexco-campana",
    num: "— 06",
    brand: "nexco",
    brandLabel: "Nexco",
    titlePre: "Configuración de ",
    titleAccent: "campaña",
    titleSuffix: ".",
    body:
      "Lanzamos tu primera campaña publicitaria con objetivo, audiencia y estructura de anuncios definidos. Ejecutado por Nexco, nuestra marca aliada de performance. El presupuesto de ads lo define y paga el cliente directamente.",
    features: [
      "Configuración completa de 1 campaña",
      "Objetivo, audiencia y estructura de anuncios",
      "Presupuesto de ads aparte (lo paga el cliente)",
    ],
  },
  {
    id: "nexco-redes",
    num: "— 07",
    brand: "nexco",
    brandLabel: "Nexco",
    titlePre: "Gestión de ",
    titleAccent: "redes",
    titleSuffix: " sociales.",
    body:
      "Contenido constante que construye comunidad: producción, publicación y una mentoría inicial para transmitir autenticidad. Ejecutado por Nexco, parte del ecosistema HGG.",
    features: [
      "3 posts + 1 video por semana",
      "Subida y gestión completa del material",
      "Mentoría inicial de autenticidad en redes",
    ],
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
              <span className="num">04</span>
              <span className="bar" />
              <span className="eyebrow eyebrow-w">Servicios</span>
            </div>
            <h2 className="display">
              Lo que
              <br />
              ofrecemos.
            </h2>
          </div>
          <p className="lede">
            Siete caminos premium para llevarte de la chispa al sistema. Los primeros
            los ejecuta HGG; el crecimiento digital, nuestra marca aliada Delegaweb; la
            publicidad y las redes, Nexco.
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
              <a href="/tienda" className="service-cta">
                Más información
                <ArrowRightIcon width={14} height={14} />
              </a>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
