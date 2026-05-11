"use client";

import {
  formatMoneyUSD,
  useRequests,
  type ApprovalRequest,
} from "@/lib/admin-store";

const TYPE_LABEL: Record<ApprovalRequest["type"], string> = {
  manual_sale: "Venta manual",
  vendor: "Registro de vendedor",
  transaction: "Transacción",
};

export function SolicitudesView() {
  const [requests, setRequests] = useRequests();
  const pending = requests.filter((r) => r.status === "pendiente");

  function approve(id: string) {
    setRequests(
      requests.map((r) =>
        r.id === id ? { ...r, status: "aprobado" as const } : r
      )
    );
  }
  function reject(id: string) {
    setRequests(
      requests.map((r) =>
        r.id === id ? { ...r, status: "rechazado" as const } : r
      )
    );
  }

  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <h1>Solicitudes de Administración</h1>
        <p>Revisa y aprueba solicitudes de administradores</p>
      </header>

      <div className="adm-card adm-empty-card-lg">
        {pending.length === 0 ? (
          <div className="adm-empty-state">
            <div className="adm-empty-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12l3 3 5-6" />
              </svg>
            </div>
            <h2>Sin solicitudes pendientes</h2>
            <p>Todo está al día</p>
          </div>
        ) : (
          <ul className="adm-req-list">
            {pending.map((r) => (
              <li key={r.id} className="adm-req-row">
                <div className="adm-req-meta">
                  <span className="adm-req-type">{TYPE_LABEL[r.type]}</span>
                  <span className="adm-req-date">
                    {new Date(r.createdAt).toLocaleString("es-ES")}
                  </span>
                </div>
                <div className="adm-req-payload">
                  {Object.entries(r.payload).map(([k, v]) => (
                    <div key={k}>
                      <span>{k}:</span>{" "}
                      <strong>
                        {typeof v === "number"
                          ? `$${formatMoneyUSD(v)}`
                          : String(v)}
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="adm-req-actions">
                  <button
                    type="button"
                    className="adm-req-btn approve"
                    onClick={() => approve(r.id)}
                  >
                    ✓ Aprobar
                  </button>
                  <button
                    type="button"
                    className="adm-req-btn reject"
                    onClick={() => reject(r.id)}
                  >
                    ✕ Rechazar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {requests.length > pending.length && (
        <section className="adm-card adm-card-pad" style={{ marginTop: 18 }}>
          <header className="adm-card-head">
            <h2 className="adm-card-title">Histórico</h2>
          </header>
          <ul className="adm-req-history">
            {requests
              .filter((r) => r.status !== "pendiente")
              .map((r) => (
                <li key={r.id} className="adm-req-history-row">
                  <span className="adm-req-type">{TYPE_LABEL[r.type]}</span>
                  <span
                    className={`adm-pill ${
                      r.status === "aprobado" ? "ok" : "off"
                    }`}
                  >
                    {r.status === "aprobado" ? "Aprobado" : "Rechazado"}
                  </span>
                  <span className="adm-req-date">
                    {new Date(r.createdAt).toLocaleString("es-ES")}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
