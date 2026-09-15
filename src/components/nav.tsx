import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CLUB } from "@/lib/routes";

// Brief "Ajustes Adicionales" (ago 2026): "Experiencias" del menú principal
// apunta a la página completa /experiencias, no al ancla de la sección del
// landing (el botón "Ver más experiencias" del landing sigue llevando ahí).
const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/#proceso", label: "Camino" },
  { href: "/experiencias", label: "Experiencias" },
  { href: "/historia", label: "Historia" },
  { href: "/tienda", label: "Tienda" },
  { href: CLUB.landing, label: "Club ECOS" },
  { href: "/blog", label: "Blog" },
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
            <span className="logo-tag">Sentido, marca y sistema</span>
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
          <Link
            to={CLUB.entrar}
            className="nav-cta nav-cta-club nav-cta-mobile"
            onClick={closeMenu}
          >
            <span className="nav-cta-club-a">ECOS Club</span>
            <span className="nav-cta-club-b">Ingresar</span>
          </Link>
        </div>

        {/*
          Arriba a la derecha: la puerta del club (brief ECOS, sep 2026).
          Sustituye al botón de WhatsApp, que sigue en el FAB y en el footer.
          Al pasar el mouse cambia de color y dice "Ingresar".
        */}
        <Link to={CLUB.entrar} className="nav-cta nav-cta-club nav-cta-desktop">
          <span className="nav-cta-club-a">ECOS Club</span>
          <span className="nav-cta-club-b">Ingresar</span>
        </Link>

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
