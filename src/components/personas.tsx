import type { ReactNode } from "react";
import { ArrowRightIcon } from "./icons";
import { Reveal } from "./reveal";

type Persona = {
  accent: "purple" | "blue" | "gold";
  step: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
  icon: ReactNode;
};

const PERSONAS: Persona[] = [
  {
    accent: "purple",
    step: "Etapa · Claridad",
    title: "Buscas tu camino.",
    body:
      "No sabes qué hacer con tu vida, te sientes confundido o necesitas claridad sobre tu propósito.",
    cta: { label: "Empieza por aquí", href: "#proceso" },
    icon: (
      <svg
        viewBox="0 0 56 56"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="28" cy="20" r="8" />
        <path d="M14 46c0-7 6-12 14-12s14 5 14 12" />
        <path d="M28 38v-4M24 36l4-2 4 2" opacity="0.4" />
        <circle cx="28" cy="20" r="14" opacity="0.2" strokeDasharray="2 3" />
      </svg>
    ),
  },
  {
    accent: "blue",
    step: "Etapa · Identidad",
    title: "Tienes la idea, falta la forma.",
    body:
      "Ya sabes qué quieres hacer, pero no tienes una marca clara, identidad visual o estructura profesional.",
    cta: { label: "Construye tu marca", href: "#servicios" },
    icon: (
      <svg
        viewBox="0 0 56 56"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="12" y="14" width="32" height="28" rx="2" />
        <path d="M18 22h20M18 28h14M18 34h10" />
        <circle cx="40" cy="14" r="3" fill="currentColor" fillOpacity="0.2" />
      </svg>
    ),
  },
  {
    accent: "gold",
    step: "Etapa · Escala",
    title: "Quieres crecer con sistema.",
    body:
      "Ya tienes una marca o proyecto, pero necesitas crecer, vender más y crear un mejor sistema digital.",
    cta: { label: "Escala con propósito", href: "#servicios" },
    icon: (
      <svg
        viewBox="0 0 56 56"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 42L22 30l8 8 16-18" />
        <path d="M36 12h10v10" />
        <circle cx="22" cy="30" r="2" fill="currentColor" />
        <circle cx="30" cy="38" r="2" fill="currentColor" />
      </svg>
    ),
  },
];

export function Personas() {
  return (
    <section id="personas">
      <div className="shell">
        <div className="section-head">
          <div className="meta">
            <div className="eyebrow-row">
              <span className="num">01</span>
              <span className="bar" />
              <span className="eyebrow eyebrow-w">Para ti</span>
            </div>
            <h2 className="display">
              No importa
              <br />
              en qué punto estés.
            </h2>
          </div>
          <p className="lede">
            Cada camino es distinto, pero todos parten de la misma chispa. Identifica el tuyo
            y descubre por dónde comenzamos a construir tu marca con propósito.
          </p>
        </div>

        <Reveal stagger className="personas">
          {PERSONAS.map((p) => (
            <article key={p.title} className="persona" data-accent={p.accent}>
              <div className="persona-icon">{p.icon}</div>
              <span className="step">{p.step}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <a href={p.cta.href} className="arrow-link">
                {p.cta.label}
                <ArrowRightIcon width={14} height={14} />
              </a>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
