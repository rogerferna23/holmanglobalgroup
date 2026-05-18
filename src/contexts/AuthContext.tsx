import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  role: "super" | "admin" | "vendor";
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar el profile del usuario desde la tabla `profiles`.
  // NUNCA fabricar un profile local con rol — sería escalación de privilegios.
  // Si falla la carga, se cierra la sesión.
  const loadProfile = useCallback(async (userId: string) => {
    const sb = getSupabase();
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 5000);
      const { data, error } = await sb
        .from("profiles")
        .select("id, email, name, role")
        .eq("id", userId)
        .abortSignal(ctrl.signal)
        .maybeSingle();
      clearTimeout(timeout);
      if (error || !data) {
        console.warn("[auth] profile no encontrado, cerrando sesión", error);
        await sb.auth.signOut();
        setProfile(null);
        return;
      }
      setProfile(data as Profile);
    } catch (err) {
      console.warn("[auth] error cargando profile, cerrando sesión", err);
      await sb.auth.signOut();
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    let mounted = true;

    sb.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        void loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: subscription } = sb.auth.onAuthStateChange((_evt, sess) => {
      if (!mounted) return;
      setSession(sess);
      if (sess?.user) {
        void loadProfile(sess.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    try {
      await Promise.race([
        sb.auth.signOut(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 3000)
        ),
      ]);
    } catch {
      // Continuar al sweep aunque falle
    }
    // Sweep SIEMPRE: success o failure (higiene).
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("sb-") || k === "hgg-auth") localStorage.removeItem(k);
      });
    } catch {
      /* localStorage no disponible */
    }
    setSession(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        profile,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return ctx;
}
