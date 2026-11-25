import { useEffect, useState } from "react";
import { SITE } from "@/lib/config";
import { CLARIDAD_VIDEO } from "@/lib/catalogo";
import { trackEvent } from "@/lib/analytics";
import { useInView } from "@/lib/use-in-view";
import type { OfferItem } from "@/lib/seo";
import { PlayIcon } from "./icons";

export type Product = {
  id: string;
  category: "coaching" | "marca" | "growth" | "web" | "llc" | "impulso" | "ia" | "nexco";
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
   * Otros productos que se compran desde esta misma tarjeta (botones extra,
   * con su precio en el texto). Lo usa la LLC: creación, declaración anual y
   * mantenimiento anual van en una sola fila.
   */
  alterno?: string[];
  /** No se pinta solo: vive como botón `alterno` de otra tarjeta. */
  oculto?: boolean;
  /** Mockup de lo que entrega el nivel (arriba de la tarjeta). */
  visual?: { src: string; alt: string };
};

export function waLink(text: string) {
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

export const PRODUCTS: Product[] = [
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

  // ===== 2b · GROWTH SYSTEM (nov 2026, Holman y Sol) =====
  // Para quien ya tiene marca y quiere vender cada mes: redes (Sol) + embudo
  // (Holman) + DelegaSales (IA de contenido y campañas) y DelegaWork en Elite.
  // Arranque + mensualidad + comisión sobre las ventas nuevas (por encima de lo
  // que el cliente vende hoy). Por aplicación: `customQuote` muestra el precio
  // pero el botón abre WhatsApp. DelegaSales, DelegaWork y la pauta los paga el
  // cliente aparte. A menos fijo, más comisión.
  {
    id: "growth-starter",
    category: "growth",
    categoryLabel: "Growth System",
    tag: "Starter",
    amount: "$297",
    amountValue: 297,
    customQuote: true,
    unit: "USD / mes",
    title: "Growth System Starter.",
    subtitle: "Tus primeras ventas, cada mes.",
    note: "Arranque de $297 · 15 % de tus ventas nuevas",
    features: [
      "Tus redes: 3 publicaciones y 6 historias por semana",
      "Landing y embudo a WhatsApp",
      "Tu agenda de contactos convertida en clientes, con mensajes listos",
      "Una sesión de estrategia al mes con Holman",
      "Reporte mensual de tus números",
    ],
    cta: "Aplica a Starter",
    whatsappText: "Hola Holman, quiero aplicar a Growth System Starter.",
  },
  {
    id: "growth-pro",
    category: "growth",
    categoryLabel: "Growth System",
    tag: "Pro",
    amount: "$497",
    amountValue: 497,
    customQuote: true,
    unit: "USD / mes",
    title: "Growth System Pro.",
    subtitle: "Más clientes, con seguimiento automático.",
    note: "Arranque de $497 · 12 % de tus ventas nuevas",
    features: [
      "Todo lo del Starter",
      "DelegaSales: inteligencia artificial que crea tu contenido y lleva tus campañas",
      "Tus redes: 5 publicaciones y 10 historias por semana",
      "Un regalo que capta contactos, con seguimiento automático",
      "Dos sesiones de estrategia al mes con Holman",
    ],
    cta: "Aplica a Pro",
    whatsappText: "Hola Holman, quiero aplicar a Growth System Pro.",
    highlight: true,
  },
  {
    id: "growth-elite",
    category: "growth",
    categoryLabel: "Growth System",
    tag: "Elite",
    amount: "$997",
    amountValue: 997,
    customQuote: true,
    unit: "USD / mes",
    title: "Growth System Elite.",
    subtitle: "Tu negocio creciendo con sistema.",
    note: "Arranque de $997 · 10 % de tus ventas nuevas",
    features: [
      "Todo lo del Pro",
      "DelegaWork: tu CRM, tu agenda y tu panel de ventas",
      "Campañas de anuncios por etapas: te conocen, te recuerdan y te compran",
      "Tus redes: 7 publicaciones y 14 historias por semana",
      "Un evento en vivo para captar clientes",
      "Sesión de estrategia cada 15 días y WhatsApp directo con Holman",
    ],
    cta: "Aplica a Elite",
    whatsappText: "Hola Holman, quiero aplicar a Growth System Elite.",
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
  // Nov 2026 (Holman): la LLC se cobra a precio real, sin consultoría ni FLOW.
  // Tres pagos separados en una sola fila: crearla, la declaración de cada
  // abril y el mantenimiento de cada agosto (agente + informe de Wyoming).
  {
    id: "llc-estructura",
    category: "llc",
    categoryLabel: "Estructuración Empresarial",
    tag: "Creación + EIN",
    amount: "$597",
    amountValue: 597,
    unit: "USD · creación",
    title: "Tu LLC en EE. UU.",
    subtitle: "Creamos tu empresa en Wyoming y sacamos tu EIN. Después, cada año, la mantienes al día con nosotros.",
    features: [
      "Registro de la LLC en Wyoming",
      "Agente registrado el primer año",
      "EIN ante el IRS",
    ],
    cta: "Crear mi LLC",
    alterno: ["llc-declaracion", "llc-acompanamiento"],
    whatsappText: "Hola HGG, quiero crear mi LLC en Estados Unidos.",
  },
  {
    id: "llc-declaracion",
    category: "llc",
    categoryLabel: "Estructuración Empresarial",
    tag: "Declaración anual",
    amount: "$347",
    amountValue: 347,
    unit: "USD / año",
    title: "LLC en EE. UU. — Declaración anual IRS.",
    features: ["Declaración anual ante el IRS"],
    cta: "Declaración",
    oculto: true,
    whatsappText: "Hola HGG, quiero la declaración anual de mi LLC ante el IRS.",
  },
  {
    id: "llc-acompanamiento",
    category: "llc",
    categoryLabel: "Estructuración Empresarial",
    tag: "Mantenimiento anual",
    amount: "$397",
    amountValue: 397,
    unit: "USD / año",
    title: "LLC en EE. UU. — Mantenimiento anual.",
    features: ["Agente registrado", "Informe anual de Wyoming"],
    cta: "Mantenimiento",
    oculto: true,
    whatsappText: "Hola HGG, quiero el mantenimiento anual de mi LLC.",
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
  | "growth"
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

export type Group = {
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

export type Vitrina = {
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
export const GROUPS: Group[] = [
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
      video: { id: "ee7c0980-6015-40ed-9cd1-5911ea89f713", duracion: "1 min", adelanto: "/tienda/marca-adelanto.mp4", portada: "/tienda/marca-adelanto.webp" },
    },
  },
  {
    id: "growth",
    perfil: "emprendedor",
    label: "Growth",
    name: "Growth System",
    headline: "Tu equipo de crecimiento. Ganamos cuando tú ganas.",
    paraTi: "Es para ti si ya tienes tu marca y quieres vender cada mes. Redes, embudo e inteligencia artificial trabajando juntos, y nosotros comprometidos con tus resultados.",
    comun: "En los tres: un arranque, una mensualidad y una comisión solo sobre las ventas nuevas, por encima de lo que vendes hoy. Desde 6 meses. La inversión en anuncios va directo a tu cuenta. Si vienes de Marca con Huella, entras sin arranque.",
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

// Acompañamiento anual: el high ticket de HGG. Se entra por aplicación —el
// botón abre la conversación con Holman, no el pago— porque él decide a quién
// acompaña. Va al final y cierra la tienda del emprendedor, solo en «Todo».
// Nov 2026 (Holman): pasa a $997 al mes por 12 meses con todo el equipo de
// HGG a disposición del cliente, y solo 5 cupos.
export const ANUAL = {
  head: {
    name: "Acompañamiento anual",
    headline: "Todo nuestro equipo, para tu proyecto.",
    paraTi:
      "Es para ti si quieres que el equipo completo de Holman Global Group trabaje contigo en tu proyecto durante un año.",
  },
  // Lo que pone el equipo (las mismas tres del mockup).
  tramos: ["Estrategia", "Software", "Coaching"],
  precio: 997,
  meses: 12,
  // Nov 2026 (Holman): o $10.000 de contado por los 12 meses.
  contado: 10000,
  cupos: 5,
  incluye: [
    "Todo el equipo de Holman Global Group trabajando en tu proyecto los 12 meses",
    "Acompañamiento de coaching con Holman cada mes",
    "Estrategia y plan financiero: tu meta convertida en ventas",
    "Tu marca completa: manual de marca, oferta y precio, sitio web y tienda en línea",
    "Software a tu medida: panel de administración, agenda, CRM y una plataforma para tus clientes",
    "Tus redes los 12 meses: 7 publicaciones y 14 historias por semana",
    "Un panel de trabajo: pides lo que necesitas y el equipo lo ejecuta",
    "ECOS Business Club los 12 meses",
    "WhatsApp directo con Holman",
  ],
  whatsappText: "Hola Holman, quiero aplicar al Acompañamiento Anual.",
};

/** Categoría de producto → filtro de la tienda. */
export function filterFor(p: Product): Exclude<Filter, "all"> {
  switch (p.category) {
    case "coaching":
      return "proposito";
    case "marca":
      return "marca";
    case "growth":
      return "growth";
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
export const CAT_PARAM: Record<string, Filter> = {
  todo: "all",
  all: "all",
  proposito: "proposito",
  "propósito": "proposito",
  coaching: "proposito",
  // Nombre nuevo de la categoría (brief 13-ago). Los dos de arriba se quedan
  // como alias para no romper enlaces ya compartidos.
  sentido: "proposito",
  marca: "marca",
  growth: "growth",
  sistema: "sistema",
  impulso: "sistema",
  complementarias: "complementarias",
  "soluciones-complementarias": "complementarias",
  llc: "complementarias",
  nexco: "complementarias",
  web: "complementarias",
};

// Nov 2026 (Holman): el plan de Marca con Huella en tres etapas, una por mes,
// solo con lo principal. Semana 1 coaching, semana 2 branding + sesión de
// contenido con Marisol, semana 3 lanzamiento y venta a contactos calientes.
export const PLAN_MARCA = [
  {
    mes: "Crear y lanzar",
    meta: "Tu marca lista y a la venta.",
    puntos: ["Tu historia, tu oferta y su precio", "Manual de marca, landing y embudo", "Lanzamiento a tus contactos"],
  },
  {
    mes: "Atraer",
    meta: "Clientes nuevos.",
    puntos: ["Contenido cada semana", "Tu regalo capta interesados (Pro y Elite)", "Ajustamos oferta y contenido"],
  },
  {
    mes: "Crecer",
    meta: "Ventas que se repiten.",
    puntos: ["Repetimos lo que funcionó", "Testimonios de tus clientes", "Tu plan para los próximos 90 días"],
  },
];

/** Cómo se agrupan los complementos (cada grupo se abre al tocarlo). */
export const COMPLEMENTOS: { nombre: string; categorias: Product["category"][] }[] = [
  { nombre: "Tu empresa en EE. UU.", categorias: ["llc"] },
  // Nov 2026 (Holman): vuelven como piezas sueltas, para quien quiera solo
  // una; el paquete completo (Marca con Huella) sale mucho mejor.
  { nombre: "Sitios web", categorias: ["web"] },
  { nombre: "Campañas y redes", categorias: ["nexco"] },
  { nombre: "Inteligencia artificial", categorias: ["ia"] },
];

/** Categorías con niveles Starter / Pro / Elite. */
export const TIERED: Product["category"][] = ["coaching", "marca", "growth", "impulso"];

// Oct 2026 (Holman): la tienda ya no muestra las marcas aliadas (Delegaweb,
// Nexco) —ni chips «Por …» ni barras de su color—. Los servicios se ofrecen
// como de HGG y todas las tarjetas van en dorado.

/** Vitrina de una etapa: el mockup grande y lo que se lleva, de menos a más. */
/**
 * Dic 2026 (tienda minimalista): en la página de cada programa va solo el
 * video (`soloMedia`); los pasos y la nota ya no se pintan.
 */
export function VitrinaEtapa({ v, etapa, soloMedia }: { v: Vitrina; etapa: string; soloMedia?: boolean }) {
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
    <section className={`tienda-vitrina${soloMedia ? " is-solo" : ""}`}>
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
      {!soloMedia && <div className="tienda-vitrina-txt">
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
      </div>}
    </section>
  );
}

