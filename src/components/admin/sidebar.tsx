import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

type Item = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const NAV: Item[] = [
  {
    href: "/admin",
    label: "Dashboard",
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
    href: "/admin/transacciones",
    label: "Transacciones",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    href: "/admin/productos",
    label: "Productos",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 2 4 6v12l8 4 8-4V6l-8-4Z" />
        <path d="M4 6l8 4 8-4M12 22V10" />
      </svg>
    ),
  },
  {
    href: "/admin/vendedores",
    label: "Vendedores",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="9" cy="8" r="3.2" />
        <circle cx="17" cy="9" r="2.4" />
        <path d="M3 20c0-3 2.7-5.5 6-5.5S15 17 15 20" />
        <path d="M14.5 14.5c2.5 0 6 1.6 6 4.5" />
      </svg>
    ),
  },
  {
    href: "/admin/reportes",
    label: "Reportes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 20V4M4 20h16" />
        <path d="M8 16v-4M12 16V8M16 16v-7" />
      </svg>
    ),
  },
  {
    href: "/admin/postulantes",
    label: "Postulantes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
        <path d="M18 4l1.5 1.5L23 2" />
      </svg>
    ),
  },
  {
    href: "/admin/seguridad",
    label: "Seguridad",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3Z" />
      </svg>
    ),
  },
  {
    href: "/admin/solicitudes",
    label: "Solicitudes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </svg>
    ),
  },
  {
    href: "/admin/auditoria",
    label: "Auditoría",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="11" cy="11" r="6" />
        <path d="M16 16l5 5" />
      </svg>
    ),
  },
  {
    href: "/admin/configuracion",
    label: "Configuración",
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

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  };

  async function logout() {
    await signOut();
    navigate("/login", { replace: true });
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
            className={`adm-nav-item${isActive(it.href) ? " active" : ""}`}
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
