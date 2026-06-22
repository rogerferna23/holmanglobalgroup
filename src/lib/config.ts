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
    raw: "+17634475060",
    display: "+1 (763) 447-5060",
    e164: "17634475060",
  },
  social: {
    instagram: "https://www.instagram.com/holmanglobalgroup",
    facebook: "https://www.facebook.com/profile.php?id=61568537740189",
  },
} as const;

// Enlace de contacto general de WhatsApp (vanity link de la marca).
// Para enlaces con texto pre-rellenado (p. ej. tienda) se usa wa.me/{e164}
// directamente, porque el vanity link no admite el parámetro ?text=.
export const WHATSAPP_URL = "https://w.app/holmanglobalgroup";
