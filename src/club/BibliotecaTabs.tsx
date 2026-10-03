import { NavLink, useLocation } from "react-router-dom";

/**
 * Pestañas de la Biblioteca: grabaciones de clase, cursos y material de los
 * profesores, bajo una sola entrada del menú. Se arman desde la ruta actual
 * para servir igual en el panel real y en la vista previa.
 */
const TABS = [
  { path: "/grabaciones", label: "Grabaciones" },
  { path: "/cursos", label: "Cursos" },
  { path: "/material", label: "Material" },
];

/** Si la ruta está dentro de la Biblioteca (no confundir con Negocio → Material). */
export function enBiblioteca(pathname: string): boolean {
  return !pathname.includes("/negocio") && /\/(grabaciones|cursos|material)(\/|$)/.test(pathname);
}

export function BibliotecaTabs() {
  const { pathname } = useLocation();
  const m = pathname.match(/^(.*)\/(grabaciones|cursos|material)(\/|$)/);
  const root = m ? m[1] : pathname;

  return (
    <nav className="neg-tabs" aria-label="Secciones de la Biblioteca">
      {TABS.map((t) => (
        <NavLink key={t.path} to={`${root}${t.path}`} className={({ isActive }) => `neg-tab${isActive ? " active" : ""}`}>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
