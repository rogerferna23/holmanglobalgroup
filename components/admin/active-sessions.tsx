"use client";

import { useCallback, useEffect, useState } from "react";

type Session = {
  id: string;
  userId: string;
  userEmail: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  ip: string | null;
  userAgent: string | null;
  isCurrent: boolean;
};

function shortUA(ua: string | null): string {
  if (!ua) return "Cliente desconocido";
  const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
  const osMatch = ua.match(/\(([^)]+)\)/);
  if (browserMatch && osMatch) {
    return `${browserMatch[1]} · ${osMatch[1].split(";")[0].trim()}`;
  }
  return ua.slice(0, 50);
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  if (!Number.isFinite(d)) return "—";
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

export function ActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sessions", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error consultando sesiones");
      setSessions(json.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = useCallback(
    async (id: string) => {
      if (!confirm("¿Cerrar esta sesión? La sesión dejará de funcionar inmediatamente.")) return;
      setBusy(true);
      try {
        const res = await fetch(`/api/admin/sessions?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const j = await res.json();
          throw new Error(j?.error || "Error revocando sesión");
        }
        await load();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error");
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  const revokeAllOthers = useCallback(async () => {
    if (!confirm("¿Cerrar todas las demás sesiones de tu cuenta? Solo permanecerá activa la sesión actual.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/sessions?all=true", { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Error");
      alert(`✓ ${j.revoked} sesiones cerradas`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }, [load]);

  return (
    <div className="adm-card adm-cfg-list">
      <header className="adm-cfg-list-head">
        <div>
          <h2 className="adm-card-title">Sesiones activas</h2>
          <p className="adm-card-sub">
            {loading ? "Cargando…" : `${sessions.length} sesiones activas`}
          </p>
        </div>
        {sessions.length > 1 && (
          <button
            type="button"
            className="adm-tx-toolbar-btn"
            onClick={revokeAllOthers}
            disabled={busy}
          >
            Cerrar todas las demás
          </button>
        )}
      </header>

      {error && (
        <div className="login-error" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}

      <ul className="adm-sessions">
        {sessions.length === 0 && !loading ? (
          <li className="adm-sessions-empty">
            No hay sesiones activas que mostrar.
          </li>
        ) : (
          sessions.map((s) => (
            <li
              key={s.id}
              className={`adm-session${s.isCurrent ? " current" : ""}`}
            >
              <div className="adm-session-icon">
                <DeviceIcon ua={s.userAgent} />
              </div>
              <div className="adm-session-body">
                <div className="adm-session-title">
                  {shortUA(s.userAgent)}
                  {s.isCurrent && (
                    <span className="adm-cfg-tag" style={{ marginLeft: 8 }}>
                      Esta sesión
                    </span>
                  )}
                </div>
                <div className="adm-session-meta">
                  <span>{s.userEmail}</span>
                  <span>· IP {s.ip || "—"}</span>
                  <span>· Última actividad {relativeTime(s.lastUsedAt || s.createdAt)}</span>
                </div>
              </div>
              {!s.isCurrent && (
                <button
                  type="button"
                  className="adm-tx-toolbar-btn"
                  onClick={() => revoke(s.id)}
                  disabled={busy}
                >
                  Revocar
                </button>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function DeviceIcon({ ua }: { ua: string | null }) {
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua || "");
  if (isMobile) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="20" height="20">
        <rect x="6" y="2" width="12" height="20" rx="2" />
        <path d="M11 18h2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="20" height="20">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}
