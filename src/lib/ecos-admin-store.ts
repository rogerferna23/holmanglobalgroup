// Store de la sección ECOS del panel de administración. Lee y escribe directo
// a Supabase; la seguridad está en las policies (is_admin()).
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { EcosLibraryItem, EcosMember, EcosReto, EcosSession, Skill } from "@/lib/ecos";
import { newId } from "@/lib/admin-store";

/** Filas de ejemplo por tabla, solo para la vista previa de desarrollo. */
export const AdminEcosMockContext = createContext<Record<string, unknown[]> | null>(null);

function useTable<T extends { id?: string | number }>(table: string, order: { col: string; asc: boolean }) {
  const mock = useContext(AdminEcosMockContext);
  const [data, setData] = useState<T[]>(() => (mock?.[table] as T[] | undefined) ?? []);
  const [loading, setLoading] = useState(!mock);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (mock) return;
    const { data: rows, error: err } = await getSupabase().from(table).select("*").order(order.col, { ascending: order.asc });
    if (err) { console.error(`[ecos-admin] ${table}`, err); setError(err.message); }
    else { setError(null); setData((rows ?? []) as T[]); }
    setLoading(false);
  }, [table, order.col, order.asc, mock]);

  useEffect(() => { void refresh(); }, [refresh]);

  const local = {
    insert: (row: T) => setData((d) => [...d, row]),
    update: (id: string, patch: Partial<T>) => setData((d) => d.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    remove: (id: string) => setData((d) => d.filter((r) => r.id !== id)),
  };
  return { data, loading, error, refresh, mock: !!mock, local };
}

/** CRUD genérico con soporte de vista previa. */
function useCrud<T extends { id: string }>(table: string, order: { col: string; asc: boolean }, prefix: string) {
  const t = useTable<T>(table, order);
  const add = useCallback(async (row: Omit<T, "id">) => {
    const full = { id: newId(prefix), ...row } as T;
    if (t.mock) { t.local.insert(full); return null; }
    const { error } = await getSupabase().from(table).insert(full);
    if (error) return error.message;
    await t.refresh();
    return null;
  }, [t, table, prefix]);
  const update = useCallback(async (id: string, patch: Partial<T>) => {
    if (t.mock) { t.local.update(id, patch); return null; }
    const { error } = await getSupabase().from(table).update(patch as Record<string, unknown>).eq("id", id);
    if (error) return error.message;
    await t.refresh();
    return null;
  }, [t, table]);
  const remove = useCallback(async (id: string) => {
    if (t.mock) { t.local.remove(id); return null; }
    const { error } = await getSupabase().from(table).delete().eq("id", id);
    if (error) return error.message;
    await t.refresh();
    return null;
  }, [t, table]);
  return { ...t, add, update, remove };
}

export function useEcosMembers() {
  return useTable<EcosMember>("ecos_members", { col: "created_at", asc: false });
}
export function useEcosSessions() {
  return useCrud<EcosSession>("ecos_sessions", { col: "starts_at", asc: true }, "ses");
}
export function useEcosLibrary() {
  return useCrud<EcosLibraryItem>("ecos_library", { col: "sort_order", asc: true }, "lib");
}
export function useEcosRetos() {
  return useCrud<EcosReto>("ecos_retos", { col: "month", asc: false }, "reto");
}

export type SettingRow = { id?: string; key: string; value: string; updated_at: string };
export function useEcosSettings() {
  const t = useTable<SettingRow>("ecos_settings", { col: "key", asc: true });
  const save = useCallback(async (key: string, value: string) => {
    if (t.mock) { t.local.update(key, { value }); return null; }
    const { error } = await getSupabase().from("ecos_settings").upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) return error.message;
    await t.refresh();
    return null;
  }, [t]);
  return { ...t, save };
}

export type GuestRow = {
  id: number; session_id: string | null; name: string; email: string; phone: string | null; whatsapp: string | null;
  invited_by: string | null; attended: boolean; converted_id: string | null; created_at: string;
};
export function useEcosGuests() {
  const t = useTable<GuestRow>("ecos_guests", { col: "created_at", asc: false });
  const setAttended = useCallback(async (id: number, attended: boolean) => {
    if (t.mock) { t.local.update(String(id), { attended }); return null; }
    const { error } = await getSupabase().from("ecos_guests").update({ attended }).eq("id", id);
    if (error) return error.message;
    await t.refresh();
    return null;
  }, [t]);
  return { ...t, setAttended };
}

export type PaymentRow = { id?: string; stripe_invoice_id: string; member_id: string | null; amount_usd: number; plan: string | null; paid_at: string };
export function useEcosPayments() {
  return useTable<PaymentRow>("ecos_payments", { col: "paid_at", asc: false });
}

export type RankingRow = { id: string; name: string; xp_ventas: number; xp_marketing: number; xp_oratoria: number; streak: number; badges: number };
export type AttendanceCount = { session_id: string; n: number };

/** Lecturas por RPC (ranking, asistentes por sesión) con soporte de vista previa. */
export function useEcosRpc<T>(fn: string, mockKey: string) {
  const mock = useContext(AdminEcosMockContext);
  const [data, setData] = useState<T[]>(() => (mock?.[mockKey] as T[] | undefined) ?? []);
  const [loading, setLoading] = useState(!mock);
  const refresh = useCallback(async () => {
    if (mock) return;
    const { data: rows, error } = await getSupabase().rpc(fn);
    if (!error) setData((rows ?? []) as T[]);
    setLoading(false);
  }, [fn, mock]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { data, loading, refresh };
}

export type CuentaSinMembresia = { id: string; email: string; name: string | null; created_at: string };

/** Cuentas registradas que todavía no tienen ficha en el club. */
export function useCuentasSinMembresia() {
  return useEcosRpc<CuentaSinMembresia>("ecos_cuentas_sin_membresia", "cuentas_sin_membresia");
}

/**
 * Da o quita una cortesía. Pasa por una función del servidor porque, además de
 * marcar la ficha, cancela la suscripción en Stripe si la había: la cortesía
 * no sirve de nada si Stripe le cobra igual cuando termine la prueba.
 */
export async function darCortesia(memberId: string, activar: boolean): Promise<{ error: string | null; cancelada: boolean }> {
  const sb = getSupabase();
  const { data: sess } = await sb.auth.getSession();
  const jwt = sess.session?.access_token;
  if (!jwt) return { error: "Tu sesión venció. Vuelve a entrar.", cancelada: false };
  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ecos-cortesia`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string },
      body: JSON.stringify({ member_id: memberId, activar }),
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string; suscripcionCancelada?: boolean };
    if (!res.ok) return { error: j.error || "No se pudo guardar la cortesía.", cancelada: false };
    return { error: null, cancelada: !!j.suscripcionCancelada };
  } catch {
    return { error: "No se pudo conectar con el servidor. ¿Está desplegada la función ecos-cortesia?", cancelada: false };
  }
}

export async function giveBonus(memberId: string, skill: Skill, points: number, note: string): Promise<string | null> {
  const { error } = await getSupabase().rpc("ecos_admin_bonus", { p_member: memberId, p_skill: skill, p_points: points, p_note: note });
  return error ? error.message : null;
}

export type AccessRow = { id?: string; member_id: string; library_id: string; granted_by: string; created_at: string };
export function useEcosCourseAccess() {
  const t = useTable<AccessRow>("ecos_course_access", { col: "created_at", asc: false });
  const grant = useCallback(async (member_id: string, library_id: string) => {
    const row = { id: `${member_id}-${library_id}`, member_id, library_id, granted_by: "admin", created_at: new Date().toISOString() };
    if (t.mock) { t.local.insert(row); return null; }
    const { error } = await getSupabase().from("ecos_course_access").upsert({ member_id, library_id, granted_by: "admin" });
    if (error) return error.message;
    await t.refresh();
    return null;
  }, [t]);
  const revoke = useCallback(async (member_id: string, library_id: string) => {
    if (t.mock) { t.local.remove(`${member_id}-${library_id}`); return null; }
    const { error } = await getSupabase().from("ecos_course_access").delete().eq("member_id", member_id).eq("library_id", library_id);
    if (error) return error.message;
    await t.refresh();
    return null;
  }, [t]);
  return { ...t, grant, revoke };
}
