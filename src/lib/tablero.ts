// Tablero de números de la Torre (oct 2026): el embudo completo en una sola
// vista — registros a la masterclass, cuentas de ECOS, Sesiones de Claridad,
// ventas — y de dónde viene cada paso (campaña, embajador o directo).
//
// Lee directo de Supabase (las policies dejan leer al admin) y calcula todo
// en el navegador: son pocas filas y así no hace falta tocar la base.
import { useCallback, useContext, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { AdminEcosMockContext } from "@/lib/ecos-admin-store";
import { ECOS, enPrueba, type EcosMember } from "@/lib/ecos";

/**
 * Meta de la etapa 1 (Holman, 15 oct 2026): entre 6.000 y 10.000 dólares antes
 * de delegar. Cuenta lo cobrado desde ETAPA1_DESDE (tienda + ECOS).
 */
export const ETAPA1 = { desde: "2026-10-01", minimo: 6000, meta: 10000 } as const;

type CampanaRow = { utm_source?: string; utm_medium?: string; utm_campaign?: string; clic?: string } | null;

export type InvitadoT = { email: string; created_at: string; invited_by: string | null; campana?: CampanaRow };
export type CitaT = {
  email: string; created_at: string; inicio: string; tipo: "claridad" | "sesion";
  estado: "agendada" | "asistio" | "no_asistio" | "cancelada";
  etapa: "nuevo" | "propuesta" | "cliente" | "descartado";
  ref_code: string | null; campana?: CampanaRow;
};
export type VentaT = {
  id: string; date: string; created_at: string; amount: number; status: string;
  service_id: string; client_email: string; ref_code?: string | null;
};
export type CobroEcosT = { paid_at: string; amount_usd: number; member_id: string | null };
export type MiembroT = Pick<EcosMember,
  "id" | "email" | "status" | "founder" | "teacher" | "cortesia" | "plan" | "price_usd" |
  "prueba_hasta" | "referred_by" | "campana" | "created_at" | "cancelled_at">;

export type DatosTablero = {
  miembros: MiembroT[]; invitados: InvitadoT[]; citas: CitaT[]; ventas: VentaT[]; cobros: CobroEcosT[];
};

export type Periodo = "7" | "30" | "mes" | "todo";
export const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "7", label: "7 días" },
  { id: "30", label: "30 días" },
  { id: "mes", label: "Este mes" },
  { id: "todo", label: "Todo" },
];

function desdeDe(p: Periodo, ahora: Date): number {
  if (p === "todo") return 0;
  if (p === "mes") return new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();
  return ahora.getTime() - Number(p) * 86_400_000;
}

// ---------- De dónde viene ----------

export type Fuente = { clave: string; label: string; tipo: "campana" | "embajador" | "directo" };
const DIRECTO: Fuente = { clave: "directo", label: "Directo / orgánico", tipo: "directo" };
const EMBAJADOR: Fuente = { clave: "embajador", label: "Embajadores", tipo: "embajador" };

function fuenteDe(campana: CampanaRow | undefined, embajador: boolean): Fuente {
  if (campana && (campana.utm_source || campana.utm_medium || campana.clic)) {
    const red = (campana.utm_source || campana.clic || "pauta").toLowerCase();
    return { clave: `campana:${red}`, label: `Campaña · ${red}`, tipo: "campana" };
  }
  return embajador ? EMBAJADOR : DIRECTO;
}

const correo = (e: string | null | undefined) => (e ?? "").trim().toLowerCase();
const ms = (iso: string) => new Date(iso).getTime();

/**
 * La primera fuente conocida de cada correo (el primer contacto gana): sirve
 * para las ventas de la tienda, que no traen la campaña consigo.
 */
function primerContacto(d: DatosTablero): Map<string, Fuente> {
  const toques: { email: string; t: number; f: Fuente }[] = [
    ...d.invitados.map((g) => ({ email: correo(g.email), t: ms(g.created_at), f: fuenteDe(g.campana, !!g.invited_by) })),
    ...d.miembros.map((m) => ({ email: correo(m.email), t: ms(m.created_at), f: fuenteDe(m.campana, !!m.referred_by) })),
    ...d.citas.map((c) => ({ email: correo(c.email), t: ms(c.created_at), f: fuenteDe(c.campana, !!c.ref_code) })),
  ].sort((a, b) => a.t - b.t);
  const mapa = new Map<string, Fuente>();
  for (const x of toques) if (x.email && !mapa.has(x.email)) mapa.set(x.email, x.f);
  return mapa;
}

// ---------- El cálculo ----------

/** Ventas que no son ventas: el producto de prueba de $1. */
const esVentaReal = (v: VentaT) => v.status === "Aprobado" && v.service_id !== "test-1usd";
/** Paga de verdad: activo y sin acceso regalado. */
const pagaECOS = (m: MiembroT) => m.status === "activo" && !m.cortesia && !m.teacher;

export type FilaFuente = { fuente: Fuente; masterclass: number; cuentas: number; citas: number; ventas: number; ingresos: number };

export type Tablero = {
  embudo: { masterclass: number; cuentas: number; claridad: number; claridadHechas: number; clientes: number; ventas: number };
  ingresos: { tienda: number; ecos: number; total: number };
  ecos: { pagando: number; enPrueba: number; fundadoresPorActivar: number; mrr: number; cancelados: number };
  fuentes: FilaFuente[];
  pendientes: { porActivar: number; claridadSinCerrar: number; citasProximas: number; fechaCobro: string };
  etapa1: { cobrado: number; minimo: number; meta: number };
};

export function calcularTablero(d: DatosTablero, periodo: Periodo, ahora = new Date()): Tablero {
  const desde = desdeDe(periodo, ahora);
  const enRango = (iso: string) => ms(iso) >= desde && ms(iso) <= ahora.getTime();

  const invitados = d.invitados.filter((g) => enRango(g.created_at));
  const cuentas = d.miembros.filter((m) => enRango(m.created_at));
  const claridad = d.citas.filter((c) => c.tipo === "claridad" && enRango(c.created_at));
  const ventas = d.ventas.filter((v) => esVentaReal(v) && enRango(v.created_at || v.date));
  const cobros = d.cobros.filter((c) => enRango(c.paid_at));

  const tienda = ventas.reduce((a, v) => a + Number(v.amount || 0), 0);
  const ecos = cobros.reduce((a, c) => a + Number(c.amount_usd || 0), 0);

  // Fuentes: cada paso con la suya; las ventas, por el primer contacto del comprador.
  const contacto = primerContacto(d);
  const filas = new Map<string, FilaFuente>();
  const fila = (f: Fuente) => {
    let r = filas.get(f.clave);
    if (!r) { r = { fuente: f, masterclass: 0, cuentas: 0, citas: 0, ventas: 0, ingresos: 0 }; filas.set(f.clave, r); }
    return r;
  };
  for (const g of invitados) fila(fuenteDe(g.campana, !!g.invited_by)).masterclass++;
  for (const m of cuentas) fila(fuenteDe(m.campana, !!m.referred_by)).cuentas++;
  for (const c of claridad) fila(fuenteDe(c.campana, !!c.ref_code)).citas++;
  for (const v of ventas) {
    const f = v.ref_code ? EMBAJADOR : contacto.get(correo(v.client_email)) ?? DIRECTO;
    const r = fila(f);
    r.ventas++;
    r.ingresos += Number(v.amount || 0);
  }
  // Los cobros de ECOS, por la fuente de la ficha del miembro.
  const fichas = new Map(d.miembros.map((m) => [m.id, m]));
  for (const c of cobros) {
    const m = c.member_id ? fichas.get(c.member_id) : undefined;
    if (!m || !c.amount_usd) continue;
    fila(fuenteDe(m.campana, !!m.referred_by)).ingresos += Number(c.amount_usd);
  }
  const orden = { campana: 0, embajador: 1, directo: 2 } as const;
  const fuentes = [...filas.values()].sort((a, b) =>
    orden[a.fuente.tipo] - orden[b.fuente.tipo] || b.ingresos - a.ingresos || a.fuente.label.localeCompare(b.fuente.label));

  // ECOS hoy (no depende del periodo, salvo las bajas).
  const pagando = d.miembros.filter(pagaECOS);
  const mrr = pagando.reduce((a, m) => a + (m.plan === "anual" ? Number(m.price_usd) / 12 : Number(m.price_usd)), 0);
  const prueba = d.miembros.filter((m) => enPrueba(m, ahora));
  const fundadoresPorActivar = prueba.filter((m) => m.founder).length;
  const cancelados = d.miembros.filter((m) => m.cancelled_at && enRango(m.cancelled_at)).length;

  // Lo que hay que atender.
  const en7 = ahora.getTime() + 7 * 86_400_000;
  const claridadSinCerrar = d.citas.filter((c) =>
    c.tipo === "claridad" && c.estado === "asistio" && (c.etapa === "nuevo" || c.etapa === "propuesta")).length;
  const citasProximas = d.citas.filter((c) =>
    c.estado === "agendada" && ms(c.inicio) >= ahora.getTime() && ms(c.inicio) <= en7).length;

  // Meta de la etapa 1: todo lo cobrado desde su inicio, sin importar el periodo elegido.
  const inicio = ms(`${ETAPA1.desde}T00:00:00`);
  const cobrado =
    d.ventas.filter((v) => esVentaReal(v) && ms(v.created_at || v.date) >= inicio).reduce((a, v) => a + Number(v.amount || 0), 0) +
    d.cobros.filter((c) => ms(c.paid_at) >= inicio).reduce((a, c) => a + Number(c.amount_usd || 0), 0);

  return {
    embudo: {
      masterclass: invitados.length,
      cuentas: cuentas.length,
      claridad: claridad.length,
      claridadHechas: claridad.filter((c) => c.estado === "asistio").length,
      clientes: claridad.filter((c) => c.etapa === "cliente").length,
      ventas: ventas.length,
    },
    ingresos: { tienda, ecos, total: tienda + ecos },
    ecos: { pagando: pagando.length, enPrueba: prueba.length, fundadoresPorActivar, mrr, cancelados },
    fuentes,
    pendientes: { porActivar: fundadoresPorActivar, claridadSinCerrar, citasProximas, fechaCobro: ECOS.primerCobroTexto },
    etapa1: { cobrado, minimo: ETAPA1.minimo, meta: ETAPA1.meta },
  };
}

/** Porcentaje entero, sin dividir por cero. */
export function pct(parte: number, total: number): number | null {
  return total > 0 ? Math.round((parte / total) * 100) : null;
}

// ---------- Carga ----------

const VACIO: DatosTablero = { miembros: [], invitados: [], citas: [], ventas: [], cobros: [] };

/**
 * Lee las cinco tablas. La columna `campana` de invitados y citas llega con la
 * migración 20261027: si aún no existe, se lee sin ella y todo cuenta como
 * directo o embajador.
 */
export function useTablero() {
  const mock = useContext(AdminEcosMockContext);
  const [datos, setDatos] = useState<DatosTablero>(() => (mock ? deMock(mock) : VACIO));
  const [loading, setLoading] = useState(!mock);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (mock) return;
    const sb = getSupabase();
    const conCampana = async <T,>(tabla: string, cols: string): Promise<T[]> => {
      const r = await sb.from(tabla).select(`${cols}, campana`);
      if (!r.error) return (r.data ?? []) as T[];
      const r2 = await sb.from(tabla).select(cols);
      if (r2.error) throw r2.error;
      return (r2.data ?? []) as T[];
    };
    try {
      const [miembros, invitados, citas, ventas, cobros] = await Promise.all([
        sb.from("ecos_members").select("id, email, status, founder, teacher, cortesia, plan, price_usd, prueba_hasta, referred_by, campana, created_at, cancelled_at")
          .then((r) => { if (r.error) throw r.error; return (r.data ?? []) as MiembroT[]; }),
        conCampana<InvitadoT>("ecos_guests", "email, created_at, invited_by"),
        conCampana<CitaT>("hgg_citas", "email, created_at, inicio, tipo, estado, etapa, ref_code"),
        sb.from("manual_sales").select("id, date, created_at, amount, status, service_id, client_email, ref_code")
          .then(async (r) => {
            if (!r.error) return (r.data ?? []) as VentaT[];
            // Sin la migración de referidos no existe ref_code.
            const r2 = await sb.from("manual_sales").select("id, date, created_at, amount, status, service_id, client_email");
            if (r2.error) throw r2.error;
            return (r2.data ?? []) as VentaT[];
          }),
        sb.from("ecos_payments").select("paid_at, amount_usd, member_id")
          .then((r) => { if (r.error) throw r.error; return (r.data ?? []) as CobroEcosT[]; }),
      ]);
      setDatos({ miembros, invitados, citas, ventas, cobros });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));
    }
    setLoading(false);
  }, [mock]);

  useEffect(() => { void cargar(); }, [cargar]);
  return { datos, loading, error, recargar: cargar };
}

function deMock(m: Record<string, unknown[]>): DatosTablero {
  return {
    miembros: (m.ecos_members ?? []) as MiembroT[],
    invitados: (m.ecos_guests ?? []) as InvitadoT[],
    citas: (m.hgg_citas ?? []) as CitaT[],
    ventas: (m.manual_sales ?? []) as VentaT[],
    cobros: (m.ecos_payments ?? []) as CobroEcosT[],
  };
}
