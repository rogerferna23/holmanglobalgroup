import type { ReactNode } from "react";
import { Reveal } from "./reveal";

type Path = {
  accent: "purple" | "blue" | "gold";
  label: string;
  icon: ReactNode;
};

// Tres puntos de partida — uno por cada etapa del camino (Propósito · Marca ·
// Sistema). Tarjetas simples: un icono y una frase directa. Conectan el camino
// con las soluciones que vienen justo después.
const PATHS: Path[] = [
  {
    accent: "purple",
    label: "Quiero descubrir mi propósito.",
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
    label: "Quiero construir una marca.",
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
    label: "Quiero escalar con un sistema.",
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
              <span className="eyebrow eyebrow-w">Inicio</span>
            </div>
            <h2 className="display">
              Tu punto
              <br />
              de partida.
            </h2>
          </div>
          <p className="lede">
            Todos recorremos el mismo camino, pero no siempre empezamos en el
            mismo punto.
          </p>
        </div>

        <Reveal stagger className="personas">
          {PATHS.map((p) => (
            <article
              key={p.label}
              className="persona persona-simple"
              data-accent={p.accent}
            >
              <div className="persona-icon">{p.icon}</div>
              <h3>{p.label}</h3>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
