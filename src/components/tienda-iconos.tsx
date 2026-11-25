/**
 * Familia de logos de la tienda (dic 2026, Holman): todos salen del molde
 * del logo de ECOS — cuadrado negro de esquinas redondas, borde dorado fino,
 * línea blanca por dentro, la palabra en blanco (Questrial) y el «apellido»
 * en dorado espaciado debajo. Sin imágenes: es HTML y CSS (.tn-logo en
 * src/styles/tienda.css), así se ve nítido en cualquier tamaño.
 */
export const LOGOS: Record<string, { palabra: string; apellido: string }> = {
  sentido: { palabra: "SENTIDO", apellido: "PROGRAMA" },
  marca: { palabra: "HUELLA", apellido: "MARCA" },
  growth: { palabra: "GROWTH", apellido: "SYSTEM" },
  anual: { palabra: "ANUAL", apellido: "12 MESES" },
  ecos: { palabra: "ECOS", apellido: "CLUB" },
  claridad: { palabra: "CLARIDAD", apellido: "SESIÓN" },
  delegawork: { palabra: "DELEGA", apellido: "WORK" },
  servicios: { palabra: "PIEZAS", apellido: "SERVICIOS" },
  diagnostico: { palabra: "EMPRESA", apellido: "DIAGNÓSTICO" },
};

export function LogoPrograma({ id, size = "md", className }: { id: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const logo = LOGOS[id];
  if (!logo) return null;
  return (
    <span className={`tn-logo is-${size}${className ? ` ${className}` : ""}`} aria-hidden="true">
      <span className="tn-logo-caja">
        <span className="tn-logo-palabra">{logo.palabra}</span>
      </span>
      <span className="tn-logo-apellido">{logo.apellido}</span>
    </span>
  );
}
