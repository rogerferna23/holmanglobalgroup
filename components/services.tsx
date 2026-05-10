"use client";

import type { MouseEvent } from "react";
import { ArrowRightIcon, CheckIcon } from "./icons";
import { Reveal } from "./reveal";

type Service = {
  id: string;
  num: string;
  titlePre: string;
  titleAccent: string;
  titleSuffix?: string;
  body: string;
  features: string[];
};

const SERVICES: Service[] = [
  {
    id: "sesiones",
    num: "— 01",
    titlePre: "Sesiones ",
    titleAccent: "vivas",
    titleSuffix: ".",
    body:
      "Espacios uno-a-uno para encontrar claridad, propósito y dirección creativa. Donde la mente y el corazón se alinean.",
    features: ["Coaching expansivo", "Coaching musical", "Claridad de propósito"],
  },
  {
    id: "marca",
    num: "— 02",
    titlePre: "Creación de ",
    titleAccent: "marca",
    titleSuffix: ".",
    body:
      "Tres niveles para construir una identidad que te represente: desde la huella esencial hasta un universo de marca completo.",
    features: ["Huella · esencial", "PRO · profesional", "360 · universo completo"],
  },
  {
    id: "escala",
    num: "— 03",
    titlePre: "Escala con ",
    titleAccent: "alma",
    titleSuffix: ".",
    body:
      "Para marcas que ya existen y necesitan crecer con estrategia. Acompañamiento integral para multiplicar impacto sin perder esencia.",
    features: [
      "Impacto 360",
      "Estrategia de crecimiento",
      "Acompañamiento mensual",
    ],
  },
  {
    id: "web",
    num: "— 04",
    titlePre: "Sitios ",
    titleAccent: "web",
    titleSuffix: " premium.",
    body:
      "Landing pages, sitios cinemáticos y ecommerce que convierten. Diseño hecho a mano, sin plantillas ni atajos.",
    features: ["Landing pages", "Sitios premium", "Ecommerce"],
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
            Cuatro caminos premium para llevarte de la chispa al sistema. Cada uno es un
            punto de entrada — empezamos donde tú estás.
          </p>
        </div>

        <Reveal stagger className="services-grid">
          {SERVICES.map((s) => (
            <article
              key={s.id}
              className="service"
              data-svc={s.id}
              onMouseMove={onMouseMove}
            >
              <div className="service-tag">
                <span className="num">{s.num}</span>
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
