"use client";

import { useState } from "react";
import { newId, useAdminUsers, type AdminUser } from "@/lib/admin-store";
import { clearAllData, loadDemoData } from "@/lib/demo-data";

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
  const [users, setUsers] = useAdminUsers();

  // El owner viene de env vars y siempre se muestra primero.
  const allUsers: AdminUser[] = [
    {
      id: "owner",
      name: "Admin Principal",
      email: "—",
      role: "super",
      isOwner: true,
    },
    ...users,
  ];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [role, setRole] = useState<AdminUser["role"]>("admin");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  function create() {
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
    if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      setError("Ya existe un usuario con ese email");
      return;
    }
    const u: AdminUser = {
      id: newId("usr"),
      name: name.trim(),
      email: email.trim(),
      password,
      role,
    };
    setUsers([...users, u]);
    setCreated(`Usuario ${u.name} creado correctamente`);
    setName("");
    setEmail("");
    setPassword("");
    setRole("admin");
  }

  function remove(id: string) {
    if (id === "owner") return;
    if (!confirm("¿Eliminar este usuario?")) return;
    setUsers(users.filter((u) => u.id !== id));
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
            <p className="adm-card-sub">{allUsers.length} usuarios con acceso</p>
          </div>
        </header>

        <ul className="adm-cfg-users">
          {allUsers.map((u) => (
            <li key={u.id} className="adm-cfg-user">
              <div className="adm-cfg-user-left">
                <span className="adm-cfg-avatar">{initialsOf(u.name) || "AP"}</span>
                <div>
                  <div className="adm-cfg-user-name">
                    {u.name}{" "}
                    {u.isOwner && <span className="adm-cfg-tag">Tú</span>}
                  </div>
                  <div className="adm-cfg-user-mail">{u.email}</div>
                </div>
              </div>
              <div className="adm-cfg-user-right">
                <span className={`adm-cfg-role role-${u.role}`}>
                  ● {ROLE_LABEL[u.role]}
                </span>
                {!u.isOwner && (
                  <button
                    type="button"
                    className="adm-icon-btn-sm"
                    onClick={() => remove(u.id)}
                    aria-label="Eliminar"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

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
          />
        </div>
        <div className="adm-field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="juan@hgg.studio"
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
          >
            <option value="admin">Administrador</option>
            <option value="vendor">Vendedor</option>
            <option value="super">Super Admin</option>
          </select>
        </div>
        {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}
        {created && (
          <div className="adm-success-msg" style={{ marginBottom: 12 }}>
            {created}
          </div>
        )}
        <button type="button" className="adm-cfg-submit" onClick={create}>
          ✓ Crear Administrador
        </button>

        <p className="adm-cfg-note">
          Nota: los usuarios creados aquí se almacenan localmente en este navegador. Para
          autenticación real multi-dispositivo, conecta una base de datos.
        </p>
      </div>

      <div className="adm-card adm-cfg-form">
        <header className="adm-cfg-form-head">
          <span className="adm-cfg-plus" style={{ background: "rgba(111, 168, 224, 0.12)", color: "#6FA8E0" }}>⚡</span>
          <div>
            <h2 className="adm-card-title">Datos de prueba</h2>
            <p className="adm-card-sub">
              Carga datos ficticios para ver cómo se ve el panel con información real
            </p>
          </div>
        </header>
        <p className="adm-cfg-note" style={{ marginBottom: 14, marginTop: 0 }}>
          Genera ~12 ventas, ~10 gastos, 4 vendedores y 3 solicitudes pendientes
          repartidas en los últimos 6 meses. Puedes limpiar todo cuando quieras.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="adm-cfg-submit"
            style={{ flex: 1, minWidth: 180 }}
            onClick={() => {
              loadDemoData();
              alert("Datos demo cargados ✓ Revisa Reportes, Vendedores y Solicitudes");
            }}
          >
            ⚡ Cargar datos demo
          </button>
          <button
            type="button"
            className="adm-cfg-submit"
            style={{
              flex: 1,
              minWidth: 180,
              background: "transparent",
              border: "1px solid var(--hairline-strong)",
              color: "var(--white)",
            }}
            onClick={() => {
              if (
                confirm(
                  "¿Borrar TODOS los datos del panel (ventas, gastos, vendedores, solicitudes)? Esta acción no se puede deshacer."
                )
              ) {
                clearAllData();
                alert("Datos eliminados ✓");
              }
            }}
          >
            🗑 Limpiar todos los datos
          </button>
        </div>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  );
}
