// Catalogo HGG centralizado para uso en /admin.
// Se mantiene paralelo al de components/tienda.tsx para no romper el codigo
// existente. Si en el futuro se quiere unificar, basta con que tienda.tsx
// importe desde aqui.

export type AdminProduct = {
  id: string;
  category: "coaching" | "marca" | "llc" | "impulso" | "ia";
  categoryLabel: string;
  tag: string;
  title: string;
  basePrice: number; // 0 = a cotizar
  unit: string;
  recurring: boolean;
  highlight?: boolean;
};

export const ADMIN_PRODUCTS: AdminProduct[] = [
  // Coaching
  {
    id: "coaching-individual",
    category: "coaching",
    categoryLabel: "Coaching",
    tag: "Individual",
    title: "Sesión Individual",
    basePrice: 50,
    unit: "USD",
    recurring: false,
  },
  {
    id: "coaching-3",
    category: "coaching",
    categoryLabel: "Coaching",
    tag: "3 sesiones",
    title: "Paquete 3 Sesiones",
    basePrice: 140,
    unit: "USD",
    recurring: false,
  },
  {
    id: "coaching-5",
    category: "coaching",
    categoryLabel: "Coaching",
    tag: "5 sesiones",
    title: "Paquete 5 Sesiones",
    basePrice: 210,
    unit: "USD",
    recurring: false,
  },
  // Marca
  {
    id: "marca-esencial",
    category: "marca",
    categoryLabel: "Construcción de Marca",
    tag: "Esencial",
    title: "Tu Marca con Huella",
    basePrice: 350,
    unit: "USD",
    recurring: false,
  },
  {
    id: "marca-pro",
    category: "marca",
    categoryLabel: "Construcción de Marca",
    tag: "PRO",
    title: "Tu Marca con Huella PRO",
    basePrice: 870,
    unit: "USD",
    recurring: false,
  },
  {
    id: "marca-360",
    category: "marca",
    categoryLabel: "Construcción de Marca",
    tag: "360",
    title: "Tu Marca con Huella 360",
    basePrice: 1900,
    unit: "USD",
    recurring: false,
    highlight: true,
  },
  // LLC
  {
    id: "llc-estructura",
    category: "llc",
    categoryLabel: "Estructuración Empresarial",
    tag: "Estructura",
    title: "Estructura Global",
    basePrice: 1175,
    unit: "USD",
    recurring: false,
  },
  {
    id: "llc-acompanamiento",
    category: "llc",
    categoryLabel: "Estructuración Empresarial",
    tag: "Anual",
    title: "Acompañamiento Estratégico LLC",
    basePrice: 1175,
    unit: "USD / año",
    recurring: true,
  },
  // Impulso 360
  {
    id: "impulso-starter",
    category: "impulso",
    categoryLabel: "Impulso Digital 360",
    tag: "Starter",
    title: "Impulso 360 Starter",
    basePrice: 770,
    unit: "USD / mes",
    recurring: true,
  },
  {
    id: "impulso-pro",
    category: "impulso",
    categoryLabel: "Impulso Digital 360",
    tag: "PRO",
    title: "Impulso 360 PRO",
    basePrice: 1497,
    unit: "USD / mes",
    recurring: true,
  },
  {
    id: "impulso-elite",
    category: "impulso",
    categoryLabel: "Impulso Digital 360",
    tag: "Elite",
    title: "Impulso 360 Elite",
    basePrice: 2197,
    unit: "USD / mes",
    recurring: true,
    highlight: true,
  },
  // IA
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
];

export function formatProductPrice(p: AdminProduct): string {
  if (p.basePrice <= 0) return "A cotizar";
  return `$${p.basePrice.toLocaleString("en-US")}`;
}
