import { NavLink, useLocation } from "react-router-dom";

/**
 * Pestañas de «Negocio». Se arman desde la ruta actual para servir igual en el
 * panel real (/ecos/panel/negocio) y en la vista previa (/ecos/preview/negocio).
 */
// Primero el plan («Empieza aquí»), luego Comisiones: la persona ve su
// negocio (su enlace y lo que gana) antes de aprender cómo recomendar.
const TABS = [
  { path: "/empieza", label: "Empieza aquí", end: false },
  { path: "", label: "Comisiones", end: true },
  { path: "/recomendar", label: "Cómo recomendar", end: false },
  // Material: el catálogo y las piezas para redes (el catálogo vive adentro).
  { path: "/material", label: "Material", end: false },
];

export function NegocioTabs() {
  const { pathname } = useLocation();
  const i = pathname.indexOf("/negocio");
  const root = i >= 0 ? pathname.slice(0, i + "/negocio".length) : pathname;

  return (
    <nav className="neg-tabs" aria-label="Secciones de Negocio">
      {TABS.map((t) => (
        <NavLink key={t.path} to={`${root}${t.path}`} end={t.end} className={({ isActive }) => `neg-tab${isActive ? " active" : ""}`}>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
