import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { ECOS, nivelEcos } from "@/lib/ecos";
import { CLUB } from "@/lib/routes";

const I = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></svg>,
  cal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>,
  play: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" /></svg>,
  book: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z" /><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z" /></svg>,
  people: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="9" cy="8" r="3.2" /><circle cx="17" cy="9" r="2.4" /><path d="M3 20c0-3 2.7-5.5 6-5.5S15 17 15 20" /><path d="M14.5 14.5c2.5 0 6 1.6 6 4.5" /></svg>,
  gift: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 12h18M12 8c-2-4-6-3-6-1s3 1 6 1zm0 0c2-4 6-3 6-1s-3 1-6 1z" /></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>,
  board: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M12 16v4M8 20h8M7 8h7M7 11h4" /></svg>,
};

const NAV: { path: string; label: string; icon: ReactNode; end?: boolean }[] = [
  { path: "", label: "Inicio", icon: I.home, end: true },
  { path: "/clases", label: "Clases", icon: I.cal },
  { path: "/grabaciones", label: "Grabaciones", icon: I.play },
  { path: "/cursos", label: "Cursos", icon: I.book },
  { path: "/comunidad", label: "Comunidad", icon: I.people },
  { path: "/referidos", label: "Beneficios", icon: I.gift },
  { path: "/cuenta", label: "Mi cuenta", icon: I.user },
];

/** Solo para quien da una materia. */
const NAV_PROFESOR = { path: "/mis-clases", label: "Mis clases", icon: I.board, end: false };

/** Cascarón del panel: menú lateral fino con íconos, barra superior con avatar. */
export default function ClubLayout({ base = CLUB.panel }: { base?: string }) {
  const { signOut } = useAuth();
  const { member, progress } = useClub();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.title = `${ECOS.brand} · ${ECOS.category}`;
    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) { robots = document.createElement("meta"); robots.setAttribute("name", "robots"); document.head.appendChild(robots); }
    robots.setAttribute("content", "noindex, nofollow");
  }, []);

  async function logout() { await signOut(); navigate(CLUB.entrar, { replace: true }); }

  const initials = (member?.name || member?.email || "?").split(/[\s@]/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const nivel = nivelEcos(progress.xp);

  return (
    <div className={`club-shell${open ? " nav-open" : ""}`}>
      <header className="club-top">
        <button type="button" className="club-burger" aria-label="Menú" onClick={() => setOpen((v) => !v)}><span /><span /><span /></button>
        <Link to={base} className="club-brand">
          <img className="club-brand-mark" src="/ecos-placa.png" alt="" width={34} height={34} />
          <span className="club-brand-row"><span className="club-brand-name">{ECOS.brand}</span><span className="club-brand-cat">{ECOS.category}</span></span>
          <span className="club-brand-desc">{ECOS.descriptor}</span>
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
            <NavLink key={it.path} to={`${base}${it.path}`} end={it.end} className={({ isActive }) => `club-nav-item${isActive ? " active" : ""}`} onClick={() => setOpen(false)}>
              <span className="club-nav-icon">{it.icon}</span><span className="club-nav-label">{it.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="club-side-foot">
          <Link to="/" className="club-side-link">Volver al sitio</Link>
          <button type="button" className="club-side-link" onClick={logout}>Cerrar sesión</button>
          <span className="club-side-firma">· Holman Global Group</span>
        </div>
      </aside>

      <main className="club-main"><Outlet /></main>
    </div>
  );
}
