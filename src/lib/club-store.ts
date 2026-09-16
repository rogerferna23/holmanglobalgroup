// Lecturas del panel de miembros de ECOS. Todo pasa por RLS: un miembro solo
// recibe lo publicado y lo que ya desbloqueó por permanencia.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { EcosLibraryItem, EcosReto, EcosSession, EcosSettings } from "@/lib/ecos";

export type CatalogItem = Pick<EcosLibraryItem, "id" | "title" | "description" | "kind" | "cover_url" | "unlock_month" | "sort_order" | "parent_id" | "skill"> & { price_usd: number | null; has_access: boolean };

export type DirectoryEntry = {
  id: string; name: string | null; city: string | null; country: string | null; business: string | null;
  level_ventas: number; level_marketing: number; level_oratoria: number; badges: string[]; since: string | null;
};

/** Datos de ejemplo para la vista previa de desarrollo (src/dev). */
export type ClubMockData = {
  sessions: EcosSession[];
  settings: EcosSettings;
  library: EcosLibraryItem[];
  catalog: CatalogItem[];
  retos: EcosReto[];
  directory: DirectoryEntry[];
};
export const ClubMockContext = createContext<ClubMockData | null>(null);

function useQuery<T>(run: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      setData(await run());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar.");
    } finally {
      setLoading(false);
    }
  }, [run]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { data, loading, error, refresh };
}

export function useClubSessions() {
  const mock = useContext(ClubMockContext);
  const run = useCallback(async () => {
    if (mock) return mock.sessions;
    const { data, error } = await getSupabase().from("ecos_sessions").select("*").order("starts_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as EcosSession[];
  }, [mock]);
  const q = useQuery<EcosSession[]>(run, []);
  return { sessions: q.data, loading: q.loading, error: q.error };
}

export function useClubSettings() {
  const mock = useContext(ClubMockContext);
  const run = useCallback(async () => {
    if (mock) return mock.settings;
    const { data, error } = await getSupabase().from("ecos_settings").select("key, value");
    if (error) throw error;
    const out: EcosSettings = {};
    for (const r of data ?? []) out[r.key as string] = (r.value as string) ?? "";
    return out;
  }, [mock]);
  const q = useQuery<EcosSettings>(run, {});
  return { settings: q.data, loading: q.loading };
}

/** Lo que el miembro YA puede abrir (con url / video). */
export function useClubLibrary(kind?: EcosLibraryItem["kind"]) {
  const mock = useContext(ClubMockContext);
  const run = useCallback(async () => {
    if (mock) return kind ? mock.library.filter((i) => i.kind === kind) : mock.library;
    let query = getSupabase().from("ecos_library").select("*").order("unlock_month", { ascending: true }).order("sort_order", { ascending: true });
    if (kind) query = query.eq("kind", kind);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as EcosLibraryItem[];
  }, [kind, mock]);
  const q = useQuery<EcosLibraryItem[]>(run, []);
  return { items: q.data, loading: q.loading };
}

/** Todo lo publicado, sin url — para pintar lo que falta por desbloquear. */
export function useClubCatalog() {
  const mock = useContext(ClubMockContext);
  const run = useCallback(async () => {
    if (mock) return mock.catalog;
    const { data, error } = await getSupabase().rpc("ecos_library_catalog");
    if (error) throw error;
    return (data ?? []) as CatalogItem[];
  }, [mock]);
  const q = useQuery<CatalogItem[]>(run, []);
  return { catalog: q.data, loading: q.loading };
}

export function useClubRetos() {
  const mock = useContext(ClubMockContext);
  const run = useCallback(async () => {
    if (mock) return mock.retos;
    const { data, error } = await getSupabase().from("ecos_retos").select("*").order("month", { ascending: false });
    if (error) throw error;
    return (data ?? []) as EcosReto[];
  }, [mock]);
  const q = useQuery<EcosReto[]>(run, []);
  return { retos: q.data, loading: q.loading };
}

export function useClubDirectory() {
  const mock = useContext(ClubMockContext);
  const run = useCallback(async () => {
    if (mock) return mock.directory;
    const { data, error } = await getSupabase().rpc("ecos_directory");
    if (error) throw error;
    return (data ?? []) as DirectoryEntry[];
  }, [mock]);
  const q = useQuery<DirectoryEntry[]>(run, []);
  return { directory: q.data, loading: q.loading };
}

/** Próxima sesión: la primera que no haya terminado (se da 90 min de margen). */
export function nextSession(sessions: EcosSession[], now = Date.now()): EcosSession | null {
  const margin = 90 * 60 * 1000;
  return sessions.find((s) => new Date(s.starts_at).getTime() + margin >= now) ?? null;
}

/** Ventana para marcar «asistí»: desde que empieza hasta 36 h después. */
export function canMarkAttendance(s: EcosSession, now = Date.now()): boolean {
  const start = new Date(s.starts_at).getTime();
  return now >= start && now <= start + 36 * 3600 * 1000;
}

/** El reto vigente: el del mes actual, o el más reciente. */
export function currentReto(retos: EcosReto[], now = new Date()): EcosReto | null {
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return retos.find((r) => r.month.startsWith(ym)) ?? retos[0] ?? null;
}

/** Sesiones del mes actual (o del próximo si este ya pasó). */
export function monthSessions(sessions: EcosSession[], now = new Date()): EcosSession[] {
  const inMonth = (d: Date, ref: Date) => d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
  const thisMonth = sessions.filter((s) => inMonth(new Date(s.starts_at), now));
  if (thisMonth.length) return thisMonth;
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return sessions.filter((s) => inMonth(new Date(s.starts_at), next));
}

export type FounderSpots = { cap: number; taken: number; left: number };

/**
 * Cuántos lugares de fundador quedan. Lo lee la landing pública mediante una
 * función que solo devuelve el conteo. Si Supabase no está configurado o falla,
 * devuelve null y la página muestra el texto genérico.
 */
export function useFounderSpots() {
  const [spots, setSpots] = useState<FounderSpots | null>(null);
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data, error } = await getSupabase().rpc("ecos_founder_spots");
        if (!vivo || error || !data) return;
        setSpots(data as FounderSpots);
      } catch {
        /* sin Supabase: la página funciona igual */
      }
    })();
    return () => { vivo = false; };
  }, []);
  return spots;
}
