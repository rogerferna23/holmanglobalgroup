import { useMemo, useRef, useState } from "react";
import {
  PHOTO_TYPES,
  initialsOf,
  photoError,
  useReviews,
  type NewReviewInput,
  type Review,
} from "@/lib/reviews";

// Panel privado de reseñas (brief "Badges y descripciones", ago 2026).
// Holman sube las reseñas aquí, una por una: foto, nombre, cargo · país,
// estrellas y texto. Lo que se publica sale directo en el carrusel del landing
// y en /experiencias, en el mismo orden en que se sube. Ya no hay formulario
// público ni cola de aprobación: este panel es el único sitio donde se crean.

const STARS = [1, 2, 3, 4, 5] as const;

const STAR_HINT: Record<number, string> = {
  1: "Muy insatisfecho",
  2: "Insatisfecho",
  3: "Correcto",
  4: "Satisfecho",
  5: "Excelente",
};

function fecha(iso: string) {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("es-ES") : "—";
}

/** Formulario de alta: una reseña por envío. */
function NuevaResena({
  onCreate,
}: {
  onCreate: (input: NewReviewInput) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [rating, setRating] = useState(5);
  const [quote, setQuote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okName, setOkName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickPhoto(file: File | null) {
    setError(null);
    if (!file) return clearPhoto();
    const bad = photoError(file);
    if (bad) {
      setError(bad);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(null);
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setOkName(null);
    try {
      await onCreate({ name, role, rating, quote, photo });
      setOkName(name.trim());
      setName("");
      setRole("");
      setRating(5);
      setQuote("");
      clearPhoto();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo publicar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="adm-card adm-card-pad">
      <header className="adm-card-head">
        <h2 className="adm-card-title">Nueva reseña</h2>
      </header>

      <form className="adm-resena-form" onSubmit={onSubmit} noValidate>
        <div className="resena-field">
          <span className="resena-label">Foto (opcional)</span>
          <div className="resena-photo-row">
            <div className="resena-photo-preview" aria-hidden="true">
              {preview ? (
                <img src={preview} alt="" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <circle cx="12" cy="9" r="3.4" />
                  <path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6" />
                </svg>
              )}
            </div>
            <div className="resena-photo-actions">
              <input
                ref={fileRef}
                id="resena-foto"
                className="resena-file"
                type="file"
                accept={PHOTO_TYPES.join(",")}
                onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
              />
              <label htmlFor="resena-foto" className="resena-file-btn">
                {photo ? "Cambiar foto" : "Elegir foto"}
              </label>
              {photo && (
                <button type="button" className="resena-file-clear" onClick={clearPhoto}>
                  Quitar
                </button>
              )}
              <span className="resena-hint">
                JPG, PNG o WebP · máximo 5 MB · sin foto salen las iniciales
              </span>
            </div>
          </div>
        </div>

        <div className="adm-resena-form-row">
          <div className="resena-field">
            <label className="resena-label" htmlFor="resena-nombre">
              Nombre
            </label>
            <input
              id="resena-nombre"
              className="resena-input"
              type="text"
              maxLength={80}
              required
              placeholder="Ej: Evelyn Rivas"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="resena-field">
            <label className="resena-label" htmlFor="resena-cargo">
              Cargo · país (opcional)
            </label>
            <input
              id="resena-cargo"
              className="resena-input"
              type="text"
              maxLength={120}
              placeholder="Ej: Empresaria Internacional · Brasil"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
        </div>

        <fieldset className="resena-field resena-stars-field">
          <legend className="resena-label">Calificación</legend>
          <div className="resena-stars" role="radiogroup" aria-label="Calificación de 1 a 5 estrellas">
            {STARS.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"} — ${STAR_HINT[n]}`}
                className={`resena-star${n <= rating ? " on" : ""}`}
                onClick={() => setRating(n)}
              >
                ★
              </button>
            ))}
          </div>
          <span className="resena-stars-hint">{STAR_HINT[rating]}</span>
        </fieldset>

        <div className="resena-field">
          <label className="resena-label" htmlFor="resena-texto">
            Reseña
          </label>
          <textarea
            id="resena-texto"
            className="resena-input resena-textarea"
            rows={5}
            maxLength={1200}
            required
            placeholder="Pega aquí el testimonio, tal y como lo escribió la persona."
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
          />
          <span className="resena-counter">{quote.length}/1200</span>
        </div>

        {error && (
          <p className="resena-error" role="alert">
            {error}
          </p>
        )}
        {okName && !error && (
          <p className="adm-resena-ok" role="status">
            Reseña de {okName} publicada. Ya se ve en la web.
          </p>
        )}

        <button
          type="submit"
          className="resena-submit"
          disabled={saving || name.trim().length < 2 || quote.trim().length < 10}
        >
          {saving ? "Publicando…" : "Publicar reseña"}
        </button>
      </form>
    </section>
  );
}

function ReviewRow({
  r,
  position,
  onToggle,
  onRole,
  onDelete,
}: {
  r: Review;
  position: number | null;
  onToggle: () => void;
  onRole: (role: string) => void;
  onDelete: () => void;
}) {
  const [role, setRole] = useState(r.role);
  const publicada = r.status === "aprobado";

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
          <div className="adm-resena-name">
            {position !== null && (
              <span className="adm-resena-pos">#{position}</span>
            )}
            {r.name}
          </div>
          <div className="adm-resena-stars" aria-label={`${r.rating} de 5 estrellas`}>
            {"★".repeat(r.rating)}
            <span className="stars-off">{"★".repeat(5 - r.rating)}</span>
          </div>
          <div className="adm-req-date">{fecha(r.createdAt)}</div>
          {!r.photoUrl && (
            <div className="adm-resena-nophoto">Sin foto — salen las iniciales</div>
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
            onBlur={() => {
              if (role.trim() !== r.role.trim()) onRole(role);
            }}
          />
        </label>
      </div>

      <div className="adm-resena-actions">
        <span className={`adm-pill ${publicada ? "ok" : "off"}`}>
          {publicada ? "Publicada" : "Oculta"}
        </span>
        <button
          type="button"
          className={`adm-req-btn ${publicada ? "reject" : "approve"}`}
          onClick={onToggle}
        >
          {publicada ? "✕ Ocultar" : "✓ Publicar"}
        </button>
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
  const { data, loading, error, create, patch, remove } = useReviews();

  // La posición solo tiene sentido en las publicadas: es el orden real en la web.
  const posiciones = useMemo(() => {
    const map = new Map<string, number>();
    let n = 0;
    for (const r of data) if (r.status === "aprobado") map.set(r.id, ++n);
    return map;
  }, [data]);

  const publicadas = posiciones.size;

  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <h1>Reseñas de clientes</h1>
        <p>
          Súbelas aquí una por una. Lo que publiques aparece en el carrusel del
          landing y en /experiencias, en el mismo orden en que lo subas.
        </p>
      </header>

      <NuevaResena onCreate={create} />

      <section className="adm-card adm-card-pad" style={{ marginTop: 18 }}>
        <header className="adm-card-head">
          <h2 className="adm-card-title">
            En la web ({publicadas}
            {data.length > publicadas ? ` · ${data.length - publicadas} ocultas` : ""})
          </h2>
        </header>

        {loading ? (
          <div className="adm-empty-state adm-resena-empty">
            <p>Cargando…</p>
          </div>
        ) : error ? (
          <div className="adm-empty-state adm-resena-empty">
            <h2>No se pudieron cargar</h2>
            <p>{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="adm-empty-state adm-resena-empty">
            <div className="adm-empty-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 3.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.65l5.9-.85L12 3.5Z" />
              </svg>
            </div>
            <h2>Todavía no hay reseñas</h2>
            <p>Sube la primera con el formulario de arriba</p>
          </div>
        ) : (
          <ul className="adm-resena-list">
            {data.map((r) => (
              <ReviewRow
                key={r.id}
                r={r}
                position={posiciones.get(r.id) ?? null}
                onToggle={() =>
                  void patch(r.id, {
                    status: r.status === "aprobado" ? "pendiente" : "aprobado",
                  })
                }
                onRole={(role) => void patch(r.id, { role })}
                onDelete={() => void remove(r.id, r.photoPath)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
