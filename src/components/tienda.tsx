import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CLARIDAD_WA_URL, SITE } from "@/lib/config";
import { trackEvent } from "@/lib/analytics";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useClub } from "@/contexts/ClubContext";
import { ECOS, tieneBeneficios } from "@/lib/ecos";
import { CLUB } from "@/lib/routes";
import type { CheckoutItem } from "@/lib/payments";
import type { OfferItem } from "@/lib/seo";
import { CheckoutModal } from "./checkout-modal";
import { ArrowRightIcon, CheckIcon } from "./icons";
import { Reveal } from "./reveal";

type Product = {
  id: string;
  category: "coaching" | "marca" | "web" | "llc" | "impulso" | "ia" | "nexco";
  categoryLabel: string;
  tag: string;
  amount: string;
  amountValue?: number; // opcional: si no se pasa, no hay checkout directo
  currency?: string; // ISO 4217 — si no se pasa, usa NEXT_PUBLIC_PAYMENT_CURRENCY
  unit: string;
  title: string;
  /**
   * Línea corta bajo el título. Opcional: los planes de DelegaWork 360 la
   * pierden (brief 13-ago-2026) — se quedan con el título y la lista.
   */
  subtitle?: string;
  /** Línea aclaratoria bajo el nombre del paquete (p. ej. plataforma incluida). */
  note?: string;
  /**
   * Párrafo descriptivo. Opcional: los planes de DelegaWork 360 no lo llevan
   * (brief "Badges y descripciones" ago 2026) — se quedan con el subtítulo, la
   * nota en cursiva y la lista de beneficios.
   */
  body?: string;
  features: string[];
  /**
   * Una línea con lo que cambia en este plan. Se usa en la versión corta de
   * los planes que no son el «Más elegido» (si falta, se usa `subtitle`).
   */
  resumen?: string;
  /** Paquetes de sesiones (Programa Sentido): muestra el precio por sesión. */
  sessions?: number;
  cta: string;
  whatsappText: string;
  highlight?: boolean;
  customQuote?: boolean; // si true: el CTA va directo a WhatsApp para cotizar
  /**
   * Otro producto que se compra desde esta misma tarjeta (segundo botón). Lo
   * usa la LLC: creación y renovación cuestan lo mismo y van en una sola fila.
   */
  alterno?: string;
  /** No se pinta solo: vive como botón `alterno` de otra tarjeta. */
  oculto?: boolean;
};

function waLink(text: string) {
  return `https://wa.me/${SITE.whatsapp.e164}?text=${encodeURIComponent(text)}`;
}

// Catálogo actualizado según Brief HGG "Reestructuración Tienda + DelegaWork 360
// + Footer" (ago 2026). Precios USD.
// Orden del catálogo = orden de las 4 categorías de la tienda:
//   Propósito (coaching) · Marca · Sistema (DelegaWork 360) ·
//   Soluciones Complementarias (LLC + Nexco + Desarrollo Web).
// IMPORTANTE: los `id` son la clave con la que el backend (Supabase Edge
// Function create-payment-intent → tabla `products`) determina el importe real
// a cobrar. NO renombrar ids sin actualizar también la tabla `products`.

// Ecosistema DelegaWork: idéntico en los tres tiers de DelegaWork 360 (lo que
// cambia entre tiers es el volumen de créditos y de servicios, no los módulos).
const ECOSYSTEM = [
  "Sofía IA",
  "CRM",
  "FLOW",
  "NETWORK",
  "DelegaMail",
  "DelegaMeet",
  "DelegaBooks",
  "DelegaSocial",
  "DelegaCloud",
  "DelegaHelp",
];

// Brief "Ajustes Adicionales" (ago 2026): DelegaCloud queda solo listado dentro
// del ecosistema, igual que los demás módulos — sin línea aparte que lo explique.

const PRODUCTS: Product[] = [
  // ============================================
  // TEMPORAL — Producto de prueba $1
  // Aparece SOLO si la URL trae ?test=1 (oculto del catalogo publico).
  // Eliminar este bloque cuando ya hayas validado pagos en live.
  // ============================================
  {
    id: "test-1usd",
    category: "coaching",
    categoryLabel: "Prueba",
    tag: "Test",
    amount: "$1",
    amountValue: 1,
    unit: "USD",
    title: "Producto de prueba.",
    subtitle: "No comprar — solo validacion del flujo de pago.",
    body:
      "Producto temporal para verificar que PayPal y el flujo de captura funcionan correctamente en live. Una vez validado, eliminar este producto del catalogo.",
    features: ["Solo $1 USD", "Pago real", "Validacion de webhook"],
    cta: "Pagar 1 USD",
    whatsappText: "Hola HGG, estoy probando el flujo de pago.",
  },

  // ===== 1 · PROGRAMA SENTIDO (Eco) — 1 color HGG =====
  // Oct 2026 (Holman): los tres paquetes recorren el MISMO camino —Claridad,
  // Identidad y Acción, que se explica una vez en el encabezado del grupo—; lo
  // que cambia es el número de sesiones. Ya no hay etapas por nivel.
  // Precios: $397 / $697 / $997 → $132 · $116 · $100 por sesión, para que los
  // 10 sean la compra que más conviene.
  //
  // OJO: la tabla `products` de Supabase decide el importe que se cobra.
  // Aplicar 20261006_sentido_precios.sql ANTES del deploy, o el cobro sale con
  // el precio viejo.
  {
    id: "sentido-starter",
    category: "coaching",
    categoryLabel: "Programa Sentido",
    tag: "Starter",
    amount: "$397",
    amountValue: 397,
    sessions: 3,
    unit: "USD · 3 sesiones",
    title: "Programa Sentido Starter.",
    subtitle: "Da el primer paso.",
    features: ["3 sesiones uno a uno con Holman", "Tu avance en tu panel: meta, compromisos y Rueda de la Vida", "El camino completo: Claridad, Identidad y Acción"],
    cta: "Empieza con Starter",
    whatsappText:
      "Hola HGG, quiero información sobre el Programa Sentido — Starter.",
  },
  {
    id: "sentido-pro",
    category: "coaching",
    categoryLabel: "Programa Sentido",
    tag: "Pro",
    amount: "$697",
    amountValue: 697,
    sessions: 6,
    unit: "USD · 6 sesiones",
    title: "Programa Sentido Pro.",
    subtitle: "Profundiza en tu proceso.",
    features: ["6 sesiones uno a uno con Holman", "Tu avance en tu panel: meta, compromisos y Rueda de la Vida", "El camino completo: Claridad, Identidad y Acción", "Más tiempo para profundizar en cada etapa"],
    cta: "Empieza con Pro",
    whatsappText:
      "Hola HGG, quiero información sobre el Programa Sentido — Pro.",
  },
  {
    id: "sentido-elite",
    category: "coaching",
    categoryLabel: "Programa Sentido",
    tag: "Elite",
    amount: "$997",
    amountValue: 997,
    sessions: 10,
    unit: "USD · 10 sesiones",
    title: "Programa Sentido Elite.",
    subtitle: "Empieza a vivir de aquello que amas.",
    features: ["10 sesiones uno a uno con Holman", "Tu avance en tu panel: meta, compromisos y Rueda de la Vida", "El camino completo: Claridad, Identidad y Acción", "Acompañamiento hasta llevarlo a la acción", "El mejor precio por sesión"],
    cta: "Empieza con Elite",
    whatsappText:
      "Hola HGG, quiero información sobre el Programa Sentido — Elite.",
    highlight: true,
  },

  // ===== 2 · MARCA CON HUELLA (Fuego · Marca) =====
  {
    id: "marca-esencial",
    category: "marca",
    categoryLabel: "Marca con Huella",
    tag: "Starter",
    amount: "$797",
    amountValue: 797,
    unit: "USD · pago único",
    title: "Marca con Huella Starter.",
    subtitle: "Sistema Inicial de Identidad Estratégica.",
    features: [
      "Coaching de marca",
      "Logo",
      "Paleta de colores",
      "Tipografías",
      "Manual de marca",
    ],
    cta: "Empieza con Starter",
    whatsappText: "Hola HGG, quiero información sobre Marca con Huella Starter.",
  },
  {
    id: "marca-pro",
    category: "marca",
    categoryLabel: "Marca con Huella",
    tag: "Pro",
    amount: "$1,597",
    amountValue: 1597,
    unit: "USD · pago único",
    title: "Marca con Huella Pro.",
    subtitle: "Identidad Estratégica + Presencia Digital.",
    features: [
      "Todo lo del Starter",
      "Sitio web profesional",
      "SEO básico",
      "Integración con WhatsApp",
      "Formularios de contacto",
    ],
    cta: "Empieza con Pro",
    whatsappText: "Hola HGG, quiero información sobre Marca con Huella Pro.",
    highlight: true,
  },
  {
    id: "marca-360",
    category: "marca",
    categoryLabel: "Marca con Huella",
    tag: "Elite",
    amount: "$3,000",
    amountValue: 3000,
    unit: "USD · pago único · ads aparte",
    title: "Marca con Huella Elite.",
    subtitle: "Marca, Posicionamiento y Captación de Clientes.",
    features: [
      "Todo lo del Pro",
      "Coaching Expansivo + Ventas Estratégicas",
      "Campaña publicitaria y redes sociales",
      "4 artículos SEO",
      "Bienvenida y seguimiento automatizados",
    ],
    cta: "Empieza con Elite",
    whatsappText: "Hola HGG, quiero información sobre Marca con Huella Elite.",
  },

  // ===== 3 · DELEGAWORK 360 (Huella · Sistema) — 3 colores HGG + Delegaweb + Nexco =====
  // Brief ago 2026: se fusionan los servicios de HGG con los planes de la
  // plataforma DelegaWork (clientes gestionados + créditos + módulos) en una
  // sola lista por tier. El ecosistema (Sofía IA + módulos) es idéntico en los
  // tres; lo único que escala es el volumen.
  {
    id: "impulso-starter",
    category: "impulso",
    categoryLabel: "DelegaWork 360",
    tag: "Starter",
    amount: "$997",
    amountValue: 997,
    unit: "USD / mes",
    title: "DelegaWork 360 Starter.",
    resumen: "Hasta 100 clientes · 1 campaña activa · 300 créditos de Sofía.",
    features: [
      "Hasta 100 clientes gestionados",
      "300 créditos mensuales de Sofía",
      "1 Consultoría Estratégica/mes",
      "2 artículos SEO/mes",
      "2 correos de campaña/mes",
      "1 flujo de automatización",
      "1 campaña publicitaria activa",
      "Reporte mensual",
    ],
    cta: "Empieza con Starter",
    whatsappText: "Hola HGG, quiero información sobre DelegaWork 360 — Starter.",
  },
  {
    id: "impulso-pro",
    category: "impulso",
    categoryLabel: "DelegaWork 360",
    tag: "Pro",
    amount: "$1,797",
    amountValue: 1797,
    unit: "USD / mes",
    title: "DelegaWork 360 Pro.",
    resumen: "Hasta 300 clientes · 2 campañas activas · 600 créditos de Sofía.",
    features: [
      "Hasta 300 clientes gestionados",
      "600 créditos mensuales de Sofía",
      "1 Consultoría Estratégica/mes",
      "4 artículos SEO/mes",
      "4 correos de campaña/mes",
      "Automatización de captación + seguimiento",
      "2 campañas publicitarias activas",
      "Reporte mensual",
    ],
    cta: "Empieza con Pro",
    whatsappText: "Hola HGG, quiero información sobre DelegaWork 360 — Pro.",
  },
  {
    id: "impulso-elite",
    category: "impulso",
    categoryLabel: "DelegaWork 360",
    tag: "Elite",
    amount: "$3,000",
    amountValue: 3000,
    unit: "USD / mes",
    title: "DelegaWork 360 Elite.",
    features: [
      "Hasta 600 clientes gestionados",
      "1.000 créditos mensuales de Sofía",
      "2 Consultorías Estratégicas/mes",
      "8 artículos SEO/mes",
      "8 correos de campaña/mes",
      "Secuencias completas automatizadas",
      "3 campañas publicitarias activas",
      "Gestión de redes sociales",
      "Soporte prioritario en DelegaHelp",
      "Reporte mensual",
    ],
    cta: "Empieza con Elite",
    whatsappText: "Hola HGG, quiero información sobre DelegaWork 360 — Elite.",
    highlight: true,
  },

  // ===== 4 · SOLUCIONES COMPLEMENTARIAS · LLC — 1 color HGG =====
  {
    id: "llc-estructura",
    category: "llc",
    categoryLabel: "Estructuración Empresarial",
    tag: "Creación y Estrategia",
    amount: "$1,175",
    amountValue: 1175,
    unit: "USD · creación, o al año si renuevas",
    title: "LLC Global — Creación o renovación anual.",
    subtitle: "Creamos tu empresa en EE. UU. o la mantenemos al día cada año, con estrategia incluida.",
    // Oct 2026 (Holman): creación y renovación cuestan lo mismo —la renovación
    // incluye los pagos y la declaración del año—, así que van en una sola
    // tarjeta con dos botones. Los dos ids siguen: cada uno cobra lo suyo.
    features: [
      "Creación completa de LLC y EIN",
      "Renovación anual y Annual Report",
      "Consultoría estratégica personalizada",
      "Acceso a FLOW (DelegaWork)",
    ],
    cta: "Crear mi LLC",
    alterno: "llc-acompanamiento",
    whatsappText:
      "Hola HGG, quiero información sobre LLC Global (creación y estrategia).",
  },
  {
    id: "llc-acompanamiento",
    category: "llc",
    categoryLabel: "Estructuración Empresarial",
    tag: "Renovación Anual",
    amount: "$1,175",
    amountValue: 1175,
    unit: "USD / año",
    title: "LLC Global — Renovación Anual.",
    subtitle: "Renovación de LLC + advisory estratégico continuo.",
    features: [
      "Renovación anual de LLC",
      "Annual Report",
      "Sesiones de guidance",
      "Acceso continuo a FLOW (DelegaWork)",
    ],
    cta: "Renovar mi LLC",
    oculto: true,
    whatsappText:
      "Hola HGG, quiero información sobre la Renovación Anual de mi LLC.",
  },

  // ===== 5 · SOLUCIONES COMPLEMENTARIAS · NEXCO — color Nexco #CB9339 =====
  {
    id: "nexco-config",
    category: "nexco",
    categoryLabel: "Campañas y redes",
    tag: "Configuración de Campaña",
    amount: "$300",
    amountValue: 300,
    unit: "USD · pago único",
    title: "Configuración de Campaña.",
    subtitle: "Tu primera campaña publicitaria, lista para lanzar.",
    features: [
      "Configuración completa de 1 campaña publicitaria",
      "Definición de objetivo, audiencia y estructura de anuncios",
      "Presupuesto de ads aparte — lo paga el cliente directamente",
    ],
    cta: "Configura tu campaña",
    whatsappText:
      "Hola HGG, quiero información sobre la Configuración de Campaña.",
  },
  {
    id: "nexco-redes",
    category: "nexco",
    categoryLabel: "Campañas y redes",
    tag: "Gestión de Redes Sociales",
    amount: "$600",
    amountValue: 600,
    unit: "USD / mes",
    title: "Gestión de Redes Sociales.",
    subtitle: "Contenido constante que construye comunidad.",
    features: [
      "3 posts + 1 video por semana (producción y publicación incluidas)",
      "Guía detallada de cada pieza antes de publicar",
      "Subida y gestión completa en redes",
      "Mentoría inicial sobre autenticidad en redes",
    ],
    cta: "Activa tus redes",
    whatsappText:
      "Hola HGG, quiero información sobre la Gestión de Redes Sociales.",
  },

  // ===== 6 · SOLUCIONES COMPLEMENTARIAS · DESARROLLO WEB — Sitios Web y luego IA =====
  {
    id: "web-landing",
    category: "web",
    categoryLabel: "Sitios Web",
    tag: "Landing Page",
    amount: "$648",
    amountValue: 648,
    unit: "USD · pago único",
    title: "Landing Page.",
    subtitle: "Diseñada para convertir visitas en clientes.",
    features: [
      "Estrategia de conversión",
      "Diseño impactante",
      "Configurar dominio + hosting",
      "Optimización SEO básica",
      "Entrega y revisión con el cliente",
    ],
    cta: "Crea tu landing",
    whatsappText: "Hola HGG, quiero información sobre una Landing Page.",
  },
  {
    id: "web-panel",
    category: "web",
    categoryLabel: "Sitios Web",
    tag: "Panel de Administración",
    amount: "$1,080",
    amountValue: 1080,
    unit: "USD · pago único",
    title: "Panel de Administración.",
    subtitle: "Gestiona tu contenido desde cualquier dispositivo.",
    features: [
      "Panel de administración",
      "Gestión autónoma de contenido",
      "Diseño responsive",
      "Optimización SEO básica",
      "Entrega y revisión con el cliente",
    ],
    cta: "Crea tu web",
    whatsappText:
      "Hola HGG, quiero información sobre una Web con panel de administración.",
  },
  {
    id: "web-ecommerce",
    category: "web",
    categoryLabel: "Sitios Web",
    tag: "Ecommerce Completo",
    amount: "$2,160",
    amountValue: 2160,
    unit: "USD · pago único",
    title: "Ecommerce Completo.",
    subtitle: "Tienda online completa para vender desde el primer día.",
    features: [
      "Tienda online completa",
      "Pasarela de pago integrada",
      "Gestión de catálogo",
      "Optimización para vender",
      "Entrega y revisión con el cliente",
    ],
    cta: "Crea tu tienda online",
    whatsappText: "Hola HGG, quiero información sobre una tienda Ecommerce.",
  },
  {
    id: "ia-sistemas",
    category: "ia",
    categoryLabel: "Inteligencia Artificial",
    tag: "A medida",
    amount: "Cotización a medida",
    unit: "Según tu proyecto",
    title: "Sistemas con Inteligencia Artificial.",
    subtitle: "Tu propia IA, entrenada con la voz de tu marca.",
    body:
      "Agentes de ventas, soporte o asistentes internos que trabajan como parte de tu equipo.",
    features: [],
    cta: "Cuéntanos tu proyecto",
    whatsappText:
      "Hola HGG, quiero hablar sobre un proyecto con Inteligencia Artificial. Cuéntenme cómo funciona y qué información necesitan para cotizar.",
    customQuote: true,
  },
];

/** Items del catálogo para el JSON-LD OfferCatalog (sin el producto de prueba). */
export const TIENDA_OFFER_ITEMS: OfferItem[] = PRODUCTS.filter(
  (p) => p.id !== "test-1usd"
).map((p) => ({
  name: p.title.replace(/\.$/, ""),
  // Los planes de DelegaWork 360 ya no llevan subtítulo (brief 13-ago), así que
  // el `description` del schema.org cae al párrafo o, en último caso, al nombre.
  description: p.subtitle || p.body || p.title.replace(/\.$/, ""),
  price: p.amountValue,
  currency: p.currency ?? "USD",
  category: p.categoryLabel,
}));

// Brief ago 2026: la tienda se agrupa por CATEGORÍA (4) en vez de por producto
// individual (6). "Soluciones Complementarias" absorbe LLC, Nexco y Desarrollo
// Web, que antes tenían filtro propio (y Desarrollo Web, sección aparte).
// El id del filtro sigue siendo `proposito` a propósito: es la clave interna y
// la que viaja en `/tienda?cat=…`. Lo que cambia (brief 13-ago) es la etiqueta
// visible, que pasa a "Sentido" para no contradecir al encabezado "Programa
// Sentido" que va justo debajo.
export type Filter =
  | "all"
  | "proposito"
  | "marca"
  | "sistema"
  | "complementarias";

/**
 * Encabezado de cada categoría de la tienda.
 *
 * Brief "Ajustes Adicionales" (ago 2026): en la vista "Todo" se intercala uno
 * antes de cada grupo para que se vea dónde empieza cada categoría.
 * Brief 13-ago-2026: además llevan copy propio (claim + párrafo) y se muestran
 * también con un filtro activo — si solo salieran en "Todo", estos textos
 * desaparecerían justo cuando alguien filtra por esa categoría.
 */
type Group = {
  id: Exclude<Filter, "all">;
  /** Etiqueta corta del chip de filtro. */
  label: string;
  /** Nombre de la categoría: va en la línea pequeña dorada, como en el home. */
  name: string;
  /** Titular grande en Questrial. */
  headline: string;
  /** Línea fina bajo el titular (método o lo incluido). */
  points?: string[];
  /** Texto corto antes de `points`. */
  pointsLabel?: string;
  /** Si va numerado (01 Claridad · 02 Identidad…). */
  numbered?: boolean;
  /** «Es para ti si…»: para que cada persona se reconozca en su etapa. */
  paraTi?: string;
};

// Oct 2026: cada grupo se abre como las secciones del home —número, raya
// dorada, nombre en versalitas y titular grande—, con una sola línea fina
// debajo. Antes eran tres líneas de tres colores distintos.
const GROUPS: Group[] = [
  {
    id: "proposito",
    label: "Sentido",
    name: "Programa Sentido",
    headline: "Descubre quién eres y hacia dónde vas.",
    paraTi: "Es para ti si sabes que quieres algo distinto, pero aún no lo ves claro.",
    points: ["Claridad", "Identidad", "Acción"],
    numbered: true,
  },
  {
    id: "marca",
    label: "Marca",
    name: "Marca con Huella",
    headline: "Una marca que se reconoce y se recuerda.",
    paraTi: "Es para ti si ya sabes qué ofreces y necesitas que se vea y se recuerde.",
  },
  {
    id: "sistema",
    label: "Sistema",
    name: "DelegaWork 360",
    headline: "Tu negocio, funcionando como un sistema.",
    paraTi: "Es para ti si ya vendes y tu negocio depende demasiado de ti.",
    // El ecosistema es igual en los tres planes: se dice una vez aquí.
    pointsLabel: "Incluido en los tres planes",
    points: ECOSYSTEM,
  },
  {
    id: "complementarias",
    label: "Complementos",
    name: "Complementos",
    headline: "Para completar tu camino.",
    paraTi: "Servicios puntuales, para cuando necesitas una pieza concreta.",
  },
];

// Encabezado de «Empieza aquí»: las dos puertas de entrada (Claridad y ECOS).
const ENTRADA = {
  name: "Empieza aquí",
  headline: "Tu primer paso.",
} as const;

// Los chips salen de los mismos grupos, para que etiqueta y encabezado nunca
// se puedan desincronizar.
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todo" },
  ...GROUPS.map((g) => ({ id: g.id as Filter, label: g.label })),
];

/** Categoría de producto → filtro de la tienda. */
function filterFor(p: Product): Exclude<Filter, "all"> {
  switch (p.category) {
    case "coaching":
      return "proposito";
    case "marca":
      return "marca";
    case "impulso":
      return "sistema";
    default:
      return "complementarias"; // llc · nexco · web · ia
  }
}

/**
 * Slugs aceptados en `/tienda?cat=…` — los usa el footer para enlazar directo
 * a cada categoría. Se aceptan también los ids internos por si quedan enlaces
 * antiguos por ahí.
 */
const CAT_PARAM: Record<string, Filter> = {
  todo: "all",
  all: "all",
  proposito: "proposito",
  "propósito": "proposito",
  coaching: "proposito",
  // Nombre nuevo de la categoría (brief 13-ago). Los dos de arriba se quedan
  // como alias para no romper enlaces ya compartidos.
  sentido: "proposito",
  marca: "marca",
  sistema: "sistema",
  impulso: "sistema",
  complementarias: "complementarias",
  "soluciones-complementarias": "complementarias",
  llc: "complementarias",
  nexco: "complementarias",
  web: "complementarias",
};

/** Beneficios que se ven en la tarjeta grande; el resto va plegado. */
const VISIBLES = 4;

/** Cómo se agrupan los complementos (cada grupo se abre al tocarlo). */
const COMPLEMENTOS: { nombre: string; categorias: Product["category"][] }[] = [
  { nombre: "Tu empresa en EE. UU.", categorias: ["llc"] },
  { nombre: "Campañas y redes", categorias: ["nexco"] },
  { nombre: "Sitios web", categorias: ["web"] },
  { nombre: "Inteligencia artificial", categorias: ["ia"] },
];

/** Categorías con niveles Starter / Pro / Elite. */
const TIERED: Product["category"][] = ["coaching", "marca", "impulso"];

// Oct 2026 (Holman): la tienda ya no muestra las marcas aliadas (Delegaweb,
// Nexco) —ni chips «Por …» ni barras de su color—. Los servicios se ofrecen
// como de HGG y todas las tarjetas van en dorado.

/** Encabezado de categoría dentro del grid; ocupa la fila completa. */
function GroupHead({ group, index }: { group: Pick<Group, "name" | "headline" | "points" | "pointsLabel" | "numbered" | "paraTi">; index: number }) {
  return (
    <header className="tienda-group-head">
      <div className="eyebrow-row">
        <span className="num">{String(index + 1).padStart(2, "0")}</span>
        <span className="bar" />
        <span className="eyebrow eyebrow-w">{group.name}</span>
      </div>
      <h2 className="display tienda-group-title">{group.headline}</h2>
      {group.paraTi && <p className="tienda-group-parati">{group.paraTi}</p>}
      {group.points && (
        <p className="tienda-group-points">
          {group.pointsLabel && (
            <span className="tienda-group-points-label">{group.pointsLabel}</span>
          )}
          {group.points.map((pt, i) => (
            <span key={pt} className="tienda-group-point">
              {group.numbered && <em>{String(i + 1).padStart(2, "0")}</em>}
              {pt}
            </span>
          ))}
        </p>
      )}
    </header>
  );
}

export function Tienda() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<CheckoutItem | null>(null);
  const { code, setCurrency, convert, formatMoney } = useCurrency();
  // Los miembros activos del club ven su precio con descuento. Aquí solo se
  // muestra: el cobro con descuento lo decide el servidor al crear el pago.
  const { member } = useClub();
  const esMiembro = tieneBeneficios(member);
  const pctMiembro = ECOS.descuentoMiembroPct;
  const precioMiembro = (usd: number) => Math.round(usd * (100 - pctMiembro)) / 100;
  // Mostrar producto de prueba solo si la URL trae ?test=1
  // Ej: hgg.studio/tienda?test=1 → ves el producto de $1 al inicio
  const [showTest, setShowTest] = useState(false);
  // Se relee en cada cambio de query string (no solo al montar) para que los
  // enlaces del footer también funcionen estando ya dentro de la tienda.
  const { search } = useLocation();
  useEffect(() => {
    const p = new URLSearchParams(search);
    setShowTest(p.get("test") === "1");
    // Deep-link por categoría: /tienda?cat=marca (lo usa el footer).
    const cat = p.get("cat");
    if (cat) {
      const target = CAT_PARAM[cat.trim().toLowerCase()];
      if (target) setFilter(target);
    }
  }, [search]);

  // Todo el catálogo vive en un único grid; ya no hay sección aparte de
  // Desarrollo Web (queda dentro de "Soluciones Complementarias").
  const catalogProducts = useMemo(
    () => (showTest ? PRODUCTS : PRODUCTS.filter((p) => p.id !== "test-1usd")),
    [showTest]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return catalogProducts;
    return catalogProducts.filter((p) => filterFor(p) === filter);
  }, [filter, catalogProducts]);

  const precio = (p: Product) => (
    <div className="tienda-item-price">
      <span className="amount">
        {typeof p.amountValue === "number"
          ? formatMoney(esMiembro ? precioMiembro(p.amountValue) : p.amountValue)
          : p.amount}
      </span>
      <span className="unit">{p.unit.replace(/USD/g, code)}</span>
      {esMiembro && typeof p.amountValue === "number" && (
        <span className="tienda-precio-lista">{formatMoney(p.amountValue)}</span>
      )}
      {p.sessions && typeof p.amountValue === "number" && (
        <span className="tienda-item-per">
          {formatMoney(
            (esMiembro ? precioMiembro(p.amountValue) : p.amountValue) / p.sessions
          )}{" "}
          por sesión
        </span>
      )}
    </div>
  );

  const boton = (p: Product) => {
    const isCheckout = !p.customQuote && typeof p.amountValue === "number";
    return isCheckout ? (
      <button
        type="button"
        className="tienda-item-cta"
        onClick={() => {
          trackEvent("begin_checkout", {
            item_id: p.id,
            item_name: p.title.replace(/\.$/, ""),
            value: convert(p.amountValue!),
            currency: code,
          });
          setSelected({
            productId: p.id,
            title: p.title.replace(/\.$/, ""),
            amount: p.amountValue!,
            currency: code,
          });
        }}
      >
        {p.cta}
        <ArrowRightIcon />
      </button>
    ) : (
      <a
        href={waLink(p.whatsappText)}
        target="_blank"
        rel="noopener noreferrer"
        className="tienda-item-cta"
      >
        {p.cta}
        <ArrowRightIcon />
      </a>
    );
  };

  const renderProduct = (p: Product) => {
    // Sentido, Marca y DelegaWork 360: la categoría ya va arriba, así que el
    // título es solo el nivel (Starter / Pro / Elite). El checkout sigue
    // usando el nombre completo.
    const tiered = TIERED.includes(p.category);
    return (
      <article
        key={p.id}
        className={`tienda-item${p.highlight ? " highlight" : ""}${tiered ? " tienda-item-featured" : ""}`}
      >
        {p.highlight && <span className="tienda-badge">Más elegido</span>}
        <div className="tienda-item-top">
          <span className="tienda-item-cat">{p.categoryLabel}</span>
        </div>
        <h3 className="display tienda-item-title">{tiered ? `${p.tag}.` : p.title}</h3>
        {p.subtitle && <p className="tienda-item-subtitle">{p.subtitle}</p>}
        {p.note && <p className="tienda-item-note">{p.note}</p>}
        {p.body && <p className="tienda-item-body">{p.body}</p>}
        {p.features.length > 0 && (
          <>
            <ul className={`tienda-item-features${p.category === "impulso" ? " is-cols" : ""}`}>
              {p.features.slice(0, VISIBLES).map((f) => (
                <li key={f}><CheckIcon />{f}</li>
              ))}
            </ul>
            {p.features.length > VISIBLES && (
              <details className="tienda-incluye">
                <summary>Ver todo lo que incluye</summary>
                <ul className={`tienda-item-features${p.category === "impulso" ? " is-cols" : ""}`}>
                  {p.features.slice(VISIBLES).map((f) => (
                    <li key={f}><CheckIcon />{f}</li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
        <div className="tienda-item-bottom">
          <div className="tienda-item-price-row">
            {precio(p)}
          </div>
          {boton(p)}
        </div>
      </article>
    );
  };

  // Oct 2026: para que no se vean 19 tarjetas iguales, cada etapa muestra en
  // grande solo su «Más elegido»; los otros planes van al lado en versión
  // corta (lo que cambia, precio y botón, con «Qué incluye» desplegable). Los
  // complementos van como filas. Todo sigue a la venta; cambia el peso visual.
  const renderCorto = (p: Product) => (
    <article key={p.id} className="tienda-corto">
      <div className="tienda-corto-info">
        <h3 className="display tienda-corto-title">{p.tag}.</h3>
        <p className="tienda-corto-resumen">{p.resumen ?? p.subtitle}</p>
        {p.features.length > 0 && (
          <details className="tienda-incluye">
            <summary>Qué incluye</summary>
            <ul className="tienda-item-features">
              {p.features.map((f) => (
                <li key={f}><CheckIcon />{f}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
      <div className="tienda-corto-bottom">
        {precio(p)}
        {boton(p)}
      </div>
    </article>
  );

  const renderFila = (p: Product) => (
    <article key={p.id} className="tienda-fila">
      <div className="tienda-fila-info">
        <span className="tienda-item-cat">{p.categoryLabel}</span>
        <h3 className="display tienda-fila-title">{p.title}</h3>
        {p.subtitle && <p className="tienda-corto-resumen">{p.subtitle}</p>}
        {p.features.length > 0 && (
          <details className="tienda-incluye">
            <summary>Qué incluye</summary>
            <ul className="tienda-item-features">
              {p.features.map((f) => (
                <li key={f}><CheckIcon />{f}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
      <div className="tienda-fila-bottom">
        {precio(p)}
        <div className="tienda-fila-botones">
          {boton(p)}
          {p.alterno && (() => {
            const alt = PRODUCTS.find((x) => x.id === p.alterno);
            return alt ? boton(alt) : null;
          })()}
        </div>
      </div>
    </article>
  );

  const renderGrupo = (items: Product[]) => {
    if (TIERED.includes(items[0].category)) {
      const destacado = items.find((p) => p.highlight) ?? items[items.length - 1];
      const otros = items.filter((p) => p !== destacado);
      return [
        renderProduct(destacado),
        <div key={`otros-${destacado.id}`} className="tienda-otros">
          <p className="tienda-otros-label">Otros planes</p>
          {otros.map(renderCorto)}
        </div>,
        <p key={`ayuda-${destacado.id}`} className="tienda-ayuda">
          ¿No sabes cuál elegir?{" "}
          <a href={CLARIDAD_WA_URL} target="_blank" rel="noopener noreferrer">Agenda tu Sesión de Claridad</a>{" "}
          y lo vemos juntos.
        </p>,
      ];
    }
    // Complementos: un renglón por tipo que se abre al tocarlo.
    return COMPLEMENTOS.flatMap((g) => {
      const filas = items.filter((p) => g.categorias.includes(p.category) && !p.oculto);
      if (!filas.length) return [];
      const precios = filas.map((p) => p.amountValue).filter((v): v is number => typeof v === "number");
      const desde = precios.length ? `desde ${formatMoney(Math.min(...precios))}` : "a medida";
      return [
        <details key={g.nombre} className="tienda-comp">
          <summary>
            <span className="tienda-comp-nombre">{g.nombre}</span>
            <span className="tienda-comp-meta">{filas.length > 1 ? `${filas.length} opciones · ` : ""}{desde}</span>
          </summary>
          <div className="tienda-comp-filas">{filas.map(renderFila)}</div>
        </details>,
      ];
    });
  };

  return (
    <section id="tienda" className="tienda">
      <div className="shell">
        <header className="tienda-head">
          <div className="eyebrow-row">
            <span className="num">·</span>
            <span className="bar" />
            <span className="eyebrow eyebrow-w">Tienda HGG</span>
          </div>
          <h1 className="display tienda-title">
            Construye tu camino<br />
            con sentido.
          </h1>

          <div className="tienda-filters" role="tablist" aria-label="Filtrar productos">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`tienda-filter${active ? " active" : ""}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="tienda-sub">
            {esMiembro ? (
              <p className="tienda-miembro">
                Eres miembro de ECOS: los precios ya tienen tu {pctMiembro}% de descuento.
              </p>
            ) : (
              <p className="tienda-miembro">
                Miembros de ECOS: {pctMiembro}% de descuento en toda la tienda.{" "}
                <a href={CLUB.landing}>Conoce el club</a>
              </p>
            )}
            <div className="tienda-moneda" role="group" aria-label="Seleccionar moneda">
              {(["USD", "EUR"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={code === c}
                  className={code === c ? "active" : ""}
                  onClick={() => setCurrency(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </header>

        <Reveal stagger className="tienda-grid">
          {/* Con o sin filtro se pinta el encabezado de cada categoría: si solo
              saliera en "Todo", el copy de Programa Sentido / Marca con Huella /
              Sistema desaparecería justo al filtrar por esa categoría. */}
          {/* 00 · Empieza aquí (oct 2026): las dos puertas de entrada, antes de
              los precios. Solo en «Todo»: con un filtro, la persona ya eligió. */}
          {filter === "all" && [
            <GroupHead key="head-entrada" group={ENTRADA} index={-1} />,
            <article key="claridad" className="tienda-item tienda-item-wide">
              <div className="tienda-item-top">
                <span className="tienda-item-cat">Sesión de Claridad</span>
              </div>
              <h3 className="display tienda-item-title">Tu primera conversación.</h3>
              <p className="tienda-item-subtitle">
                Hablas con Holman de dónde estás hoy y sales con tu siguiente paso claro.
              </p>
              <ul className="tienda-item-features">
                <li><CheckIcon />Uno a uno, en línea</li>
                <li><CheckIcon />Sin costo y sin compromiso</li>
              </ul>
              <div className="tienda-item-bottom">
                <div className="tienda-item-price-row">
                  <div className="tienda-item-price">
                    <span className="amount">Gratis</span>
                  </div>
                </div>
                <a href={CLARIDAD_WA_URL} target="_blank" rel="noopener noreferrer" className="tienda-item-cta">
                  Agenda tu Sesión de Claridad
                  <ArrowRightIcon />
                </a>
              </div>
            </article>,
            <article key="ecos" className="tienda-item tienda-item-wide">
              <div className="tienda-item-top">
                <span className="tienda-item-cat">ECOS Business Club</span>
              </div>
              <h3 className="display tienda-item-title">Aprende cada semana.</h3>
              <p className="tienda-item-subtitle">
                Ventas, marketing y oratoria en vivo, cada semana, practicando sobre tu propio negocio.
              </p>
              <ul className="tienda-item-features">
                <li><CheckIcon />{ECOS.pruebaDias} días gratis, sin tarjeta</li>
                <li><CheckIcon />{pctMiembro}% de descuento en toda la tienda</li>
              </ul>
              <div className="tienda-item-bottom">
                <div className="tienda-item-price-row">
                  <div className="tienda-item-price">
                    <span className="amount">{formatMoney(ECOS.priceUsd)}</span>
                    <span className="unit">{code} / mes</span>
                  </div>
                </div>
                <Link to={CLUB.landing} className="tienda-item-cta">
                  Conoce el club
                  <ArrowRightIcon />
                </Link>
              </div>
            </article>,
          ]}
          {GROUPS.flatMap((g, gi) => {
            const group = filtered.filter((p) => filterFor(p) === g.id);
            if (group.length === 0) return [];
            return [
              <GroupHead key={`head-${g.id}`} group={g} index={gi} />,
              ...renderGrupo(group),
            ];
          })}
        </Reveal>

        {filtered.length === 0 && (
          <p className="tienda-empty">No hay productos en esta categoría.</p>
        )}
      </div>

      <CheckoutModal item={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
