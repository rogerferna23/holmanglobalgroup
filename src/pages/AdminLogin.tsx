import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type LocationState = { from?: string };

export default function AdminLogin() {
  const { session, signIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Acceso al panel · HGG";
  }, []);

  // Si ya hay sesion, ir directo al admin
  useEffect(() => {
    if (!authLoading && session) {
      const from = (location.state as LocationState | null)?.from || "/admin";
      navigate(from, { replace: true });
    }
  }, [session, authLoading, navigate, location.state]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await signIn(email.trim(), password);
    setBusy(false);
    if (err) {
      setError("Credenciales inválidas. Verifica tu correo y contraseña.");
    } else {
      const from = (location.state as LocationState | null)?.from || "/admin";
      navigate(from, { replace: true });
    }
  }

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
          <h1 className="login-title display">Bienvenido de vuelta</h1>
          <p className="login-sub">Ingresa tus credenciales para acceder al panel.</p>
        </header>

        <form onSubmit={onSubmit} className="login-form">
          <label className="login-field">
            <span>Correo</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              disabled={busy}
            />
          </label>

          <label className="login-field">
            <span>Contraseña</span>
            <div className="login-pwd">
              <input
                type={showPwd ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="login-pwd-toggle"
                aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPwd ? "OCULTAR" : "MOSTRAR"}
              </button>
            </div>
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-submit" disabled={busy}>
            {busy ? "Entrando…" : "Iniciar sesión"}
          </button>

          <p className="login-foot">
            Acceso restringido. Si no eres parte del equipo, vuelve al{" "}
            <Link to="/" className="login-link">
              sitio principal
            </Link>
            .
          </p>
        </form>
      </div>
    </div>
  );
}
