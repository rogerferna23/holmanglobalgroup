import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { SITE } from "@/lib/config";
import { trackEvent } from "@/lib/analytics";
import { useCurrency } from "@/contexts/CurrencyContext";
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
  subtitle: string;
  /** Línea aclaratoria bajo el nombre del paquete (p. ej. plataforma incluida). */
  note?: string;
  body: string;
  features: string[];
  /** Bloque "incluido en todos los tiers" — se lista aparte de `features`. */
  ecosystem?: string[];
  cta: string;
  whatsappText: string;
  highlight?: boolean;
  customQuote?: boolean; // si true: el CTA va directo a WhatsApp para cotizar
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
  "Sofía IA — atiende, cualifica y alimenta el CRM automáticamente",
  "CRM · FLOW · NETWORK · DelegaMail · DelegaMeet · DelegaBooks · DelegaSocial · DelegaCloud · DelegaHelp",
];

// DelegaCloud es el módulo nuevo del brief de agosto: la nube dentro de
// DelegaWork donde se almacenan todos los documentos de la empresa.
const ECOSYSTEM_NOTE =
  "DelegaCloud es la nube dentro de DelegaWork: todos los documentos de tu empresa accesibles en un solo lugar.";

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

  // ===== 1 · PROPÓSITO / COACHING (Eco) — 1 color HGG =====
  {
    id: "coaching-individual",
    category: "coaching",
    categoryLabel: "Coaching",
    tag: "Individual",
    amount: "$150",
    amountValue: 150,
    unit: "USD",
    title: "Sesión Individual.",
    subtitle: "Sesión 1 a 1 de Coaching Expansivo y Musical.",
    body:
      "Un espacio de claridad, desbloqueo y dirección creativa donde la mente y el corazón se alinean.",
    features: ["1 sesión de coaching expansivo o musical"],
    cta: "Reserva tu sesión",
    whatsappText:
      "Hola HGG, quiero reservar una Sesión Individual de Coaching Expansivo y Musical.",
  },
  {
    id: "coaching-5",
    category: "coaching",
    categoryLabel: "Coaching",
    tag: "5 sesiones",
    amount: "$597",
    amountValue: 597,
    unit: "USD",
    title: "Paquete 5 Sesiones.",
    subtitle: "Proceso profundo de transformación, estructura y expansión.",
    body:
      "Un proceso vivo de cinco encuentros para sostener un cambio profundo en vida, propósito y proyectos.",
    features: ["5 sesiones de coaching expansivo y musical"],
    cta: "Empieza tu transformación",
    whatsappText:
      "Hola HGG, quiero información sobre el Paquete de 5 Sesiones de Coaching.",
  },
  {
    id: "coaching-10",
    category: "coaching",
    categoryLabel: "Coaching",
    tag: "10 sesiones",
    amount: "$1,097",
    amountValue: 1097,
    unit: "USD",
    title: "Paquete 10 Sesiones.",
    subtitle: "Acompañamiento profundo y sostenido en el tiempo.",
    body:
      "Diez encuentros para una transformación completa: propósito, identidad y un sistema para sostener el cambio a largo plazo.",
    features: ["10 sesiones de coaching expansivo y musical"],
    cta: "Empieza tu proceso",
    whatsappText:
      "Hola HGG, quiero información sobre el Paquete de 10 Sesiones de Coaching.",
  },

  // ===== 2 · MARCA CON HUELLA (Fuego · Marca) =====
  {
    id: "marca-esencial",
    category: "marca",
    categoryLabel: "Marca con Huella",
    tag: "Starter",
    amount: "$797",
    amountValue: 797,
    unit: "USD",
    title: "Marca con Huella Starter.",
    subtitle: "Sistema Inicial de Identidad Estratégica.",
    body:
      "Construye una identidad clara, coherente y profesional para emprendedores y marcas en su primera etapa.",
    features: [
      "Coaching de marca",
      "Logo",
      "Paleta de colores",
      "Tipografías",
      "Manual de marca",
      "50 leads calificados con Apify",
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
    unit: "USD",
    title: "Marca con Huella Pro.",
    subtitle: "Identidad Estratégica + Presencia Digital.",
    body:
      "Una marca sólida con presencia digital profesional lista para empezar a crecer.",
    features: [
      "Todo lo del Starter",
      "Sitio web profesional",
      "SEO básico",
      "Integración con WhatsApp",
      "Formularios de contacto",
      "150 leads calificados con Apify",
    ],
    cta: "Construye con Pro",
    whatsappText: "Hola HGG, quiero información sobre Marca con Huella Pro.",
  },
  {
    id: "marca-360",
    category: "marca",
    categoryLabel: "Marca con Huella",
    tag: "Elite",
    amount: "$3,000",
    amountValue: 3000,
    unit: "USD",
    title: "Marca con Huella Elite.",
    subtitle: "Marca, Posicionamiento y Captación de Clientes.",
    body:
      "Marca + presencia digital + sistema de captación. Activamos un ecosistema completo capaz de atraer clientes potenciales.",
    features: [
      "Todo lo del Pro",
      "Sesión adicional Coaching Expansivo",
      "Sesión de Ventas Estratégicas",
      "4 artículos SEO (600–800 palabras)",
      "1 secuencia de bienvenida automatizada",
      "1 flujo de automatización",
      "Configuración de campaña publicitaria (Nexco)",
      "Gestión de redes sociales (Nexco)",
      "300 leads calificados con Apify",
      "Presupuesto de ads: cliente aparte",
    ],
    cta: "Activa tu Elite",
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
    subtitle: "Captación inicial y validación.",
    note:
      "Incluye acceso completo a la plataforma DelegaWork + acompañamiento estratégico de HGG.",
    body:
      "Tu primera estructura digital activa: consultoría estratégica, contenido SEO, email marketing y publicidad para empezar a generar leads.",
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
    ecosystem: ECOSYSTEM,
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
    subtitle: "Crecimiento sostenido.",
    note:
      "Incluye acceso completo a la plataforma DelegaWork + acompañamiento estratégico de HGG.",
    body:
      "Más volumen de contenido, automatización de captación y seguimiento, y campañas duales para crecer con ritmo.",
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
    ecosystem: ECOSYSTEM,
    cta: "Activa Pro",
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
    subtitle: "Escalado con sistema.",
    note:
      "Incluye acceso completo a la plataforma DelegaWork + acompañamiento estratégico de HGG.",
    body:
      "Operación digital de alto volumen: SEO premium, secuencias completas, tres campañas activas, redes sociales y soporte prioritario.",
    features: [
      "Hasta 600 clientes gestionados",
      "1.000 créditos mensuales de Sofía",
      "2 Consultorías Estratégicas/mes",
      "8 artículos SEO/mes",
      "8 correos de campaña/mes",
      "Secuencias completas automatizadas",
      "3 campañas publicitarias activas",
      "Gestión de redes sociales (Nexco)",
      "Soporte prioritario en DelegaHelp",
      "Reporte mensual",
    ],
    ecosystem: ECOSYSTEM,
    cta: "Activa Elite",
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
    unit: "USD",
    title: "LLC Global — Creación y Estrategia.",
    subtitle: "Creación de LLC + estructuración estratégica integral.",
    body:
      "Construye los cimientos legales y estratégicos de tu negocio internacional con acompañamiento experto desde el día uno.",
    features: [
      "Creación completa de LLC",
      "Obtención de EIN",
      "Consultoría estratégica personalizada",
      "Acceso a FLOW (DelegaWork)",
    ],
    cta: "Empieza con tu LLC",
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
    body:
      "Mantén tu LLC vigente y crece con seguimiento estratégico y acceso continuo a tus herramientas durante todo el año.",
    features: [
      "Renovación anual de LLC",
      "Annual Report",
      "Sesiones de guidance",
      "Acceso continuo a FLOW (DelegaWork)",
    ],
    cta: "Renueva tu LLC",
    whatsappText:
      "Hola HGG, quiero información sobre la Renovación Anual de mi LLC.",
  },

  // ===== 5 · SOLUCIONES COMPLEMENTARIAS · NEXCO — color Nexco #CB9339 =====
  {
    id: "nexco-config",
    category: "nexco",
    categoryLabel: "Nexco",
    tag: "Configuración de Campaña",
    amount: "$300",
    amountValue: 300,
    unit: "USD",
    title: "Configuración de Campaña.",
    subtitle: "Tu primera campaña publicitaria, lista para lanzar.",
    body:
      "Configuración completa de una campaña publicitaria con objetivo, audiencia y estructura de anuncios definidos. El presupuesto de ads lo paga el cliente directamente.",
    features: [
      "Configuración completa de 1 campaña publicitaria",
      "Definición de objetivo, audiencia y estructura de anuncios",
      "Presupuesto de ads aparte — lo paga el cliente directamente",
    ],
    cta: "Configura tu campaña",
    whatsappText:
      "Hola HGG, quiero información sobre la Configuración de Campaña (Nexco).",
  },
  {
    id: "nexco-redes",
    category: "nexco",
    categoryLabel: "Nexco",
    tag: "Gestión de Redes Sociales",
    amount: "$600",
    amountValue: 600,
    unit: "USD / mes",
    title: "Gestión de Redes Sociales.",
    subtitle: "Contenido constante que construye comunidad.",
    body:
      "Producción y publicación de contenido en tus redes, con guía previa de cada pieza y una mentoría inicial para transmitir autenticidad.",
    features: [
      "3 posts + 1 video por semana (producción y publicación incluidas)",
      "Guía detallada de cada pieza antes de publicar",
      "Subida y gestión completa en redes",
      "Mentoría inicial sobre autenticidad en redes",
    ],
    cta: "Activa tus redes",
    whatsappText:
      "Hola HGG, quiero información sobre la Gestión de Redes Sociales (Nexco).",
  },

  // ===== 6 · SOLUCIONES COMPLEMENTARIAS · DESARROLLO WEB — Sitios Web y luego IA =====
  {
    id: "web-landing",
    category: "web",
    categoryLabel: "Sitios Web",
    tag: "Landing Page",
    amount: "$648",
    amountValue: 648,
    unit: "USD",
    title: "Landing Page.",
    subtitle: "Diseñada para convertir visitas en clientes.",
    body:
      "Estrategia de conversión y diseño impactante. Incluye dominio, hosting y optimización SEO básica, con entrega y revisión contigo.",
    features: [
      "Estrategia de conversión",
      "Diseño impactante",
      "Configurar dominio + hosting",
      "Optimización SEO básica",
      "Entrega y revisión con el cliente",
    ],
    cta: "Contratar",
    whatsappText: "Hola HGG, quiero información sobre una Landing Page.",
  },
  {
    id: "web-panel",
    category: "web",
    categoryLabel: "Sitios Web",
    tag: "Panel de Administración",
    amount: "$1,080",
    amountValue: 1080,
    unit: "USD",
    title: "Panel de Administración.",
    subtitle: "Gestiona tu contenido desde cualquier dispositivo.",
    body:
      "Web con panel para gestionar tu contenido de forma autónoma. Diseño responsive y optimización SEO básica, con entrega y revisión contigo.",
    features: [
      "Panel de administración",
      "Gestión autónoma de contenido",
      "Diseño responsive",
      "Optimización SEO básica",
      "Entrega y revisión con el cliente",
    ],
    cta: "Contratar",
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
    unit: "USD",
    title: "Ecommerce Completo.",
    subtitle: "Tienda online completa para vender desde el primer día.",
    body:
      "Tienda online con pasarela de pago integrada y gestión de catálogo, optimizada para vender. Entrega y revisión contigo.",
    features: [
      "Tienda online completa",
      "Pasarela de pago integrada",
      "Gestión de catálogo",
      "Optimización para vender",
      "Entrega y revisión con el cliente",
    ],
    cta: "Contratar",
    whatsappText: "Hola HGG, quiero información sobre una tienda Ecommerce.",
  },
  {
    id: "ia-sistemas",
    category: "ia",
    categoryLabel: "Inteligencia Artificial",
    tag: "A medida",
    amount: "Cotización a medida",
    unit: "Invoice a la medida por el monto acordado",
    title: "Sistemas con Inteligencia Artificial.",
    subtitle: "Tu propia IA, entrenada con la voz de tu marca.",
    body:
      "Desarrollamos sistemas de inteligencia artificial a la medida de cada negocio. Entrenamos nuestra propia IA para integrarse como parte activa del equipo — ya sea como agente de ventas, soporte al cliente, asistente interno o cualquier rol que la empresa necesite. Una IA que trabaja por ti, con la voz y el conocimiento de tu marca.",
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
  description: p.subtitle,
  price: p.amountValue,
  currency: p.currency ?? "USD",
  category: p.categoryLabel,
}));

// Brief ago 2026: la tienda se agrupa por CATEGORÍA (4) en vez de por producto
// individual (6). "Soluciones Complementarias" absorbe LLC, Nexco y Desarrollo
// Web, que antes tenían filtro propio (y Desarrollo Web, sección aparte).
export type Filter =
  | "all"
  | "proposito"
  | "marca"
  | "sistema"
  | "complementarias";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "proposito", label: "Propósito" },
  { id: "marca", label: "Marca" },
  { id: "sistema", label: "Sistema" },
  { id: "complementarias", label: "Soluciones Complementarias" },
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
  marca: "marca",
  sistema: "sistema",
  impulso: "sistema",
  complementarias: "complementarias",
  "soluciones-complementarias": "complementarias",
  llc: "complementarias",
  nexco: "complementarias",
  web: "complementarias",
};

// Barra superior de color por tarjeta (Brief Ajustes Finales), según quién ejecuta:
//   gold      → solo HGG (1 color) — coaching, marca Starter, LLC
//   blue      → solo Delegaweb (1 color) — web, IA
//   nexco     → solo Nexco (1 color, #CB9339)
//   gold-blue → HGG + Delegaweb (2 colores) — marca Pro
//   tri       → HGG + Delegaweb + Nexco (3 colores) — marca Elite, DelegaWork 360
type Bar = "gold" | "blue" | "nexco" | "gold-blue" | "tri";
function barFor(p: Product): Bar {
  if (p.category === "nexco") return "nexco";
  if (p.category === "web" || p.id === "ia-sistemas") return "blue";
  if (p.category === "impulso" || p.id === "marca-360") return "tri";
  if (p.id === "marca-pro") return "gold-blue";
  return "gold"; // coaching, marca Starter, LLC
}

// Chips "Ejecutado por …" — mismos actores que los colores de la barra.
function providersFor(p: Product): string[] {
  switch (barFor(p)) {
    case "gold":
      return ["HGG"];
    case "blue":
      return ["Delegaweb"];
    case "nexco":
      return ["Nexco"];
    case "gold-blue":
      return ["HGG", "Delegaweb"];
    case "tri":
      return ["HGG", "Delegaweb", "Nexco"];
    default:
      return [];
  }
}

// Clase de chip por marca ejecutora.
function providerClass(label: string): string {
  if (label === "Nexco") return "tienda-provider is-nexco";
  if (label === "Delegaweb") return "tienda-provider is-dw";
  return "tienda-provider is-hgg";
}

export function Tienda() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<CheckoutItem | null>(null);
  const { code, setCurrency, convert, formatMoney } = useCurrency();
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

  const renderProduct = (p: Product) => {
    const isCheckout = !p.customQuote && typeof p.amountValue === "number";
    const providers = providersFor(p);
    // LLC y Nexco ocupan media fila (2 por fila); IA (customQuote) ocupa fila completa.
    const wideClass =
      p.category === "llc" || p.category === "nexco"
        ? " tienda-item-wide"
        : p.customQuote
          ? " tienda-item-full"
          : "";
    return (
      <article
        key={p.id}
        className={`tienda-item${p.highlight ? " highlight" : ""}${wideClass}`}
        data-bar={barFor(p)}
      >
        {p.highlight && <span className="tienda-badge">Más elegido</span>}
        <div className="tienda-item-top">
          <span className="tienda-item-cat">{p.categoryLabel}</span>
          <span className="tienda-item-tag">— {p.tag}</span>
        </div>
        <h3 className="display tienda-item-title">{p.title}</h3>
        <p className="tienda-item-subtitle">{p.subtitle}</p>
        {p.note && <p className="tienda-item-note">{p.note}</p>}
        {providers.length > 0 && (
          <div className="tienda-providers">
            {providers.map((label) => (
              <span key={label} className={providerClass(label)}>
                Ejecutado por {label}
              </span>
            ))}
          </div>
        )}
        <p className="tienda-item-body">{p.body}</p>
        {p.features.length > 0 && (
          <ul className="tienda-item-features">
            {p.features.map((f) => (
              <li key={f}>
                <CheckIcon />
                {f}
              </li>
            ))}
          </ul>
        )}
        {p.ecosystem && p.ecosystem.length > 0 && (
          <div className="tienda-item-eco">
            <span className="tienda-item-eco-title">
              Ecosistema DelegaWork incluido
            </span>
            <ul>
              {p.ecosystem.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <p className="tienda-item-eco-note">{ECOSYSTEM_NOTE}</p>
          </div>
        )}
        <div className="tienda-item-bottom">
          <div className="tienda-item-price-row">
            <div className="tienda-item-price">
              <span className="amount">
                {typeof p.amountValue === "number"
                  ? formatMoney(p.amountValue)
                  : p.amount}
              </span>
              <span className="unit">{p.unit.replace(/USD/g, code)}</span>
            </div>
          </div>
          {isCheckout ? (
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
          )}
          {isCheckout && (
            <a
              href={waLink(p.whatsappText)}
              target="_blank"
              rel="noopener noreferrer"
              className="tienda-item-alt"
            >
              ¿Prefieres consultar por WhatsApp?
            </a>
          )}
        </div>
      </article>
    );
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
            con propósito.
          </h1>
          <p className="tienda-lede">
            Catálogo completo de servicios. Filtra por categoría y elige el punto
            de entrada que se ajusta a tu momento.
          </p>

          <div
            className="tienda-filters"
            role="group"
            aria-label="Seleccionar moneda"
            style={{ marginBottom: 4 }}
          >
            {(["USD", "EUR"] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={code === c}
                className={`tienda-filter${code === c ? " active" : ""}`}
                onClick={() => setCurrency(c)}
              >
                <span>{c === "USD" ? "$ USD" : "€ EUR"}</span>
              </button>
            ))}
          </div>

          <div className="tienda-filters" role="tablist" aria-label="Filtrar productos">
            {FILTERS.map((f) => {
              const count =
                f.id === "all"
                  ? catalogProducts.length
                  : catalogProducts.filter((p) => filterFor(p) === f.id).length;
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
                  <span>{f.label}</span>
                  <span className="tienda-filter-count">{count}</span>
                </button>
              );
            })}
          </div>
        </header>

        <Reveal stagger className="tienda-grid">
          {filtered.map(renderProduct)}
        </Reveal>

        {filtered.length === 0 && (
          <p className="tienda-empty">No hay productos en esta categoría.</p>
        )}
      </div>

      <CheckoutModal item={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
