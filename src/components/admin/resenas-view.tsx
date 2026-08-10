import { useMemo, useState } from "react";
import { initialsOf, useReviews, type Review } from "@/lib/reviews";

// Panel de aprobación de reseñas (brief "Ajustes Adicionales" ago 2026, punto 5).
// Lo que llega por el formulario privado /tu-experiencia entra como "pendiente";
// solo lo que se aprueba aquí se publica en el carrusel del landing y en
// /experiencias. El cargo · país no lo pide el formulario: se rellena aquí para
// que la tarjeta quede igual que las 9 experiencias curadas.

const STATUS_LABEL: Record<Review["status"], string> = {
  pendiente: "Pendiente",
  aprobado: "Publicada",
  rechazado: "Rechazada",
};

function fecha(iso: string) {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleString("es-ES") : "—";
}

function ReviewRow({
  r,
  onApprove,
  onReject,
  onDelete,
}: {
  r: Review;
  onApprove: (role: string) => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const [role, setRole] = useState(r.role);

  return (
    <li className="adm-resena">
      <div className="adm-resena-person">
        <div className="adm-resena-avatar">
          {r.photoUrl ? (
            <img src={r.photoUrl} alt={r.name} />
          ) : (
            <span aria-hidden="true">{initialsOf(r.name)}</span>
          )}
        </div>
        <div>
          <div className="adm-resena-name">{r.name}</div>
          <div className="adm-resena-stars" aria-label={`${r.rating} de 5 estrellas`}>
            {"★".repeat(r.rating)}
            <span className="stars-off">{"★".repeat(5 - r.rating)}</span>
          </div>
          <div className="adm-req-date">{fecha(r.createdAt)}</div>
          {!r.photoUrl && (
            <div className="adm-resena-nophoto">Sin foto — saldrán las iniciales</div>
          )}
        </div>
      </div>

      <div className="adm-resena-body">
        <p className="adm-resena-quote">{r.quote}</p>
        <label className="adm-resena-role">
          <span>Cargo · país (se muestra bajo el nombre)</span>
          <input
            type="text"
            className="adm-resena-input"
            maxLength={120}
            placeholder="Ej: Empresaria · Colombia"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </label>
      </div>

      <div className="adm-resena-actions">
        <span
          className={`adm-pill ${
            r.status === "aprobado" ? "ok" : r.status === "pendiente" ? "off" : ""
          }`}
        >
          {STATUS_LABEL[r.status]}
        </span>
        {r.status !== "aprobado" && (
          <button
            type="button"
            className="adm-req-btn approve"
            onClick={() => onApprove(role)}
          >
            ✓ Publicar
          </button>
        )}
        {r.status !== "rechazado" && (
          <button type="button" className="adm-req-btn reject" onClick={onReject}>
            ✕ {r.status === "aprobado" ? "Despublicar" : "Rechazar"}
          </button>
        )}
        <button
          type="button"
          className="adm-resena-delete"
          onClick={() => {
            if (window.confirm(`¿Borrar definitivamente la reseña de ${r.name}?`)) {
              onDelete();
            }
          }}
        >
          Borrar
        </button>
      </div>
    </li>
  );
}

export function ResenasView() {
  const { data, loading, error, patch, remove } = useReviews();

  const pendientes = useMemo(
    () => data.filter((r) => r.status === "pendiente"),
    [data]
  );
  const resueltas = useMemo(
    () => data.filter((r) => r.status !== "pendiente"),
    [data]
  );

  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <h1>Reseñas de clientes</h1>
        <p>
          Lo que llega por el formulario privado. Solo lo que publiques aquí
          aparece en el carrusel del landing y en /experiencias.
        </p>
      </header>

      <div className="adm-card adm-empty-card-lg">
        {loading ? (
          <div className="adm-empty-state">
            <p>Cargando…</p>
          </div>
        ) : error ? (
          <div className="adm-empty-state">
            <h2>No se pudieron cargar</h2>
            <p>{error}</p>
          </div>
        ) : pendientes.length === 0 ? (
          <div className="adm-empty-state">
            <div className="adm-empty-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12l3 3 5-6" />
              </svg>
            </div>
            <h2>Sin reseñas pendientes</h2>
            <p>Todo está revisado</p>
          </div>
        ) : (
          <ul className="adm-resena-list">
            {pendientes.map((r) => (
              <ReviewRow
                key={r.id}
                r={r}
                onApprove={(role) =>
                  void patch(r.id, { status: "aprobado", role })
                }
                onReject={() => void patch(r.id, { status: "rechazado" })}
                onDelete={() => void remove(r.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {resueltas.length > 0 && (
        <section className="adm-card adm-card-pad" style={{ marginTop: 18 }}>
          <header className="adm-card-head">
            <h2 className="adm-card-title">
              Publicadas y rechazadas ({resueltas.length})
            </h2>
          </header>
          <ul className="adm-resena-list">
            {resueltas.map((r) => (
              <ReviewRow
                key={r.id}
                r={r}
                onApprove={(role) =>
                  void patch(r.id, { status: "aprobado", role })
                }
                onReject={() => void patch(r.id, { status: "rechazado" })}
                onDelete={() => void remove(r.id)}
              />
            ))}
          </ul>
        </section>
      )}

      <p className="adm-resena-link">
        Link privado para compartir con cada cliente:{" "}
        <code>{`${window.location.origin}/tu-experiencia`}</code>
      </p>
    </div>
  );
}
