import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ADMIN } from "@/lib/routes";

type Item = {
  href: string;
  label: string;
  icon: React.ReactNode;
  /**
   * Secciones que viven como pestañas dentro de este grupo (ver
   * admin-tabs.tsx): el ítem queda marcado también cuando se está en ellas.
   */
  also?: string[];
};

const NAV: Item[] = [
  {
    href: ADMIN.home,
    label: "Dashboard",
    also: [ADMIN.transacciones, ADMIN.reportes],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: ADMIN.productos,
    label: "Tienda",
    also: [ADMIN.vendedores, ADMIN.solicitudes],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 2 4 6v12l8 4 8-4V6l-8-4Z" />
        <path d="M4 6l8 4 8-4M12 22V10" />
      </svg>
    ),
  },
  {
    href: ADMIN.resenas,
    label: "Reseñas",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.65l5.9-.85L12 3.5Z" />
      </svg>
    ),
  },
  {
    href: ADMIN.instagram,
    label: "Instagram",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: ADMIN.ecos,
    label: "ECOS",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 5.5a6.5 6.5 0 0 1 6.5 6.5M12 2a10 10 0 0 1 10 10" />
        <path d="M12 18.5A6.5 6.5 0 0 1 5.5 12M12 22A10 10 0 0 1 2 12" />
      </svg>
    ),
  },
  {
    href: ADMIN.test,
    label: "Test",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v9l6.4 6.4M12 12H3" />
      </svg>
    ),
  },
  {
    href: ADMIN.configuracion,
    label: "Configuración",
    also: [ADMIN.auditoria],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
      </svg>
    ),
  },
];

import { useAuth } from "@/contexts/AuthContext";

export function AdminSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const matches = (href: string) =>
    href === ADMIN.home ? pathname === ADMIN.home : pathname === href || pathname.startsWith(href + "/");
  const isActive = (it: Item) => matches(it.href) || (it.also ?? []).some(matches);

  async function logout() {
    await signOut();
    navigate(ADMIN.login, { replace: true });
  }

  return (
    <aside className={`adm-sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="adm-brand">
        <span className="adm-brand-mark">H</span>
        <span className="adm-brand-text">
          HGG <span>Admin</span>
        </span>
      </div>
      <nav className="adm-nav">
        {NAV.map((it) => (
          <Link
            key={it.href}
            to={it.href}
            className={`adm-nav-item${isActive(it) ? " active" : ""}`}
          >
            <span className="adm-nav-icon">{it.icon}</span>
            <span className="adm-nav-label">{it.label}</span>
          </Link>
        ))}
      </nav>
      <div className="adm-sidebar-foot">
        <button
          type="button"
          className="adm-foot-btn"
          onClick={() => setCollapsed((v) => !v)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
          </svg>
          <span>{collapsed ? "Expandir panel" : "Contraer panel"}</span>
        </button>
        <button type="button" className="adm-foot-btn" onClick={logout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
            <path d="M10 17l5-5-5-5M15 12H3" />
          </svg>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
