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
  // Fallback a "admin" si la query tarda mas de 3s (network lenta).
  const loadProfile = useCallback(async (userId: string, email: string) => {
    const sb = getSupabase();
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 3000);
      const { data } = await sb
        .from("profiles")
        .select("id, email, name, role")
        .eq("id", userId)
        .abortSignal(ctrl.signal)
        .maybeSingle();
      clearTimeout(timeout);
      if (data) {
        setProfile(data as Profile);
      } else {
        // Si no existe perfil, lo creamos como admin por defecto
        setProfile({ id: userId, email, name: null, role: "admin" });
      }
    } catch {
      // Fallback seguro
      setProfile({ id: userId, email, name: null, role: "admin" });
    }
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    let mounted = true;

    sb.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        void loadProfile(data.session.user.id, data.session.user.email || "");
      }
      setLoading(false);
    });

    const { data: subscription } = sb.auth.onAuthStateChange((_evt, sess) => {
      if (!mounted) return;
      setSession(sess);
      if (sess?.user) {
        void loadProfile(sess.user.id, sess.user.email || "");
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
      // Forzar limpieza local si signOut falla
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("sb-") || k === "hgg-auth") localStorage.removeItem(k);
      });
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
