import { SITE, WHATSAPP_URL } from "@/lib/config";
import {
  InstagramIcon,
  SpotifyIcon,
  WhatsAppIcon,
  YoutubeIcon,
} from "./icons";

const EXPLORE = [
  { href: "/#proceso", label: "Proceso" },
  { href: "/historia", label: "Historia" },
  { href: "/#corazon", label: "Corazón" },
  { href: "/#servicios", label: "Servicios" },
  { href: "/tienda", label: "Tienda" },
];

const PRODUCTOS = [
  { href: "/tienda", label: "Coaching" },
  { href: "/tienda", label: "Tu Marca con Huella" },
  { href: "/tienda", label: "PRO" },
  { href: "/tienda", label: "360" },
  { href: "/tienda", label: "Creación de LLC" },
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo">
              <div className="logo-mark" aria-hidden="true" />
              <span>HOLMAN GLOBAL GROUP</span>
            </div>
            <p>
              Coaching, branding y sistemas digitales para personas con corazón de elefante.
              Construyendo marcas con propósito desde 2024.
            </p>
          </div>

          <div className="footer-col">
            <h4>Explora</h4>
            <ul>
              {EXPLORE.map((l) => (
                <li key={l.label}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4>Productos</h4>
            <ul>
              {PRODUCTOS.map((l) => (
                <li key={l.label}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4>Contacto</h4>
            <ul>
              <li>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              </li>
              <li>
                <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
              </li>
              <li>
                <a href={`tel:${SITE.phone.raw}`}>{SITE.phone.display}</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {SITE.name} · Todos los derechos reservados
          </span>
          <div className="footer-socials">
            <a href={SITE.social.instagram} aria-label="Instagram">
              <InstagramIcon width={14} height={14} />
            </a>
            <a href={SITE.social.spotify} aria-label="Spotify">
              <SpotifyIcon width={14} height={14} />
            </a>
            <a href={SITE.social.youtube} aria-label="YouTube">
              <YoutubeIcon width={14} height={14} />
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
            >
              <WhatsAppIcon width={14} height={14} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
