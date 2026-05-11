import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-guard";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/demo — carga datos ficticios (vacia primero)
// DELETE /api/admin/demo — vacia todas las tablas (excepto admin_users)

function dateMonthsAgo(monthsBack: number, day = 15): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  d.setDate(day);
  return d.toISOString().slice(0, 10);
}
function dateThisMonth(day: number): string {
  const d = new Date();
  d.setDate(day);
  return d.toISOString().slice(0, 10);
}

const DEMO_SALES = [
  { date: dateThisMonth(8),  service_id: "marca-360", service_title: "Tu Marca con Huella 360", client_name: "Carolina Jiménez", client_email: "carolina.j@gmail.com", client_phone: "+34 612 345 678", origin: "Instagram",     notes: "Coach de bienestar, busca relanzar marca.", amount: 1900, status: "Aprobado" },
  { date: dateThisMonth(5),  service_id: "coaching-5", service_title: "Paquete 5 Sesiones",      client_name: "Andrés Romero",   client_email: "andres.romero@outlook.com", client_phone: "+57 320 444 1212", origin: "WhatsApp",  notes: "Recomendado por Tatiana.",                  amount: 210,  status: "Aprobado" },
  { date: dateThisMonth(2),  service_id: "marca-pro", service_title: "Tu Marca con Huella PRO", client_name: "Lucía Méndez",     client_email: "lucia@estudiomendez.com",   client_phone: "+34 699 112 233", origin: "Web",       notes: "Arquitecta. Necesita web + identidad.",     amount: 870,  status: "Aprobado" },
  { date: dateMonthsAgo(1, 22), service_id: "llc-estructura", service_title: "Estructura Global", client_name: "Daniel Domínguez", client_email: "daniel@dseguros.com",      client_phone: "+1 305 555 0182",  origin: "Recomendación", notes: "Cliente USA. Apertura LLC + estrategia.", amount: 1175, status: "Aprobado" },
  { date: dateMonthsAgo(1, 12), service_id: "impulso-pro",   service_title: "Impulso 360 PRO",   client_name: "Natha Sánchez",   client_email: "natha.s@marketingco.com",   client_phone: "+57 311 200 5544", origin: "Instagram",  notes: "Mensual. Renovación automática.",         amount: 1497, status: "Aprobado" },
  { date: dateMonthsAgo(2, 18), service_id: "coaching-3",     service_title: "Paquete 3 Sesiones", client_name: "Valentina Tafur", client_email: "valen.tafur@gmail.com",     client_phone: null,             origin: "Directo",     notes: null,                                       amount: 140,  status: "Aprobado" },
  { date: dateMonthsAgo(2, 5),  service_id: "marca-esencial", service_title: "Tu Marca con Huella", client_name: "Evelyn Rivas",   client_email: "evelyn@evelynrivas.com",    client_phone: "+58 414 998 7766", origin: "Recomendación", notes: null,                                  amount: 350,  status: "Aprobado" },
  { date: dateMonthsAgo(3, 14), service_id: "marca-360",     service_title: "Tu Marca con Huella 360", client_name: "Tatiana Acosta", client_email: "tatiana@coaching.es", client_phone: "+34 655 778 990", origin: "WhatsApp", notes: "Coach internacional. Marca personal premium.", amount: 1900, status: "Aprobado" },
  { date: dateMonthsAgo(3, 3),  service_id: "impulso-elite", service_title: "Impulso 360 Elite",   client_name: "Clínica Vital Holística", client_email: "ceo@vitalholistica.com", client_phone: "+34 911 220 011", origin: "Web", notes: "Mensual. Lleva 3 meses activo.", amount: 2197, status: "Aprobado" },
  { date: dateMonthsAgo(4, 20), service_id: "coaching-individual", service_title: "Sesión Individual", client_name: "Roberto Núñez", client_email: "rnunez@protonmail.com", client_phone: null, origin: "Instagram", notes: null, amount: 50, status: "Aprobado" },
  { date: dateMonthsAgo(5, 10), service_id: "marca-pro",     service_title: "Tu Marca con Huella PRO", client_name: "Sofía Aguilar", client_email: "sofia.aguilar@casasol.com", client_phone: "+34 644 332 211", origin: "Recomendación", notes: null, amount: 870, status: "Aprobado" },
  { date: dateMonthsAgo(6, 28), service_id: "llc-acompanamiento", service_title: "Acompañamiento Estratégico LLC", client_name: "Mateo Cifuentes", client_email: "mateo@m-cif.com", client_phone: null, origin: "Directo", notes: "Renovación anual.", amount: 1175, status: "Aprobado" },
];

const DEMO_EXPENSES = [
  { date: dateThisMonth(1),    description: "Hosting Vercel Pro",          category: "Infraestructura", amount: 20 },
  { date: dateThisMonth(3),    description: "Publicidad Meta Ads",         category: "Marketing",       amount: 240 },
  { date: dateThisMonth(7),    description: "Google Workspace",            category: "SaaS",            amount: 12 },
  { date: dateThisMonth(10),   description: "Diseñador freelance",         category: "Servicios",       amount: 380 },
  { date: dateMonthsAgo(1, 5), description: "Stripe + PayPal fees",        category: "Comisiones",      amount: 96 },
  { date: dateMonthsAgo(1, 18),description: "Publicidad LinkedIn",         category: "Marketing",       amount: 180 },
  { date: dateMonthsAgo(2, 8), description: "Notion Plus team",            category: "SaaS",            amount: 32 },
  { date: dateMonthsAgo(2, 22),description: "Editor de video",             category: "Servicios",       amount: 250 },
  { date: dateMonthsAgo(3, 14),description: "Annual report LLC",           category: "Legal",           amount: 110 },
  { date: dateMonthsAgo(4, 10),description: "Curso de actualización",      category: "Formación",       amount: 199 },
];

const DEMO_VENDORS = [
  { name: "María Fernanda López", initials: "ML", specialty: "Coaching · Marca", phone: "+34 622 110 884", email: "maria@hgg.studio",   active: true },
  { name: "Joaquín Restrepo",     initials: "JR", specialty: "LLC · USA",        phone: "+1 786 555 9032", email: "joaquin@hgg.studio", active: true },
  { name: "Ana Velasco",          initials: "AV", specialty: "Impulso 360",      phone: "+34 611 778 991", email: "ana@hgg.studio",     active: true },
  { name: "Esteban Calderón",     initials: "EC", specialty: "IA · Sistemas",    phone: "+57 312 003 8842", email: "esteban@hgg.studio", active: false },
];

const DEMO_REQUESTS = [
  {
    type: "manual_sale",
    payload: { cliente: "Pablo Henao", servicio: "Paquete 5 Sesiones", importe: 210, vendedor: "María Fernanda López" },
    status: "pendiente",
  },
  {
    type: "vendor",
    payload: { nombre: "Diana Castaño", especialidad: "Coaching musical", telefono: "+57 313 222 9090" },
    status: "pendiente",
  },
  {
    type: "transaction",
    payload: { tipo: "Reembolso parcial", cliente: "Andrés Romero", importe: 70, motivo: "Cancelación 1 sesión" },
    status: "pendiente",
  },
];

export async function POST() {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const sb = getSupabaseAdmin();

  // Vaciar tablas (orden no importa al no haber FKs entre ellas)
  await sb.from("manual_sales").delete().neq("id", "");
  await sb.from("expenses").delete().neq("id", "");
  await sb.from("vendors").delete().neq("id", "");
  await sb.from("approval_requests").delete().neq("id", "");

  const now = Date.now();
  const sales = DEMO_SALES.map((s, i) => ({ id: `sale_demo_${now}_${i}`, ...s }));
  const exps = DEMO_EXPENSES.map((e, i) => ({ id: `exp_demo_${now}_${i}`, ...e }));
  const vends = DEMO_VENDORS.map((v, i) => ({ id: `vd_demo_${now}_${i}`, ...v }));
  const reqs = DEMO_REQUESTS.map((r, i) => ({ id: `req_demo_${now}_${i}`, ...r }));

  const r1 = await sb.from("manual_sales").insert(sales);
  const r2 = await sb.from("expenses").insert(exps);
  const r3 = await sb.from("vendors").insert(vends);
  const r4 = await sb.from("approval_requests").insert(reqs);

  const errors = [r1, r2, r3, r4].filter((r) => r.error).map((r) => r.error?.message);
  if (errors.length) {
    console.error("[api/admin/demo POST]", errors);
    return NextResponse.json({ error: errors.join(" / ") }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    inserted: { sales: sales.length, expenses: exps.length, vendors: vends.length, requests: reqs.length },
  });
}

export async function DELETE() {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const sb = getSupabaseAdmin();
  await sb.from("manual_sales").delete().neq("id", "");
  await sb.from("expenses").delete().neq("id", "");
  await sb.from("vendors").delete().neq("id", "");
  await sb.from("approval_requests").delete().neq("id", "");
  // OJO: no borramos admin_users — esos son cuentas reales

  return NextResponse.json({ ok: true });
}
