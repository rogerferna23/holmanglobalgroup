/**
 * Finanzas: la plantilla financiera y comercial de Holman en Torre → Finanzas
 * (oct 2026). Planifica cada mes (proyección) y registra lo que pasó (real)
 * para medir si se cumplió. Tablas `hgg_fin_periodos` y `hgg_fin_filas`
 * (20261030_hgg_finanzas.sql); cada quien ve solo las suyas.
 *
 * Reglas que no se negocian (las mismas del Excel que se descarga):
 * - Una venta se escribe UNA vez. Vendido ≠ cobrado ≠ pendiente.
 * - El saldo real cuenta solo dinero que ya entró; lo previsto va aparte.
 * - Las comisiones salen de las ventas, no de Costos, y se pagan cuando entra
 *   el dinero de esa venta.
 * - Nada se inventa: lo que falta se señala.
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { newId } from "@/lib/admin-store";

/* ------------------------------------------------------------------ Tipos */

export type Escenario = "plan" | "real";
export type Hoja = "embajadores" | "ventas" | "costos" | "deudas";
type Num = number | null;
type Fecha = string | null;

export type Embajador = { nombre: string; meta: Num; pct: Num };

export type Venta = {
  tipo: "proyectada" | "real";
  fecha: Fecha;
  cliente: string;
  servicio: string;
  usd: Num;
  tasa: Num;
  cop_directo: Num;
  anticipo: Num;
  fecha_anticipo: Fecha;
  saldo_cobrado: Num;
  fecha_saldo: Fecha;
  fecha_estimada: Fecha;
  vendedor: string;
  closer: string;
  pct_closer: Num;
  /** Si es la venta real de una proyectada, el id de la proyectada. */
  de_proyeccion?: string | null;
};

export const CATEGORIAS = [
  "Herramientas", "Proveedores", "Entrega de servicios", "Impuestos", "Comisiones (pasarelas y bancos)", "Otros",
] as const;

export type Costo = {
  concepto: string;
  categoria: string;
  proveedor: string;
  moneda: "COP" | "USD";
  presupuesto: Num;
  real: Num;
  tasa: Num;
  fecha: Fecha;
  fijo: "" | "Fijo" | "Variable";
  notas: string;
};

export const ESTADOS_DEUDA = ["Al día", "En mora", "En negociación", "Pagada"] as const;
export const TIPOS_DEUDA = ["Tarjeta de crédito", "Crédito de consumo", "Libre inversión", "Crédito con persona", "Otro"] as const;

export type Deuda = {
  entidad: string;
  tipo: string;
  saldo: Num;
  cuota: Num;
  minimo: Num;
  /** Interés MENSUAL en % (2.1 = 2,1 % al mes). */
  tasa: Num;
  fecha_limite: Fecha;
  estado: string;
  prioridad_propia: Num;
  abono_plan: Num;
  fecha_abono: Fecha;
  pagado_real: Num;
  abono_real: Num;
};

export type SemanaDatos = {
  otros_plan: Num; otros_real: Num;
  /** Vacío = el presupuesto personal repartido por días. */
  personales_plan: Num; personales_real: Num;
  ahorro_plan: Num; ahorro_real: Num;
};

export type Periodo = {
  id: string;
  mes: string; // YYYY-MM-01
  saldo_inicial: Num;
  tasa: Num;
  presupuesto_personal: Num;
  /** % (20 = 20 %). */
  pct_comision: Num;
  pct_cobro: Num;
  saldo_final_real: Num;
  semanas: SemanaDatos[];
  notas: string | null;
};

export type Fila<T = unknown> = { id: string; periodo_id: string; hoja: Hoja; orden: number; datos: T };

export type Libro = { periodo: Periodo; filas: Fila[] };

/* ------------------------------------------------------------------ Vacíos */

export const PRESUPUESTO_PERSONAL = 3_000_000; // Dato de Holman: vivir con 3.000.000 COP al mes.

export const semanaVacia = (): SemanaDatos => ({
  otros_plan: null, otros_real: null, personales_plan: null, personales_real: null, ahorro_plan: null, ahorro_real: null,
});

export function vacio(hoja: "ventas", tipo?: Venta["tipo"]): Venta;
export function vacio(hoja: "embajadores"): Embajador;
export function vacio(hoja: "costos"): Costo;
export function vacio(hoja: "deudas"): Deuda;
export function vacio(hoja: Hoja, tipo: Venta["tipo"] = "proyectada"): Venta | Embajador | Costo | Deuda {
  switch (hoja) {
    case "embajadores": return { nombre: "", meta: null, pct: null };
    case "ventas": return {
      tipo, fecha: null, cliente: "", servicio: "", usd: null, tasa: null, cop_directo: null, anticipo: null,
      fecha_anticipo: null, saldo_cobrado: null, fecha_saldo: null, fecha_estimada: null, vendedor: "", closer: "", pct_closer: null,
    };
    case "costos": return { concepto: "", categoria: "", proveedor: "", moneda: "COP", presupuesto: null, real: null, tasa: null, fecha: null, fijo: "", notas: "" };
    case "deudas": return {
      entidad: "", tipo: "", saldo: null, cuota: null, minimo: null, tasa: null, fecha_limite: null, estado: "",
      prioridad_propia: null, abono_plan: null, fecha_abono: null, pagado_real: null, abono_real: null,
    };
  }
}

/* ------------------------------------------------------------------ Fechas */

const dia = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};
const iso = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);

export function rango(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  const ini = dia(mes);
  const fin = Math.round(Date.UTC(y, m, 0) / 86_400_000);
  return { ini, fin, dias: fin - ini + 1, semanas: Math.ceil((fin - ini + 1) / 7) };
}

/** Las semanas del mes: 1–7, 8–14, 15–21, 22–28 y 29 en adelante. */
export function semanasDe(mes: string) {
  const r = rango(mes);
  return Array.from({ length: r.semanas }, (_, i) => {
    const desde = r.ini + 7 * i;
    const hasta = Math.min(desde + 6, r.fin);
    return { n: i + 1, desde: iso(desde), hasta: iso(hasta), dias: hasta - desde + 1 };
  });
}

/** Semana (1…) de una fecha dentro del mes; null si cae fuera. */
export function semanaDe(fecha: Fecha, mes: string): number | null {
  if (!fecha) return null;
  const r = rango(mes);
  const d = dia(fecha);
  if (d < r.ini || d > r.fin) return null;
  return Math.min(r.semanas, Math.floor((d - r.ini) / 7) + 1);
}

export const enMes = (fecha: Fecha, mes: string) => semanaDe(fecha, mes) !== null;

export function nombreMes(mes: string) {
  const s = new Date(`${mes.slice(0, 10)}T12:00:00`).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function mesSiguiente(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

/** La misma fecha un mes después (el 31 cae en el último día). */
function correrUnMes(fecha: Fecha): Fecha {
  if (!fecha) return null;
  const [y, m, d] = fecha.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
  const ultimo = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, ultimo)).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ Cálculo por fila */

const n = (x: Num | undefined) => (typeof x === "number" && Number.isFinite(x) ? x : 0);
const igual = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase() && a.trim() !== "";

export function valorVenta(v: Venta): number {
  if (v.cop_directo !== null && v.cop_directo !== undefined) return n(v.cop_directo);
  return v.usd !== null && v.tasa !== null ? n(v.usd) * n(v.tasa) : 0;
}

export function calcVenta(v: Venta, embajadores: Embajador[]) {
  const valor = valorVenta(v);
  const cobrado = n(v.anticipo) + (v.tipo === "real" ? n(v.saldo_cobrado) : 0);
  const pendiente = valor - cobrado;
  const emb = embajadores.find((e) => igual(e.nombre, v.vendedor));
  const pctEmb = emb ? n(emb.pct) : 0;
  const comEmb = (valor * pctEmb) / 100;
  const comCloser = (valor * n(v.pct_closer)) / 100;
  const comisiones = comEmb + comCloser;
  /**
   * Cobros con su fecha. Real: anticipo y saldo cobrado, cada uno en la fecha
   * en que entró. Proyectada: el anticipo esperado y el resto en la fecha
   * estimada (sin fechas, en la fecha de la venta).
   */
  const cobros: { monto: number; fecha: Fecha }[] = v.tipo === "real"
    ? [{ monto: n(v.anticipo), fecha: v.fecha_anticipo }, { monto: n(v.saldo_cobrado), fecha: v.fecha_saldo }]
    : [{ monto: n(v.anticipo), fecha: v.fecha_anticipo ?? v.fecha }, { monto: valor - n(v.anticipo), fecha: v.fecha_estimada ?? v.fecha }];
  const estado = valor === 0 ? "" : v.tipo === "proyectada" ? "Proyectada" : pendiente <= 0 ? "Cobrada" : cobrado > 0 ? "Cobro parcial" : "Por cobrar";
  return { valor, cobrado, pendiente, pctEmb, comEmb, comCloser, comisiones, margen: valor - comisiones, cobros, estado };
}

export function valorCosto(c: Costo, esc: Escenario, tasaRef: Num): number {
  const v = esc === "plan" ? c.presupuesto : c.real;
  if (v === null || v === undefined) return 0;
  if (c.moneda !== "USD") return n(v);
  const t = c.tasa ?? tasaRef;
  return t === null ? 0 : n(v) * n(t);
}

export function calcDeuda(d: Deuda) {
  const activa = n(d.saldo) > 0 && d.estado !== "Pagada";
  const tasa = n(d.tasa) / 100;
  const interes = n(d.saldo) * tasa;
  const pagoPlan = !d.entidad || d.estado === "Pagada" ? 0
    : Math.min(d.cuota !== null ? n(d.cuota) : n(d.minimo), n(d.saldo) * (1 + tasa));
  const ea = d.tasa === null ? null : Math.pow(1 + tasa, 12) - 1;
  const cierrePlan = Math.max(0, n(d.saldo) + interes - pagoPlan - n(d.abono_plan));
  const hayReal = d.pagado_real !== null || d.abono_real !== null;
  const cierreReal = Math.max(0, n(d.saldo) + interes - n(d.pagado_real) - n(d.abono_real));
  let meses: number | string | null = null;
  if (activa) {
    if (pagoPlan <= 0) meses = "Sin pago";
    else if (tasa === 0) meses = Math.ceil(n(d.saldo) / pagoPlan);
    else if (pagoPlan <= interes) meses = "La cuota no cubre el interés";
    else meses = Math.ceil(-Math.log(1 - (tasa * n(d.saldo)) / pagoPlan) / Math.log(1 + tasa));
  }
  const puntaje = activa ? (d.estado === "En mora" ? 10 : 0) + tasa : null;
  return { activa, interes, pagoPlan, ea, cierrePlan, cierreReal, hayReal, meses, puntaje };
}

/** Prioridad sugerida (avalancha): primero en mora, después la de mayor tasa. */
export function prioridades(deudas: Deuda[]): (number | null)[] {
  const p = deudas.map((d) => calcDeuda(d).puntaje);
  return p.map((x) => (x === null ? null : 1 + p.filter((y) => y !== null && y > x).length));
}

/* ------------------------------------------------------------------ Datos faltantes */

export function faltaVenta(v: Venta, mes: string): string[] {
  const f: string[] = [];
  if (!v.fecha) f.push("fecha de venta");
  if (v.tipo === "real" && !v.cliente.trim()) f.push("cliente");
  if (!v.servicio.trim()) f.push("servicio");
  if (v.usd === null && v.cop_directo === null) f.push("valor");
  if (v.usd !== null && v.cop_directo === null && v.tasa === null) f.push("tasa de cambio");
  if (!v.vendedor.trim()) f.push("vendedor");
  if (n(v.anticipo) > 0 && !v.fecha_anticipo) f.push("fecha del anticipo");
  if (v.tipo === "real" && n(v.saldo_cobrado) > 0 && !v.fecha_saldo) f.push("fecha del cobro del saldo");
  const pend = valorVenta(v) - n(v.anticipo) - (v.tipo === "real" ? n(v.saldo_cobrado) : 0);
  if (pend > 0 && !v.fecha_estimada) f.push("fecha estimada de cobro");
  if (v.closer.trim() && v.pct_closer === null) f.push("% del closer");
  if (pend < 0) f.push("¡lo cobrado supera lo vendido!");
  if (v.fecha && !enMes(v.fecha, mes) && v.tipo === "proyectada") f.push("la fecha no es de este mes");
  return f;
}
export const faltaEmbajador = (e: Embajador) => [e.meta === null && "meta mensual", e.pct === null && "% de comisión"].filter(Boolean) as string[];
export function faltaCosto(c: Costo, mes: string, tasaRef: Num): string[] {
  const f: string[] = [];
  if (!c.categoria) f.push("categoría");
  if (c.presupuesto === null) f.push("presupuesto");
  if (c.moneda === "USD" && c.tasa === null && tasaRef === null) f.push("tasa de cambio");
  if (!c.fecha) f.push("fecha de pago");
  else if (!enMes(c.fecha, mes)) f.push("la fecha no es de este mes");
  return f;
}
export function faltaDeuda(d: Deuda, mes: string): string[] {
  const f: string[] = [];
  if (d.saldo === null) f.push("saldo");
  if (d.cuota === null && d.minimo === null) f.push("cuota o pago mínimo");
  if (d.tasa === null) f.push("tasa");
  if (!d.fecha_limite) f.push("fecha límite");
  else if (!enMes(d.fecha_limite, mes)) f.push("fecha límite fuera del mes");
  if (!d.estado) f.push("estado");
  if (d.fecha_abono && !enMes(d.fecha_abono, mes)) f.push("fecha del abono fuera del mes");
  return f;
}

/* ------------------------------------------------------------------ El libro calculado */

export function separar(filas: Fila[]) {
  const de = <T,>(h: Hoja) => filas.filter((f) => f.hoja === h).sort((a, b) => a.orden - b.orden) as Fila<T>[];
  return {
    embajadores: de<Embajador>("embajadores"),
    ventas: de<Venta>("ventas"),
    costos: de<Costo>("costos"),
    deudas: de<Deuda>("deudas"),
  };
}

export type SemanaFlujo = {
  n: number; desde: string; hasta: string;
  saldoInicial: number; ventas: number; otros: number; ingresos: number; previstos: number;
  personales: number; hgg: number; comisiones: number; cuotas: number; abonos: number; ahorro: number;
  salidas: number; neto: number; saldoFinal: number; saldoConPrevistos: number;
};

export function flujo(libro: Libro, esc: Escenario): SemanaFlujo[] {
  const { periodo: p } = libro;
  const h = separar(libro.filas);
  const emb = h.embajadores.map((f) => f.datos);
  const sem = semanasDe(p.mes);
  const r = rango(p.mes);
  const ult = sem.length;
  const zero = () => sem.map(() => 0);
  const ventas = zero(), comisiones = zero(), previstos = zero(), hgg = zero(), cuotas = zero(), abonos = zero();
  const tipo = esc === "plan" ? "proyectada" : "real";

  for (const { datos: v } of h.ventas) {
    if (v.tipo !== tipo) continue;
    const c = calcVenta(v, emb);
    for (const cb of c.cobros) {
      const s = semanaDe(cb.fecha, p.mes);
      if (s === null || cb.monto === 0) continue;
      ventas[s - 1] += cb.monto;
      if (c.valor) comisiones[s - 1] += (c.comisiones * cb.monto) / c.valor;
    }
    if (esc === "real" && c.pendiente > 0) {
      const s = semanaDe(v.fecha_estimada, p.mes);
      if (s !== null) previstos[s - 1] += c.pendiente;
    }
  }
  for (const { datos: c } of h.costos) {
    const v = valorCosto(c, esc, p.tasa);
    if (!v) continue;
    const s = c.fecha ? semanaDe(c.fecha, p.mes) : 1; // sin fecha: semana 1 (prudente)
    if (s !== null) hgg[s - 1] += v;
  }
  for (const { datos: d } of h.deudas) {
    const c = calcDeuda(d);
    const cuota = esc === "plan" ? c.pagoPlan : n(d.pagado_real);
    const abono = esc === "plan" ? n(d.abono_plan) : n(d.abono_real);
    const sc = d.fecha_limite ? semanaDe(d.fecha_limite, p.mes) : 1;
    if (cuota && sc !== null) cuotas[sc - 1] += cuota;
    const sa = d.fecha_abono ? semanaDe(d.fecha_abono, p.mes) : ult; // sin fecha: última semana
    if (abono && sa !== null) abonos[sa - 1] += abono;
  }

  const presupuesto = p.presupuesto_personal ?? 0;
  let saldo = n(p.saldo_inicial);
  let previstosAcum = 0;
  return sem.map((w, i) => {
    const sd = p.semanas[i] ?? semanaVacia();
    const otros = n(esc === "plan" ? sd.otros_plan : sd.otros_real);
    const personales = esc === "plan"
      ? (sd.personales_plan ?? (presupuesto * w.dias) / r.dias)
      : n(sd.personales_real);
    const ahorro = n(esc === "plan" ? sd.ahorro_plan : sd.ahorro_real);
    const ingresos = ventas[i] + otros;
    const salidas = personales + hgg[i] + comisiones[i] + cuotas[i] + abonos[i] + ahorro;
    const saldoInicial = saldo;
    saldo = saldoInicial + ingresos - salidas;
    previstosAcum += previstos[i];
    return {
      n: w.n, desde: w.desde, hasta: w.hasta, saldoInicial, ventas: ventas[i], otros, ingresos, previstos: previstos[i],
      personales, hgg: hgg[i], comisiones: comisiones[i], cuotas: cuotas[i], abonos: abonos[i], ahorro, salidas,
      neto: ingresos - salidas, saldoFinal: saldo, saldoConPrevistos: saldo + previstosAcum,
    };
  });
}

const suma = (xs: SemanaFlujo[], k: keyof SemanaFlujo) => xs.reduce((a, x) => a + (x[k] as number), 0);

export function indicadores(libro: Libro) {
  const { periodo: p } = libro;
  const h = separar(libro.filas);
  const emb = h.embajadores.map((f) => f.datos);
  const plan = flujo(libro, "plan");
  const real = flujo(libro, "real");

  const delMes = (tipo: Venta["tipo"]) => h.ventas.filter((f) => f.datos.tipo === tipo && enMes(f.datos.fecha, p.mes));
  const tot = (fs: Fila<Venta>[], k: "valor" | "comisiones") => fs.reduce((a, f) => a + calcVenta(f.datos, emb)[k], 0);
  const reales = h.ventas.filter((f) => f.datos.tipo === "real");

  const vendidoPlan = tot(delMes("proyectada"), "valor");
  const vendidoReal = tot(delMes("real"), "valor");
  const pendientes = reales.map((f) => ({ v: f.datos, c: calcVenta(f.datos, emb) })).filter((x) => x.c.pendiente > 0);
  const pendiente = pendientes.reduce((a, x) => a + x.c.pendiente, 0);
  const pendienteEnMes = suma(real, "previstos");
  const pendienteSinFecha = pendientes.filter((x) => !x.v.fecha_estimada).reduce((a, x) => a + x.c.pendiente, 0);

  const costosPlan = h.costos.reduce((a, f) => a + valorCosto(f.datos, "plan", p.tasa), 0);
  const costosReal = h.costos.reduce((a, f) => a + valorCosto(f.datos, "real", p.tasa), 0);
  const deudas = h.deudas.map((f) => ({ d: f.datos, c: calcDeuda(f.datos) }));
  const deudaInicio = deudas.reduce((a, x) => a + n(x.d.saldo), 0);
  const intereses = deudas.reduce((a, x) => a + x.c.interes, 0);
  const deudaCierrePlan = deudas.reduce((a, x) => a + x.c.cierrePlan, 0);
  const deudaCierreReal = deudas.reduce((a, x) => a + x.c.cierreReal, 0);

  // Meta mínima de ventas (sobre la proyección).
  const pctCom = n(p.pct_comision) / 100;
  const pctCobro = p.pct_cobro === null || p.pct_cobro === 0 ? 1 : p.pct_cobro / 100;
  const ajuste = (x: number) => (pctCom >= 1 ? null : Math.max(0, x) / (1 - pctCom) / pctCobro);
  const otrosPlan = suma(plan, "otros");
  const saldo0 = n(p.saldo_inicial);
  const metaCompleta = ajuste(suma(plan, "personales") + suma(plan, "hgg") + suma(plan, "cuotas") + suma(plan, "abonos") + suma(plan, "ahorro") - otrosPlan - saldo0);
  const metaPiso = ajuste(suma(plan, "personales") + suma(plan, "hgg") + suma(plan, "cuotas") - otrosPlan - saldo0);

  const capacidad = (f: SemanaFlujo[]) => saldo0 + suma(f, "ingresos") - suma(f, "personales") - suma(f, "hgg") - suma(f, "comisiones") - suma(f, "ahorro");
  const minPlan = Math.min(...plan.map((w) => w.saldoFinal));
  const minReal = Math.min(...real.map((w) => w.saldoFinal));
  const minRealPrev = Math.min(...real.map((w) => w.saldoConPrevistos));
  const finalReal = real[real.length - 1]?.saldoFinal ?? 0;

  return {
    plan, real,
    vendidoPlan, vendidoReal,
    vendidoRealUsd: delMes("real").reduce((a, f) => a + (f.datos.cop_directo === null ? n(f.datos.usd) : 0), 0),
    cobradoPlan: suma(plan, "ventas"), cobradoReal: suma(real, "ventas"),
    cobradoDeVentasDelMes: delMes("real").reduce((a, f) => a + calcVenta(f.datos, emb).cobros.filter((c) => enMes(c.fecha, p.mes)).reduce((s, c) => s + c.monto, 0), 0),
    pendiente, pendienteEnMes, pendienteSinFecha, pendienteFuera: pendiente - pendienteEnMes - pendienteSinFecha,
    comisionesGeneradas: tot(delMes("real"), "comisiones"), comisionesPagadas: suma(real, "comisiones"),
    costosPlan, costosReal,
    margenVendido: vendidoReal - tot(delMes("real"), "comisiones") - costosReal,
    margenCaja: suma(real, "ventas") - suma(real, "comisiones") - costosReal,
    margenPlan: vendidoPlan - tot(delMes("proyectada"), "comisiones") - costosPlan,
    presupuesto: p.presupuesto_personal ?? 0,
    personalesPlan: suma(plan, "personales"), personalesReal: suma(real, "personales"),
    cuotasPlan: suma(plan, "cuotas"), cuotasReal: suma(real, "cuotas"),
    abonosPlan: suma(plan, "abonos"), abonosReal: suma(real, "abonos"),
    ahorroPlan: suma(plan, "ahorro"), ahorroReal: suma(real, "ahorro"),
    necesidades: Math.max(p.presupuesto_personal ?? 0, suma(plan, "personales")) + suma(plan, "cuotas"),
    capacidadPlan: capacidad(plan), capacidadReal: capacidad(real),
    deudaInicio, intereses, deudaCierrePlan, deudaCierreReal,
    metaCompleta, metaPiso,
    saldoFinalPlan: plan[plan.length - 1]?.saldoFinal ?? 0, saldoFinalReal: finalReal,
    descuadre: p.saldo_final_real === null ? null : p.saldo_final_real - finalReal,
    minPlan, minReal, minRealPrev,
    supuestos: { sinComision: p.pct_comision === null, sinCobro: p.pct_cobro === null },
  };
}

export type Indicadores = ReturnType<typeof indicadores>;

/** Qué tan bien salió el mes: proyectado vs. real, con su sentido. */
export function cumplimiento(i: Indicadores) {
  const filas: { id: string; label: string; plan: number | null; real: number; mejor: "mas" | "menos"; nota?: string }[] = [
    { id: "ventas", label: "Ventas del mes (vendido)", plan: i.vendidoPlan, real: i.vendidoReal, mejor: "mas" },
    { id: "piso", label: "Meta mínima de ventas (piso)", plan: i.metaPiso, real: i.vendidoReal, mejor: "mas", nota: "Por debajo de esto haría falta un préstamo." },
    { id: "cobrado", label: "Dinero cobrado", plan: i.cobradoPlan, real: i.cobradoReal, mejor: "mas" },
    { id: "costos", label: "Costos de HGG", plan: i.costosPlan, real: i.costosReal, mejor: "menos" },
    { id: "personales", label: "Gastos personales", plan: i.personalesPlan, real: i.personalesReal, mejor: "menos" },
    { id: "deudas", label: "Pagos a deudas (cuotas + abonos)", plan: i.cuotasPlan + i.abonosPlan, real: i.cuotasReal + i.abonosReal, mejor: "mas" },
    { id: "ahorro", label: "Ahorro", plan: i.ahorroPlan, real: i.ahorroReal, mejor: "mas" },
    { id: "saldo", label: "Saldo final en caja", plan: i.saldoFinalPlan, real: i.saldoFinalReal, mejor: "mas" },
    { id: "deuda", label: "Deuda al cierre del mes", plan: i.deudaCierrePlan, real: i.deudaCierreReal, mejor: "menos" },
  ];
  return filas.map((f) => {
    const pct = f.plan ? f.real / f.plan : null;
    const ok = f.plan === null ? null : f.mejor === "mas" ? f.real >= f.plan : f.real <= f.plan;
    const cerca = pct !== null && (f.mejor === "mas" ? pct >= 0.8 : pct <= 1.1);
    return { ...f, pct, estado: ok === null ? "sin" : ok ? "ok" : cerca ? "cerca" : "lejos" } as const;
  });
}

/** Lo que falta para que los números sean reales. */
export function faltantes(libro: Libro) {
  const { periodo: p } = libro;
  const h = separar(libro.filas);
  const lista: { label: string; falta: boolean; detalle?: string }[] = [
    { label: "Saldo en caja al inicio del mes", falta: p.saldo_inicial === null },
    { label: "Tasa de cambio de referencia", falta: p.tasa === null },
    { label: "% de comisiones estimado (para la meta)", falta: p.pct_comision === null },
    { label: "% de lo vendido que se cobra en el mes", falta: p.pct_cobro === null },
  ];
  const cuenta = (label: string, total: number, malos: number) =>
    lista.push({ label, falta: total === 0 || malos > 0, detalle: total === 0 ? "ninguno todavía" : malos ? `${malos} con datos incompletos` : `${total} completos` });
  cuenta("Embajadores", h.embajadores.length, h.embajadores.filter((f) => faltaEmbajador(f.datos).length).length);
  cuenta("Ventas proyectadas", h.ventas.filter((f) => f.datos.tipo === "proyectada").length, h.ventas.filter((f) => f.datos.tipo === "proyectada" && faltaVenta(f.datos, p.mes).length).length);
  cuenta("Costos", h.costos.length, h.costos.filter((f) => faltaCosto(f.datos, p.mes, p.tasa).length).length);
  cuenta("Deudas", h.deudas.length, h.deudas.filter((f) => faltaDeuda(f.datos, p.mes).length).length);
  return lista;
}

/* ------------------------------------------------------------------ Mes siguiente */

/**
 * Arma el mes siguiente con lo que sigue vigente: embajadores (meta y %),
 * costos (presupuesto, sin lo real, fecha un mes después), deudas (con el
 * saldo al cierre: el real si se registraron pagos, si no el proyectado) y el
 * saldo inicial = saldo real en cuentas si se anotó, si no el del flujo real.
 * Las ventas no pasan: las pendientes se vuelven a escribir como proyectadas
 * del mes nuevo solo si de verdad se esperan.
 */
export function armarMesSiguiente(libro: Libro): { periodo: Omit<Periodo, "id">; filas: { hoja: Hoja; orden: number; datos: unknown }[] } {
  const { periodo: p } = libro;
  const h = separar(libro.filas);
  const ind = indicadores(libro);
  const filas: { hoja: Hoja; orden: number; datos: unknown }[] = [];
  h.embajadores.forEach((f, i) => filas.push({ hoja: "embajadores", orden: i, datos: { ...f.datos } }));
  h.costos.forEach((f, i) => filas.push({ hoja: "costos", orden: i, datos: { ...f.datos, real: null, fecha: correrUnMes(f.datos.fecha) } }));
  h.deudas.forEach((f, i) => {
    const c = calcDeuda(f.datos);
    if (f.datos.estado === "Pagada") return;
    filas.push({
      hoja: "deudas", orden: i,
      datos: {
        ...f.datos, saldo: c.hayReal ? c.cierreReal : c.cierrePlan, fecha_limite: correrUnMes(f.datos.fecha_limite),
        abono_plan: null, fecha_abono: null, pagado_real: null, abono_real: null,
        estado: (c.hayReal ? c.cierreReal : c.cierrePlan) <= 0 ? "Pagada" : f.datos.estado,
      },
    });
  });
  const sig = mesSiguiente(p.mes);
  return {
    periodo: {
      mes: sig, saldo_inicial: p.saldo_final_real ?? ind.saldoFinalReal, tasa: p.tasa, presupuesto_personal: p.presupuesto_personal,
      pct_comision: p.pct_comision, pct_cobro: p.pct_cobro, saldo_final_real: null,
      semanas: semanasDe(sig).map(() => semanaVacia()), notas: null,
    },
    filas,
  };
}

/* ------------------------------------------------------------------ Datos (Supabase) */

/** Datos de ejemplo para /ecos/preview/finanzas. Con `null`, se lee la base. */
export const FinanzasMockContext = createContext<{ periodos: Periodo[]; filas: Fila[] } | null>(null);

const errorTabla = (m: string) =>
  m.includes("hgg_fin_") ? "Falta correr la migración 20261030_hgg_finanzas.sql en Supabase." : m;

function normalizarPeriodo(p: Periodo): Periodo {
  const sem = semanasDe(p.mes).map((_, i) => ({ ...semanaVacia(), ...(p.semanas?.[i] ?? {}) }));
  const num = (x: unknown) => (x === null || x === undefined || x === "" ? null : Number(x));
  return {
    ...p, mes: p.mes.slice(0, 10), semanas: sem,
    saldo_inicial: num(p.saldo_inicial), tasa: num(p.tasa), presupuesto_personal: num(p.presupuesto_personal),
    pct_comision: num(p.pct_comision), pct_cobro: num(p.pct_cobro), saldo_final_real: num(p.saldo_final_real),
  };
}

function primerDiaDe(fecha = new Date()) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-01`;
}

export function useFinanzas() {
  const mock = useContext(FinanzasMockContext);
  const [periodos, setPeriodos] = useState<Periodo[]>(mock?.periodos.map(normalizarPeriodo) ?? []);
  const [filas, setFilas] = useState<Fila[]>(mock?.filas ?? []);
  const [sel, setSel] = useState<string | null>(mock?.periodos[0]?.id ?? null);
  const [loading, setLoading] = useState(!mock);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (mock) return;
    const sb = getSupabase();
    const { data, error: e } = await sb.from("hgg_fin_periodos").select("*").order("mes", { ascending: false });
    if (e) { setError(errorTabla(e.message)); setLoading(false); return; }
    const ps = ((data ?? []) as Periodo[]).map(normalizarPeriodo);
    setPeriodos(ps);
    const { data: fs, error: e2 } = await sb.from("hgg_fin_filas").select("id, periodo_id, hoja, orden, datos").order("orden");
    setError(e2 ? errorTabla(e2.message) : null);
    setFilas((fs ?? []) as Fila[]);
    setSel((s) => s ?? (ps.find((p) => p.mes === primerDiaDe())?.id ?? ps[0]?.id ?? null));
    setLoading(false);
  }, [mock]);

  useEffect(() => {
    cargar().catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  }, [cargar]);

  const periodo = periodos.find((p) => p.id === sel) ?? null;
  const libro: Libro | null = periodo ? { periodo, filas: filas.filter((f) => f.periodo_id === periodo.id) } : null;

  const fallo = useCallback(async (m: string) => { await cargar(); return errorTabla(m); }, [cargar]);

  const crearPeriodo = useCallback(async (base: Omit<Periodo, "id">, nuevas: { hoja: Hoja; orden: number; datos: unknown }[] = []): Promise<string | null> => {
    if (periodos.some((p) => p.mes === base.mes)) return `Ya existe ${nombreMes(base.mes)}.`;
    const id = newId("fin");
    const p = normalizarPeriodo({ ...base, id });
    const fs: Fila[] = nuevas.map((f) => ({ id: newId("ff"), periodo_id: id, ...f }));
    setPeriodos((xs) => [p, ...xs].sort((a, b) => b.mes.localeCompare(a.mes)));
    setFilas((xs) => [...xs, ...fs]);
    setSel(id);
    if (mock) return null;
    const sb = getSupabase();
    const { error: e } = await sb.from("hgg_fin_periodos").insert({ ...base, id });
    if (e) return fallo(e.message);
    if (fs.length) {
      const { error: e2 } = await sb.from("hgg_fin_filas").insert(fs);
      if (e2) return fallo(e2.message);
    }
    return null;
  }, [periodos, mock, fallo]);

  const actualizarPeriodo = useCallback(async (cambios: Partial<Periodo>): Promise<string | null> => {
    if (!periodo) return null;
    setPeriodos((xs) => xs.map((p) => (p.id === periodo.id ? { ...p, ...cambios } : p)));
    if (mock) return null;
    const { error: e } = await getSupabase().from("hgg_fin_periodos").update({ ...cambios, updated_at: new Date().toISOString() }).eq("id", periodo.id);
    return e ? fallo(e.message) : null;
  }, [periodo, mock, fallo]);

  const agregarFila = useCallback(async (hoja: Hoja, datos: unknown): Promise<string | null> => {
    if (!periodo) return null;
    const orden = Math.max(-1, ...filas.filter((f) => f.periodo_id === periodo.id && f.hoja === hoja).map((f) => f.orden)) + 1;
    const f: Fila = { id: newId("ff"), periodo_id: periodo.id, hoja, orden, datos };
    setFilas((xs) => [...xs, f]);
    if (mock) return null;
    const { error: e } = await getSupabase().from("hgg_fin_filas").insert(f);
    return e ? fallo(e.message) : null;
  }, [periodo, filas, mock, fallo]);

  const actualizarFila = useCallback(async (id: string, datos: unknown): Promise<string | null> => {
    setFilas((xs) => xs.map((f) => (f.id === id ? { ...f, datos } : f)));
    if (mock) return null;
    const { error: e } = await getSupabase().from("hgg_fin_filas").update({ datos, updated_at: new Date().toISOString() }).eq("id", id);
    return e ? fallo(e.message) : null;
  }, [mock, fallo]);

  const borrarFila = useCallback(async (id: string): Promise<string | null> => {
    setFilas((xs) => xs.filter((f) => f.id !== id));
    if (mock) return null;
    const { error: e } = await getSupabase().from("hgg_fin_filas").delete().eq("id", id);
    return e ? fallo(e.message) : null;
  }, [mock, fallo]);

  return {
    periodos, periodo, libro, loading, error, preview: !!mock,
    elegir: setSel, crearPeriodo, actualizarPeriodo, agregarFila, actualizarFila, borrarFila,
  };
}

/** Un mes en blanco, con el presupuesto personal de Holman ya puesto. */
export function periodoNuevo(mes: string): Omit<Periodo, "id"> {
  return {
    mes, saldo_inicial: null, tasa: null, presupuesto_personal: PRESUPUESTO_PERSONAL, pct_comision: null, pct_cobro: null,
    saldo_final_real: null, semanas: semanasDe(mes).map(() => semanaVacia()), notas: null,
  };
}

/** Herramientas que ya se sabe que se pagan (sin montos: los pone Holman). */
export const COSTOS_CONOCIDOS: Pick<Costo, "concepto" | "categoria" | "proveedor" | "notas">[] = [
  { concepto: "Supabase (base de datos del sitio y ECOS)", categoria: "Herramientas", proveedor: "Supabase", notas: "Confirmar plan y valor." },
  { concepto: "Resend (correos)", categoria: "Herramientas", proveedor: "Resend", notas: "Confirmar plan y valor." },
  { concepto: "Zoom", categoria: "Herramientas", proveedor: "Zoom", notas: "Confirmar plan y valor." },
  { concepto: "Bunny (videos)", categoria: "Herramientas", proveedor: "Bunny", notas: "Confirmar valor." },
  { concepto: "DelegaWork (Sofía / WhatsApp)", categoria: "Herramientas", proveedor: "DelegaWork", notas: "Confirmar valor del mes." },
  { concepto: "Zernio (cobra a la tarjeta)", categoria: "Herramientas", proveedor: "Zernio", notas: "Confirmar si es de HGG y su valor." },
  { concepto: "Comisiones de Stripe", categoria: "Comisiones (pasarelas y bancos)", proveedor: "Stripe", notas: "Variable: depende de lo cobrado." },
  { concepto: "Pauta / campañas", categoria: "Otros", proveedor: "", notas: "Confirmar monto del mes." },
  { concepto: "Contador e impuestos de la LLC", categoria: "Impuestos", proveedor: "", notas: "Confirmar si hay pago este mes." },
];

export const cop = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x) ? "—" : `${x < 0 ? "−" : ""}$${Math.round(Math.abs(x)).toLocaleString("es-CO")}`;
export const pctTxt = (x: number | null) => (x === null || !Number.isFinite(x) ? "—" : `${Math.round(x * 100)}%`);
