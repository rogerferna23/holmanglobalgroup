import { NavLink, useLocation } from "react-router-dom";

/**
 * Pestañas de «Negocio». Se arman desde la ruta actual para servir igual en el
 * panel real (/ecos/panel/negocio) y en la vista previa (/ecos/preview/negocio).
 */
const TABS = [
  { path: "", label: "Cómo recomendar", end: true },
  { path: "/catalogo", label: "Catálogo", end: false },
  { path: "/comisiones", label: "Comisiones", end: false },
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
