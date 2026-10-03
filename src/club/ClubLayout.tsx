import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ROLES_ADMIN, useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { ECOS, enPrueba, nivelEcos, tieneAcceso } from "@/lib/ecos";
import { Candado, PanelBloqueado } from "@/club/PanelBloqueado";
import { ADMIN, CLUB } from "@/lib/routes";
import { enBiblioteca } from "@/club/BibliotecaTabs";
import { ICONOS } from "@/club/iconos";

const I = ICONOS;

// Cinco entradas, nada más. Grabaciones, Cursos y Material viven juntos en
// «Biblioteca» (con pestañas adentro). Comunidad se entra desde Inicio
// («La comunidad · Ver el directorio»); la página sigue en /comunidad.
type ItemNav = { path: string; label: string; icon: ReactNode; end?: boolean; biblioteca?: boolean };
const NAV: ItemNav[] = [
  { path: "", label: "Inicio", icon: I.home, end: true },
  { path: "/clases", label: "Clases", icon: I.cal },
  { path: "/grabaciones", label: "Biblioteca", icon: I.book, biblioteca: true },
  { path: "/negocio", label: "Negocio", icon: I.gift },
  { path: "/cuenta", label: "Mi cuenta", icon: I.user },
];

/** Solo para quien da una materia. */
const NAV_PROFESOR: ItemNav = { path: "/mis-clases", label: "Mis clases", icon: I.board, end: false };

/** Cascarón del panel: menú lateral fino con íconos, barra superior con avatar. */
export default function ClubLayout({ base = CLUB.panel }: { base?: string }) {
  const { signOut, profile } = useAuth();
  const { member, progress } = useClub();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.title = `${ECOS.brand} · ${ECOS.category}`;
    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) { robots = document.createElement("meta"); robots.setAttribute("name", "robots"); document.head.appendChild(robots); }
    robots.setAttribute("content", "noindex, nofollow");
  }, []);

  const esAdmin = !!profile && ROLES_ADMIN.includes(profile.role);
  // Sin acceso (después del mes gratis sin activar, pago caído o cancelado):
  // ve el club completo, pero cada sección con candado y el botón para abrirla.
  const acceso = tieneAcceso(member);

  async function logout() { await signOut(); navigate(CLUB.entrar, { replace: true }); }

  const initials = (member?.name || member?.email || "?").split(/[\s@]/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const nivel = nivelEcos(progress.xp);

  return (
    <div className={`club-shell${open ? " nav-open" : ""}`}>
      <header className="club-top">
        <button type="button" className="club-burger" aria-label="Menú" onClick={() => setOpen((v) => !v)}><span /><span /><span /></button>
        <Link to={base} className="club-brand">
          <img className="club-brand-mark" src="/ecos-placa.png" alt="" width={38} height={38} />
          <span className="club-brand-text">
            <span className="club-brand-row"><span className="club-brand-name">{ECOS.brand}</span><span className="club-brand-cat">{ECOS.category}</span></span>
            <span className="club-brand-desc">{ECOS.descriptor}</span>
          </span>
        </Link>
        <div className="club-top-right">
          <span className="club-top-streak" title="Semanas seguidas viniendo">🔥 {progress.streak}</span>
          <Link to={`${base}/cuenta`} className="club-avatar" title={`Nivel ECOS ${nivel}`}>
            <span className="club-avatar-ring" style={{ background: `conic-gradient(var(--gold) ${Math.min(100, (nivel / 10) * 100)}%, rgba(255,255,255,0.08) 0)` }} />
            <span className="club-avatar-in">{initials}</span>
            <span className="club-avatar-lvl">{nivel}</span>
          </Link>
        </div>
      </header>

      <aside className="club-side">
        <nav className="club-nav" aria-label="Secciones del club">
          {(member?.teacher ? [NAV[0], NAV_PROFESOR, ...NAV.slice(1)] : NAV).map((it) => (
            <NavLink key={it.path} to={`${base}${it.path}`} end={it.end} title={it.label} className={({ isActive }) => `club-nav-item${isActive || (it.biblioteca && enBiblioteca(pathname)) ? " active" : ""}`} onClick={() => setOpen(false)}>
              <span className="club-nav-icon">{it.icon}</span><span className="club-nav-label">{it.label}</span>
              {!acceso && <span className="club-nav-lock" aria-label="Bloqueado"><Candado /></span>}
            </NavLink>
          ))}
        </nav>
        <div className="club-side-foot">
          {esAdmin && <Link to={ADMIN.home} className="club-side-link club-side-admin" title="Administración"><span className="club-nav-icon">{I.admin}</span><span className="club-nav-label">Administración</span></Link>}
          <Link to="/" className="club-side-link" title="Volver al sitio"><span className="club-nav-icon">{I.sitio}</span><span className="club-nav-label">Volver al sitio</span></Link>
          <button type="button" className="club-side-link" onClick={logout} title="Cerrar sesión"><span className="club-nav-icon">{I.salir}</span><span className="club-nav-label">Cerrar sesión</span></button>
          <span className="club-side-firma">· Holman Global Group</span>
        </div>
      </aside>

      <main className="club-main">
        {enPrueba(member) && (
          <div className="club-prueba" role="status">
            <p>
              <strong>Estás en tu mes gratis.</strong> Activa tu membresía antes del {ECOS.primerCobroTexto} para
              seguir sin cortes. Hoy pagas $0, y al activarla se abren tu descuento y tu comisión.
            </p>
            <Link to={CLUB.activar} className="club-prueba-btn">Activar</Link>
          </div>
        )}
        {acceso ? <Outlet /> : <PanelBloqueado member={member} base={base} />}
      </main>
    </div>
  );
}
