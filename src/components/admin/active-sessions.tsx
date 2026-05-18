import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// Con Supabase Auth, las sesiones se gestionan internamente con refresh tokens.
// Este componente muestra la sesion actual y permite cerrarla.
// Para revocacion server-side fuerte, usar Supabase Dashboard -> Auth -> Users.

function shortUA(): string {
  if (typeof navigator === "undefined") return "Cliente desconocido";
  const ua = navigator.userAgent;
  const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
  const osMatch = ua.match(/\(([^)]+)\)/);
  if (browserMatch && osMatch) {
    return `${browserMatch[1]} · ${osMatch[1].split(";")[0].trim()}`;
  }
  return ua.slice(0, 50);
}

export function ActiveSessions() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  async function logout() {
    if (!confirm("¿Cerrar tu sesión?")) return;
    await signOut();
    navigate("/login", { replace: true });
  }

  if (!session) {
    return (
      <div className="adm-card adm-cfg-list">
        <header className="adm-cfg-list-head">
          <div>
            <h2 className="adm-card-title">Sesiones activas</h2>
            <p className="adm-card-sub">No hay sesión activa</p>
          </div>
        </header>
      </div>
    );
  }

  const createdAt = session.user.created_at
    ? new Date(session.user.created_at).toLocaleString("es-ES")
    : "—";

  return (
    <div className="adm-card adm-cfg-list">
      <header className="adm-cfg-list-head">
        <div>
          <h2 className="adm-card-title">Sesión activa</h2>
          <p className="adm-card-sub">Tu sesión actual en este navegador</p>
        </div>
      </header>
      <ul className="adm-sessions">
        <li className="adm-session current">
          <div className="adm-session-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              width="20"
              height="20"
            >
              <rect x="3" y="4" width="18" height="12" rx="2" />
              <path d="M8 20h8M12 16v4" />
            </svg>
          </div>
          <div className="adm-session-body">
            <div className="adm-session-title">
              {shortUA()}
              <span className="adm-cfg-tag" style={{ marginLeft: 8 }}>
                Esta sesión
              </span>
            </div>
            <div className="adm-session-meta">
              <span>{session.user.email}</span>
              <span>· Cuenta creada {createdAt}</span>
            </div>
          </div>
          <button
            type="button"
            className="adm-tx-toolbar-btn"
            onClick={logout}
          >
            Cerrar sesión
          </button>
        </li>
      </ul>
      <p
        className="adm-cfg-note"
        style={{ marginTop: 12, marginBottom: 0 }}
      >
        Para revocar sesiones desde otros dispositivos, usa Supabase Dashboard
        → Authentication → Users → revoca el access token del usuario.
      </p>
    </div>
  );
}
