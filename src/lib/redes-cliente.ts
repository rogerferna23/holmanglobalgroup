/**
 * Redes del cliente y equipo por programa (nov 2026).
 *
 * Sol (o quien Holman asigne) lleva las redes de algunos clientes. Lo ve en su
 * panel del club, en «Mis clientes» (CLUB.equipo), y anota tres cosas:
 * publicaciones con su estado, números del mes por red y notas de avance.
 * El cliente lo ve en «Mi proceso» → «Tus redes» y aprueba las piezas.
 * Holman lo ve y lo edita todo desde Torre → Clientes → Programas.
 *
 * Datos: hgg_programa_equipo, hgg_redes_publicaciones, hgg_redes_numeros,
 * hgg_redes_notas (migración 20261123_hgg_redes_equipo.sql). La seguridad
 * está en RLS: Sol no lee hgg_programas, solo hgg_equipo_mis_clientes().
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { newId } from "@/lib/admin-store";

export const REDES = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "youtube", label: "YouTube" },
  { id: "otra", label: "Otra" },
] as const;
export type RedId = (typeof REDES)[number]["id"];

export const TIPOS_PIEZA = [
  { id: "reel", label: "Reel" },
  { id: "post", label: "Post" },
  { id: "carrusel", label: "Carrusel" },
  { id: "historia", label: "Historia" },
  { id: "video", label: "Video" },
] as const;

export type EstadoPieza = "diseno" | "aprobar" | "aprobada" | "publicada";
export const ESTADOS_PIEZA: { id: EstadoPieza; label: string }[] = [
  { id: "diseno", label: "En diseño" },
  { id: "aprobar", label: "Para aprobar" },
  { id: "aprobada", label: "Aprobada" },
  { id: "publicada", label: "Publicada" },
];

export type Publicacion = {
  id: string;
  programa_id: string;
  fecha: string;
  red: string;
  tipo: string;
  titulo: string;
  enlace: string | null;
  estado: EstadoPieza;
  autor: string | null;
  created_at: string;
};

export type NumerosMes = {
  id: string;
  programa_id: string;
  /** Primer día del mes (YYYY-MM-01). */
  mes: string;
  red: string;
  seguidores: number | null;
  alcance: number | null;
  mensajes: number | null;
  autor: string | null;
  created_at: string;
};

export type NotaRedes = {
  id: string;
  programa_id: string;
  fecha: string;
  texto: string;
  necesita: string | null;
  autor: string | null;
  created_at: string;
};

export type MiembroEquipo = {
  id: string;
  programa_id: string;
  email: string;
  nombre: string;
  rol: string;
  created_at: string;
};

export type RedesData = {
  publicaciones: Publicacion[];
  numeros: NumerosMes[];
  notas: NotaRedes[];
  equipo: MiembroEquipo[];
};

/** Lo que Sol ve de cada cliente: sin meta, creencias, rueda ni actas. */
export type ClienteEquipo = {
  id: string;
  nombre: string;
  email: string;
  titulo: string;
  producto: string;
  etapas: string[];
  etapa_actual: number;
  estado: "activo" | "pausado" | "terminado";
  inicio: string;
  sesiones_total: number | null;
  sesiones_hechas: number;
  rol: string;
};

const VACIO: RedesData = { publicaciones: [], numeros: [], notas: [], equipo: [] };

export const labelRed = (id: string) => REDES.find((r) => r.id === id)?.label ?? id;
export const labelTipo = (id: string) => TIPOS_PIEZA.find((t) => t.id === id)?.label ?? id;
export const labelEstado = (id: EstadoPieza) => ESTADOS_PIEZA.find((e) => e.id === id)?.label ?? id;

/** «noviembre de 2026». */
export function mesLargo(iso: string): string {
  const d = new Date(`${iso.slice(0, 7)}-15T12:00:00`);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("es-US", { month: "long", year: "numeric" }) : iso;
}

/** «1.240» */
export const num = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("es-CO"));

// ---------------------------------------------------------------------------
// Vista previa (sin Supabase)
// ---------------------------------------------------------------------------

/** Datos de ejemplo: las redes de todos los programas + los clientes de Sol. */
export type RedesMock = RedesData & { misClientes: ClienteEquipo[] };
export const RedesMockContext = createContext<RedesMock | null>(null);

// ---------------------------------------------------------------------------
// Las redes de un programa (Holman, Sol y el cliente leen lo mismo)
// ---------------------------------------------------------------------------

type Tabla = "publicaciones" | "numeros" | "notas" | "equipo";
const TABLA: Record<Tabla, string> = {
  publicaciones: "hgg_redes_publicaciones",
  numeros: "hgg_redes_numeros",
  notas: "hgg_redes_notas",
  equipo: "hgg_programa_equipo",
};

/**
 * Las redes de uno o varios programas. RLS decide qué devuelve: el admin ve
 * todo, Sol solo los que tiene asignados y el cliente solo los suyos.
 */
export function useRedes(programaIds: string[]) {
  const mock = useContext(RedesMockContext);
  const clave = programaIds.join(",");
  const filtrar = useCallback(
    (d: RedesData): RedesData => {
      const ids = new Set(clave.split(",").filter(Boolean));
      return {
        publicaciones: d.publicaciones.filter((x) => ids.has(x.programa_id)),
        numeros: d.numeros.filter((x) => ids.has(x.programa_id)),
        notas: d.notas.filter((x) => ids.has(x.programa_id)),
        equipo: d.equipo.filter((x) => ids.has(x.programa_id)),
      };
    },
    [clave],
  );
  const [data, setData] = useState<RedesData>(mock ? filtrar(mock) : VACIO);
  const [loading, setLoading] = useState(!mock);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (mock) { setData(filtrar(mock)); setLoading(false); return; }
    const ids = clave.split(",").filter(Boolean);
    if (!ids.length) { setData(VACIO); setLoading(false); return; }
    const sb = getSupabase();
    const [p, n, t, e] = await Promise.all([
      sb.from(TABLA.publicaciones).select("*").in("programa_id", ids).order("fecha", { ascending: false }),
      sb.from(TABLA.numeros).select("*").in("programa_id", ids).order("mes", { ascending: false }),
      sb.from(TABLA.notas).select("*").in("programa_id", ids).order("fecha", { ascending: false }),
      sb.from(TABLA.equipo).select("*").in("programa_id", ids),
    ]);
    // Sin la migración todavía: nada que mostrar, sin romper la página.
    const err = p.error ?? n.error ?? t.error ?? e.error;
    setError(err ? err.message : null);
    setData({
      publicaciones: (p.data ?? []) as Publicacion[],
      numeros: (n.data ?? []) as NumerosMes[],
      notas: (t.data ?? []) as NotaRedes[],
      equipo: (e.data ?? []) as MiembroEquipo[],
    });
    setLoading(false);
  }, [mock, clave, filtrar]);

  useEffect(() => {
    cargar().catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  }, [cargar]);

  /** Inserta, actualiza o borra; en la vista previa, solo en memoria. */
  const escribir = useCallback(
    async <K extends Tabla>(
      clave: K,
      op: { insertar?: Omit<RedesData[K][number], "id" | "created_at">; actualizar?: { id: string; cambios: Partial<RedesData[K][number]> }; borrar?: string },
    ): Promise<string | null> => {
      if (mock) {
        setData((d) => {
          let filas = d[clave] as Array<{ id: string }>;
          if (op.insertar) filas = [{ ...op.insertar, id: newId("r"), created_at: new Date().toISOString() } as { id: string }, ...filas];
          if (op.actualizar) filas = filas.map((f) => (f.id === op.actualizar!.id ? { ...f, ...op.actualizar!.cambios } : f));
          if (op.borrar) filas = filas.filter((f) => f.id !== op.borrar);
          return { ...d, [clave]: filas };
        });
        return null;
      }
      const t = getSupabase().from(TABLA[clave]);
      const { error: e } = op.insertar
        ? clave === "numeros"
          ? await t.upsert(op.insertar as Record<string, unknown>, { onConflict: "programa_id,mes,red" })
          : await t.insert(op.insertar as Record<string, unknown>)
        : op.actualizar
          ? await t.update(op.actualizar.cambios as Record<string, unknown>).eq("id", op.actualizar.id)
          : await t.delete().eq("id", op.borrar!);
      if (e) return e.message;
      await cargar();
      return null;
    },
    [mock, cargar],
  );

  /** El cliente aprueba una pieza «para aprobar». */
  const aprobar = useCallback(async (id: string): Promise<string | null> => {
    setData((d) => ({ ...d, publicaciones: d.publicaciones.map((x) => (x.id === id ? { ...x, estado: "aprobada" } : x)) }));
    if (mock) return null;
    const { error: e } = await getSupabase().rpc("hgg_redes_aprobar", { p_id: id });
    if (e) { await cargar(); return e.message; }
    return null;
  }, [mock, cargar]);

  return { ...data, loading, error, escribir, aprobar, recargar: cargar, preview: !!mock };
}

// ---------------------------------------------------------------------------
// Lo que ve Sol en su panel
// ---------------------------------------------------------------------------

/** Los clientes que Holman le asignó a quien entró. Vacío si no es del equipo. */
export function useMisClientesEquipo() {
  const mock = useContext(RedesMockContext);
  const [clientes, setClientes] = useState<ClienteEquipo[] | null>(mock ? mock.misClientes : null);
  useEffect(() => {
    if (mock) return;
    let vivo = true;
    getSupabase().rpc("hgg_equipo_mis_clientes").then(
      ({ data, error }) => { if (vivo) setClientes(error ? [] : ((data ?? []) as ClienteEquipo[])); },
      () => { if (vivo) setClientes([]); },
    );
    return () => { vivo = false; };
  }, [mock]);
  return clientes;
}
