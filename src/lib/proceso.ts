/**
 * «Mi proceso»: el avance de cada cliente de HGG (fase 1, oct 2026).
 *
 * Holman abre un programa por cliente desde la Torre (Clientes). El cliente lo
 * ve dentro del club, en /ecos/panel/proceso: su meta, su camino por etapas,
 * sus sesiones con el acta, sus compromisos y su Rueda de la Vida antes y
 * ahora. Mientras el programa está vigente tiene el club incluido (la base lo
 * marca con la cortesía del programa; ver 20261021_hgg_procesos.sql).
 *
 * Lo que se lee y escribe va directo a Supabase; la seguridad está en RLS.
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { newId } from "@/lib/admin-store";
import { AREAS, type AreaId } from "@/lib/test-heridas";

export type EstadoPrograma = "activo" | "pausado" | "terminado";

export type Programa = {
  id: string;
  user_id: string | null;
  email: string;
  nombre: string;
  producto: string;
  titulo: string;
  etapas: string[];
  etapa_actual: number;
  meta: string | null;
  meta_fecha: string | null;
  sesiones_total: number | null;
  inicio: string;
  estado: EstadoPrograma;
  pausado_at: string | null;
  terminado_at: string | null;
  created_at: string;
};

export type SesionPrograma = {
  id: string;
  programa_id: string;
  fecha: string;
  titulo: string;
  resumen: string | null;
  acta_path: string | null;
  created_at: string;
};

export type Compromiso = {
  id: string;
  programa_id: string;
  sesion_id: string | null;
  texto: string;
  fecha_limite: string | null;
  hecho: boolean;
  hecho_at: string | null;
  created_at: string;
};

export type Medicion = {
  id: string;
  programa_id: string;
  tipo: "rueda";
  fecha: string;
  valores: Partial<Record<AreaId, number>>;
  nota: string | null;
  created_at: string;
};

export type ProcesoData = {
  programas: Programa[];
  sesiones: SesionPrograma[];
  compromisos: Compromiso[];
  mediciones: Medicion[];
};

const VACIO: ProcesoData = { programas: [], sesiones: [], compromisos: [], mediciones: [] };

/** Los programas que se abren desde la Torre. Sentido primero: es la fase 1. */
export const PRODUCTOS_PROGRAMA: { id: string; titulo: string; sesiones: number | null; etapas: string[] }[] = [
  { id: "sentido-starter", titulo: "Programa Sentido Starter", sesiones: 3, etapas: ["Claridad", "Identidad", "Acción"] },
  { id: "sentido-pro", titulo: "Programa Sentido Pro", sesiones: 6, etapas: ["Claridad", "Identidad", "Acción"] },
  { id: "sentido-elite", titulo: "Programa Sentido Elite", sesiones: 10, etapas: ["Claridad", "Identidad", "Acción"] },
  { id: "marca", titulo: "Marca con Huella", sesiones: null, etapas: ["Brief", "Identidad", "Web", "Lanzamiento"] },
  { id: "otro", titulo: "Programa a medida", sesiones: null, etapas: ["Claridad", "Identidad", "Acción"] },
];

export const ESTADO_LABEL: Record<EstadoPrograma, string> = {
  activo: "Activo",
  pausado: "En pausa",
  terminado: "Terminado",
};

export { AREAS };

/** El programa que se muestra primero: el vigente más reciente. */
export function programaPrincipal(programas: Programa[]): Programa | null {
  const orden = [...programas].sort((a, b) => b.inicio.localeCompare(a.inicio));
  return orden.find((p) => p.estado === "activo") ?? orden.find((p) => p.estado === "pausado") ?? orden[0] ?? null;
}

/** Promedio de la Rueda (1 a 10), o null si no tiene valores. */
export function promedioRueda(m: Medicion | undefined): number | null {
  if (!m) return null;
  const v = Object.values(m.valores).filter((x): x is number => typeof x === "number");
  return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 : null;
}

/** «12 de octubre». Las fechas de la base vienen sin hora (YYYY-MM-DD). */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("es-US", { day: "numeric", month: "long" }) : "—";
}

// ---------------------------------------------------------------------------
// Vista previa de desarrollo (sin Supabase)
// ---------------------------------------------------------------------------

/** Datos de ejemplo para /ecos/preview. Con `null` dentro, el panel lee la base. */
export const ProcesoMockContext = createContext<ProcesoData | null>(null);

// ---------------------------------------------------------------------------
// Lo que ve el cliente
// ---------------------------------------------------------------------------

/** El proceso de quien entró. Asocia por correo los programas abiertos antes de crear su cuenta. */
export function useMiProceso() {
  const mock = useContext(ProcesoMockContext);
  const [data, setData] = useState<ProcesoData>(mock ?? VACIO);
  const [loading, setLoading] = useState(!mock);

  const cargar = useCallback(async () => {
    if (mock) return;
    const sb = getSupabase();
    await sb.rpc("hgg_vincular_mis_programas").then(() => undefined, () => undefined);
    const { data: auth } = await sb.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { setData(VACIO); setLoading(false); return; }
    const { data: programas } = await sb.from("hgg_programas").select("*").eq("user_id", uid);
    const ids = ((programas ?? []) as Programa[]).map((p) => p.id);
    if (!ids.length) { setData(VACIO); setLoading(false); return; }
    const [s, c, m] = await Promise.all([
      sb.from("hgg_programa_sesiones").select("*").in("programa_id", ids).order("fecha", { ascending: false }),
      sb.from("hgg_compromisos").select("*").in("programa_id", ids).order("created_at", { ascending: false }),
      sb.from("hgg_mediciones").select("*").in("programa_id", ids).order("fecha", { ascending: true }),
    ]);
    setData({
      programas: (programas ?? []) as Programa[],
      sesiones: (s.data ?? []) as SesionPrograma[],
      compromisos: (c.data ?? []) as Compromiso[],
      mediciones: (m.data ?? []) as Medicion[],
    });
    setLoading(false);
  }, [mock]);

  useEffect(() => {
    cargar().catch((e: unknown) => { console.error("[proceso]", e); setLoading(false); });
  }, [cargar]);

  const marcar = useCallback(async (id: string, hecho: boolean) => {
    setData((d) => ({ ...d, compromisos: d.compromisos.map((c) => (c.id === id ? { ...c, hecho, hecho_at: hecho ? new Date().toISOString() : null } : c)) }));
    if (mock) return null;
    const { error } = await getSupabase().rpc("hgg_marcar_compromiso", { p_id: id, p_hecho: hecho });
    if (error) { await cargar(); return error.message; }
    return null;
  }, [mock, cargar]);

  return { ...data, loading, marcar, recargar: cargar, preview: !!mock };
}

/**
 * Solo si tiene algún programa (para el candado del menú). Una consulta
 * mínima: el detalle lo carga la página.
 */
export function useTienePrograma(): boolean | null {
  const mock = useContext(ProcesoMockContext);
  const [tiene, setTiene] = useState<boolean | null>(mock ? mock.programas.length > 0 : null);
  useEffect(() => {
    if (mock) return;
    let vivo = true;
    void (async () => {
      try {
        const sb = getSupabase();
        const { data: auth } = await sb.auth.getUser();
        if (!auth.user) { if (vivo) setTiene(false); return; }
        const { count, error } = await sb.from("hgg_programas").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id);
        // Sin la tabla todavía (migración sin correr) no se pinta candado: mejor nada que uno falso.
        if (vivo) setTiene(error ? null : (count ?? 0) > 0);
      } catch {
        if (vivo) setTiene(null);
      }
    })();
    return () => { vivo = false; };
  }, [mock]);
  return tiene;
}

/** Enlace temporal (1 hora) para descargar un acta del bucket privado. */
export async function enlaceActa(path: string): Promise<string | null> {
  const { data, error } = await getSupabase().storage.from("procesos").createSignedUrl(path, 3600);
  if (error) { console.error("[proceso] acta", error); return null; }
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Lo que hace Holman (Torre → Clientes)
// ---------------------------------------------------------------------------

/** Todo de todos los clientes. Con datos de ejemplo en la vista previa. */
export function useProcesosAdmin() {
  const mock = useContext(ProcesoMockContext);
  const [data, setData] = useState<ProcesoData>(mock ?? VACIO);
  const [loading, setLoading] = useState(!mock);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (mock) return;
    const sb = getSupabase();
    const [p, s, c, m] = await Promise.all([
      sb.from("hgg_programas").select("*").order("created_at", { ascending: false }),
      sb.from("hgg_programa_sesiones").select("*").order("fecha", { ascending: false }),
      sb.from("hgg_compromisos").select("*").order("created_at", { ascending: false }),
      sb.from("hgg_mediciones").select("*").order("fecha", { ascending: true }),
    ]);
    const err = p.error ?? s.error ?? c.error ?? m.error;
    setError(err ? err.message : null);
    setData({
      programas: (p.data ?? []) as Programa[],
      sesiones: (s.data ?? []) as SesionPrograma[],
      compromisos: (c.data ?? []) as Compromiso[],
      mediciones: (m.data ?? []) as Medicion[],
    });
    setLoading(false);
  }, [mock]);

  useEffect(() => {
    cargar().catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  }, [cargar]);

  /** Inserta, actualiza o borra en una tabla; en la vista previa, solo en memoria. */
  const escribir = useCallback(
    async <K extends keyof ProcesoData>(
      clave: K,
      tabla: string,
      op: { insertar?: ProcesoData[K][number]; actualizar?: { id: string; cambios: Partial<ProcesoData[K][number]> }; borrar?: string },
    ): Promise<string | null> => {
      if (mock) {
        setData((d) => {
          let filas = d[clave] as Array<{ id: string }>;
          if (op.insertar) filas = [op.insertar as { id: string }, ...filas];
          if (op.actualizar) filas = filas.map((f) => (f.id === op.actualizar!.id ? { ...f, ...op.actualizar!.cambios } : f));
          if (op.borrar) filas = filas.filter((f) => f.id !== op.borrar);
          return { ...d, [clave]: filas };
        });
        return null;
      }
      const t = getSupabase().from(tabla);
      const { error: e } = op.insertar
        ? await t.insert(op.insertar as Record<string, unknown>)
        : op.actualizar
          ? await t.update(op.actualizar.cambios as Record<string, unknown>).eq("id", op.actualizar.id)
          : await t.delete().eq("id", op.borrar!);
      if (e) return e.message;
      await cargar();
      return null;
    },
    [mock, cargar],
  );

  /** Sube el acta en PDF al bucket privado y devuelve su ruta. */
  const subirActa = useCallback(async (programaId: string, archivo: File): Promise<{ path: string | null; error: string | null }> => {
    const path = `${programaId}/${newId("acta")}.pdf`;
    if (mock) return { path, error: null };
    const { error: e } = await getSupabase().storage.from("procesos").upload(path, archivo, { contentType: "application/pdf" });
    return e ? { path: null, error: e.message } : { path, error: null };
  }, [mock]);

  return { ...data, loading, error, escribir, subirActa, recargar: cargar, preview: !!mock };
}

export { newId };
