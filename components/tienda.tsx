"use client";

import { useMemo, useState } from "react";
import { SITE } from "@/lib/config";
import type { CheckoutItem } from "@/lib/payments";
import { CheckoutModal } from "./checkout-modal";
import { ArrowRightIcon, CheckIcon } from "./icons";
import { Reveal } from "./reveal";

type Product = {
  id: string;
  category: "coaching" | "marca" | "llc";
  categoryLabel: string;
  tag: string;
  amount: string;
  amountValue: number;
  currency?: string; // ISO 4217 — si no se pasa, usa NEXT_PUBLIC_PAYMENT_CURRENCY
  unit: string;
  title: string;
  subtitle: string;
  body: string;
  features: string[];
  cta: string;
  whatsappText: string;
  highlight?: boolean;
};

function waLink(text: string) {
  return `https://wa.me/${SITE.phone.e164}?text=${encodeURIComponent(text)}`;
}

const PRODUCTS: Product[] = [
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
    highlight: true,
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
  },
  {
    id: "llc-structuring",
    category: "llc",
    categoryLabel: "Estructuración Empresarial",
    tag: "Structuring",
    amount: "€997",
    amountValue: 997,
    currency: "EUR",
    unit: "EUR",
    title: "Strategic Structuring Program.",
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
    cta: "Empieza el programa",
    whatsappText:
      "Hola HGG, quiero información sobre el Strategic Structuring Program.",
  },
  {
    id: "llc-advisory-annual",
    category: "llc",
    categoryLabel: "Estructuración Empresarial",
    tag: "Annual",
    amount: "€997",
    amountValue: 997,
    currency: "EUR",
    unit: "EUR / año",
    title: "Strategic Advisory Annual.",
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
    cta: "Activa tu advisory",
    whatsappText:
      "Hola HGG, quiero información sobre el Strategic Advisory Annual.",
  },
];

type Filter = "all" | "coaching" | "marca" | "llc";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "coaching", label: "Coaching" },
  { id: "marca", label: "Marca" },
  { id: "llc", label: "LLC" },
];

export function Tienda() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<CheckoutItem | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return PRODUCTS;
    return PRODUCTS.filter((p) => p.category === filter);
  }, [filter]);

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
                  ? PRODUCTS.length
                  : PRODUCTS.filter((p) => p.category === f.id).length;
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
          {filtered.map((p) => (
            <article
              key={p.id}
              className={`tienda-item${p.highlight ? " highlight" : ""}`}
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
                <button
                  type="button"
                  className="tienda-item-cta"
                  onClick={() =>
                    setSelected({
                      productId: p.id,
                      title: p.title.replace(/\.$/, ""),
                      amount: p.amountValue,
                      currency: p.currency,
                    })
                  }
                >
                  {p.cta}
                  <ArrowRightIcon />
                </button>
                <a
                  href={waLink(p.whatsappText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tienda-item-alt"
                >
                  ¿Prefieres consultar por WhatsApp?
                </a>
              </div>
            </article>
          ))}
        </Reveal>

        {filtered.length === 0 && (
          <p className="tienda-empty">No hay productos en esta categoría.</p>
        )}
      </div>

      <CheckoutModal item={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
