import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Puerta del panel. Exige sesión Y perfil cargado.
 *
 * Antes solo comprobaba `session`, y cuando el perfil no se podía leer el
 * AuthContext cerraba la sesión por su cuenta: el resultado era un rebote al
 * login sin ningún mensaje. Ahora, si hay sesión pero no perfil, se explica en
 * pantalla qué pasa y qué hay que hacer, que es lo único que permite arreglarlo
 * sin abrir la consola del navegador.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, issue, loading, signOut, reloadProfile } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Splash>Verificando sesión…</Splash>;
  }

  // Sin sesión: al login, como siempre.
  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // Sesión válida pero sin perfil: aquí es donde antes se perdía la pista.
  if (!profile) {
    const email = session.user?.email || "tu usuario";
    return issue === "sin-conexion" ? (
      <Blocked
        title="No se pudo verificar tu acceso"
        onRetry={reloadProfile}
        onSignOut={signOut}
      >
        Tu sesión es válida, pero no hemos podido consultar tu perfil en
        Supabase. Suele ser un corte de conexión momentáneo. Si insiste, revisa
        que el proyecto de Supabase esté disponible.
      </Blocked>
    ) : (
      <Blocked
        title="Tu usuario no tiene perfil asignado"
        onRetry={reloadProfile}
        onSignOut={signOut}
      >
        La contraseña de <strong>{email}</strong> es correcta, pero no existe una
        fila en <code>profiles</code> para este usuario (o las políticas RLS no
        dejan leerla). Sin perfil no hay rol, y sin rol el panel no puede
        abrirse. Un super admin debe asignarle rol desde Supabase.
      </Blocked>
    );
  }

  return <>{children}</>;
}

function Splash({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        color: "var(--gold)",
        fontSize: 12,
        letterSpacing: "0.1em",
      }}
    >
      {children}
    </div>
  );
}

function Blocked({
  title,
  children,
  onRetry,
  onSignOut,
}: {
  title: string;
  children: React.ReactNode;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="login-shell">
      <div className="login-card">
        <header className="login-head">
          <div className="login-brand">
            <span className="login-brand-mark">H</span>
            <span className="login-brand-text">
              <strong>HGG</strong> Admin
            </span>
          </div>
          <h1 className="login-title display">{title}</h1>
        </header>
        <p className="login-sub" style={{ marginBottom: 20 }}>
          {children}
        </p>
        <button type="button" className="login-submit" onClick={onRetry}>
          Reintentar
        </button>
        <p className="login-foot">
          <button
            type="button"
            onClick={onSignOut}
            className="login-link"
            style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}
          >
            Cerrar sesión y volver a entrar
          </button>
        </p>
      </div>
    </div>
  );
}
