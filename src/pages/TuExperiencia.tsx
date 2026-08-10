import { useRef, useState } from "react";
import { Seo } from "@/components/seo";
import { Grain } from "@/components/grain";
import { SITE } from "@/lib/config";
import {
  MAX_PHOTO_BYTES,
  PHOTO_TYPES,
  submitReview,
} from "@/lib/reviews";

// Formulario privado de reseñas (brief "Ajustes Adicionales" ago 2026, punto 5).
// Es un link que Holman comparte directamente con cada cliente: no está
// enlazado desde ninguna parte del sitio, va con noindex y también bloqueado en
// robots.txt. Lo que se envía queda "pendiente" hasta que Holman lo aprueba en
// /admin/resenas — así nadie externo publica reseñas y el equipo no tiene que
// subir los testimonios a mano.

const STARS = [1, 2, 3, 4, 5] as const;

const STAR_HINT: Record<number, string> = {
  1: "Muy insatisfecho",
  2: "Insatisfecho",
  3: "Correcto",
  4: "Satisfecho",
  5: "Excelente",
};

export default function TuExperiencia() {
  const [rating, setRating] = useState(5);
  const [name, setName] = useState("");
  const [quote, setQuote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickPhoto(file: File | null) {
    setError(null);
    if (!file) {
      setPhoto(null);
      setPreview("");
      return;
    }
    if (!PHOTO_TYPES.includes(file.type)) {
      setError("La foto debe ser JPG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("La foto no puede pesar más de 5 MB.");
      return;
    }
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
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      await submitReview({ name, rating, quote, photo });
      if (preview) URL.revokeObjectURL(preview);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar. Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Seo
        title="Cuéntanos tu experiencia — Holman Global Group"
        description="Formulario privado para clientes de Holman Global Group."
        noindex
      />
      <Grain />
      <main className="resena-page">
        <div className="resena-shell">
          <header className="resena-head">
            <img
              src="/logo-h.png"
              alt={SITE.name}
              width={48}
              height={48}
              className="resena-logo"
            />
            <div className="eyebrow-row resena-eyebrow">
              <span className="bar" />
              <span className="eyebrow eyebrow-w">Solo para clientes</span>
              <span className="bar" />
            </div>
            <h1 className="display resena-title">Cuéntanos tu experiencia.</h1>
            <p className="resena-lede">
              Tu testimonio ayuda a que otras personas se atrevan a empezar su
              camino. Nos llevará menos de dos minutos.
            </p>
          </header>

          {done ? (
            <div className="resena-card resena-done">
              <div className="resena-done-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 12l3 3 5-6" />
                </svg>
              </div>
              <h2 className="display">¡Gracias, {name.trim().split(" ")[0]}!</h2>
              <p>
                Tu reseña ya nos llegó. Holman la revisa antes de publicarla en
                la web — te avisaremos cuando esté online.
              </p>
            </div>
          ) : (
            <form className="resena-card" onSubmit={onSubmit} noValidate>
              <fieldset className="resena-field resena-stars-field">
                <legend className="resena-label">Tu calificación</legend>
                <div
                  className="resena-stars"
                  role="radiogroup"
                  aria-label="Calificación de 1 a 5 estrellas"
                >
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
                <label className="resena-label" htmlFor="resena-nombre">
                  Nombre
                </label>
                <input
                  id="resena-nombre"
                  className="resena-input"
                  type="text"
                  autoComplete="name"
                  maxLength={80}
                  required
                  placeholder="Cómo quieres que aparezca tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="resena-field">
                <label className="resena-label" htmlFor="resena-texto">
                  Tu reseña
                </label>
                <textarea
                  id="resena-texto"
                  className="resena-input resena-textarea"
                  rows={6}
                  maxLength={1200}
                  required
                  placeholder="¿Qué cambió para ti? ¿Cómo fue el acompañamiento?"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                />
                <span className="resena-counter">{quote.length}/1200</span>
              </div>

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
                      <button
                        type="button"
                        className="resena-file-clear"
                        onClick={clearPhoto}
                      >
                        Quitar
                      </button>
                    )}
                    <span className="resena-hint">
                      JPG, PNG o WebP · máximo 5 MB
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <p className="resena-error" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="resena-submit"
                disabled={sending || !name.trim() || quote.trim().length < 10}
              >
                {sending ? "Enviando…" : "Enviar mi reseña"}
              </button>

              <p className="resena-legal">
                Al enviar aceptas que {SITE.name} publique tu nombre, tu reseña y
                tu foto en la web. Nada se publica hasta que Holman lo revisa.
              </p>
            </form>
          )}

          <footer className="resena-foot">
            {SITE.name} · {SITE.url.replace(/^https?:\/\//, "")}
          </footer>
        </div>
      </main>
    </>
  );
}
