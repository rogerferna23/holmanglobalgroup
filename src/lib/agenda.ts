import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Campana } from "@/lib/campana";
import { getSupabase } from "@/lib/supabase";
import { EUR_TO_USD } from "@/contexts/CurrencyContext";

/**
 * Agenda propia de HGG (oct 2026, reemplaza a DelegaMeet).
 *
 * La persona reserva en /agendar (Sesión de Claridad) o /sesion (sesión de
 * coaching) y ve las horas en la zona de su navegador. Todo lo público pasa por
 * la función `agenda`; la Torre lee y escribe las tablas por RLS.
 */

export type TipoId = "claridad" | "sesion" | "reunion";
export type TipoCfg = { nombre: string; duracion: number; bloque: number; activo: boolean };
export type Tramo = [string, string];

export type Ajustes = {
  id: 1;
  zona: string;
  horario: Record<string, Tramo[]>;
  aviso_horas: number;
  dias_adelante: number;
  tipos: Record<TipoId, TipoCfg>;
  correo_avisos: string;
};

export type EstadoCita = "agendada" | "asistio" | "no_asistio" | "cancelada";
export type EtapaCita = "nuevo" | "propuesta" | "cliente" | "descartado";

export type Cita = {
  id: string;
  tipo: TipoId;
  inicio: string;
  fin: string;
  nombre: string;
  email: string;
  whatsapp: string | null;
  zona_cliente: string | null;
  motivo: string | null;
  ref_code: string | null;
  estado: EstadoCita;
  etapa: EtapaCita;
  notas: string | null;
  zoom_url: string | null;
  /** Quién la da (hgg_agenda_anfitriones). Sin la migración del equipo, no viene. */
  anfitrion?: string;
  /** El embajador que la trajo (cuenta), si llegó con su enlace. */
  referrer?: string | null;
  created_at: string;
};

/** null en `anfitrion` = bloquea a todo el equipo. */
export type Bloqueo = { id: string; desde: string; hasta: string; motivo: string | null; anfitrion?: string | null };

/**
 * Quien da sesiones. Holman deja `horario` en null (usa el de los ajustes);
 * Zack tiene el suyo. Cada uno crea las reuniones en SU cuenta de Zoom (secrets
 * de la función `agenda`); `zoom_fijo` es el plan B mientras no estén.
 */
export type Anfitrion = {
  id: string;
  nombre: string;
  correo: string;
  tipos: TipoId[];
  horario: Record<string, Tramo[]> | null;
  zoom_fijo: string | null;
  orden: number;
  activo: boolean;
};

export const DIAS_SEMANA: { id: string; nombre: string }[] = [
  { id: "1", nombre: "Lunes" }, { id: "2", nombre: "Martes" }, { id: "3", nombre: "Miércoles" },
  { id: "4", nombre: "Jueves" }, { id: "5", nombre: "Viernes" }, { id: "6", nombre: "Sábado" },
  { id: "7", nombre: "Domingo" },
];

export const ESTADO_CITA: Record<EstadoCita, string> = {
  agendada: "Agendada", asistio: "Asistió", no_asistio: "No asistió", cancelada: "Cancelada",
};
export const ETAPA_CITA: Record<EtapaCita, string> = {
  nuevo: "Nuevo", propuesta: "Propuesta enviada", cliente: "Cliente", descartado: "No avanzó",
};

/** Que cada tramo termine después de empezar y que no se pisen. */
export function validarSemana(horario: Record<string, Tramo[]>): string | null {
  for (const d of DIAS_SEMANA) {
    const ts = [...(horario[d.id] ?? [])].sort((a, b) => a[0].localeCompare(b[0]));
    for (let i = 0; i < ts.length; i++) {
      if (ts[i][0] >= ts[i][1]) return `${d.nombre}: cada tramo debe terminar después de empezar.`;
      if (i > 0 && ts[i][0] < ts[i - 1][1]) return `${d.nombre}: hay tramos que se pisan.`;
    }
  }
  return null;
}

export const ordenarSemana = (horario: Record<string, Tramo[]>) =>
  Object.fromEntries(Object.entries(horario).map(([d, t]) => [d, [...t].sort((a, b) => a[0].localeCompare(b[0]))]));

/** La zona del navegador; Bogotá si no se puede saber. */
export function zonaDelNavegador(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Bogota";
  } catch {
    return "America/Bogota";
  }
}

const CIUDADES: Record<string, string> = {
  Bogota: "Bogotá", Mexico_City: "Ciudad de México", New_York: "Nueva York", Los_Angeles: "Los Ángeles",
  Sao_Paulo: "São Paulo", Buenos_Aires: "Buenos Aires", Santo_Domingo: "Santo Domingo", Panama: "Panamá",
  Asuncion: "Asunción", Canary: "Canarias", London: "Londres", Lisbon: "Lisboa",
};

/** «Bogotá», «Madrid», «Buenos Aires»… para decir de dónde es la hora. */
export function nombreZona(tz: string): string {
  const c = tz.split("/").pop() ?? tz;
  return CIUDADES[c] ?? c.replace(/_/g, " ");
}

/** «2026-10-20» de un instante en una zona: sirve para agrupar por día. */
export function claveDia(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(iso));
}

export function diaLargo(iso: string, tz: string): string {
  return new Date(iso).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", timeZone: tz });
}

export function horaCorta(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString("es-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
}

// ---------------------------------------------------------------------------
// Lo público: la función `agenda`
// ---------------------------------------------------------------------------

async function llamar<T>(accion: string, datos: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke("agenda", { body: { accion, ...datos } });
  if (error) {
    // supabase-js esconde el cuerpo de la respuesta en error.context.
    let msg = "No pudimos conectar con la agenda. Intenta de nuevo en un momento.";
    let ocupada = false;
    try {
      const ctx = (error as { context?: Response }).context;
      const body = ctx ? await ctx.json() : null;
      if (body?.error) msg = body.error;
      ocupada = !!body?.ocupada;
    } catch { /* sin cuerpo */ }
    const e = new Error(msg) as Error & { ocupada?: boolean };
    e.ocupada = ocupada;
    throw e;
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export type Horarios = {
  tipo: { id: TipoId; nombre: string; duracion: number; activo: boolean };
  /** Si se pidió con «?con=», el anfitrión que respondió (null si no existe o está apagado). */
  con?: { id: string; nombre: string } | null;
  zonaHolman: string;
  horas: string[];
};

export const pedirHorarios = (tipo: TipoId, con?: string) => llamar<Horarios>("horarios", con ? { tipo, con } : { tipo });

export type Reserva = { id: string; tipo: TipoId; inicio: string; fin: string; zoom_url: string | null; nombre: string };

export const reservarCita = (datos: {
  tipo: TipoId; inicio: string; nombre: string; email: string; whatsapp?: string; motivo?: string; zona: string; ref?: string | null;
  campana?: Campana | null;
  /** Reservar solo con este anfitrión (enlace /agendar?con=zack). */
  con?: string;
}) => llamar<{ ok: true; cita: Reserva }>("reservar", datos);

export const cancelarConToken = (token: string) => llamar<{ ok: true; otraVez?: string; yaEstaba?: boolean }>("cancelar", { token });

// ---------------------------------------------------------------------------
// La Torre
// ---------------------------------------------------------------------------

/**
 * Planes de DelegaWork que se registran desde la cita (precio de la tienda en
 * USD: euros × EUR_TO_USD). La comisión del embajador se calcula sobre esto
 * cada mes (hgg_delegawork_comisiones_mes).
 */
export type PlanDW = "basico" | "starter" | "pro" | "elite";
export const PLANES_DW: { id: PlanDW; nombre: string; usd: number }[] = [
  { id: "starter", nombre: "Starter", usd: Math.round(599 * EUR_TO_USD) },
  { id: "pro", nombre: "Pro", usd: Math.round(1199 * EUR_TO_USD) },
  { id: "basico", nombre: "Básico", usd: Math.round(199 * EUR_TO_USD) },
  { id: "elite", nombre: "Elite", usd: Math.round(1799 * EUR_TO_USD) },
];

export type ClienteDW = {
  id: string; cita_id: string | null; nombre: string; email: string; plan: PlanDW;
  precio_usd: number; referrer: string | null; inicio: string; cancelado_en: string | null;
};

/** Vista previa sin Supabase (/ecos/preview/agenda): los cambios quedan en memoria. */
export const AgendaMockContext = createContext<{
  citas: Cita[]; ajustes: Ajustes; bloqueos: Bloqueo[]; anfitriones: Anfitrion[];
} | null>(null);

export function useAgendaAdmin() {
  const mock = useContext(AgendaMockContext);
  const [citas, setCitas] = useState<Cita[]>(mock?.citas ?? []);
  const [ajustes, setAjustes] = useState<Ajustes | null>(mock?.ajustes ?? null);
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>(mock?.bloqueos ?? []);
  const [anfitriones, setAnfitriones] = useState<Anfitrion[]>(mock?.anfitriones ?? []);
  const [clientesDW, setClientesDW] = useState<ClienteDW[]>([]);
  const [loading, setLoading] = useState(!mock);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (mock) return;
    const sb = getSupabase();
    const [c, a, b, f, d] = await Promise.all([
      sb.from("hgg_citas").select("*").order("inicio", { ascending: true }),
      sb.from("hgg_agenda_ajustes").select("*").eq("id", 1).maybeSingle(),
      sb.from("hgg_agenda_bloqueos").select("*").gte("hasta", new Date().toISOString()).order("desde"),
      sb.from("hgg_agenda_anfitriones").select("*").order("orden"),
      sb.from("hgg_delegawork_clientes").select("*").order("created_at"),
    ]);
    const err = c.error ?? a.error ?? b.error;
    setError(err ? err.message : null);
    setCitas((c.data ?? []) as Cita[]);
    setAjustes((a.data ?? null) as Ajustes | null);
    setBloqueos((b.data ?? []) as Bloqueo[]);
    // Sin la migración del equipo (20261031) la tabla no existe: Holman solo.
    setAnfitriones(f.error ? [] : ((f.data ?? []) as Anfitrion[]));
    // Sin la migración de comisiones automáticas (20261101) no existe: nada que mostrar.
    setClientesDW(d.error ? [] : ((d.data ?? []) as ClienteDW[]));
    setLoading(false);
  }, [mock]);

  useEffect(() => {
    cargar().catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  }, [cargar]);

  const actualizarCita = useCallback(async (id: string, cambios: Partial<Cita>): Promise<string | null> => {
    const { error: e } = await getSupabase().from("hgg_citas").update(cambios).eq("id", id);
    if (e) return e.message;
    setCitas((cs) => cs.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
    return null;
  }, []);

  /** Cancela desde la Torre: borra el Zoom y le avisa a la persona. */
  const cancelarCita = useCallback(async (id: string): Promise<string | null> => {
    try {
      await llamar("cancelar", { id });
      await cargar();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }, [cargar]);

  const reintentarZoom = useCallback(async (id: string): Promise<string | null> => {
    try {
      await llamar("zoom", { id });
      await cargar();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }, [cargar]);

  /** Pasa la cita a otro anfitrión: Zoom nuevo y aviso a la persona. */
  const asignarCita = useCallback(async (id: string, anfitrion: string): Promise<string | null> => {
    if (mock) {
      setCitas((cs) => cs.map((c) => (c.id === id ? { ...c, anfitrion } : c)));
      return null;
    }
    try {
      await llamar("asignar", { id, anfitrion });
      await cargar();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }, [cargar, mock]);

  /**
   * «Cerró DelegaWork»: el cliente queda registrado y la comisión del
   * embajador de este mes se crea ya; las siguientes, cada 1 de mes.
   */
  const registrarDelegaWork = useCallback(async (cita: Cita, plan: PlanDW): Promise<string | null> => {
    const p = PLANES_DW.find((x) => x.id === plan);
    if (!p) return "Elige un plan.";
    const nuevo = {
      cita_id: cita.id, nombre: cita.nombre, email: cita.email, plan, precio_usd: p.usd,
      referrer: cita.referrer ?? null,
    };
    if (mock) {
      setClientesDW((xs) => [...xs, { ...nuevo, id: `dw-${xs.length}`, inicio: new Date().toISOString().slice(0, 10), cancelado_en: null }]);
      return null;
    }
    const sb = getSupabase();
    const { data, error: e } = await sb.from("hgg_delegawork_clientes").insert(nuevo).select("*").single();
    if (e) return e.message;
    setClientesDW((xs) => [...xs, data as ClienteDW]);
    const { error: e2 } = await sb.rpc("hgg_delegawork_comisiones_mes");
    return e2 ? `Cliente guardado, pero la comisión de este mes no se creó: ${e2.message}` : null;
  }, [mock]);

  /** El cliente dejó DelegaWork: desde el mes siguiente ya no hay comisión. */
  const cancelarDelegaWork = useCallback(async (id: string): Promise<string | null> => {
    const hoy = new Date().toISOString().slice(0, 10);
    if (!mock) {
      const { error: e } = await getSupabase().from("hgg_delegawork_clientes").update({ cancelado_en: hoy }).eq("id", id);
      if (e) return e.message;
    }
    setClientesDW((xs) => xs.map((x) => (x.id === id ? { ...x, cancelado_en: hoy } : x)));
    return null;
  }, [mock]);

  /** Qué anfitriones tienen su Zoom conectado. null = no se pudo saber. */
  const zoomEstado = useCallback(async (): Promise<Record<string, boolean> | null> => {
    if (mock) return Object.fromEntries((mock.anfitriones).map((x) => [x.id, x.id === "holman"]));
    try {
      return (await llamar<{ conectado: Record<string, boolean> }>("zoom_estado")).conectado;
    } catch {
      return null;
    }
  }, [mock]);

  const guardarAnfitrion = useCallback(async (id: string, cambios: Partial<Anfitrion>): Promise<string | null> => {
    if (mock) {
      setAnfitriones((fs) => fs.map((x) => (x.id === id ? { ...x, ...cambios } : x)));
      return null;
    }
    const { error: e } = await getSupabase().from("hgg_agenda_anfitriones").update(cambios).eq("id", id);
    if (e) return e.message;
    setAnfitriones((fs) => fs.map((x) => (x.id === id ? { ...x, ...cambios } : x)));
    return null;
  }, [mock]);

  const guardarAjustes = useCallback(async (cambios: Partial<Ajustes>): Promise<string | null> => {
    const { error: e } = await getSupabase().from("hgg_agenda_ajustes")
      .update({ ...cambios, updated_at: new Date().toISOString() }).eq("id", 1);
    if (e) return e.message;
    setAjustes((a) => (a ? { ...a, ...cambios } : a));
    return null;
  }, []);

  const agregarBloqueo = useCallback(async (b: Omit<Bloqueo, "id">): Promise<string | null> => {
    const { error: e } = await getSupabase().from("hgg_agenda_bloqueos").insert(b);
    if (e) return e.message;
    await cargar();
    return null;
  }, [cargar]);

  const borrarBloqueo = useCallback(async (id: string): Promise<string | null> => {
    const { error: e } = await getSupabase().from("hgg_agenda_bloqueos").delete().eq("id", id);
    if (e) return e.message;
    setBloqueos((bs) => bs.filter((b) => b.id !== id));
    return null;
  }, []);

  return {
    citas, ajustes, bloqueos, anfitriones, loading, error, recargar: cargar,
    clientesDW, registrarDelegaWork, cancelarDelegaWork,
    actualizarCita, cancelarCita, reintentarZoom, asignarCita, guardarAnfitrion, zoomEstado,
    guardarAjustes, agregarBloqueo, borrarBloqueo,
  };
}

// ---------------------------------------------------------------------------
// «Mi agenda» en el panel de ECOS: lo del anfitrión que no es Holman (Zack)
// ---------------------------------------------------------------------------

/** Lo que ve un anfitrión de sí mismo (función hgg_mi_anfitrion). */
export type MiAnfitrion = {
  id: string;
  nombre: string;
  correo: string;
  tipos: TipoId[];
  horario: Record<string, Tramo[]>;
  activo: boolean;
  zona: string;
  tipos_cfg: Record<TipoId, TipoCfg>;
};

/** Vista previa sin Supabase: la ficha y las citas del anfitrión. */
export const AnfitrionMockContext = createContext<{ yo: MiAnfitrion; citas: Cita[] } | null>(null);

/** La ficha de quien entra, si da sesiones; null si no (o sin la migración). */
export function useMiAnfitrion(): MiAnfitrion | null {
  const mock = useContext(AnfitrionMockContext);
  const [yo, setYo] = useState<MiAnfitrion | null>(mock?.yo ?? null);
  useEffect(() => {
    if (mock) return;
    let vivo = true;
    getSupabase().rpc("hgg_mi_anfitrion").then(({ data, error }) => {
      if (vivo && !error && data) setYo(data as MiAnfitrion);
    }, () => { /* sin la función, no es anfitrión */ });
    return () => { vivo = false; };
  }, [mock]);
  return yo;
}

export function useMiAgenda() {
  const mock = useContext(AnfitrionMockContext);
  const [citas, setCitas] = useState<Cita[]>(mock?.citas ?? []);
  const [loading, setLoading] = useState(!mock);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mock) return;
    let vivo = true;
    getSupabase().rpc("hgg_mis_citas").then(({ data, error: e }) => {
      if (!vivo) return;
      setError(e ? e.message : null);
      setCitas((data ?? []) as Cita[]);
      setLoading(false);
    }, (e: unknown) => {
      if (vivo) { setError(e instanceof Error ? e.message : String(e)); setLoading(false); }
    });
    return () => { vivo = false; };
  }, [mock]);

  const anotar = useCallback(async (id: string, c: { estado: EstadoCita; etapa: EtapaCita; notas: string | null }): Promise<string | null> => {
    if (!mock) {
      const { data, error: e } = await getSupabase().rpc("hgg_mi_cita_actualizar", {
        p_id: id, p_estado: c.estado, p_etapa: c.etapa, p_notas: c.notas ?? "",
      });
      if (e) return e.message;
      if (!data) return "No encontramos esa cita.";
    }
    setCitas((cs) => cs.map((x) => (x.id === id ? { ...x, ...c } : x)));
    return null;
  }, [mock]);

  const guardarHorario = useCallback(async (horario: Record<string, Tramo[]>): Promise<string | null> => {
    if (mock) return null;
    const { data, error: e } = await getSupabase().rpc("hgg_mi_horario_guardar", { p_horario: horario });
    if (e) return e.message;
    return data ? null : "No pudimos guardar tu horario.";
  }, [mock]);

  return { citas, loading, error, anotar, guardarHorario };
}
