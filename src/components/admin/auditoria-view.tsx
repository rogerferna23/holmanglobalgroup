import { useCallback, useEffect, useMemo, useState } from "react";

type Entry = {
  id: number;
  createdAt: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  status: "success" | "failure";
};

const ACTION_LABELS: Record<string, string> = {
  login: "Inicio de sesión",
  login_failed: "Intento de login fallido",
  logout: "Cierre de sesión",
  session_revoked: "Sesión revocada",
  "sale.create": "Venta creada",
  "sale.delete": "Venta eliminada",
  "sale.update": "Venta actualizada",
  "expense.create": "Gasto creado",
  "expense.delete": "Gasto eliminado",
  "vendor.create": "Vendedor creado",
  "vendor.delete": "Vendedor eliminado",
  "user.create": "Usuario admin creado",
  "user.delete": "Usuario admin eliminado",
  "request.approve": "Solicitud aprobada",
  "request.reject": "Solicitud rechazada",
  "request.create": "Solicitud creada",
  "request.delete": "Solicitud eliminada",
  "paypal.create_order": "Orden PayPal",
  "paypal.capture": "Captura PayPal",
  "paypal.capture_failed": "Captura PayPal fallida",
  "demo.load": "Datos demo cargados",
  "demo.clear": "Datos limpiados",
};

const ACTION_TONES: Record<string, "ok" | "warn" | "err" | "info"> = {
  login: "ok",
  login_failed: "err",
  logout: "info",
  session_revoked: "warn",
  "sale.create": "ok",
  "sale.delete": "warn",
  "expense.create": "ok",
  "expense.delete": "warn",
  "user.create": "ok",
  "user.delete": "warn",
  "request.approve": "ok",
  "request.reject": "warn",
  "paypal.capture": "ok",
  "paypal.capture_failed": "err",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function shortUA(ua: string | null): string {
  if (!ua) return "—";
  // Extraer fragmento legible: nombre de navegador + OS
  const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
  const osMatch = ua.match(/\(([^)]+)\)/);
  if (browserMatch && osMatch) {
    return `${browserMatch[1]} · ${osMatch[1].split(";")[0]}`;
  }
  return ua.slice(0, 40);
}

export function AuditoriaView() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [action, setAction] = useState("");
  const [user, setUser] = useState("");
  const [status, setStatus] = useState<"" | "success" | "failure">("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      let query = sb
        .from("audit_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * limit, page * limit + limit - 1);
      if (action) query = query.eq("action", action);
      if (user) query = query.ilike("user_email", `%${user}%`);
      if (status) query = query.eq("status", status);

      const { data, count, error: err } = await query;
      if (err) {
        setError("Error consultando auditoría");
        setEntries([]);
        setTotal(0);
      } else {
        setEntries(
          (data || []).map((row) => ({
            id: row.id,
            createdAt: row.created_at,
            userId: row.user_id,
            userEmail: row.user_email,
            action: row.action,
            resource: row.resource,
            resourceId: row.resource_id,
            ip: row.ip,
            userAgent: row.user_agent,
            metadata: row.metadata,
            status: row.status,
          }))
        );
        setTotal(count || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, [action, user, status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  // Estadisticas rapidas calculadas sobre la pagina actual
  const stats = useMemo(() => {
    const failures = entries.filter((e) => e.status === "failure").length;
    const logins = entries.filter((e) => e.action === "login").length;
    const failedLogins = entries.filter((e) => e.action === "login_failed").length;
    return { failures, logins, failedLogins };
  }, [entries]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <h1>Auditoría</h1>
        <p>Registro de acciones del panel · {total} entradas</p>
      </header>

      <div className="adm-tx-stats">
        <div className="adm-tx-stat tone-up">
          <div className="adm-tx-stat-text">
            <span className="adm-tx-stat-title">LOGINS (página)</span>
            <span className="adm-tx-stat-value">{stats.logins}</span>
          </div>
        </div>
        <div className="adm-tx-stat tone-down">
          <div className="adm-tx-stat-text">
            <span className="adm-tx-stat-title">LOGINS FALLIDOS</span>
            <span className="adm-tx-stat-value">{stats.failedLogins}</span>
          </div>
        </div>
        <div className="adm-tx-stat tone-net">
          <div className="adm-tx-stat-text">
            <span className="adm-tx-stat-title">FALLOS TOTALES</span>
            <span className="adm-tx-stat-value">{stats.failures}</span>
          </div>
        </div>
      </div>

      <div className="adm-card adm-audit-filters">
        <div className="adm-field" style={{ flex: 1, marginBottom: 0 }}>
          <label>Acción</label>
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Todas</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="adm-field" style={{ flex: 1, marginBottom: 0 }}>
          <label>Usuario (email)</label>
          <input
            type="text"
            value={user}
            onChange={(e) => {
              setUser(e.target.value);
              setPage(0);
            }}
            placeholder="ej: hola@hgg.studio"
          />
        </div>
        <div className="adm-field" style={{ width: 140, marginBottom: 0 }}>
          <label>Estado</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "success" | "failure" | "");
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            <option value="success">Éxito</option>
            <option value="failure">Fallo</option>
          </select>
        </div>
        <button
          type="button"
          className="adm-tx-toolbar-btn"
          onClick={() => {
            setAction("");
            setUser("");
            setStatus("");
            setPage(0);
          }}
          style={{ alignSelf: "flex-end", marginBottom: 2 }}
        >
          Limpiar
        </button>
      </div>

      <div className="adm-card adm-card-pad">
        {error && (
          <div className="login-error" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}
        {loading ? (
          <p className="adm-tx-empty">Cargando…</p>
        ) : entries.length === 0 ? (
          <p className="adm-tx-empty">No hay entradas que coincidan.</p>
        ) : (
          <table className="adm-tx-table adm-audit-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Acción</th>
                <th>Usuario</th>
                <th>Recurso</th>
                <th>IP / Cliente</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const tone = ACTION_TONES[e.action] || "info";
                return (
                  <tr key={e.id}>
                    <td className="adm-audit-date">{formatDate(e.createdAt)}</td>
                    <td>
                      <span className={`adm-audit-action tone-${tone}`}>
                        {ACTION_LABELS[e.action] || e.action}
                      </span>
                    </td>
                    <td>
                      <div style={{ color: "var(--white)" }}>
                        {e.userEmail || "—"}
                      </div>
                      {e.userId && (
                        <div style={{ fontSize: 9, color: "var(--muted-2)" }}>
                          {e.userId}
                        </div>
                      )}
                    </td>
                    <td>
                      {e.resource ? (
                        <div>
                          <span style={{ color: "var(--white)" }}>{e.resource}</span>
                          {e.resourceId && (
                            <div style={{ fontSize: 9, color: "var(--muted-2)" }}>
                              {e.resourceId}
                            </div>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <div style={{ color: "var(--white)" }}>{e.ip || "—"}</div>
                      <div style={{ fontSize: 9, color: "var(--muted-2)" }}>
                        {shortUA(e.userAgent)}
                      </div>
                    </td>
                    <td>
                      {e.status === "success" ? (
                        <span className="adm-pill ok">✓ Éxito</span>
                      ) : (
                        <span className="adm-pill off">✗ Fallo</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="adm-pagination">
          <button
            type="button"
            className="adm-tx-toolbar-btn"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            ← Anterior
          </button>
          <span className="adm-pagination-info">
            Página {page + 1} de {totalPages}
          </span>
          <button
            type="button"
            className="adm-tx-toolbar-btn"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
