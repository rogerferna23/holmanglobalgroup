import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase";
import { SITE } from "@/lib/config";
import { useAuth } from "@/contexts/AuthContext";
import { EMPTY_PROGRESS, type EcosMember, type MemberProfile, type Plan, type Progress } from "@/lib/ecos";
import { CLUB } from "@/lib/routes";

/**
 * Estado del miembro de ECOS. Se apoya en AuthContext para la sesión (es el
 * mismo Supabase Auth) y añade lo propio del club: la ficha en `ecos_members`,
 * su progreso (XP, racha, insignias), el alta con Stripe y el portal.
 *
 * Quién puede entrar lo decide `member.status`, que solo escribe el webhook de
 * Stripe. El XP solo lo escriben funciones del servidor: el navegador pide
 * («asistí», «visto», «presenté mi reto») y el servidor decide y suma.
 */

export type SignUpProfile = MemberProfile & { email: string; password: string };

export type ClubContextValue = {
  member: EcosMember | null;
  progress: Progress;
  loading: boolean;
  isActive: boolean;
  refresh: () => Promise<void>;
  signUp: (p: SignUpProfile) => Promise<{ error: string | null; needsConfirm: boolean }>;
  startCheckout: (ref?: string, plan?: Plan) => Promise<{ error: string | null; clientSecret: string | null }>;
  openPortal: () => Promise<{ error: string | null }>;
  updateProfile: (patch: Partial<MemberProfile>) => Promise<{ error: string | null }>;
  markAttendance: (sessionId: string) => Promise<{ error: string | null; points?: number }>;
  markViewed: (libraryId: string) => Promise<{ error: string | null; points?: number }>;
  markReto: (retoId: string) => Promise<{ error: string | null; points?: number }>;
};

export const ClubContext = createContext<ClubContextValue | null>(null);

async function callFunction<T>(name: string, body: unknown): Promise<{ data: T | null; error: string | null }> {
  const sb = getSupabase();
  const { data: sess } = await sb.auth.getSession();
  const jwt = sess.session?.access_token;
  if (!jwt) return { data: null, error: "Inicia sesión para continuar." };
  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string },
      body: JSON.stringify(body ?? {}),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string } & T;
    if (!res.ok) return { data: null, error: json.error || "No se pudo completar la operación." };
    return { data: json as T, error: null };
  } catch {
    // Aquí caen dos cosas que el navegador no distingue: que de verdad no haya
    // red, y que la función no responda (sin desplegar, o caída) — en ese caso
    // la respuesta llega sin cabeceras CORS y el fetch falla igual. El mensaje
    // sirve para ambas y le dice a la persona qué hacer.
    return {
      data: null,
      error: `No pudimos conectar con el sistema de pagos. Revisa tu conexión, o escríbenos por WhatsApp al ${SITE.phone.display} y te ayudamos a entrar.`,
    };
  }
}

type RpcResult = { ok?: boolean; already?: boolean; points?: number };

export function ClubProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [member, setMember] = useState<EcosMember | null>(null);
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    const { data } = await getSupabase().rpc("ecos_my_progress");
    if (data && typeof data === "object") setProgress({ ...EMPTY_PROGRESS, ...(data as Partial<Progress>) });
  }, []);

  const refresh = useCallback(async () => {
    if (!session?.user) {
      setMember(null);
      setProgress(EMPTY_PROGRESS);
      setLoading(false);
      return;
    }
    const sb = getSupabase();
    const { data } = await sb.from("ecos_members").select("*").eq("id", session.user.id).maybeSingle();
    const m = (data as EcosMember | null) ?? null;
    setMember(m);
    if (m?.status === "activo") await loadProgress();
    else setProgress(EMPTY_PROGRESS);
    setLoading(false);
  }, [session, loadProgress]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    void refresh();
  }, [authLoading, refresh]);

  const signUp = useCallback(async (p: SignUpProfile) => {
    let sb: ReturnType<typeof getSupabase>;
    try {
      sb = getSupabase();
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Registro no disponible.", needsConfirm: false };
    }
    const { email, password, ...profile } = p;
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      // Solo el perfil: el rol lo fija el servidor y nunca sale de aquí.
      options: { data: profile, emailRedirectTo: `${window.location.origin}${CLUB.entrar}` },
    });
    if (error) return { error: error.message, needsConfirm: false };
    return { error: null, needsConfirm: !data.session };
  }, []);

  // Devuelve el secreto de la sesión para montar el pago DENTRO del sitio.
  // Antes mandaba a la página de Stripe; ahora nadie sale de aquí.
  const startCheckout = useCallback(async (ref?: string, plan: Plan = "mensual") => {
    const { data, error } = await callFunction<{ clientSecret: string }>("ecos-checkout", { ref: ref || undefined, plan });
    if (error || !data?.clientSecret) return { error: error || "No se pudo abrir el pago.", clientSecret: null };
    return { error: null, clientSecret: data.clientSecret };
  }, []);

  const openPortal = useCallback(async () => {
    const { data, error } = await callFunction<{ url: string }>("ecos-portal", {});
    if (error || !data?.url) return { error: error || "No se pudo abrir el portal." };
    window.location.assign(data.url);
    return { error: null };
  }, []);

  const updateProfile = useCallback(async (patch: Partial<MemberProfile>) => {
    if (!member) return { error: "Sin membresía." };
    const { error } = await getSupabase().from("ecos_members").update(patch).eq("id", member.id);
    if (error) return { error: error.message };
    setMember({ ...member, ...patch });
    return { error: null };
  }, [member]);

  const rpc = useCallback(async (fn: string, args: Record<string, string>) => {
    const { data, error } = await getSupabase().rpc(fn, args);
    if (error) return { error: error.message };
    const r = (data ?? {}) as RpcResult;
    await loadProgress();
    return { error: null, points: r.already ? 0 : r.points };
  }, [loadProgress]);

  const markAttendance = useCallback((sessionId: string) => rpc("ecos_mark_attendance", { p_session: sessionId }), [rpc]);
  const markViewed = useCallback((libraryId: string) => rpc("ecos_mark_viewed", { p_library: libraryId }), [rpc]);
  const markReto = useCallback((retoId: string) => rpc("ecos_mark_reto", { p_reto: retoId }), [rpc]);

  return (
    <ClubContext.Provider
      value={{
        member, progress, loading: authLoading || loading, isActive: member?.status === "activo",
        refresh, signUp, startCheckout, openPortal, updateProfile, markAttendance, markViewed, markReto,
      }}
    >
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error("useClub debe usarse dentro de un ClubProvider");
  return ctx;
}
