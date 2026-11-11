import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CLARIDAD_WA_URL, SITE } from "@/lib/config";
import { CLARIDAD_VIDEO } from "@/lib/catalogo";
import { trackEvent } from "@/lib/analytics";
import { useInView } from "@/lib/use-in-view";
import { EUR_TO_USD, useCurrency } from "@/contexts/CurrencyContext";
import { useClub } from "@/contexts/ClubContext";
import { ECOS, tieneBeneficios } from "@/lib/ecos";
import { CLUB } from "@/lib/routes";
import type { CheckoutItem } from "@/lib/payments";
import type { OfferItem } from "@/lib/seo";
import {
  CheckoutModal,
  CompraConfirmada,
  borrarCompraPendiente,
  leerCompraPendiente,
  type CompraPendiente,
} from "./checkout-modal";
import { ArrowRightIcon, CheckIcon, PlayIcon } from "./icons";
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
   * Precio fijado en euros (planes de DelegaWork). En dólares se muestra
   * convertido; no lleva descuento de ECOS porque lo cobra DelegaWork.
   */
  precioEur?: number;
  /** Paquetes de sesiones: muestra el precio por sesión (hoy ninguno lo usa). */
  sessions?: number;
  /** Pago en cuotas: el primer pago se cobra con su propio producto. */
  cuotas?: { productId: string; n: number; monto: number };
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
  /** Mockup de lo que entrega el nivel (arriba de la tarjeta). */
  visual?: { src: string; alt: string };
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
  // Oct 2026 (Holman): los tres paquetes recorren el MISMO camino —la fórmula
  // M2H2 (Metas, Mentalidad, Habilidades, Hábitos), que se explica una vez en el
  // encabezado del grupo; antes era Claridad, Identidad y Acción—; lo
  // que cambia es el número de sesiones. Ya no hay etapas por nivel.
  // Nov 2026 (precios de lanzamiento): Starter = 1 sesión de 90 min ($67, se
  // descuenta si sigue al Pro), Pro = 90 días / 8 sesiones ($497 o 3 × $177),
  // Elite = 6 meses / 16 sesiones ($897 o 6 × $157). Ya no se muestra el precio
  // por sesión: se vende el resultado, no las horas. Las cuotas cobran el primer
  // pago con su propio id (`*-cuota`), como la oferta de la masterclass.
  //
  // OJO: la tabla `products` de Supabase decide el importe que se cobra.
  // Aplicar 20261112_sentido_lanzamiento.sql ANTES del deploy, o el cobro sale con
  // el precio viejo.
  {
    id: "sentido-starter",
    category: "coaching",
    categoryLabel: "Programa Sentido",
    tag: "Starter",
    amount: "$67",
    amountValue: 67,
    unit: "USD · 1 sesión de 90 min",
    title: "Programa Sentido Starter.",
    subtitle: "Tu meta y tu plan de 90 días, en una sesión.",
    features: [
      "Una sesión 1 a 1 de 90 minutos",
      "Test de autodescubrimiento y Rueda de la Vida",
      "Tu plan de 90 días por escrito",
      "Se descuenta si sigues al Pro",
    ],
    cta: "Reserva tu sesión",
    whatsappText:
      "Hola HGG, quiero información sobre el Programa Sentido — Starter.",
    visual: {
      src: "/tienda/sentido-starter.webp",
      alt: "Informe con la Rueda de la Vida y acta de la primera sesión, con datos de muestra",
    },
  },
  {
    id: "sentido-pro",
    category: "coaching",
    categoryLabel: "Programa Sentido",
    tag: "Pro",
    amount: "$497",
    amountValue: 497,
    unit: "USD · 90 días · pago único",
    cuotas: { productId: "sentido-pro-cuota", n: 3, monto: 177 },
    title: "Programa Sentido Pro.",
    subtitle: "90 días para cumplir tu primera meta.",
    features: [
      "8 sesiones 1 a 1 en 12 semanas",
      "Tu avance en «Mi proceso»",
      "Test del patrón del dinero",
      "ECOS Business Club mientras dura tu programa",
    ],
    cta: "Empieza con Pro",
    whatsappText:
      "Hola HGG, quiero información sobre el Programa Sentido — Pro.",
    visual: {
      src: "/tienda/sentido-pro.webp",
      alt: "Sesión por Zoom con Holman y el panel Mi proceso con los 4 pasos en el celular",
    },
  },
  {
    id: "sentido-elite",
    category: "coaching",
    categoryLabel: "Programa Sentido",
    tag: "Elite",
    amount: "$897",
    amountValue: 897,
    unit: "USD · 6 meses · pago único",
    cuotas: { productId: "sentido-elite-cuota", n: 6, monto: 157 },
    title: "Programa Sentido Elite.",
    subtitle: "Seis meses: dos metas cumplidas y hábitos que se quedan.",
    features: [
      "16 sesiones 1 a 1 en 6 meses",
      "Todo lo del Pro",
      "WhatsApp directo entre sesiones",
      "Tu Rueda de la Vida a los 3 y a los 6 meses",
    ],
    cta: "Empieza con Elite",
    whatsappText:
      "Hola HGG, quiero información sobre el Programa Sentido — Elite.",
    highlight: true,
    visual: {
      src: "/tienda/sentido-elite.webp",
      alt: "Rueda de la Vida de inicio frente a la de ahora, en papel y en el panel",
    },
  },

  // ===== 2 · MARCA CON HUELLA (Fuego · Marca) =====
  // Nov 2026: Marca con Huella pasa a ser un programa de 90 días, hecho con
  // Marisol (landing, embudo y redes) y Holman (sesiones semanales, marca,
  // oferta y web). El cliente solo vende. Redes por semana (Marisol, 10 nov
  // 2026): Starter 3 publicaciones + 6 historias, Pro 5 + 10, Elite 7 + 14;
  // sin campañas de anuncios. Precios de
  // lanzamiento, pendientes de confirmar con Marisol: 3 × 400 / 550 / 800 o de
  // contado 1.097 / 1.497 / 2.197.
  {
    id: "marca-esencial",
    category: "marca",
    categoryLabel: "Marca con Huella",
    tag: "Starter",
    amount: "$1,097",
    amountValue: 1097,
    unit: "USD · 90 días · pago único",
    cuotas: { productId: "marca-esencial-cuota", n: 3, monto: 400 },
    title: "Marca con Huella Starter.",
    subtitle: "Tu marca y tu producto, vendiendo a tu círculo.",
    features: [
      "Acompañamiento de coaching de marca con Holman",
      "Manual de marca: logo, paleta de colores y tipografías",
      "Landing y embudo a WhatsApp",
      "Tus redes por 90 días: 3 publicaciones (reel, estático o carrusel) y 6 historias por semana",
      "Tu oferta, su precio y la estructura de tu negocio",
    ],
    cta: "Empieza con Starter",
    whatsappText: "Hola HGG, quiero información sobre Marca con Huella Starter.",
    visual: {
      src: "/tienda/marca-starter.webp",
      alt: "Marca de ejemplo con su logo y colores, su landing en el celular y el embudo por WhatsApp",
    },
  },
  {
    id: "marca-pro",
    category: "marca",
    categoryLabel: "Marca con Huella",
    tag: "Pro",
    amount: "$1,497",
    amountValue: 1497,
    unit: "USD · 90 días · pago único",
    cuotas: { productId: "marca-pro-cuota", n: 3, monto: 550 },
    title: "Marca con Huella Pro.",
    subtitle: "Que te encuentren y te recuerden.",
    features: [
      "Todo lo del Starter",
      "Tu sitio web completo",
      "Un regalo descargable que capta contactos, con correos automáticos de seguimiento",
      "Tus redes: 5 publicaciones y 10 historias por semana",
    ],
    cta: "Empieza con Pro",
    whatsappText: "Hola HGG, quiero información sobre Marca con Huella Pro.",
    highlight: true,
    visual: {
      src: "/tienda/marca-pro.webp",
      alt: "Sitio web completo de la marca de ejemplo y su Instagram con contenido y reels",
    },
  },
  {
    id: "marca-360",
    category: "marca",
    categoryLabel: "Marca con Huella",
    tag: "Elite",
    amount: "$2,197",
    amountValue: 2197,
    unit: "USD · 90 días · pago único",
    cuotas: { productId: "marca-360-cuota", n: 3, monto: 800 },
    title: "Marca con Huella Elite.",
    subtitle: "Tu marca vendiendo en todo el mundo.",
    features: [
      "Todo lo del Pro",
      "Tus redes: 7 publicaciones y 14 historias por semana",
      "Tienda en línea con pasarela de pago internacional",
      "WhatsApp directo con Holman",
      "Plan financiero: tu meta convertida en ventas",
    ],
    cta: "Empieza con Elite",
    whatsappText: "Hola HGG, quiero información sobre Marca con Huella Elite.",
    visual: {
      src: "/tienda/marca-elite.webp",
      alt: "Embudo, plan de contenido, Instagram y seguimiento por WhatsApp de la marca de ejemplo",
    },
  },

  // ===== 3 · DELEGAWORK (Sistema) =====
  // Oct 2026 (Holman): DelegaWork 360 deja de tener paquetes —ahora es una
  // reunión con Holman y un plan a la medida— y la tienda muestra solo los
  // planes de DelegaWork con sus precios y nombres oficiales (en euros, del
  // PDF de embajadores). No se cobran aquí: el botón abre WhatsApp mientras
  // llega el enlace de embajador de Holman. «Básico» (199 €) es provisional
  // hasta que Roger confirme el nombre. La `note` es cuántos clientes atiende
  // Sofía en cada plan (tabla de precios del 12-oct-2026). Sin número de
  // personas: parecía que ellas atendían a los clientes. Las herramientas
  // tampoco se listan, para no confundir.
  {
    id: "delegawork-basico",
    category: "impulso",
    categoryLabel: "DelegaWork",
    tag: "Básico",
    amount: "199 €",
    precioEur: 199,
    unit: "USD / mes",
    title: "DelegaWork Básico.",
    subtitle: "Para empezar a ordenar tu negocio.",
    note: "Sofía atiende 100 clientes",
    features: [],
    cta: "Quiero DelegaWork Básico",
    whatsappText: "Hola Holman, quiero información sobre DelegaWork — plan Básico.",
    visual: {
      src: "/tienda/delegawork-basico.webp",
      alt: "Sofía atendiendo por WhatsApp y calificando prospectos para el CRM; atiende 100 clientes",
    },
  },
  {
    id: "delegawork-starter",
    category: "impulso",
    categoryLabel: "DelegaWork",
    tag: "Starter",
    amount: "599 €",
    precioEur: 599,
    unit: "USD / mes",
    title: "DelegaWork Starter.",
    subtitle: "Sofía atiende y agenda por ti.",
    note: "Sofía atiende 300 clientes",
    features: [],
    cta: "Quiero DelegaWork Starter",
    whatsappText: "Hola Holman, quiero información sobre DelegaWork — plan Starter.",
    visual: {
      src: "/tienda/delegawork-starter.webp",
      alt: "Sofía agendando por WhatsApp, los clientes que requieren atención en el CRM y las próximas sesiones; atiende 300 clientes",
    },
  },
  {
    id: "delegawork-pro",
    category: "impulso",
    categoryLabel: "DelegaWork",
    tag: "Pro",
    amount: "1,199 €",
    precioEur: 1199,
    unit: "USD / mes",
    title: "DelegaWork Pro.",
    subtitle: "Para un negocio que ya está creciendo.",
    note: "Sofía atiende 600 clientes",
    features: [],
    cta: "Quiero DelegaWork Pro",
    whatsappText: "Hola Holman, quiero información sobre DelegaWork — plan Pro.",
    visual: {
      src: "/tienda/delegawork-pro.webp",
      alt: "El panel de DelegaWork, el embudo por etapa, las próximas sesiones y WhatsApp; atiende 600 clientes",
    },
  },
  {
    id: "delegawork-elite",
    category: "impulso",
    categoryLabel: "DelegaWork",
    tag: "Elite",
    amount: "1,799 €",
    precioEur: 1799,
    unit: "USD / mes",
    title: "DelegaWork Elite.",
    subtitle: "Todo el sistema, para empresas.",
    note: "Sofía atiende 1.000 clientes",
    features: [],
    cta: "Quiero DelegaWork Elite",
    whatsappText: "Hola Holman, quiero información sobre DelegaWork — plan Elite.",
    visual: {
      src: "/tienda/delegawork-elite.webp",
      alt: "El sistema completo: panel, Sofía, DelegaBooks, llamadas y WhatsApp; atiende 1.000 clientes",
    },
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
    amount: "$200",
    amountValue: 200,
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
    amount: "$200",
    amountValue: 200,
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

/** Categorías que ya no se venden en la tienda (nov 2026). */
const FUERA_DE_VENTA: Product["category"][] = [];

/** Items del catálogo para el JSON-LD OfferCatalog (sin el producto de prueba). */
export const TIENDA_OFFER_ITEMS: OfferItem[] = PRODUCTS.filter(
  (p) => p.id !== "test-1usd" && !FUERA_DE_VENTA.includes(p.category)
).map((p) => ({
  name: p.title.replace(/\.$/, ""),
  description: p.subtitle || p.body || p.title.replace(/\.$/, ""),
  // Los planes de DelegaWork tienen su precio en euros.
  price: p.amountValue ?? p.precioEur,
  currency: p.precioEur ? "EUR" : p.currency ?? "USD",
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
/**
 * Para quién es cada parte de la tienda (oct 2026, Holman): quien emprende ve
 * su camino (Sentido, Marca, ECOS, el anual); quien ya tiene empresa ve las
 * herramientas para hacerla funcionar (DelegaWork, LLC, webs, campañas, IA).
 * Así nadie ve todo de golpe. Los cursos (oct 2026) tienen su propia página,
 * /cursos, enlazada en el menú de arriba: se compran solos, en Hotmart. Aquí
 * solo los invita una franja al final del camino del emprendedor.
 */
export type Perfil = "emprendedor" | "empresa";

type Group = {
  id: Exclude<Filter, "all">;
  perfil: Perfil;
  /** Etiqueta corta en el índice de secciones. */
  label: string;
  /** Nombre de la categoría: va en la línea pequeña dorada, como en el home. */
  name: string;
  /** Titular grande en Questrial. */
  headline: string;
  /** Línea fina bajo el titular (método o lo incluido). */
  points?: string[];
  /** Texto corto antes de `points`. */
  pointsLabel?: string;
  /** Si va numerado (01 Metas · 02 Mentalidad…). */
  numbered?: boolean;
  /** «Es para ti si…»: para que cada persona se reconozca en su etapa. */
  paraTi?: string;
  /**
   * Ancla de /experiencias con los testimonios de esta etapa. Solo en las
   * etapas que ya tienen reseñas publicadas (hoy Sentido y Marca).
   */
  experiencias?: string;
  /** Lo que tienen en común los planes de la etapa; se dice una vez aquí. */
  comun?: string;
  /** Vitrina con mockup entre el encabezado y los planes (como /cursos). */
  vitrina?: Vitrina;
};

type Vitrina = {
  img: string;
  alt: string;
  kicker: string;
  titulo: string;
  /**
   * Lo que se lleva, de menos a más; `nivel` dice desde qué plan. Sin `nivel`
   * va en todos (Sentido: los planes solo cambian el número de sesiones).
   */
  pasos: { nombre: string; texto: string; nivel?: string }[];
  nota: string;
  /**
   * Video promocional en Bunny (misma biblioteca que el de Claridad). En vez
   * del mockup va un adelanto de 8 s en bucle y sin sonido (`adelanto`, con
   * `portada` mientras carga) y un play grande; al tocarlo, el video completo.
   * Los videos se hacen en redes/remotion (src/hgg y src/delegawork).
   */
  video?: { id: string; duracion: string; adelanto: string; portada: string };
};

// Oct 2026: cada grupo se abre como las secciones del home —número, raya
// dorada, nombre en versalitas y titular grande—, con una sola línea fina
// debajo. Antes eran tres líneas de tres colores distintos.
const GROUPS: Group[] = [
  {
    id: "proposito",
    perfil: "emprendedor",
    label: "Sentido",
    name: "Programa Sentido",
    headline: "Descubre quién eres y hacia dónde vas.",
    experiencias: "sentido",
    // 28 oct 2026: el camino es la fórmula M2H2 (Corazón de Elefante es la filosofía).
    pointsLabel: "Fórmula M2H2",
    points: ["Metas", "Mentalidad", "Habilidades", "Hábitos"],
    numbered: true,
    // Datos de muestra: «Camila» no existe (mockups: scripts/mockups/render.sh sentido).
    vitrina: {
      img: "/tienda/sentido-hero.webp",
      alt: "Sesión por Zoom con Holman, el panel Mi proceso en el celular, el informe de la Rueda de la Vida y el acta de la sesión",
      kicker: "Así se vive el Programa Sentido",
      titulo: "Tu proceso, a la vista.",
      pasos: [
        { nombre: "Tu punto de partida", texto: "La Rueda de la Vida y el test de autodescubrimiento: ves dónde estás hoy." },
        { nombre: "Tu camino", texto: "Sesiones 1 a 1 por Zoom y tu panel «Mi proceso», con tu meta a 90 días, tus compromisos y el acta de cada sesión.", nivel: "Pro" },
        { nombre: "Tu avance", texto: "Tu Rueda del inicio junto a la de ahora: ves cuánto has crecido.", nivel: "Pro" },
      ],
      nota: "Ejemplo con datos de muestra.",
      video: { id: "57b3d20f-910d-4614-8f2d-f404889b4471", duracion: "1 min", adelanto: "/tienda/sentido-adelanto.mp4", portada: "/tienda/sentido-adelanto.webp" },
    },
  },
  {
    id: "marca",
    perfil: "emprendedor",
    label: "Marca",
    name: "Marca con Huella",
    headline: "Tu marca vendiendo en 90\u00a0días.",
    paraTi: "Es para ti si vives de tu conocimiento y tu marca todavía no muestra lo que vales. Nosotros la creamos y la movemos; tú te enfocas en vender.",
    experiencias: "marca",
    // Oct 2026: primera vitrina de la tienda. «Órbita» es una marca de muestra
    // (mockups: scripts/mockups/render.sh marca).
    vitrina: {
      img: "/tienda/marca-hero.webp",
      alt: "Marca de ejemplo «Órbita», una academia digital: manual de marca, sitio web, Instagram y tarjetas de presentación",
      kicker: "Así se ve una Marca con Huella",
      titulo: "Tu marca, lista para vender.",
      pasos: [
        { nombre: "Marca y producto", texto: "Manual de marca, tu oferta con su precio, landing y embudo a WhatsApp, y tus redes.", nivel: "Starter" },
        { nombre: "Presencia", texto: "Tu sitio web completo, un regalo que capta contactos y más contenido cada semana.", nivel: "Pro" },
        { nombre: "Ventas", texto: "Tu tienda con pago internacional, tu plan financiero y contenido todos los días.", nivel: "Elite" },
      ],
      nota: "De regalo en los tres: ECOS Business Club mientras dura tu programa, tu guion de venta con mensajes de WhatsApp listos y el test del patrón del dinero. Ejemplo con «Órbita», una marca de muestra.",
      video: { id: "47d90c41-0b1b-48cc-855e-8bcc75779dbc", duracion: "50 s", adelanto: "/tienda/marca-adelanto.mp4", portada: "/tienda/marca-adelanto.webp" },
    },
  },
  {
    id: "sistema",
    perfil: "empresa",
    label: "DelegaWork",
    name: "DelegaWork",
    headline: "Tu negocio, funcionando como un sistema.",
    paraTi: "Es para ti si ya vendes y tu negocio depende demasiado de ti.",
    // Capturas reales de la plataforma (modo demostración) y de delegawork.com;
    // el chat de WhatsApp es de muestra (mockups: scripts/mockups/render.sh delegawork).
    vitrina: {
      img: "/tienda/delegawork-hero.webp",
      alt: "El panel real de DelegaWork en el computador, Sofía conectando los módulos, las cuentas de DelegaBooks y Sofía agendando por WhatsApp",
      kicker: "Así trabaja DelegaWork en tu negocio",
      titulo: "Tu negocio atiende, agenda y vende a toda hora.",
      pasos: [
        { nombre: "Sofía atiende", texto: "Responde por WhatsApp en segundos, a cualquier hora, y agenda las citas por ti." },
        { nombre: "Tu CRM, al día solo", texto: "Sofía, nuestra IA, carga cada conversación al CRM por su cuenta y le hace el seguimiento a cada cliente." },
        { nombre: "Todo conectado", texto: "Agenda, recordatorios, correos y seguimiento automático trabajando juntos." },
      ],
      nota: "Va en todos los planes: lo que cambia es cuántos clientes atiende Sofía. Imágenes de la plataforma real.",
      video: { id: "c31c35d5-8984-47da-9944-6f7f1282d0a5", duracion: "1 min", adelanto: "/tienda/delegawork-adelanto.mp4", portada: "/tienda/delegawork-adelanto.webp" },
    },
    // El ecosistema es igual en los tres planes: se dice una vez aquí.
    comun: `En todos los planes: ${ECOSYSTEM[0]}, ${ECOSYSTEM[1]} y ${ECOSYSTEM.length - 2} herramientas más.`,
  },
  {
    id: "complementarias",
    perfil: "empresa",
    label: "Servicios",
    name: "Servicios para tu empresa",
    headline: "La pieza que te falta.",
    paraTi: "Tu empresa en EE. UU., tu sitio web, tus campañas o un sistema con IA, por separado. Si necesitas varias piezas, en Marca con Huella te salen mucho mejor.",
  },
];

// Encabezado de «Empieza aquí»: las dos puertas de entrada (Claridad y ECOS).
const ENTRADA = {
  name: "Empieza aquí",
  headline: "Tu primer paso.",
} as const;

// La puerta de entrada de las empresas: una conversación, no un catálogo.
const ENTRADA_EMPRESA = {
  name: "Empieza aquí",
  headline: "Primero, tu empresa.",
} as const;

// Acompañamiento anual (oct 2026): el high ticket de HGG. Se entra por
// aplicación —el botón abre la conversación con Holman, no el pago— porque
// son 12 meses de su tiempo y él decide a quién acompaña. Va al final y
// cierra la tienda del emprendedor, solo en «Todo».
const ANUAL = {
  head: {
    name: "Acompañamiento anual",
    headline: "Un año, el camino completo.",
    paraTi:
      "Es para ti si quieres recorrer Sentido, Marca y Sistema de la mano de Holman, con un plan y alguien que te sostenga.",
  },
  // Las tres etapas del camino. Sin meses: se trabajan las tres todo el año.
  tramos: ["Sentido", "Marca", "Sistema"],
  precio: 5997,
  cuota: 597,
  cuotas: 12,
  // Nov 2026 (Holman): se queda en $5.997 y lleva TODO: los dos programas
  // completos, acompañamiento de todo el año y los cambios de la web.
  incluye: [
    "Programa Sentido Elite y Marca con Huella Elite, completos",
    "Acompañamiento de Holman los 12 meses, con sesiones 1 a 1",
    "Cambios en tu sitio web cuando los necesites, todo el año",
    "ECOS Business Club los 12 meses",
    "Tests para conocerte y entender tu relación con el dinero",
    "WhatsApp directo con Holman entre sesiones",
  ],
  whatsappText: "Hola Holman, quiero aplicar al Acompañamiento Anual.",
};

// Oct 2026 (Holman): ya no hay chips que filtran (Todo / Sentido / Marca
// confundían con las pestañas de arriba). Cada pestaña muestra todo lo suyo y
// un índice lleva a cada sección. Sale de los mismos grupos, para que etiqueta
// y encabezado nunca se desincronicen.
function seccionesDe(perfil: Perfil): { id: string; label: string }[] {
  return [
    { id: "entrada", label: "Empieza aquí" },
    ...GROUPS.filter((g) => g.perfil === perfil).map((g) => ({ id: g.id, label: g.label })),
    ...(perfil === "emprendedor" ? [{ id: "anual", label: "Anual" }] : []),
  ];
}

const perfilDe = (f: Filter): Perfil | null =>
  f === "all" ? null : GROUPS.find((g) => g.id === f)?.perfil ?? null;

/** Lo que cambia arriba según el perfil. `cruceA`: a qué pestaña lleva el cruce. */
const PERFILES: Record<Perfil, { boton: string; titulo: [string, string]; cruce: string; cruceBoton: string; cruceA: Perfil }> = {
  emprendedor: {
    boton: "Emprendo",
    titulo: ["Construye tu camino", "con sentido."],
    cruce: "¿Ya tienes tu empresa en marcha?",
    cruceBoton: "Ver soluciones para empresas",
    cruceA: "empresa",
  },
  empresa: {
    boton: "Empresa",
    titulo: ["Haz que tu empresa", "funcione sola."],
    cruce: "¿Estás empezando o quieres claridad y marca?",
    cruceBoton: "Ver el camino del emprendedor",
    cruceA: "emprendedor",
  },
};

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

// Nov 2026 (Holman): el plan de Marca con Huella en tres etapas, una por mes,
// solo con lo principal. Semana 1 coaching, semana 2 branding + sesión de
// contenido con Marisol, semana 3 lanzamiento y venta a contactos calientes.
const PLAN_MARCA = [
  {
    mes: "Crear y lanzar",
    puntos: [
      "Coaching de marca con Holman: tu historia, tu mensaje, tu oferta y su precio",
      "Tu marca lista: manual de marca, landing y embudo (y tu web o tu tienda, según el paquete)",
      "Plan de contenido con Marisol, lanzamiento y primeras ventas a tus contactos",
    ],
  },
  {
    mes: "Atraer",
    puntos: [
      "Contenido cada semana en tus redes",
      "Clientes nuevos más allá de tus contactos (en Pro y Elite, tu regalo capta interesados)",
      "Revisamos resultados y ajustamos tu oferta y tu contenido",
    ],
  },
  {
    mes: "Crecer",
    puntos: [
      "Repetimos lo que funcionó y sumamos testimonios de tus clientes",
      "Medimos tus ventas frente a tu meta (en Elite, con plan financiero)",
      "Te entregamos todos tus archivos y un plan para los próximos 90 días",
    ],
  },
];

/** Cómo se agrupan los complementos (cada grupo se abre al tocarlo). */
const COMPLEMENTOS: { nombre: string; categorias: Product["category"][] }[] = [
  { nombre: "Tu empresa en EE. UU.", categorias: ["llc"] },
  // Nov 2026 (Holman): vuelven como piezas sueltas, para quien quiera solo
  // una; el paquete completo (Marca con Huella) sale mucho mejor.
  { nombre: "Sitios web", categorias: ["web"] },
  { nombre: "Campañas y redes", categorias: ["nexco"] },
  { nombre: "Inteligencia artificial", categorias: ["ia"] },
];

/** Categorías con niveles Starter / Pro / Elite. */
const TIERED: Product["category"][] = ["coaching", "marca", "impulso"];

// Oct 2026 (Holman): la tienda ya no muestra las marcas aliadas (Delegaweb,
// Nexco) —ni chips «Por …» ni barras de su color—. Los servicios se ofrecen
// como de HGG y todas las tarjetas van en dorado.

/** Encabezado de categoría dentro del grid; ocupa la fila completa. */
function GroupHead({ group, index, id }: { group: Pick<Group, "name" | "headline" | "points" | "pointsLabel" | "numbered" | "paraTi" | "comun">; index: number; id: string }) {
  return (
    <header className="tienda-group-head" id={`sec-${id}`} data-seccion={id}>
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
      {group.comun && <p className="tienda-group-comun">{group.comun}</p>}
    </header>
  );
}

/** Vitrina de una etapa: el mockup grande y lo que se lleva, de menos a más. */
function VitrinaEtapa({ v, etapa }: { v: Vitrina; etapa: string }) {
  // El reproductor de Bunny se carga solo al tocar play: la tienda no paga su peso.
  // El adelanto se pide al acercarse a la vitrina y no se mueve si la persona
  // pidió menos movimiento en su sistema.
  const [viendo, setViendo] = useState(false);
  const [ref, cerca] = useInView<HTMLDivElement>(0, "200px 0px");
  const [quieto, setQuieto] = useState(false);
  useEffect(() => {
    setQuieto(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  const ver = () => {
    setViendo(true);
    trackEvent("tienda_video", { etapa });
  };
  return (
    <section className="tienda-vitrina">
      <div className="tienda-vitrina-img" ref={ref}>
        {viendo && v.video ? (
          <div className="tienda-vitrina-video">
            <iframe
              src={`https://iframe.mediadelivery.net/embed/${CLARIDAD_VIDEO.biblioteca}/${v.video.id}?autoplay=true&preload=true&responsive=true`}
              title={v.kicker}
              loading="lazy"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        ) : v.video ? (
          <button type="button" className="tienda-vitrina-adelanto" onClick={ver} aria-label={`Ver el video (${v.video.duracion}): ${v.alt}`}>
            {cerca && !quieto ? (
              <video src={v.video.adelanto} poster={v.video.portada} autoPlay muted loop playsInline aria-hidden="true" />
            ) : (
              <img src={v.video.portada} alt="" width={960} height={540} loading="lazy" />
            )}
            <span className="tienda-vitrina-play" aria-hidden="true"><PlayIcon /></span>
            <span className="tienda-vitrina-dura" aria-hidden="true">Video · {v.video.duracion}</span>
          </button>
        ) : (
          <img src={v.img} alt={v.alt} width={1600} height={1032} loading="lazy" />
        )}
      </div>
      <div className="tienda-vitrina-txt">
        <span className="tienda-item-cat">{v.kicker}</span>
        <h3 className="display tienda-vitrina-title">{v.titulo}</h3>
        <ol className="tienda-vitrina-pasos">
          {v.pasos.map((p, i) => (
            <li key={p.nombre}>
              <em>{String(i + 1).padStart(2, "0")}</em>
              <div>
                <span className="tienda-vitrina-nombre">
                  {p.nombre} {p.nivel && <small>desde {p.nivel}</small>}
                </span>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="tienda-vitrina-nota">{v.nota}</p>
      </div>
    </section>
  );
}

export function Tienda() {
  const [perfil, setPerfilState] = useState<Perfil>("emprendedor");
  // Forma de pago elegida en cada tarjeta con cuotas (por defecto, en cuotas).
  const [pagos, setPagos] = useState<Record<string, "cuotas" | "contado">>({});
  // Sección a la que hay que bajar cuando termine de pintarse (?cat=…).
  const [destino, setDestino] = useState<string | null>(null);
  // Sección que se está viendo: se marca en el índice.
  const [activa, setActiva] = useState<string | null>(null);
  const elegirPerfil = (p: Perfil) => {
    setPerfilState(p);
    trackEvent("tienda_perfil", { perfil: p });
  };
  // Vuelta de una compra que el banco verificó fuera de la ventana de pago.
  const [compraVuelta, setCompraVuelta] = useState<CompraPendiente | null>(null);
  const [selected, setSelected] = useState<CheckoutItem | null>(null);
  const { code, setCurrency, convert, formatMoney } = useCurrency();
  // Los miembros activos del club ven su precio con descuento. Aquí solo se
  // muestra: el cobro con descuento lo decide el servidor al crear el pago.
  const { member } = useClub();
  // Sin descuento de miembro desde nov 2026 (pct = 0): no hay precio de miembro.
  const esMiembro = tieneBeneficios(member) && ECOS.descuentoMiembroPct > 0;
  const pctMiembro = ECOS.descuentoMiembroPct;
  const precioMiembro = (usd: number) => Math.round(usd * (100 - pctMiembro)) / 100;
  // Mostrar producto de prueba solo si la URL trae ?test=1
  // Ej: hgg.studio/tienda?test=1 → ves el producto de $1 al inicio
  const [showTest, setShowTest] = useState(false);
  // Se relee en cada cambio de query string (no solo al montar) para que los
  // enlaces del footer también funcionen estando ya dentro de la tienda.
  const { search } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const p = new URLSearchParams(search);
    setShowTest(p.get("test") === "1");
    // /tienda?para=empresa abre directo la tienda de empresas.
    // `?cat=empresa` también vale (lo usa la tarjeta de Software del home).
    const para = p.get("para") ?? (p.get("cat") === "empresa" ? "empresa" : null);
    // /tienda?para=cursos (enlaces viejos) → la página de cursos.
    if (para === "cursos") {
      navigate("/cursos", { replace: true });
      return;
    }
    if (para === "empresa" || para === "emprendedor") setPerfilState(para);
    // Deep-link por categoría: /tienda?cat=marca (lo usa el footer). La
    // categoría ya dice el perfil: /tienda?cat=llc abre la de empresas.
    const cat = p.get("cat");
    if (cat && cat !== "empresa") {
      const target = CAT_PARAM[cat.trim().toLowerCase()];
      if (target) {
        const dueño = perfilDe(target);
        if (dueño) setPerfilState(dueño);
        if (target !== "all") setDestino(target);
      }
    }
    // Stripe devuelve aquí, con ?redirect_status=, cuando el banco pidió verificar.
    if (p.get("redirect_status") === "succeeded") {
      const pendiente = leerCompraPendiente();
      if (pendiente) {
        borrarCompraPendiente();
        setCompraVuelta(pendiente);
      }
    }
  }, [search]);

  // Baja a la sección pedida por ?cat= cuando la pestaña ya está pintada.
  useEffect(() => {
    if (!destino) return;
    const t = window.setTimeout(() => {
      // Salto directo («instant» gana al scroll-behavior: smooth global): es un
      // enlace (footer, home), no un clic en el índice.
      const el = document.getElementById(`sec-${destino}`);
      if (el) {
        const margen = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - margen, behavior: "instant" });
      }
      setDestino(null);
    }, 300);
    return () => window.clearTimeout(t);
  }, [destino, perfil]);

  // El índice marca la sección que está en pantalla.
  useEffect(() => {
    setActiva(null);
    const heads = Array.from(document.querySelectorAll<HTMLElement>("[data-seccion]"));
    if (!heads.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiva((visible.target as HTMLElement).dataset.seccion ?? null);
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );
    heads.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [perfil]);

  const irASeccion = (id: string) => {
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    trackEvent("tienda_seccion", { seccion: id });
  };

  // Todo el catálogo vive en un único grid; ya no hay sección aparte de
  // Desarrollo Web (queda dentro de "Soluciones Complementarias").
  const catalogProducts = useMemo(
    () => (showTest ? PRODUCTS : PRODUCTS.filter((p) => p.id !== "test-1usd")),
    [showTest]
  );

  const delPerfil = useMemo(
    () => catalogProducts.filter((p) => perfilDe(filterFor(p)) === perfil),
    [catalogProducts, perfil]
  );
  const secciones = seccionesDe(perfil);
  const gruposVisibles = GROUPS.filter((g) => g.perfil === perfil);
  const textos = PERFILES[perfil];

  // Nov 2026 (Holman): con cuotas, las dos formas de pago van lado a lado y del
  // mismo tamaño («3 × $400» | «$1,097»). Se elige una y el botón cobra esa.
  const formaDe = (p: Product) => pagos[p.id] ?? "cuotas";
  const precio = (p: Product) => p.cuotas && typeof p.amountValue === "number" ? (
    <div className="tienda-pagos" role="radiogroup" aria-label="Forma de pago">
      {(["cuotas", "contado"] as const).map((forma) => {
        const on = formaDe(p) === forma;
        const ahorro = p.cuotas!.n * p.cuotas!.monto - p.amountValue!;
        return (
          <button
            key={forma}
            type="button"
            role="radio"
            aria-checked={on}
            className={`tienda-pago${on ? " is-on" : ""}`}
            onClick={() => setPagos((prev) => ({ ...prev, [p.id]: forma }))}
          >
            <span className="tienda-pago-label">{forma === "cuotas" ? `En ${p.cuotas!.n} pagos` : "De contado"}</span>
            <span className="tienda-pago-monto">
              {forma === "cuotas" ? <><span className="tienda-cuota-n">{p.cuotas!.n} ×</span> {formatMoney(p.cuotas!.monto)}</> : formatMoney(p.amountValue!)}
            </span>
            <span className="tienda-pago-nota">
              {forma === "cuotas" ? `${code} al mes` : ahorro > 0 ? `Ahorras ${formatMoney(ahorro)}` : `${code} · un pago`}
            </span>
          </button>
        );
      })}
    </div>
  ) : p.precioEur ? (
    <div className="tienda-item-price">
      {/* En dólares, redondeado a un precio limpio ($649, no $647); en euros, el oficial. */}
      <span className="amount">{code === "USD" ? formatMoney(Math.ceil((p.precioEur * EUR_TO_USD) / 10) * 10 - 1) : formatMoney(p.precioEur * EUR_TO_USD)}</span>
      <span className="unit">{p.unit.replace(/USD/g, code)}</span>
    </div>
  ) : (
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
    if (isCheckout && p.cuotas && formaDe(p) === "cuotas") {
      const { productId, n, monto } = p.cuotas;
      const titulo = `${p.title.replace(/\.$/, "")} — 1 de ${n} pagos`;
      return (
        <button
          type="button"
          className="tienda-item-cta"
          onClick={() => {
            trackEvent("begin_checkout", { item_id: productId, item_name: titulo, value: convert(monto), currency: code });
            setSelected({ productId, title: titulo, amount: monto, currency: code });
          }}
        >
          {p.cta}
          <ArrowRightIcon />
        </button>
      );
    }
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
    const visibles = VISIBLES;
    return (
      <article
        key={p.id}
        className={`tienda-item${p.highlight ? " highlight" : ""}`}
      >
        {p.highlight && <span className="tienda-badge">Más elegido</span>}
        {p.visual && (
          <div className="tienda-item-visual">
            <img src={p.visual.src} alt={p.visual.alt} width={900} height={600} loading="lazy" />
          </div>
        )}
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
              {p.features.slice(0, visibles).map((f) => (
                <li key={f}><CheckIcon />{f}</li>
              ))}
            </ul>
            {p.features.length > visibles && (
              <details className="tienda-incluye">
                <summary>Ver todo lo que incluye</summary>
                <ul className={`tienda-item-features${p.category === "impulso" ? " is-cols" : ""}`}>
                  {p.features.slice(visibles).map((f) => (
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

  const renderAnual = (index: number) => [
    <GroupHead key="head-anual" group={ANUAL.head} index={index} id="anual" />,
    // Oct 2026: imagen a la izquierda, detalles a la derecha y el precio abajo,
    // a lo ancho (antes la imagen y todo el texto iban a un lado y el precio solo).
    <article key="anual" className="tienda-anual">
      <div className="tienda-item-visual tienda-anual-visual">
        <img
          src="/tienda/entrada-anual.webp"
          alt="El año del acompañamiento: Sentido, Marca y Sistema en 12 meses, y el WhatsApp directo con Holman"
          width={900}
          height={545}
          loading="lazy"
        />
      </div>
      <div className="tienda-anual-main">
        <span className="tienda-item-cat">Acompañamiento anual</span>
        <h3 className="display tienda-anual-title">12 meses con Holman.</h3>
        <p className="tienda-item-subtitle">
          De saber quién eres a tener una marca y un negocio que funcionan.
        </p>
        <ol className="tienda-anual-tramos">
          {ANUAL.tramos.map((etapa, i) => (
            <li key={etapa}>
              <em>{String(i + 1).padStart(2, "0")}</em>
              <span className="tienda-anual-etapa">{etapa}</span>
            </li>
          ))}
        </ol>
        <ul className="tienda-item-features tienda-anual-incluye">
          {ANUAL.incluye.map((f) => (
            <li key={f}><CheckIcon />{f}</li>
          ))}
        </ul>
      </div>
      <aside className="tienda-anual-precio">
        <div className="tienda-anual-cifra">
          <span className="tienda-anual-label">Tu inversión</span>
          <span className="tienda-anual-amount">{formatMoney(ANUAL.precio)}</span>
          <span className="unit">{code} · pago único</span>
          <span className="tienda-item-per">
            o {ANUAL.cuotas} cuotas de {formatMoney(ANUAL.cuota)}
          </span>
        </div>
        <div className="tienda-anual-accion">
          <a
            href={waLink(ANUAL.whatsappText)}
            target="_blank"
            rel="noopener noreferrer"
            className="tienda-item-cta"
          >
            Aplica a tu lugar
            <ArrowRightIcon />
          </a>
          <p className="tienda-anual-nota">Por aplicación: Holman conversa contigo antes de empezar.</p>
        </div>
      </aside>
    </article>,
  ];

  const renderGrupo = (items: Product[], experiencias?: string) => {
    // Oct 2026 (Holman): los tres planes de cada etapa del mismo tamaño, uno
    // al lado del otro; el «Más elegido» se distingue por el borde y el botón.
    if (TIERED.includes(items[0].category)) {
      const clave = items[0].id;
      return [
        <div key={`planes-${clave}`} className={`tienda-planes${items.length === 4 ? " is-4" : ""}`}>
          {items.map(renderProduct)}
        </div>,
        // Marca con Huella (nov 2026): garantía que depende de nosotros (oferta
        // y landing listas al día 30, no cuánto vende) y cupo real por mes.
        ...(items[0].category === "marca" ? [
          <div key={`plan-${clave}`} className="tienda-plan">
            <div className="tienda-plan-head">
              <span className="tienda-plan-kicker">Plan de trabajo</span>
              <h3 className="display">90 días, un mes por etapa.</h3>
              <p>Igual en los tres paquetes; cambia cuánto entregamos en cada etapa.</p>
            </div>
            <ol className="tienda-plan-etapas">
              {PLAN_MARCA.map((e, i) => (
                <li key={e.mes}>
                  <span className="tienda-plan-mes">Mes {i + 1}</span>
                  <h4>{e.mes}</h4>
                  <ul>
                    {e.puntos.map((t) => <li key={t}><CheckIcon />{t}</li>)}
                  </ul>
                </li>
              ))}
            </ol>
          </div>,
          <div key={`sellos-${clave}`} className="tienda-sellos">
            <p><strong>Garantía de lanzamiento.</strong> Si cumples tus tareas de cada semana y al día 30 tu oferta no está lista o tu landing no está publicada, seguimos contigo un mes más sin costo.</p>
            <p><strong>Cupo limitado.</strong> Solo 7 marcas nuevas por mes, para acompañar bien a cada una.</p>
          </div>,
        ] : []),
        items[0].category === "impulso" ? (
          // DelegaWork 360 ya no tiene paquetes: es una reunión con Holman.
          <div key={`ayuda-${clave}`} className="tienda-ayuda">
            <p><strong>¿Quieres un plan a tu medida?</strong> Lo armamos contigo.</p>
            <div className="tienda-ayuda-botones">
              <a href={waLink("Hola Holman, quiero un plan personalizado de DelegaWork 360.")} target="_blank" rel="noopener noreferrer" className="tienda-ayuda-btn">
                Conversemos
                <ArrowRightIcon />
              </a>
            </div>
          </div>
        ) : (
        <div key={`ayuda-${clave}`} className="tienda-ayuda">
          <p><strong>¿No sabes cuál elegir?</strong> En una Sesión de Claridad gratis lo vemos juntos.</p>
          <div className="tienda-ayuda-botones">
            <a href={CLARIDAD_WA_URL} target="_blank" rel="noopener noreferrer" className="tienda-ayuda-btn">
              Agendar mi Sesión de Claridad
              <ArrowRightIcon />
            </a>
            {experiencias && (
              <Link to={`/experiencias#${experiencias}`} className="tienda-ayuda-btn is-sec">
                Ver experiencias reales
              </Link>
            )}
          </div>
        </div>
        ),
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
          <div className="tienda-perfil" role="group" aria-label="¿Para quién es?">
            {(Object.keys(PERFILES) as Perfil[]).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={perfil === p}
                className={perfil === p ? "active" : ""}
                onClick={() => elegirPerfil(p)}
              >
                {PERFILES[p].boton}
              </button>
            ))}
          </div>

          <h1 className="display tienda-title">
            {textos.titulo[0]}<br />
            {textos.titulo[1]}
          </h1>

          <div className="tienda-sub">
            {/* Nov 2026 (Holman): sin aviso del descuento de ECOS. Con los
                precios de lanzamiento el 10 % ya no tiene lógica. */}
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

        {/* Índice (oct 2026): lleva a cada sección sin esconder nada. */}
        {secciones.length > 0 && (
          <nav className="tienda-indice" aria-label="Secciones de la tienda">
            {secciones.map((sec, i) => (
              <button
                key={sec.id}
                type="button"
                className={activa === sec.id ? "active" : ""}
                onClick={() => irASeccion(sec.id)}
              >
                <em>{String(i).padStart(2, "0")}</em>
                {sec.label}
              </button>
            ))}
          </nav>
        )}

        <Reveal stagger className="tienda-grid">
          {/* Con o sin filtro se pinta el encabezado de cada categoría: si solo
              saliera en "Todo", el copy de Programa Sentido / Marca con Huella /
              Sistema desaparecería justo al filtrar por esa categoría. */}
          {/* 00 · Empieza aquí (oct 2026): las dos puertas de entrada, antes de
              los precios. Solo en «Todo»: con un filtro, la persona ya eligió. */}
          {perfil === "empresa" && [
            <GroupHead key="head-entrada-empresa" group={ENTRADA_EMPRESA} index={-1} id="entrada" />,
            <article key="diagnostico" className="tienda-item tienda-item-wide tienda-item-solo tienda-item-diag">
              <div className="tienda-item-visual">
                <img
                  src="/tienda/entrada-diagnostico.webp"
                  alt="Un diagnóstico de empresa por áreas, con qué conviene primero, y la conversación por WhatsApp con Holman"
                  width={900}
                  height={560}
                  loading="lazy"
                />
              </div>
              <div className="tienda-item-diag-txt">
                <div className="tienda-item-top">
                  <span className="tienda-item-cat">Diagnóstico de tu empresa</span>
                </div>
                <h3 className="display tienda-item-title">Cuéntanos qué te frena.</h3>
                <p className="tienda-item-subtitle">
                  Revisamos cómo vendes, cómo atiendes y cómo se organiza tu equipo, y te decimos qué conviene primero.
                </p>
                <ul className="tienda-item-features">
                  <li><CheckIcon />Una conversación, sin costo</li>
                  <li><CheckIcon />Sales con un plan concreto para tu empresa</li>
                </ul>
                <div className="tienda-item-bottom">
                  <div className="tienda-item-price-row">
                    <div className="tienda-item-price">
                      <span className="amount">Gratis</span>
                    </div>
                  </div>
                  <a
                    href={waLink("Hola Holman, tengo una empresa y quiero un diagnóstico.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tienda-item-cta"
                  >
                    Pide tu diagnóstico
                    <ArrowRightIcon />
                  </a>
                </div>
              </div>
            </article>,
          ]}
          {perfil === "emprendedor" && [
            <GroupHead key="head-entrada" group={ENTRADA} index={-1} id="entrada" />,
            <article key="claridad" className="tienda-item tienda-item-wide">
              <div className="tienda-item-visual">
                <img src="/tienda/entrada-claridad.webp" alt="Sesión por Zoom con Holman y la página para agendar tu Sesión de Claridad en el celular" width={900} height={560} loading="lazy" />
              </div>
              <div className="tienda-item-top">
                <span className="tienda-item-cat">Sesión de Claridad</span>
              </div>
              <h3 className="display tienda-item-title">Tu primera conversación.</h3>
              <p className="tienda-item-subtitle">
                Entiendes dónde estás hoy y sales con tu siguiente paso claro.
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
              <div className="tienda-item-visual">
                <img src="/tienda/entrada-ecos.webp" alt="El panel de ECOS Business Club en computador y celular" width={900} height={560} loading="lazy" />
              </div>
              <div className="tienda-item-top">
                <span className="tienda-item-cat">ECOS Business Club</span>
              </div>
              <h3 className="display tienda-item-title">Aprende cada semana.</h3>
              <p className="tienda-item-subtitle">
                Ventas, marketing y oratoria en vivo, cada semana, practicando sobre tu propio negocio.
              </p>
              <ul className="tienda-item-features">
                <li><CheckIcon />{ECOS.pruebaDias} días gratis, sin tarjeta</li>
                <li><CheckIcon />Comunidad y biblioteca de clases</li>
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
          {gruposVisibles.flatMap((g, gi) => {
            const group = delPerfil.filter((p) => filterFor(p) === g.id);
            if (group.length === 0) return [];
            return [
              <GroupHead key={`head-${g.id}`} group={g} index={gi} id={g.id} />,
              ...(g.vitrina ? [<VitrinaEtapa key={`vitrina-${g.id}`} v={g.vitrina} etapa={g.id} />] : []),
              ...renderGrupo(group, g.experiencias),
            ];
          })}
          {/* El anual cierra el camino del emprendedor: Sentido → Marca → todo junto. */}
          {perfil === "emprendedor" && renderAnual(gruposVisibles.length)}
          {/* Los cursos viven en /cursos; aquí, una invitación al final del camino. */}
          {perfil === "emprendedor" && (
            <Link key="cursos" to="/cursos" className="tienda-cursos-franja" onClick={() => trackEvent("tienda_cursos")}>
              <div className="tienda-cursos-txt">
                <span className="tienda-item-cat">Cursos en video</span>
                <h3 className="display">¿Prefieres aprender a tu ritmo?</h3>
                <p>Cursos, talleres y clases para entender tu mente, tus emociones y tu negocio. Desde el celular o el computador, cuando quieras.</p>
                <span className="tienda-cursos-ir">Mira los cursos <ArrowRightIcon /></span>
              </div>
              <img
                src="/cursos/paquete-emociones.webp"
                alt="El curso Gestión de las emociones en computador y celular, con su workbook"
                width={1100}
                height={822}
                loading="lazy"
              />
            </Link>
          )}
        </Reveal>

        <p className="tienda-cruce">
          {textos.cruce}{" "}
          <button
            type="button"
            onClick={() => {
              elegirPerfil(textos.cruceA);
              document.getElementById("tienda")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            {textos.cruceBoton}
            <ArrowRightIcon />
          </button>
        </p>

      </div>

      <CheckoutModal item={selected} onClose={() => setSelected(null)} />
      {compraVuelta && (
        <div className="checkout-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setCompraVuelta(null); }}>
          <div className="checkout-modal">
            <button type="button" className="checkout-close" aria-label="Cerrar" onClick={() => setCompraVuelta(null)}>×</button>
            <CompraConfirmada
              titulo="¡Pago confirmado!"
              productId={compraVuelta.productId}
              producto={compraVuelta.title}
              reference={compraVuelta.reference}
              email={compraVuelta.email}
              onClose={() => setCompraVuelta(null)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
