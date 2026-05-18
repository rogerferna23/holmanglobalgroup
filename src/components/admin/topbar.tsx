import { useState } from "react";

export function AdminTopbar() {
  const [q, setQ] = useState("");
  return (
    <header className="adm-topbar">
      <div className="adm-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="11" cy="11" r="6" />
          <path d="M16 16l5 5" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar..."
        />
      </div>
      <div className="adm-topbar-right">
        <button type="button" className="adm-icon-btn" aria-label="Notificaciones">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10 21a2 2 0 0 0 4 0" />
          </svg>
          <span className="adm-icon-dot" />
        </button>
        <div className="adm-user">
          <div className="adm-user-avatar">AP</div>
          <div className="adm-user-info">
            <div className="adm-user-name">Admin</div>
            <div className="adm-user-role">Super Admin</div>
          </div>
          <span className="adm-user-status" aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}
