"use client";

// Datos ficticios para mostrar como se ve el panel con informacion real.
// El usuario lo carga con un boton desde Configuracion y puede limpiarlo cuando quiera.

import {
  newId,
  type ApprovalRequest,
  type Expense,
  type ManualSale,
  type Vendor,
} from "@/lib/admin-store";

const KEYS = {
  sales: "hgg_admin_manual_sales",
  expenses: "hgg_admin_expenses",
  admins: "hgg_admin_users",
  vendors: "hgg_admin_vendors",
  requests: "hgg_admin_requests",
};

function dateMonthsAgo(monthsBack: number, day = 15): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  d.setDate(day);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

function dateThisMonth(day: number): string {
  const d = new Date();
  d.setDate(day);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

const ORIGINS = ["Instagram", "WhatsApp", "Recomendación", "Web", "Directo"];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

export function loadDemoData() {
  // ----- VENTAS MANUALES -----
  const sales: ManualSale[] = [
    {
      id: newId("sale"), date: dateThisMonth(8),
      serviceId: "marca-360", serviceTitle: "Tu Marca con Huella 360",
      clientName: "Carolina Jiménez", clientEmail: "carolina.j@gmail.com",
      clientPhone: "+34 612 345 678", origin: "Instagram",
      notes: "Coach de bienestar, busca relanzar marca.",
      amount: 1900, status: "Aprobado",
    },
    {
      id: newId("sale"), date: dateThisMonth(5),
      serviceId: "coaching-5", serviceTitle: "Paquete 5 Sesiones",
      clientName: "Andrés Romero", clientEmail: "andres.romero@outlook.com",
      clientPhone: "+57 320 444 1212", origin: "WhatsApp",
      notes: "Recomendado por Tatiana.",
      amount: 210, status: "Aprobado",
    },
    {
      id: newId("sale"), date: dateThisMonth(2),
      serviceId: "marca-pro", serviceTitle: "Tu Marca con Huella PRO",
      clientName: "Lucía Méndez", clientEmail: "lucia@estudiomendez.com",
      clientPhone: "+34 699 112 233", origin: "Web",
      notes: "Arquitecta. Necesita web + identidad.",
      amount: 870, status: "Aprobado",
    },
    {
      id: newId("sale"), date: dateMonthsAgo(1, 22),
      serviceId: "llc-estructura", serviceTitle: "Estructura Global",
      clientName: "Daniel Domínguez", clientEmail: "daniel@dseguros.com",
      clientPhone: "+1 305 555 0182", origin: "Recomendación",
      notes: "Cliente USA. Apertura LLC + estrategia.",
      amount: 1175, status: "Aprobado",
    },
    {
      id: newId("sale"), date: dateMonthsAgo(1, 12),
      serviceId: "impulso-pro", serviceTitle: "Impulso 360 PRO",
      clientName: "Natha Sánchez", clientEmail: "natha.s@marketingco.com",
      clientPhone: "+57 311 200 5544", origin: "Instagram",
      notes: "Mensual. Renovación automática.",
      amount: 1497, status: "Aprobado",
    },
    {
      id: newId("sale"), date: dateMonthsAgo(2, 18),
      serviceId: "coaching-3", serviceTitle: "Paquete 3 Sesiones",
      clientName: "Valentina Tafur", clientEmail: "valen.tafur@gmail.com",
      origin: "Directo",
      amount: 140, status: "Aprobado",
    },
    {
      id: newId("sale"), date: dateMonthsAgo(2, 5),
      serviceId: "marca-esencial", serviceTitle: "Tu Marca con Huella",
      clientName: "Evelyn Rivas", clientEmail: "evelyn@evelynrivas.com",
      clientPhone: "+58 414 998 7766", origin: "Recomendación",
      amount: 350, status: "Aprobado",
    },
    {
      id: newId("sale"), date: dateMonthsAgo(3, 14),
      serviceId: "marca-360", serviceTitle: "Tu Marca con Huella 360",
      clientName: "Tatiana Acosta", clientEmail: "tatiana@coaching.es",
      clientPhone: "+34 655 778 990", origin: "WhatsApp",
      notes: "Coach internacional. Marca personal premium.",
      amount: 1900, status: "Aprobado",
    },
    {
      id: newId("sale"), date: dateMonthsAgo(3, 3),
      serviceId: "impulso-elite", serviceTitle: "Impulso 360 Elite",
      clientName: "Clínica Vital Holística", clientEmail: "ceo@vitalholistica.com",
      clientPhone: "+34 911 220 011", origin: "Web",
      notes: "Mensual. Lleva 3 meses activo.",
      amount: 2197, status: "Aprobado",
    },
    {
      id: newId("sale"), date: dateMonthsAgo(4, 20),
      serviceId: "coaching-individual", serviceTitle: "Sesión Individual",
      clientName: "Roberto Núñez", clientEmail: "rnunez@protonmail.com",
      origin: "Instagram",
      amount: 50, status: "Aprobado",
    },
    {
      id: newId("sale"), date: dateMonthsAgo(5, 10),
      serviceId: "marca-pro", serviceTitle: "Tu Marca con Huella PRO",
      clientName: "Sofía Aguilar", clientEmail: "sofia.aguilar@casasol.com",
      clientPhone: "+34 644 332 211", origin: "Recomendación",
      amount: 870, status: "Aprobado",
    },
    {
      id: newId("sale"), date: dateMonthsAgo(6, 28),
      serviceId: "llc-acompanamiento", serviceTitle: "Acompañamiento Estratégico LLC",
      clientName: "Mateo Cifuentes", clientEmail: "mateo@m-cif.com",
      origin: "Directo",
      notes: "Renovación anual.",
      amount: 1175, status: "Aprobado",
    },
  ];

  // ----- GASTOS -----
  const expenses: Expense[] = [
    { id: newId("exp"), date: dateThisMonth(1),  description: "Hosting Vercel Pro", category: "Infraestructura", amount: 20 },
    { id: newId("exp"), date: dateThisMonth(3),  description: "Publicidad Meta Ads", category: "Marketing", amount: 240 },
    { id: newId("exp"), date: dateThisMonth(7),  description: "Google Workspace", category: "SaaS", amount: 12 },
    { id: newId("exp"), date: dateThisMonth(10), description: "Diseñador freelance", category: "Servicios", amount: 380 },
    { id: newId("exp"), date: dateMonthsAgo(1, 5),  description: "Stripe + PayPal fees", category: "Comisiones", amount: 96 },
    { id: newId("exp"), date: dateMonthsAgo(1, 18), description: "Publicidad LinkedIn",  category: "Marketing",   amount: 180 },
    { id: newId("exp"), date: dateMonthsAgo(2, 8),  description: "Notion Plus team",     category: "SaaS",         amount: 32 },
    { id: newId("exp"), date: dateMonthsAgo(2, 22), description: "Editor de video",      category: "Servicios",    amount: 250 },
    { id: newId("exp"), date: dateMonthsAgo(3, 14), description: "Agencia tributaria USA — annual report", category: "Legal", amount: 110 },
    { id: newId("exp"), date: dateMonthsAgo(4, 10), description: "Curso de actualización", category: "Formación",  amount: 199 },
  ];

  // ----- VENDEDORES -----
  const vendors: Vendor[] = [
    { id: newId("vd"), name: "María Fernanda López", initials: "ML", specialty: "Coaching · Marca", phone: "+34 622 110 884", email: "maria@hgg.studio", active: true },
    { id: newId("vd"), name: "Joaquín Restrepo",     initials: "JR", specialty: "LLC · USA",        phone: "+1 786 555 9032", email: "joaquin@hgg.studio", active: true },
    { id: newId("vd"), name: "Ana Velasco",          initials: "AV", specialty: "Impulso 360",      phone: "+34 611 778 991", email: "ana@hgg.studio",      active: true },
    { id: newId("vd"), name: "Esteban Calderón",     initials: "EC", specialty: "IA · Sistemas",    phone: "+57 312 003 8842", email: "esteban@hgg.studio", active: false },
  ];

  // ----- SOLICITUDES PENDIENTES -----
  const requests: ApprovalRequest[] = [
    {
      id: newId("req"),
      type: "manual_sale",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      status: "pendiente",
      payload: {
        cliente: "Pablo Henao",
        servicio: "Paquete 5 Sesiones",
        importe: 210,
        vendedor: "María Fernanda López",
      },
    },
    {
      id: newId("req"),
      type: "vendor",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      status: "pendiente",
      payload: {
        nombre: "Diana Castaño",
        especialidad: "Coaching musical",
        telefono: "+57 313 222 9090",
      },
    },
    {
      id: newId("req"),
      type: "transaction",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      status: "pendiente",
      payload: {
        tipo: "Reembolso parcial",
        cliente: "Andrés Romero",
        importe: 70,
        motivo: "Cancelación 1 sesión",
      },
    },
  ];

  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.sales, JSON.stringify(sales));
  localStorage.setItem(KEYS.expenses, JSON.stringify(expenses));
  localStorage.setItem(KEYS.vendors, JSON.stringify(vendors));
  localStorage.setItem(KEYS.requests, JSON.stringify(requests));

  // Notificar a los hooks abiertos
  for (const k of Object.values(KEYS)) {
    window.dispatchEvent(new CustomEvent("hgg-store-change", { detail: { key: k } }));
  }
}

export function clearAllData() {
  if (typeof window === "undefined") return;
  for (const k of Object.values(KEYS)) {
    localStorage.removeItem(k);
    window.dispatchEvent(new CustomEvent("hgg-store-change", { detail: { key: k } }));
  }
}
