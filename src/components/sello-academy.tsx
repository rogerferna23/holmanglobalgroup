import { useId } from "react";

/**
 * El sello de ECOS Academy (el logo elegido el 1 nov 2026). Es el mismo dibujo
 * de docs/academy/logo/sello-ecos-academy.html, sin fondo y con los textos
 * en los colores del tema (claro u oscuro):
 * «ECOS ACADEMY» arriba en dorado, «HOLMAN GLOBAL GROUP» abajo y «ECOS» con el
 * rombo en el centro. Los ids van con useId para poder pintar varios sellos.
 */
export function SelloAcademy({ size = 220, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const oro = `oro-${id}`;
  const arriba = `arriba-${id}`;
  const abajo = `abajo-${id}`;
  return (
    <svg
      viewBox="0 0 400 400"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="ECOS Academy · Holman Global Group"
    >
      <defs>
        <linearGradient id={oro} gradientUnits="userSpaceOnUse" x1="70" y1="60" x2="330" y2="340">
          <stop offset="0" stopColor="#FFE38A" />
          <stop offset=".35" stopColor="#F0B800" />
          <stop offset=".62" stopColor="#B58600" />
          <stop offset=".82" stopColor="#F7CF4A" />
          <stop offset="1" stopColor="#C99400" />
        </linearGradient>
        <path id={arriba} d="M56 200 A144 144 0 0 1 344 200" />
        <path id={abajo} d="M41 200 A159 159 0 0 0 359 200" />
      </defs>

      <circle cx="200" cy="200" r="194" fill="none" stroke={`url(#${oro})`} strokeWidth="4" />
      <circle cx="200" cy="200" r="184" fill="none" stroke="#F0B800" strokeWidth="1.2" strokeDasharray="2 5" opacity=".75" />

      <text fontFamily="Josefin Sans" fontSize="23" fontWeight="600" fill="#F0B800" letterSpacing="7" textAnchor="middle">
        <textPath href={`#${arriba}`} startOffset="50%">ECOS ACADEMY</textPath>
      </text>
      <text fontFamily="Josefin Sans" fontSize="18.5" fontWeight="400" style={{ fill: "var(--muted)" }} letterSpacing="5.5" textAnchor="middle">
        <textPath href={`#${abajo}`} startOffset="50%">HOLMAN GLOBAL GROUP</textPath>
      </text>

      <path d="M48 200 l7 -7 7 7 -7 7 Z" fill="#F0B800" />
      <path d="M338 200 l7 -7 7 7 -7 7 Z" fill="#F0B800" />

      <circle cx="200" cy="200" r="120" fill="rgba(240,184,0,.04)" stroke={`url(#${oro})`} strokeWidth="2" />
      <circle cx="200" cy="200" r="112" fill="none" stroke="#F0B800" strokeWidth=".8" opacity=".35" />

      <text x="204" y="214" textAnchor="middle" fontFamily="Questrial" fontSize="58" letterSpacing="9" style={{ fill: "var(--white)" }}>
        ECOS
      </text>
      <path d="M146 242 H190 M210 242 H254" stroke="#F0B800" strokeWidth="1.5" />
      <path d="M200 235 l7 7 -7 7 -7 -7 Z" fill="#F0B800" />
    </svg>
  );
}
