// Fuente ÚNICA de rutas públicas. La usa el plugin de build para generar
// sitemap.xml, robots.txt y el HTML por ruta (meta correcto en cada página).
// Si añades una ruta pública nueva, ponla aquí (con su title/description).
export const SITE_URL = "https://holmanglobalgroup.com";

export const PUBLIC_ROUTES = [
  {
    path: "/",
    priority: "1.0",
    changefreq: "weekly",
    title:
      "Holman Global Group | Coaching, Branding y Marketing Digital en Español",
    description:
      "Descubre tu propósito, construye tu marca y crea un sistema para vivir de lo que amas. Coaching expansivo, branding y sistemas digitales. Primera sesión sin costo.",
  },
  {
    path: "/tienda",
    priority: "0.9",
    changefreq: "weekly",
    title: "Tienda — Coaching, Branding y LLC | Holman Global Group",
    description:
      "Sesiones de coaching desde $50 USD, paquetes de branding, creación de LLC y sistemas de marketing digital. Elige el servicio que se ajusta a tu momento.",
  },
  {
    path: "/historia",
    priority: "0.8",
    changefreq: "monthly",
    title: "Nuestra Historia — Holman Global Group",
    description:
      "Conoce el origen de Holman Global Group y la filosofía Corazón de Elefante: propósito, marca y sistema para personas que quieren vivir diferente.",
  },
  {
    path: "/trabaja",
    priority: "0.5",
    changefreq: "monthly",
    title: "Trabaja con nosotros — Holman Global Group",
    description:
      "Únete a Holman Global Group. Crece con propósito en coaching, branding y sistemas digitales.",
  },
  {
    path: "/privacidad",
    priority: "0.3",
    changefreq: "yearly",
    title: "Política de Privacidad — Holman Global Group",
    description:
      "Política de privacidad de Holman Global Group: cómo tratamos y protegemos tus datos personales.",
  },
  {
    path: "/cookies",
    priority: "0.3",
    changefreq: "yearly",
    title: "Política de Cookies — Holman Global Group",
    description:
      "Cómo usamos cookies en Holman Global Group: técnicas, de analítica (Google Analytics 4) y de marketing (Meta Pixel), y cómo aceptarlas o rechazarlas.",
  },
  {
    path: "/terminos",
    priority: "0.3",
    changefreq: "yearly",
    title: "Términos y Condiciones — Holman Global Group",
    description:
      "Términos y condiciones de uso de los servicios de Holman Global Group.",
  },
  {
    path: "/descargos",
    priority: "0.3",
    changefreq: "yearly",
    title: "Descargos de Responsabilidad — Holman Global Group",
    description: "Descargos de responsabilidad de Holman Global Group.",
  },
  {
    path: "/copyright",
    priority: "0.3",
    changefreq: "yearly",
    title: "Copyright y Propiedad Intelectual — Holman Global Group",
    description:
      "Información de copyright y propiedad intelectual de Holman Global Group.",
  },
  {
    path: "/reembolsos",
    priority: "0.3",
    changefreq: "yearly",
    title: "Política de Reembolsos — Holman Global Group",
    description: "Política de reembolsos de Holman Global Group.",
  },
];
