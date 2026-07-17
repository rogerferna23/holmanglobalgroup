export const SITE = {
  name: "Holman Global Group",
  shortName: "HGG",
  tagline: "Corazón de Elefante",
  description:
    "Coaching, branding y sistemas digitales para personas con propósito. Construimos marcas con alma desde 2024.",
  url: "https://holmanglobalgroup.com",
  email: "soporte@holmanglobalgroup.com",
  legalName: "Holman Global Group LLC",
  foundingDate: "2024",
  // Nombre del fundador/coach para el schema Person de /historia.
  // Déjalo vacío y el schema Person no se emite; rellénalo y aparece automáticamente.
  founder: "Holman Orjuela",
  areaServed: ["US", "ES"],
  inLanguage: "es",
  phone: {
    // Número principal de Sofía — atención a clientes (Brief ajustes finales, jul 2026).
    raw: "+12099641747",
    display: "+1 (209) 964-1747",
    e164: "12099641747",
  },
  // Número de respaldo que se muestra en el footer junto al principal.
  phoneBackup: {
    raw: "+573239103261",
    display: "+57 (323) 910-3261",
    e164: "573239103261",
  },
  // Número oficial de WhatsApp del sitio = número principal de Sofía.
  // Todos los botones/enlaces de WhatsApp (header, footer, CTAs, FAB y tienda)
  // apuntan a este número vía WHATSAPP_URL / waLink().
  whatsapp: {
    e164: "12099641747",
    display: "+1 (209) 964-1747",
  },
  social: {
    instagram: "https://www.instagram.com/holmanglobalgroup",
    facebook: "https://www.facebook.com/profile.php?id=61568537740189",
  },
} as const;

// Enlace base de WhatsApp para todos los botones del sitio (header, footer,
// CTAs, FAB). Para enlaces con texto pre-rellenado (p. ej. tienda) se usa
// wa.me/{e164}?text=… — ver waLink() en components/tienda.tsx.
export const WHATSAPP_URL = `https://wa.me/${SITE.whatsapp.e164}`;
