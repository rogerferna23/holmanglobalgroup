// Fuente ÚNICA de rutas públicas. La usa el plugin de build para generar
// sitemap.xml, robots.txt y el HTML por ruta (meta correcto en cada página).
// Si añades una ruta pública nueva, ponla aquí (con su title/description).
export const SITE_URL = "https://holmanglobalgroup.com";

export const PUBLIC_ROUTES = [
  {
    path: "/",
    priority: "1.0",
    changefreq: "weekly",
    title: "Holman Global Group | Sentido, Marca y Sistema",
    description:
      "Coaching expansivo, branding y sistemas digitales para vivir de lo que amas.",
  },
  {
    path: "/tienda",
    priority: "0.9",
    changefreq: "weekly",
    title: "Tienda — Coaching, Branding y LLC | Holman Global Group",
    description:
      "Sesiones de coaching, paquetes de branding, creación de LLC y sistemas de marketing digital. Elige el servicio que se ajusta a tu momento.",
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
    path: "/experiencias",
    priority: "0.7",
    changefreq: "monthly",
    title: "Experiencias — Holman Global Group",
    description:
      "Historias reales de clientes de Holman Global Group: procesos de coaching, marca y sistemas digitales contados por quienes los vivieron.",
  },
  {
    path: "/ecos",
    priority: "0.9",
    changefreq: "weekly",
    title: "ECOS Business Club — Ventas, marketing y oratoria | Holman Global Group",
    description:
      "Club de membresía para emprendedores latinos: clases de ventas, marketing y oratoria cada semana, práctica en vivo y una comunidad que te ve avanzar. $47 al mes.",
    // Lo que se ve al compartir el enlace por WhatsApp. Sin esto salía la imagen
    // genérica de HGG, que no dice nada del club.
    image: "/og-ecos.png",
    imageAlt: "ECOS Business Club — ventas, marketing y oratoria, $47 al mes",
  },
  {
    // Enlace de agenda de Holman y de los embajadores (/agendar?ref=CODIGO).
    // Fuera del sitemap y con noindex: existe para que al pegarlo en WhatsApp
    // salga la tarjeta de HGG con la foto y no la de la plataforma de agenda.
    path: "/agendar",
    sitemap: false,
    noindex: true,
    priority: "0.1",
    changefreq: "yearly",
    // Mismo texto de la Sesión de Claridad en la agenda de DelegaWork.
    title: "Holman Global Group · Sesión de Claridad",
    description:
      "Conoceremos tu historia, entenderemos tus objetivos e identificaremos el mejor camino para ayudarte a avanzar con claridad, estrategia y dirección.",
    image: "/og-agenda.png",
    imageAlt: "Holman Global Group — Sentido, Marca y Sistema · Agenda",
  },
  {
    // Enlace para quien ya compró sesiones de coaching (/sesion). Igual que
    // /agendar: fuera del sitemap, noindex, y con su propia tarjeta.
    path: "/sesion",
    sitemap: false,
    noindex: true,
    priority: "0.1",
    changefreq: "yearly",
    title: "Holman Global Group · Sesión de coaching",
    description:
      "Agenda tu sesión de coaching con Holman: elige el día y la hora que mejor te queden.",
    image: "/og-sesion.png",
    imageAlt: "Holman Global Group — Sentido, Marca y Sistema · Sesión de coaching",
  },
  {
    path: "/blog",
    priority: "0.6",
    changefreq: "weekly",
    title: "Blog — Holman Global Group",
    description:
      "Ideas sobre propósito, marca y sistemas digitales para vivir de lo que amas. Próximamente, artículos de Holman Global Group.",
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
    path: "/ecos/terminos",
    priority: "0.3",
    changefreq: "yearly",
    title: "Términos de ECOS Business Club — Holman Global Group",
    description:
      "Condiciones de la membresía de ECOS Business Club: precio, mes gratis, renovación automática, cancelación, grabaciones y comunidad.",
  },
  {
    path: "/reembolsos",
    priority: "0.3",
    changefreq: "yearly",
    title: "Política de Reembolsos — Holman Global Group",
    description: "Política de reembolsos de Holman Global Group.",
  },
];
