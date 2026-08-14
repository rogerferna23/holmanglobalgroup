// Catalogo HGG centralizado para uso en /admin.
// Se mantiene paralelo al de components/tienda.tsx y a la tabla `products` de
// Supabase (ver supabase/migrations). Precios en USD (Brief HGG, jul 2026).
// Si en el futuro se quiere unificar, basta con que tienda.tsx importe de aqui.

export type AdminProduct = {
  id: string;
  category: "coaching" | "marca" | "web" | "llc" | "impulso" | "ia" | "nexco";
  categoryLabel: string;
  tag: string;
  title: string;
  basePrice: number; // 0 = a cotizar
  unit: string;
  recurring: boolean;
  highlight?: boolean;
};

export const ADMIN_PRODUCTS: AdminProduct[] = [
  // ============================================
  // TEMPORAL — Producto de prueba $1
  // Solo visible si NEXT_PUBLIC_SHOW_TEST_PRODUCT=true
  // Eliminar cuando ya hayas validado los pagos en live.
  // ============================================
  {
    id: "test-1usd",
    category: "coaching",
    categoryLabel: "Prueba",
    tag: "Test",
    title: "Producto de prueba (no comprar)",
    basePrice: 1,
    unit: "USD",
    recurring: false,
  },
  // Programa Sentido (Eco) — 1 color HGG.
  // Brief 13-ago-2026: sustituye a Sesión Individual / Paquete 5 / Paquete 10,
  // que quedan desactivados en la tabla `products` (no borrados, para conservar
  // el historial de transacciones que los referencie).
  {
    id: "sentido-starter",
    category: "coaching",
    categoryLabel: "Programa Sentido",
    tag: "Starter",
    title: "Programa Sentido Starter",
    basePrice: 397,
    unit: "USD",
    recurring: false,
  },
  {
    id: "sentido-pro",
    category: "coaching",
    categoryLabel: "Programa Sentido",
    tag: "Pro",
    title: "Programa Sentido Pro",
    basePrice: 747,
    unit: "USD",
    recurring: false,
  },
  {
    id: "sentido-elite",
    category: "coaching",
    categoryLabel: "Programa Sentido",
    tag: "Elite",
    title: "Programa Sentido Elite",
    basePrice: 1097,
    unit: "USD",
    recurring: false,
  },
  // Marca con Huella (Fuego · Marca)
  {
    id: "marca-esencial",
    category: "marca",
    categoryLabel: "Marca con Huella",
    tag: "Starter",
    title: "Marca con Huella Starter",
    basePrice: 797,
    unit: "USD",
    recurring: false,
  },
  {
    id: "marca-pro",
    category: "marca",
    categoryLabel: "Marca con Huella",
    tag: "Pro",
    title: "Marca con Huella Pro",
    basePrice: 1597,
    unit: "USD",
    recurring: false,
  },
  {
    id: "marca-360",
    category: "marca",
    categoryLabel: "Marca con Huella",
    tag: "Elite",
    title: "Marca con Huella Elite",
    basePrice: 3000,
    unit: "USD",
    recurring: false,
  },
  // Sitios Web y Sistemas Digitales (Huella · Sistema) — color Delegaweb
  {
    id: "web-landing",
    category: "web",
    categoryLabel: "Sitios Web",
    tag: "Landing Page",
    title: "Landing Page",
    basePrice: 648,
    unit: "USD",
    recurring: false,
  },
  {
    id: "web-panel",
    category: "web",
    categoryLabel: "Sitios Web",
    tag: "Panel de Administración",
    title: "Panel de Administración",
    basePrice: 1080,
    unit: "USD",
    recurring: false,
  },
  {
    id: "web-ecommerce",
    category: "web",
    categoryLabel: "Sitios Web",
    tag: "Ecommerce Completo",
    title: "Ecommerce Completo",
    basePrice: 2160,
    unit: "USD",
    recurring: false,
  },
  // DelegaWork 360 (Huella · Sistema) — 3 colores HGG + Delegaweb + Nexco
  {
    id: "impulso-starter",
    category: "impulso",
    categoryLabel: "DelegaWork 360",
    tag: "Starter",
    title: "DelegaWork 360 Starter",
    basePrice: 997,
    unit: "USD / mes",
    recurring: true,
  },
  {
    id: "impulso-pro",
    category: "impulso",
    categoryLabel: "DelegaWork 360",
    tag: "Pro",
    title: "DelegaWork 360 Pro",
    basePrice: 1797,
    unit: "USD / mes",
    recurring: true,
  },
  {
    id: "impulso-elite",
    category: "impulso",
    categoryLabel: "DelegaWork 360",
    tag: "Elite",
    title: "DelegaWork 360 Elite",
    basePrice: 3000,
    unit: "USD / mes",
    recurring: true,
    highlight: true,
  },
  // Estructuración Empresarial (LLC) — 1 color HGG
  {
    id: "llc-estructura",
    category: "llc",
    categoryLabel: "Estructuración Empresarial",
    tag: "Creación y Estrategia",
    title: "LLC Global — Creación y Estrategia",
    basePrice: 1175,
    unit: "USD",
    recurring: false,
  },
  {
    id: "llc-acompanamiento",
    category: "llc",
    categoryLabel: "Estructuración Empresarial",
    tag: "Renovación Anual",
    title: "LLC Global — Renovación Anual",
    basePrice: 1175,
    unit: "USD / año",
    recurring: true,
  },
  // Sistemas con IA — color Delegaweb
  {
    id: "ia-sistemas",
    category: "ia",
    categoryLabel: "Inteligencia Artificial",
    tag: "A medida",
    title: "Sistemas con IA",
    basePrice: 0,
    unit: "Cotización",
    recurring: false,
  },
  // Nexco — color Nexco #CB9339
  {
    id: "nexco-config",
    category: "nexco",
    categoryLabel: "Nexco",
    tag: "Configuración de Campaña",
    title: "Configuración de Campaña",
    basePrice: 300,
    unit: "USD",
    recurring: false,
  },
  {
    id: "nexco-redes",
    category: "nexco",
    categoryLabel: "Nexco",
    tag: "Gestión de Redes Sociales",
    title: "Gestión de Redes Sociales",
    basePrice: 600,
    unit: "USD / mes",
    recurring: true,
  },
];

export function formatProductPrice(p: AdminProduct): string {
  if (p.basePrice <= 0) return "A cotizar";
  return `$${p.basePrice.toLocaleString("en-US")}`;
}
