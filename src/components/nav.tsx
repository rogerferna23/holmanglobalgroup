import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { WHATSAPP_URL } from "@/lib/config";
import { WhatsAppIcon } from "./icons";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/#proceso", label: "Proceso" },
  { href: "/#corazon", label: "Corazón" },
  { href: "/#servicios", label: "Servicios" },
  { href: "/historia", label: "Historia" },
  { href: "/tienda", label: "Tienda" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled((window.scrollY || 0) > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cerrar el menú móvil al cambiar de ruta o pulsar Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMenu = () => setMobileOpen(false);

  return (
    <nav id="nav" className={`nav${scrolled ? " scrolled" : ""}${mobileOpen ? " menu-open" : ""}`}>
      <div className="shell nav-row">
        <Link
          to="/"
          className="logo"
          aria-label="Holman Global Group LLC"
          onClick={closeMenu}
        >
          <img             src="/logo-h.png"
            alt="Holman Global Group"
            width={42}
            height={42}
           
            className="logo-mark"
          />
          <span className="logo-text">
            <span className="logo-name">Holman Global Group LLC</span>
            <span className="logo-tag">Propósito, marca y sistema</span>
          </span>
        </Link>

        <div className={`nav-links${mobileOpen ? " open" : ""}`} id="nav-menu">
          {NAV_LINKS.map((l) =>
            l.href.includes("#") ? (
              <a key={l.href} href={l.href} onClick={closeMenu}>
                {l.label}
              </a>
            ) : (
              <Link key={l.href} to={l.href} onClick={closeMenu}>
                {l.label}
              </Link>
            )
          )}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-cta nav-cta-mobile"
            onClick={closeMenu}
          >
            <WhatsAppIcon width={14} height={14} />
            WhatsApp
          </a>
          <Link
            to="/login"
            className="nav-cta nav-cta-mobile nav-login"
            onClick={closeMenu}
          >
            Acceder al panel
          </Link>
        </div>

        <Link
          to="/login"
          className="nav-login nav-cta-desktop"
          aria-label="Acceso al panel"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            width="14"
            height="14"
          >
            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
            <path d="M10 17l5-5-5-5M15 12H3" />
          </svg>
          Acceder
        </Link>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="nav-cta nav-cta-desktop"
        >
          <WhatsAppIcon width={14} height={14} />
          WhatsApp
        </a>

        <button
          type="button"
          className="nav-burger"
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileOpen}
          aria-controls="nav-menu"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
}
