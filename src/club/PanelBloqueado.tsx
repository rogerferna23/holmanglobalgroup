import { Link, useLocation } from "react-router-dom";
import { ECOS, type EcosMember } from "@/lib/ecos";
import { CLUB } from "@/lib/routes";

/** Qué hay detrás de cada candado. Se muestra para que se antoje, no para regañar. */
const SECCIONES: Record<string, { titulo: string; texto: string; tarjetas: number }> = {
  "": { titulo: "Tu panel", texto: "Tu próxima clase, tu avance en cada habilidad, tu racha y los retos del mes.", tarjetas: 4 },
  clases: { titulo: "Clases en vivo", texto: "Ventas, marketing y oratoria todas las semanas, con el enlace para entrar a Zoom.", tarjetas: 6 },
  grabaciones: { titulo: "Grabaciones", texto: "Cada clase queda aquí el mismo día, para repasarla cuando te quede bien.", tarjetas: 6 },
  cursos: { titulo: "Cursos", texto: "Cursos completos de las tres materias, para avanzar a tu ritmo.", tarjetas: 3 },
  comunidad: { titulo: "Comunidad", texto: "El directorio de miembros: quién es quién, a qué se dedica y cómo contactarlo.", tarjetas: 6 },
  referidos: { titulo: "Comisiones", texto: `Tu enlace de embajador y el ${ECOS.comisionReferidoPct}% de comisión por cada persona que traigas.`, tarjetas: 3 },
  cuenta: { titulo: "Mi cuenta", texto: "Tu perfil, tu nivel y la administración de tu membresía.", tarjetas: 2 },
};

const Candado = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

/**
 * Lo que ve dentro del panel quien no tiene acceso: después del mes gratis sin
 * activar, con el pago caído o con la membresía cancelada. Entra, ve el club
 * con candados y desbloquea desde aquí. Nunca un muro de pago en la puerta.
 */
export function PanelBloqueado({ member, base }: { member: EcosMember | null; base: string }) {
  const { pathname } = useLocation();
  const clave = pathname.slice(base.length).replace(/^\//, "").split("/")[0] ?? "";
  const s = SECCIONES[clave] ?? SECCIONES[""];

  const cta =
    member?.status === "pausado" ? "Actualizar mi tarjeta"
    : member?.status === "cancelado" ? "Volver a ECOS"
    : "Desbloquear todo el club";

  return (
    <div className="club-lock">
      <div className="club-lock-fondo" aria-hidden="true">
        {Array.from({ length: s.tarjetas }, (_, i) => (
          <div key={i} className="club-lock-tarjeta">
            <span /><span /><span />
          </div>
        ))}
      </div>
      <div className="club-lock-caja">
        <span className="club-lock-icono"><Candado /></span>
        <h1>{s.titulo}</h1>
        <p>{s.texto}</p>
        <Link to={CLUB.activar} className="club-btn">{cta}</Link>
        <small>${ECOS.priceUsd} al mes o ${ECOS.priceAnualUsd} al año · cancelas cuando quieras</small>
      </div>
    </div>
  );
}

export { Candado };
