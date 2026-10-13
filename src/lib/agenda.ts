import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

/**
 * Agenda propia de HGG (oct 2026, reemplaza a DelegaMeet).
 *
 * La persona reserva en /agendar (Sesión de Claridad) o /sesion (sesión de
 * coaching) y ve las horas en la zona de su navegador. Todo lo público pasa por
 * la función `agenda`; la Torre lee y escribe las tablas por RLS.
 */

export type TipoId = "claridad" | "sesion";
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
  created_at: string;
};

export type Bloqueo = { id: string; desde: string; hasta: string; motivo: string | null };

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

/** Zonas que se ofrecen si la persona quiere cambiar la detectada. */
export const ZONAS_COMUNES: { id: string; nombre: string }[] = [
  { id: "America/Bogota", nombre: "Colombia · Perú · Ecuador · Panamá" },
  { id: "America/Mexico_City", nombre: "México (Ciudad de México)" },
  { id: "America/New_York", nombre: "EE. UU. Este (Miami, Nueva York)" },
  { id: "America/Chicago", nombre: "EE. UU. Centro (Houston, Chicago)" },
  { id: "America/Denver", nombre: "EE. UU. Montaña (Denver)" },
  { id: "America/Los_Angeles", nombre: "EE. UU. Pacífico (Los Ángeles)" },
  { id: "America/Caracas", nombre: "Venezuela" },
  { id: "America/Santo_Domingo", nombre: "República Dominicana · Puerto Rico" },
  { id: "America/Guatemala", nombre: "Centroamérica" },
  { id: "America/Santiago", nombre: "Chile" },
  { id: "America/Argentina/Buenos_Aires", nombre: "Argentina · Uruguay" },
  { id: "America/Sao_Paulo", nombre: "Brasil (São Paulo)" },
  { id: "Europe/Madrid", nombre: "España (península)" },
  { id: "Europe/London", nombre: "Reino Unido · Portugal" },
];

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
  zonaHolman: string;
  horas: string[];
};

export const pedirHorarios = (tipo: TipoId) => llamar<Horarios>("horarios", { tipo });

export type Reserva = { id: string; tipo: TipoId; inicio: string; fin: string; zoom_url: string | null; nombre: string };

export const reservarCita = (datos: {
  tipo: TipoId; inicio: string; nombre: string; email: string; whatsapp?: string; motivo?: string; zona: string; ref?: string | null;
}) => llamar<{ ok: true; cita: Reserva }>("reservar", datos);

export const cancelarConToken = (token: string) => llamar<{ ok: true; otraVez?: string; yaEstaba?: boolean }>("cancelar", { token });

// ---------------------------------------------------------------------------
// La Torre
// ---------------------------------------------------------------------------

export function useAgendaAdmin() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [ajustes, setAjustes] = useState<Ajustes | null>(null);
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const sb = getSupabase();
    const [c, a, b] = await Promise.all([
      sb.from("hgg_citas").select("*").order("inicio", { ascending: true }),
      sb.from("hgg_agenda_ajustes").select("*").eq("id", 1).maybeSingle(),
      sb.from("hgg_agenda_bloqueos").select("*").gte("hasta", new Date().toISOString()).order("desde"),
    ]);
    const err = c.error ?? a.error ?? b.error;
    setError(err ? err.message : null);
    setCitas((c.data ?? []) as Cita[]);
    setAjustes((a.data ?? null) as Ajustes | null);
    setBloqueos((b.data ?? []) as Bloqueo[]);
    setLoading(false);
  }, []);

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
    citas, ajustes, bloqueos, loading, error, recargar: cargar,
    actualizarCita, cancelarCita, reintentarZoom, guardarAjustes, agregarBloqueo, borrarBloqueo,
  };
}
