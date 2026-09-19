import { useEffect, useMemo, useState } from "react";
import { useClub } from "@/contexts/ClubContext";
import { useClubSessions } from "@/lib/club-store";
import { getSupabase } from "@/lib/supabase";
import { fmtDate, SESSION_KIND_LABEL, SUBJECT_LABEL, type EcosSession } from "@/lib/ecos";

type Sesion = EcosSession;

/**
 * Lo que ve un profesor: sus propias clases, para prepararlas.
 *
 * Puede escribir de qué va y poner su enlace de Zoom. No puede crear ni borrar
 * sesiones: el calendario del club se arma desde un solo lado. Si falta una
 * clase o sobra, eso se habla con Holman.
 */
export default function MisClases() {
  const { member } = useClub();
  const { sessions, loading: cargando } = useClubSessions();
  const [locales, setLocales] = useState<Record<string, { description: string | null; zoom_url: string | null }>>({});
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<{ description: string; zoom_url: string }>({ description: "", zoom_url: "" });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Las sesiones a su nombre. Lo que guarda se refleja al momento sin volver a
  // pedir la lista entera.
  const sesiones = useMemo(
    () => sessions
      .filter((s) => s.teacher_id && s.teacher_id === member?.id)
      .map((s) => ({ ...s, ...(locales[s.id] ?? {}) })),
    [sessions, member?.id, locales]
  );

  const { proximas, pasadas } = useMemo(() => {
    const ahora = Date.now();
    return {
      proximas: sesiones.filter((s) => new Date(s.starts_at).getTime() >= ahora),
      pasadas: sesiones.filter((s) => new Date(s.starts_at).getTime() < ahora).reverse(),
    };
  }, [sesiones]);

  function abrir(s: Sesion) {
    setEditando(s.id);
    setBorrador({ description: s.description ?? "", zoom_url: s.zoom_url ?? "" });
    setMsg(null);
  }

  async function guardar(id: string) {
    setGuardando(true);
    setMsg(null);
    const { error } = await getSupabase()
      .from("ecos_sessions")
      .update({ description: borrador.description.trim() || null, zoom_url: borrador.zoom_url.trim() || null })
      .eq("id", id);
    setGuardando(false);
    if (error) { setMsg(error.message); return; }
    setLocales((prev) => ({ ...prev, [id]: { description: borrador.description.trim() || null, zoom_url: borrador.zoom_url.trim() || null } }));
    setEditando(null);
    setMsg("Guardado.");
  }

  function tarjeta(s: Sesion, pasada = false) {
    const abierta = editando === s.id;
    return (
      <article key={s.id} className={`club-card club-misclase${pasada ? " pasada" : ""}`}>
        <div className="club-misclase-head">
          <div>
            <span className="club-misclase-meta">
              {fmtDate(s.starts_at, true)} · {SESSION_KIND_LABEL[s.kind]}{s.subject !== "abierta" ? ` de ${SUBJECT_LABEL[s.subject]}` : ""}
            </span>
            <h3 className="club-misclase-title">{s.title}</h3>
          </div>
          {!s.published && <span className="club-pill">Sin publicar</span>}
        </div>

        {abierta ? (
          <>
            <label className="club-field">
              <span>De qué va</span>
              <textarea
                rows={3} value={borrador.description} disabled={guardando}
                placeholder="Lo que se va a trabajar. Lo leen antes de entrar."
                onChange={(e) => setBorrador({ ...borrador, description: e.target.value })}
              />
            </label>
            <label className="club-field">
              <span>Tu enlace de Zoom</span>
              <input
                type="url" value={borrador.zoom_url} disabled={guardando}
                placeholder="Si lo dejas vacío se usa el del club"
                onChange={(e) => setBorrador({ ...borrador, zoom_url: e.target.value })}
              />
            </label>
            <div className="club-misclase-acciones">
              <button type="button" className="club-btn" disabled={guardando} onClick={() => guardar(s.id)}>
                {guardando ? "Guardando…" : "Guardar"}
              </button>
              <button type="button" className="club-link-btn" onClick={() => setEditando(null)}>Cancelar</button>
            </div>
          </>
        ) : (
          <>
            <p className="club-misclase-desc">
              {s.description || <em>Todavía no has escrito de qué va.</em>}
            </p>
            {!pasada && (
              <button type="button" className="club-link-btn" onClick={() => abrir(s)}>
                {s.description ? "Editar" : "Preparar esta clase"}
              </button>
            )}
          </>
        )}
      </article>
    );
  }

  return (
    <section className="club-page">
      <header className="club-page-head">
        <h1>Mis clases</h1>
        <p>
          Las sesiones que te tocan. Escribe de qué va cada una —lo leen antes de entrar— y
          pon tu enlace de Zoom si usas el tuyo.
        </p>
      </header>

      {msg && <p className="club-notice">{msg}</p>}

      {cargando ? (
        <p className="club-muted">Cargando…</p>
      ) : sesiones.length === 0 ? (
        <p className="club-muted">
          Todavía no hay clases a tu nombre. En cuanto Holman arme el calendario del mes,
          aparecen aquí.
        </p>
      ) : (
        <>
          {proximas.length > 0 && (
            <>
              <h2 className="club-section-title">Lo que viene</h2>
              {proximas.map((s) => tarjeta(s))}
            </>
          )}
          {pasadas.length > 0 && (
            <>
              <h2 className="club-section-title">Ya dadas</h2>
              {pasadas.map((s) => tarjeta(s, true))}
            </>
          )}
        </>
      )}
    </section>
  );
}
