import { periodoNuevo, vacio, type Fila, type Periodo } from "@/lib/finanzas";

/**
 * Datos de EJEMPLO para /ecos/preview/finanzas (solo `pnpm dev`). No son los
 * números de Holman: sirven para ver la pantalla llena y probar el Excel.
 */
const p: Periodo = {
  ...periodoNuevo("2026-11-01"),
  id: "fin_demo",
  saldo_inicial: 1_200_000,
  tasa: 4000,
  pct_comision: 15,
  pct_cobro: 60,
};
p.semanas[0] = { ...p.semanas[0], personales_real: 650_000, ahorro_plan: 100_000, ahorro_real: 50_000 };
p.semanas[1] = { ...p.semanas[1], personales_real: 720_000, ahorro_plan: 100_000 };

let orden = 0;
const fila = <T,>(hoja: Fila["hoja"], datos: T): Fila<T> => ({ id: `demo_${orden}`, periodo_id: p.id, hoja, orden: orden++, datos });

export const FINANZAS_MOCK: { periodos: Periodo[]; filas: Fila[] } = {
  periodos: [p],
  filas: [
    fila("embajadores", { nombre: "Ana Ejemplo", meta: 4_000_000, pct: 10 }),
    fila("embajadores", { nombre: "Luis Ejemplo", meta: 2_000_000, pct: 10 }),
    fila("ventas", { ...vacio("ventas", "proyectada"), fecha: "2026-11-03", servicio: "Marca con Huella", usd: 1000, tasa: 4000, anticipo: 2_000_000, fecha_anticipo: "2026-11-03", fecha_estimada: "2026-11-20", vendedor: "Ana Ejemplo" }),
    fila("ventas", { ...vacio("ventas", "proyectada"), fecha: "2026-11-10", servicio: "Programa Fundador", usd: 100, tasa: 4000, vendedor: "Holman" }),
    fila("ventas", { ...vacio("ventas", "real"), fecha: "2026-11-04", cliente: "Cliente de ejemplo", servicio: "Marca con Huella", usd: 1000, tasa: 4000, anticipo: 2_000_000, fecha_anticipo: "2026-11-04", fecha_estimada: "2026-11-25", vendedor: "Ana Ejemplo", closer: "Closer ejemplo", pct_closer: 10, de_proyeccion: "demo_2" }),
    fila("ventas", { ...vacio("ventas", "real"), fecha: "2026-10-25", cliente: "Cliente de octubre", servicio: "Sesiones de coaching", cop_directo: 1_500_000, anticipo: 500_000, fecha_anticipo: "2026-10-25", saldo_cobrado: 1_000_000, fecha_saldo: "2026-11-09", vendedor: "Holman" }),
    fila("costos", { ...vacio("costos"), concepto: "Herramienta en dólares (ejemplo)", categoria: "Herramientas", moneda: "USD", presupuesto: 25, real: 25, fecha: "2026-11-10", fijo: "Fijo" }),
    fila("costos", { ...vacio("costos"), concepto: "Pauta (ejemplo)", categoria: "Otros", moneda: "COP", presupuesto: 600_000, real: 750_000, fecha: "2026-11-15", fijo: "Variable" }),
    fila("costos", { ...vacio("costos"), concepto: "Contador (ejemplo)", categoria: "Impuestos", moneda: "COP", presupuesto: 100_000 }),
    fila("deudas", { ...vacio("deudas"), entidad: "Tarjeta (ejemplo)", tipo: "Tarjeta de crédito", saldo: 5_000_000, cuota: 300_000, tasa: 2.5, fecha_limite: "2026-11-15", estado: "Al día", abono_plan: 200_000, pagado_real: 300_000 }),
    fila("deudas", { ...vacio("deudas"), entidad: "Banco (ejemplo)", tipo: "Libre inversión", saldo: 2_000_000, minimo: 100_000, tasa: 1.8, estado: "En mora" }),
  ],
};
