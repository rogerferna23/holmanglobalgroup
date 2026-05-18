import { useState } from "react";
import { useAdminUsers, type AdminUser } from "@/lib/admin-store";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/lib/supabase";
import { ActiveSessions } from "@/components/admin/active-sessions";

const ROLE_LABEL: Record<AdminUser["role"], string> = {
  super: "Super Admin",
  admin: "Administrador",
  vendor: "Vendedor",
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export function ConfiguracionView() {
  const { data: users, loading, refresh } = useAdminUsers();
  const { user: currentUser } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [role, setRole] = useState<AdminUser["role"]>("admin");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createUser() {
    setError(null);
    setCreated(null);

    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (!email.includes("@")) {
      setError("Email no válido");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (
      users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    ) {
      setError("Ya existe un usuario con ese email");
      return;
    }

    setBusy(true);
    try {
      const sb = getSupabase();
      // 1. Crear usuario en Supabase Auth (con email verification)
      const { data, error: signUpError } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim(), role },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // 2. Insertar perfil en tabla profiles
      if (data.user) {
        await sb.from("profiles").upsert({
          id: data.user.id,
          email: email.trim(),
          name: name.trim(),
          role,
        });
      }

      setCreated(
        `Usuario ${name.trim()} creado. Debe confirmar su email antes de entrar.`
      );
      setName("");
      setEmail("");
      setPassword("");
      setRole("admin");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setBusy(false);
    }
  }

  async function removeUser(id: string) {
    if (id === currentUser?.id) {
      alert("No puedes eliminar tu propio usuario");
      return;
    }
    if (!confirm("¿Eliminar este usuario?")) return;
    try {
      const sb = getSupabase();
      // Solo borra de profiles. Para borrar del auth necesita service_role
      // (Edge Function admin-delete-user).
      await sb.from("profiles").delete().eq("id", id);
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <h1>Configuración</h1>
        <p>Gestión de accesos al panel de administración</p>
      </header>

      <div className="adm-card adm-cfg-list">
        <header className="adm-cfg-list-head">
          <div>
            <h2 className="adm-card-title">Administradores</h2>
            <p className="adm-card-sub">
              {loading ? "Cargando…" : `${users.length} usuarios con acceso`}
            </p>
          </div>
        </header>

        <ul className="adm-cfg-users">
          {users.map((u) => {
            const isMe = u.id === currentUser?.id;
            return (
              <li key={u.id} className="adm-cfg-user">
                <div className="adm-cfg-user-left">
                  <span className="adm-cfg-avatar">
                    {initialsOf(u.name) || "U"}
                  </span>
                  <div>
                    <div className="adm-cfg-user-name">
                      {u.name}
                      {isMe && <span className="adm-cfg-tag">Tú</span>}
                    </div>
                    <div className="adm-cfg-user-mail">{u.email}</div>
                  </div>
                </div>
                <div className="adm-cfg-user-right">
                  <span className={`adm-cfg-role role-${u.role}`}>
                    ● {ROLE_LABEL[u.role]}
                  </span>
                  {!isMe && (
                    <button
                      type="button"
                      className="adm-icon-btn-sm"
                      onClick={() => removeUser(u.id)}
                      aria-label="Eliminar"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <ActiveSessions />

      <div className="adm-card adm-cfg-form">
        <header className="adm-cfg-form-head">
          <span className="adm-cfg-plus">+</span>
          <div>
            <h2 className="adm-card-title">Nuevo Administrador</h2>
            <p className="adm-card-sub">Agrega acceso al panel</p>
          </div>
        </header>

        <div className="adm-field">
          <label>Nombre completo</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Juan Pérez"
            disabled={busy}
          />
        </div>
        <div className="adm-field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="juan@hgg.studio"
            disabled={busy}
          />
        </div>
        <div className="adm-field">
          <label>Contraseña</label>
          <div className="adm-pwd-row">
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mín. 6 caracteres"
              disabled={busy}
            />
            <button
              type="button"
              className="adm-pwd-toggle"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? "Ocultar" : "Mostrar"}
            >
              {showPwd ? "🙈" : "👁"}
            </button>
          </div>
        </div>
        <div className="adm-field">
          <label>Rol</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AdminUser["role"])}
            disabled={busy}
          >
            <option value="admin">Administrador</option>
            <option value="vendor">Vendedor</option>
            <option value="super">Super Admin</option>
          </select>
        </div>
        {error && (
          <div className="login-error" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}
        {created && (
          <div className="adm-success-msg" style={{ marginBottom: 12 }}>
            {created}
          </div>
        )}
        <button
          type="button"
          className="adm-cfg-submit"
          onClick={createUser}
          disabled={busy}
        >
          {busy ? "Creando…" : "✓ Crear Administrador"}
        </button>

        <p className="adm-cfg-note">
          Nota: los nuevos administradores recibirán un email de confirmación.
          Deben hacer click en el enlace antes de poder iniciar sesión.
        </p>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      width="14"
      height="14"
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  );
}
