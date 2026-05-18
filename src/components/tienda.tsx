import { useEffect, useMemo, useState } from "react";
import { SITE } from "@/lib/config";
import type { CheckoutItem } from "@/lib/payments";
import { CheckoutModal } from "./checkout-modal";
import { ArrowRightIcon, CheckIcon } from "./icons";
import { Reveal } from "./reveal";

type Product = {
  id: string;
  category: "coaching" | "marca" | "llc" | "impulso" | "ia";
  categoryLabel: string;
  tag: string;
  amount: string;
  amountValue?: number; // opcional: si no se pasa, no hay checkout directo
  currency?: string; // ISO 4217 — si no se pasa, usa NEXT_PUBLIC_PAYMENT_CURRENCY
  unit: string;
  title: string;
  subtitle: string;
  body: string;
  features: string[];
  cta: string;
  whatsappText: string;
  highlight?: boolean;
  customQuote?: boolean; // si true: el CTA va directo a WhatsApp para cotizar
};

function waLink(text: string) {
  return `https://wa.me/${SITE.phone.e164}?text=${encodeURIComponent(text)}`;
}

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
  {
    id: "coaching-individual",
    category: "coaching",
    categoryLabel: "Coaching",
    tag: "Individual",
    amount: "$50",
    amountValue: 50,
    unit: "USD",
    title: "Sesión Individual.",
    subtitle: "Sesión 1 a 1 de Coaching Expansivo y Musical.",
    body:
      "Un espacio de claridad, desbloqueo y dirección creativa donde la mente y el corazón se alinean.",
    features: ["Coaching expansivo", "Coaching musical", "Claridad y propósito"],
    cta: "Reserva tu sesión",
    whatsappText:
      "Hola HGG, quiero reservar una Sesión Individual de Coaching Expansivo y Musical.",
  },
  {
    id: "coaching-3",
    category: "coaching",
    categoryLabel: "Coaching",
    tag: "3 sesiones",
    amount: "$140",
    amountValue: 140,
    unit: "USD",
    title: "Paquete 3 Sesiones.",
    subtitle: "Proceso corto de claridad, desbloqueo y dirección.",
    body:
      "Tres encuentros para sostener un cambio inicial: identificar bloqueos, abrir camino y dar el primer paso con claridad.",
    features: [
      "3 sesiones 1 a 1",
      "Mapa de propósito",
      "Acompañamiento entre sesiones",
    ],
    cta: "Empieza el proceso",
    whatsappText:
      "Hola HGG, quiero información sobre el Paquete de 3 Sesiones de Coaching.",
  },
  {
    id: "coaching-5",
    category: "coaching",
    categoryLabel: "Coaching",
    tag: "5 sesiones",
    amount: "$210",
    amountValue: 210,
    unit: "USD",
    title: "Paquete 5 Sesiones.",
    subtitle: "Proceso profundo de transformación, estructura y expansión.",
    body:
      "Un proceso vivo de cinco encuentros para sostener un cambio profundo en vida, propósito y proyectos.",
    features: [
      "5 sesiones 1 a 1",
      "Estructura de transformación",
      "Acompañamiento extendido",
    ],
    cta: "Empieza tu transformación",
    whatsappText:
      "Hola HGG, quiero información sobre el Paquete de 5 Sesiones de Coaching.",
  },
  {
    id: "marca-esencial",
    category: "marca",
    categoryLabel: "Construcción de Marca",
    tag: "Esencial",
    amount: "$350",
    amountValue: 350,
    unit: "USD",
    title: "Tu Marca con Huella.",
    subtitle: "Sistema Inicial de Identidad Estratégica.",
    body:
      "Construye una identidad clara, coherente y profesional para emprendedores y marcas en su primera etapa.",
    features: [
      "Coaching de marca",
      "Logo",
      "Paleta de colores",
      "Tipografías",
      "Manual básico de marca",
    ],
    cta: "Empieza con Huella",
    whatsappText: "Hola HGG, quiero información sobre Tu Marca con Huella (Esencial).",
  },
  {
    id: "marca-pro",
    category: "marca",
    categoryLabel: "Construcción de Marca",
    tag: "PRO",
    amount: "$870",
    amountValue: 870,
    unit: "USD",
    title: "Tu Marca con Huella PRO.",
    subtitle: "Identidad Estratégica + Presencia Digital.",
    body:
      "Una marca sólida con presencia digital profesional lista para empezar a crecer.",
    features: [
      "Todo lo de Huella",
      "Sitio web profesional",
      "SEO básico",
      "Integración con WhatsApp",
      "Formularios de contacto",
      "Estructura digital profesional",
    ],
    cta: "Construye con PRO",
    whatsappText: "Hola HGG, quiero información sobre Tu Marca con Huella PRO.",
  },
  {
    id: "marca-360",
    category: "marca",
    categoryLabel: "Construcción de Marca",
    tag: "360",
    amount: "$1.900",
    amountValue: 1900,
    unit: "USD",
    title: "Tu Marca con Huella 360.",
    subtitle: "Marca, Posicionamiento y Captación de Clientes.",
    body:
      "Marca + presencia digital + sistema de captación. Activamos un ecosistema completo capaz de atraer clientes potenciales.",
    features: [
      "Coaching expansivo",
      "Ventas estratégicas",
      "Identidad visual",
      "Sitio web profesional",
      "SEO",
      "Email marketing",
      "Automatización",
      "Publicidad digital",
      "Embudos de captación",
    ],
    cta: "Activa tu 360",
    whatsappText: "Hola HGG, quiero información sobre Tu Marca con Huella 360.",
    highlight: true,
  },
  {
    id: "llc-estructura",
    category: "llc",
    categoryLabel: "Estructuración Empresarial",
    tag: "Estructura",
    amount: "$1175",
    amountValue: 1175,
    unit: "USD",
    title: "Estructura Global.",
    subtitle: "Creación de LLC + estructuración estratégica integral.",
    body:
      "Construye los cimientos legales y estratégicos de tu negocio internacional con acompañamiento experto desde el día uno.",
    features: [
      "Creación completa de LLC",
      "Registro oficial de empresa",
      "Obtención de EIN",
      "Sesión estratégica 1:1",
      "Diagnóstico inicial del perfil empresarial",
      "Estrategia financiera y de expansión",
      "Recomendaciones de estructura según el negocio",
      "Organización inicial de operativa internacional",
      "Guidance sobre métodos de cobro internacionales",
      "Acompañamiento estratégico inicial",
      "Resolución de dudas durante el proceso",
    ],
    cta: "Empieza con Estructura Global",
    whatsappText:
      "Hola HGG, quiero información sobre Estructura Global (creación de LLC).",
  },
  {
    id: "llc-acompanamiento",
    category: "llc",
    categoryLabel: "Estructuración Empresarial",
    tag: "Anual",
    amount: "$1175",
    amountValue: 1175,
    unit: "USD / año",
    title: "Acompañamiento Estratégico.",
    subtitle: "Renovación de LLC + advisory estratégico continuo.",
    body:
      "Mantén tu LLC vigente y crece con seguimiento estratégico y acompañamiento durante todo el año.",
    features: [
      "Renovación anual de LLC",
      "Annual report",
      "Seguimiento estratégico del negocio",
      "Sesiones de guidance según evolución empresarial",
      "Acompañamiento estratégico continuo",
      "Resolución de dudas generales sobre la estructura",
      "Orientación sobre operativa internacional",
      "Seguimiento básico de cumplimiento",
      "Recordatorios importantes y soporte general",
    ],
    cta: "Activa tu acompañamiento",
    whatsappText:
      "Hola HGG, quiero información sobre el Acompañamiento Estratégico anual.",
  },
  {
    id: "impulso-starter",
    category: "impulso",
    categoryLabel: "Impulso Digital 360",
    tag: "Starter",
    amount: "$770",
    amountValue: 770,
    unit: "USD / mes",
    title: "Para emprendedores que empiezan a escalar.",
    subtitle: "Captación inicial y validación · 50–100 leads/mes.",
    body:
      "Tu primera estructura digital activa: coaching, contenido SEO, email marketing y publicidad para empezar a generar leads desde el día uno.",
    features: [
      "1 sesión de Coaching Expansivo",
      "1 sesión de consultoría en ventas estratégicas",
      "4 artículos optimizados para SEO (600–800 palabras)",
      "2 secuencias de email marketing (5 correos cada una)",
      "1 flujo de automatización (bienvenida o agendamiento)",
      "1 campaña publicitaria mensual (Meta Ads o Google Ads)",
      "Ajustes quincenales de campañas y estrategia",
      "Reporte mensual de resultados",
    ],
    cta: "Empieza con Starter",
    whatsappText:
      "Hola HGG, quiero información sobre Impulso Digital 360 — Starter.",
  },
  {
    id: "impulso-pro",
    category: "impulso",
    categoryLabel: "Impulso Digital 360",
    tag: "PRO",
    amount: "$1,497",
    amountValue: 1497,
    unit: "USD / mes",
    title: "Para marcas que buscan crecer cada semana.",
    subtitle: "Crecimiento sostenido · 130–250 leads/mes.",
    body:
      "Más volumen de contenido, automatización completa, campañas duales y revisión semanal para crecer con ritmo y consistencia.",
    features: [
      "2 sesiones de Coaching Expansivo",
      "2 sesiones de consultoría en ventas estratégicas",
      "8 artículos optimizados para SEO (800–1,000 palabras)",
      "4 secuencias de email marketing",
      "Flujos de automatización para captación y seguimiento de leads",
      "2 campañas publicitarias activas (captación y remarketing)",
      "Revisión y ajustes semanales de campañas",
      "Call mensual de estrategia",
      "Reporte quincenal de resultados",
    ],
    cta: "Activa PRO",
    whatsappText:
      "Hola HGG, quiero información sobre Impulso Digital 360 — PRO.",
  },
  {
    id: "impulso-elite",
    category: "impulso",
    categoryLabel: "Impulso Digital 360",
    tag: "Elite",
    amount: "$2,197",
    amountValue: 2197,
    unit: "USD / mes",
    title: "Para negocios que quieren escalar con sistema.",
    subtitle: "Escalado con sistema · 300–450 leads/mes.",
    body:
      "Operación digital de alto volumen: SEO premium, CRM, tres campañas activas y reuniones estratégicas semanales para multiplicar resultados.",
    features: [
      "4 sesiones de Coaching Expansivo",
      "4 sesiones de consultoría en ventas estratégicas",
      "12 artículos SEO premium (1,000+ palabras)",
      "Secuencias completas de email marketing automatizadas",
      "Implementación de CRM para gestión de clientes potenciales",
      "3 campañas publicitarias activas (captación, remarketing y conversión)",
      "Reunión estratégica semanal",
      "Optimización continua de campañas",
      "Reporte mensual de impacto y evolución",
    ],
    cta: "Activa Elite",
    whatsappText:
      "Hola HGG, quiero información sobre Impulso Digital 360 — Elite.",
    highlight: true,
  },
  {
    id: "ia-sistemas",
    category: "ia",
    categoryLabel: "Inteligencia Artificial",
    tag: "A medida",
    amount: "Cotización",
    unit: "según alcance",
    title: "Sistemas con Inteligencia Artificial.",
    subtitle:
      "Webs inteligentes, automatizaciones, contenido generado con IA y campañas optimizadas — diseñado a medida para tu proyecto.",
    body:
      "Construimos sistemas digitales potenciados con IA: páginas web inteligentes, automatizaciones de procesos, generación de imágenes y videos, guiones para campañas y configuración de publicidad optimizada. Cada proyecto se cotiza según su alcance.",
    features: [
      "Páginas web con integración de IA",
      "Automatización de procesos y flujos de trabajo",
      "Generación de videos con IA",
      "Generación de imágenes a medida",
      "Creación de guiones para video",
      "Configuración de campañas publicitarias con IA",
      "Estrategia y arquitectura del sistema",
      "Cotización personalizada según alcance",
    ],
    cta: "Cuéntanos tu proyecto",
    whatsappText:
      "Hola HGG, quiero hablar sobre un proyecto con Inteligencia Artificial. Cuéntenme cómo funciona y qué información necesitan para cotizar.",
    customQuote: true,
  },
];

type Filter = "all" | "coaching" | "marca" | "llc" | "impulso" | "ia";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "coaching", label: "Coaching" },
  { id: "marca", label: "Marca" },
  { id: "llc", label: "LLC" },
  { id: "impulso", label: "Impulso 360" },
  { id: "ia", label: "IA" },
];

export function Tienda() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<CheckoutItem | null>(null);
  // Mostrar producto de prueba solo si la URL trae ?test=1
  // Ej: hgg.studio/tienda?test=1 → ves el producto de $1 al inicio
  const [showTest, setShowTest] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    setShowTest(p.get("test") === "1");
  }, []);

  const visibleProducts = useMemo(
    () => (showTest ? PRODUCTS : PRODUCTS.filter((p) => p.id !== "test-1usd")),
    [showTest]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return visibleProducts;
    return visibleProducts.filter((p) => p.category === filter);
  }, [filter, visibleProducts]);

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

          <div className="tienda-filters" role="tablist" aria-label="Filtrar productos">
            {FILTERS.map((f) => {
              const count =
                f.id === "all"
                  ? visibleProducts.length
                  : visibleProducts.filter((p) => p.category === f.id).length;
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
          {filtered.map((p) => {
            const isCheckout = !p.customQuote && typeof p.amountValue === "number";
            const wideClass =
              p.category === "llc"
                ? " tienda-item-wide"
                : p.customQuote
                  ? " tienda-item-full"
                  : "";
            return (
              <article
                key={p.id}
                className={`tienda-item${p.highlight ? " highlight" : ""}${wideClass}`}
              >
                {p.highlight && <span className="tienda-badge">Más elegido</span>}
                <div className="tienda-item-top">
                  <span className="tienda-item-cat">{p.categoryLabel}</span>
                  <span className="tienda-item-tag">— {p.tag}</span>
                </div>
                <h3 className="display tienda-item-title">{p.title}</h3>
                <p className="tienda-item-subtitle">{p.subtitle}</p>
                <p className="tienda-item-body">{p.body}</p>
                <ul className="tienda-item-features">
                  {p.features.map((f) => (
                    <li key={f}>
                      <CheckIcon />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="tienda-item-bottom">
                  <div className="tienda-item-price-row">
                    <div className="tienda-item-price">
                      <span className="amount">{p.amount}</span>
                      <span className="unit">{p.unit}</span>
                    </div>
                  </div>
                  {isCheckout ? (
                    <button
                      type="button"
                      className="tienda-item-cta"
                      onClick={() =>
                        setSelected({
                          productId: p.id,
                          title: p.title.replace(/\.$/, ""),
                          amount: p.amountValue!,
                          currency: p.currency,
                        })
                      }
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
