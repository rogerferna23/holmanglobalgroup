/**
 * Un ícono por programa de la tienda (dic 2026, Holman: «un logo para cada
 * segmento, súper bonito y básico»). Todos de línea fina, mismo grosor y
 * mismo color (`currentColor`), en una caja de 48 × 48.
 */
import type { ReactNode } from "react";

const TRAZOS: Record<string, ReactNode> = {
  // Claridad: un sol que asoma.
  claridad: (
    <>
      <circle cx="24" cy="24" r="7" />
      <path d="M24 8v5M24 35v5M8 24h5M35 24h5M12.7 12.7l3.5 3.5M31.8 31.8l3.5 3.5M12.7 35.3l3.5-3.5M31.8 16.2l3.5-3.5" />
    </>
  ),
  // ECOS: ondas que se expanden.
  ecos: (
    <>
      <circle cx="24" cy="24" r="3" />
      <path d="M17 17a10 10 0 0 0 0 14M31 17a10 10 0 0 1 0 14M12 12a17 17 0 0 0 0 24M36 12a17 17 0 0 1 0 24" />
    </>
  ),
  // Sentido: una brújula.
  sentido: (
    <>
      <circle cx="24" cy="24" r="16" />
      <path d="M29.5 18.5l-3 8-8 3 3-8z" />
    </>
  ),
  // Marca con Huella: la huella del elefante.
  marca: (
    <>
      <ellipse cx="24" cy="28" rx="11" ry="10" />
      <circle cx="14.5" cy="14" r="2.6" />
      <circle cx="21" cy="10.5" r="2.6" />
      <circle cx="27.5" cy="10.5" r="2.6" />
      <circle cx="34" cy="14" r="2.6" />
    </>
  ),
  // Growth System: una línea que sube.
  growth: (
    <>
      <path d="M9 36l10-10 7 6 13-15" />
      <path d="M31 17h8v8" />
      <path d="M9 40h30" />
    </>
  ),
  // Acompañamiento anual: un calendario (el año juntos).
  anual: (
    <>
      <rect x="9" y="11" width="30" height="28" rx="4" />
      <path d="M9 19h30M17 7v8M31 7v8" />
      <path d="M17 26h0.01M24 26h0.01M31 26h0.01M17 32h0.01M24 32h0.01" strokeWidth="2.6" />
    </>
  ),
  // DelegaWork: un sistema de nodos conectados.
  delegawork: (
    <>
      <circle cx="24" cy="12" r="4" />
      <circle cx="12" cy="34" r="4" />
      <circle cx="36" cy="34" r="4" />
      <path d="M22 15.5l-8 15M26 15.5l8 15M16 34h16" />
    </>
  ),
  // Servicios: la pieza que falta.
  servicios: (
    <path d="M12 16h8a4 4 0 1 1 8 0h8v8a4 4 0 1 1 0 8v8H28a4 4 0 1 0-8 0h-8v-8a4 4 0 1 0 0-8z" />
  ),
  // Diagnóstico: una lupa.
  diagnostico: (
    <>
      <circle cx="21" cy="21" r="11" />
      <path d="M29 29l10 10" />
    </>
  ),
  // Cursos: reproducir.
  cursos: (
    <>
      <rect x="8" y="11" width="32" height="24" rx="4" />
      <path d="M21 18v10l8-5z" />
      <path d="M17 40h14" />
    </>
  ),
};

export function IconoPrograma({ id, className }: { id: string; className?: string }) {
  const trazo = TRAZOS[id];
  if (!trazo) return null;
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {trazo}
    </svg>
  );
}
