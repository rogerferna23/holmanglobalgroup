import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SITE, WHATSAPP_URL } from "@/lib/config";
import {
  FacebookIcon,
  InstagramIcon,
  WhatsAppIcon,
} from "./icons";

// Hasta que existan URLs reales, renderizamos <span> en lugar de <a> para no
// hacer scroll al top al clickear (footer es Server Component, no puede usar onClick).
const isPlaceholderHref = (href: string) => !href || href === "#";

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  if (isPlaceholderHref(href)) {
    return (
      <span aria-label={label} aria-disabled="true" role="link">
        {children}
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
    >
      {children}
    </a>
  );
}

const EXPLORE = [
  { href: "/#proceso", label: "Proceso" },
  { href: "/experiencias", label: "Experiencias" },
  { href: "/historia", label: "Historia" },
  { href: "/tienda", label: "Tienda" },
  { href: "/blog", label: "Blog" },
];

const POLITICAS = [
  { href: "/privacidad", label: "Privacidad" },
  { href: "/cookies", label: "Cookies" },
  { href: "/terminos", label: "Términos" },
  { href: "/descargos", label: "Descargos" },
  { href: "/copyright", label: "Copyright" },
];

// Brief ago 2026: la columna deja de listar productos individuales y pasa a
// listar las 4 categorías de la tienda. Cada enlace abre la tienda con su
// filtro ya aplicado (`?cat=` → src/components/tienda.tsx).
const CATEGORIAS = [
  { href: "/tienda?cat=sentido", label: "Sentido" },
  { href: "/tienda?cat=marca", label: "Marca" },
  { href: "/tienda?cat=sistema", label: "Sistema" },
  { href: "/tienda?cat=complementarias", label: "Soluciones Complementarias" },
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo">
              <img                 src="/logo-h.png"
                alt="Holman Global Group"
                width={36}
                height={36}
                className="logo-mark"
              />
              <span>HOLMAN GLOBAL GROUP</span>
            </div>
            <p>
              Coaching, branding y sistemas digitales para personas con corazón de elefante.
              Construyendo marcas con sentido desde 2024.
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
            <h4>Categorías</h4>
            <ul>
              {CATEGORIAS.map((l) => (
                <li key={l.label}>
                  <Link to={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4>Políticas</h4>
            <ul>
              {POLITICAS.map((l) => (
                <li key={l.label}>
                  <Link to={l.href}>{l.label}</Link>
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
                <a href={`tel:${SITE.phone.raw}`}>
                  Principal (Sofía): {SITE.phone.display}
                </a>
              </li>
              <li>
                <a href={`tel:${SITE.phoneBackup.raw}`}>
                  Respaldo: {SITE.phoneBackup.display}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {SITE.name} LLC · Todos los derechos reservados
          </span>
          <div className="footer-socials">
            <SocialLink href={SITE.social.instagram} label="Instagram">
              <InstagramIcon width={14} height={14} />
            </SocialLink>
            <SocialLink href={SITE.social.facebook} label="Facebook">
              <FacebookIcon width={14} height={14} />
            </SocialLink>
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
