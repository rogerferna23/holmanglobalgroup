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
    raw: "+34711208967",
    display: "+34 711 208 967",
    e164: "34711208967",
  },
  social: {
    instagram: "#",
    spotify: "#",
    youtube: "#",
  },
} as const;

export const WHATSAPP_URL = `https://wa.me/${SITE.phone.e164}`;
