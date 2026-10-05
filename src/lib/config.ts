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
  // Oct 2026: el sitio pasa al número de Colombia de Holman (WhatsApp Business
  // en su celular). El de EE. UU. (+1 209 964 1747) queda solo en Sofía /
  // DelegaWork y no responde sin recarga, por eso ya no se muestra.
  phone: {
    raw: "+573239103261",
    display: "+57 (323) 910-3261",
    e164: "573239103261",
  },
  // Número oficial de WhatsApp del sitio. Todos los botones/enlaces de WhatsApp
  // (header, footer, CTAs, FAB y tienda) apuntan a este número vía
  // WHATSAPP_URL / waLink().
  whatsapp: {
    e164: "573239103261",
    display: "+57 (323) 910-3261",
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

// Botón «Agenda tu Sesión de Claridad» de la home: pasa primero por WhatsApp,
// donde Holman conversa con la persona y le manda la agenda si encaja. Es el
// filtro: la agenda directa (/agendar) queda para los embajadores.
export const CLARIDAD_WA_URL = `${WHATSAPP_URL}?text=${encodeURIComponent(
  "Hola, quiero agendar mi Sesión de Claridad."
)}`;

// Canal de WhatsApp de ECOS (avisos de clases, podcast y masterclass). Abierto
// a cualquiera; el link de Zoom vive solo en el panel. Lo usa /links; el botón
// del panel lee el suyo de ecos_settings.whatsapp_group_url.
export const ECOS_CANAL_WA_URL = "https://whatsapp.com/channel/0029Vb9Ec155fM5VTslkfk2y";
