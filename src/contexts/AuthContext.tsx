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

/**
 * Por qué hay sesión pero no perfil. Antes esto no existía y cualquier fallo
 * acababa en `signOut()` silencioso: entrabas con tu contraseña, la sesión se
 * destruía sola y volvías al login SIN NINGÚN MENSAJE. Desde fuera parecía
 * "el panel no me deja entrar" y no había forma de saber por qué.
 *
 *   'sin-perfil'  → la fila de `profiles` no existe o RLS no deja leerla
 *                   (Supabase devuelve 0 filas sin error en ambos casos).
 *   'sin-conexion'→ no se pudo hablar con Supabase (red, timeout, proyecto caído).
 *                   NO cerramos sesión: al recuperar la red basta con reintentar.
 */
export type AuthIssue = "sin-perfil" | "sin-conexion" | null;

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** Por qué falta el perfil, si falta. */
  issue: AuthIssue;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Reintenta cargar el perfil (para el botón de la pantalla de error). */
  reloadProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [issue, setIssue] = useState<AuthIssue>(null);
  const [loading, setLoading] = useState(true);

  // Cargar el profile del usuario desde la tabla `profiles`.
  // NUNCA fabricar un profile local con rol — sería escalación de privilegios.
  //
  // Tampoco cerramos la sesión cuando falla: el acceso al panel lo decide
  // ProtectedRoute exigiendo `profile`, y así podemos explicar en pantalla QUÉ
  // ha fallado en vez de rebotar al login sin decir nada. La sesión sin perfil
  // no abre ninguna puerta: RLS sigue bloqueando todo del lado del servidor.
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
      if (error) {
        // Error real de Supabase (red, proyecto caído, tabla inexistente).
        console.warn("[auth] no se pudo consultar profiles", error);
        setProfile(null);
        setIssue("sin-conexion");
        return;
      }
      if (!data) {
        // 0 filas: o no hay perfil para este usuario, o RLS no deja leerlo.
        console.warn("[auth] el usuario no tiene fila en profiles (o RLS la oculta)");
        setProfile(null);
        setIssue("sin-perfil");
        return;
      }
      setProfile(data as Profile);
      setIssue(null);
    } catch (err) {
      // Timeout del AbortController o fallo de fetch.
      console.warn("[auth] error cargando profile", err);
      setProfile(null);
      setIssue("sin-conexion");
    }
  }, []);

  const reloadProfile = useCallback(async () => {
    const sb = getSupabase();
    const { data } = await sb.auth.getSession();
    if (data.session?.user) await loadProfile(data.session.user.id);
  }, [loadProfile]);

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
        setIssue(null);
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
    setIssue(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        profile,
        issue,
        loading,
        signIn,
        signOut,
        reloadProfile,
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
