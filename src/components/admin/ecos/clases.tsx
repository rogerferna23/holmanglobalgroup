import { Fragment, useMemo, useState, type FormEvent } from "react";
import { useEcosGuests, useEcosLibrary, useEcosMembers, useEcosRpc, useEcosSessions, type AttendanceCount } from "@/lib/ecos-admin-store";
import { fmtDate, SESSION_KIND_LABEL, SUBJECT_LABEL, type EcosSession, type SessionKind, type SessionSubject } from "@/lib/ecos";

const KINDS = Object.keys(SESSION_KIND_LABEL) as SessionKind[];
const SUBJECTS = Object.keys(SUBJECT_LABEL) as SessionSubject[];

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Draft = {
  starts_at: string; kind: SessionKind; subject: SessionSubject; title: string; teacher: string; teacher_id: string;
  description: string; zoom_url: string; recording_id: string; open_to_guests: boolean; published: boolean;
};
const EMPTY: Draft = { starts_at: "", kind: "clase", subject: "ventas", title: "", teacher: "", teacher_id: "", description: "", zoom_url: "", recording_id: "", open_to_guests: false, published: true };

function fromSession(s: EcosSession): Draft {
  return { starts_at: toLocalInput(s.starts_at), kind: s.kind, subject: s.subject, title: s.title, teacher: s.teacher ?? "", teacher_id: s.teacher_id ?? "", description: s.description ?? "", zoom_url: s.zoom_url ?? "", recording_id: s.recording_id ?? "", open_to_guests: s.open_to_guests, published: s.published };
}

/**
 * El tema de cada mes lo escribe Holman aquí: título, profesor, descripción.
 * Se crea, se edita en el sitio y aparece al instante en el panel del miembro.
 */
export function EcosClases() {
  const { data: sessions, loading, add, update, remove } = useEcosSessions();
  const { data: miembros } = useEcosMembers();
  const profesores = useMemo(() => miembros.filter((m) => m.teacher), [miembros]);
  const { data: guests, setAttended } = useEcosGuests();
  const { data: library } = useEcosLibrary();
  const { data: counts } = useEcosRpc<AttendanceCount>("ecos_attendance_counts", "ecos_attendance_counts");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showGuests, setShowGuests] = useState<string | null>(null);

  const attendanceOf = useMemo(() => new Map(counts.map((c) => [c.session_id, c.n])), [counts]);
  const recordings = useMemo(() => library.filter((l) => l.kind === "grabacion"), [library]);
  const guestsBySession = useMemo(() => {
    const m = new Map<string, typeof guests>();
    for (const g of guests) { const k = g.session_id ?? ""; m.set(k, [...(m.get(k) ?? []), g]); }
    return m;
  }, [guests]);

  function payload(d: Draft): Omit<EcosSession, "id"> {
    return {
      starts_at: new Date(d.starts_at).toISOString(), kind: d.kind, subject: d.kind === "masterclass" ? "abierta" : d.subject,
      title: d.title.trim(), teacher: d.teacher.trim() || null, teacher_id: d.teacher_id || null, description: d.description.trim() || null,
      zoom_url: d.zoom_url.trim() || null, recording_id: d.recording_id || null, open_to_guests: d.open_to_guests, published: d.published,
    };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const err = editing ? await update(editing, payload(draft)) : await add(payload(draft));
    setBusy(false);
    if (err) { setMsg(err); return; }
    setMsg(editing ? "Sesión actualizada: los miembros ya la ven así." : "Sesión publicada.");
    setEditing(null);
    setDraft({ ...EMPTY, starts_at: draft.starts_at });
  }

  function startEdit(s: EcosSession) {
    setEditing(s.id); setDraft(fromSession(s)); setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="adm-ecos-grid">
      <div className="adm-card adm-card-pad">
        <div className="adm-card-head">
          <div className="adm-card-titlerow"><h2 className="adm-card-title">{editing ? "Editar sesión" : "Nueva sesión"}</h2></div>
          {editing && <button type="button" className="adm-ecos-del" onClick={() => { setEditing(null); setDraft(EMPTY); }}>Cancelar</button>}
        </div>
        <form onSubmit={onSubmit} className="adm-ecos-form">
          <div className="adm-form-row">
            <div className="adm-field"><label htmlFor="s-when">Fecha y hora</label><input id="s-when" type="datetime-local" required value={draft.starts_at} onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })} /></div>
            <div className="adm-field"><label htmlFor="s-kind">Tipo</label>
              <select id="s-kind" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as SessionKind })}>{KINDS.map((k) => <option key={k} value={k}>{SESSION_KIND_LABEL[k]}</option>)}</select></div>
          </div>
          <div className="adm-form-row">
            <div className="adm-field"><label htmlFor="s-subject">Materia</label>
              <select id="s-subject" value={draft.kind === "masterclass" ? "abierta" : draft.subject} disabled={draft.kind === "masterclass"} onChange={(e) => setDraft({ ...draft, subject: e.target.value as SessionSubject })}>{SUBJECTS.map((s) => <option key={s} value={s}>{SUBJECT_LABEL[s]}</option>)}</select></div>
            <div className="adm-field"><label htmlFor="s-teacher">Profesor (nombre que se muestra)</label><input id="s-teacher" type="text" value={draft.teacher} onChange={(e) => setDraft({ ...draft, teacher: e.target.value })} placeholder="Zack, Nati, Holman…" /></div>
          </div>
          <div className="adm-field">
            <label htmlFor="s-teacher-id">Quién la prepara</label>
            <select id="s-teacher-id" value={draft.teacher_id} onChange={(e) => {
              const prof = profesores.find((p) => p.id === e.target.value);
              // Al elegir a alguien se propone su nombre, por no escribirlo dos veces.
              setDraft({ ...draft, teacher_id: e.target.value, teacher: draft.teacher.trim() || (prof?.name ?? "") });
            }}>
              <option value="">Nadie — solo la preparo yo desde aquí</option>
              {profesores.map((p) => <option key={p.id} value={p.id}>{p.name || p.email}</option>)}
            </select>
            <span className="adm-ecos-sub">Le aparece en «Mis clases» dentro del club, y puede escribir de qué va y poner su Zoom. Los profesores se nombran en la pestaña Profesores.</span>
          </div>
          <div className="adm-field"><label htmlFor="s-title">Tema (lo que ve el miembro)</label><input id="s-title" type="text" required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="La oferta que se entiende a la primera" /></div>
          <div className="adm-field"><label htmlFor="s-desc">Descripción</label><textarea id="s-desc" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
          <div className="adm-field"><label htmlFor="s-zoom">Enlace de Zoom (vacío = el general de Ajustes)</label><input id="s-zoom" type="url" value={draft.zoom_url} onChange={(e) => setDraft({ ...draft, zoom_url: e.target.value })} placeholder="https://zoom.us/j/…" /></div>
          <div className="adm-field"><label htmlFor="s-rec">Grabación (de la Biblioteca)</label>
            <select id="s-rec" value={draft.recording_id} onChange={(e) => setDraft({ ...draft, recording_id: e.target.value })}>
              <option value="">— todavía no —</option>
              {recordings.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select></div>
          <div className="adm-form-row">
            <label className="adm-ecos-check"><input type="checkbox" checked={draft.open_to_guests} onChange={(e) => setDraft({ ...draft, open_to_guests: e.target.checked })} /> Abierta a invitados</label>
            <label className="adm-ecos-check"><input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} /> Publicada</label>
          </div>
          {msg && <p className="adm-ecos-note">{msg}</p>}
          <button type="submit" className="adm-add-btn" disabled={busy}>{busy ? "Guardando…" : editing ? "Guardar cambios" : "Publicar sesión"}</button>
        </form>
      </div>

      <div className="adm-card">
        <table className="adm-vend-table">
          <thead><tr><th>Cuándo</th><th>Sesión</th><th>Asistieron</th><th>Invitados</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr><td colSpan={6} className="adm-tx-empty">{loading ? "Cargando…" : "Sin sesiones. Crea la primera con el formulario."}</td></tr>
            ) : sessions.map((s) => {
              const gs = guestsBySession.get(s.id) ?? [];
              return (
                <Fragment key={s.id}>
                  <tr>
                    <td>{fmtDate(s.starts_at, true)}</td>
                    <td><strong>{s.title}</strong><br /><small className="adm-ecos-sub">{SESSION_KIND_LABEL[s.kind]}{s.subject !== "abierta" ? ` · ${SUBJECT_LABEL[s.subject]}` : ""}{s.teacher ? ` · ${s.teacher}` : ""}{s.recording_id ? " · con grabación" : ""}</small></td>
                    <td>{attendanceOf.get(s.id) ?? 0}</td>
                    <td>{s.open_to_guests ? <button type="button" className="adm-ecos-del" onClick={() => setShowGuests(showGuests === s.id ? null : s.id)}>{gs.length} {showGuests === s.id ? "▲" : "▼"}</button> : "—"}</td>
                    <td><button type="button" className={`adm-pill ${s.published ? "ok" : "off"} adm-ecos-pillbtn`} onClick={() => update(s.id, { published: !s.published })}>{s.published ? "Publicada" : "Oculta"}</button></td>
                    <td>
                      <button type="button" className="adm-ecos-del" onClick={() => startEdit(s)}>Editar</button>{" "}
                      <button type="button" className="adm-ecos-del" onClick={() => { if (confirm("¿Borrar esta sesión?")) void remove(s.id); }}>Borrar</button>
                    </td>
                  </tr>
                  {showGuests === s.id && (
                    <tr><td colSpan={6} className="adm-ecos-guests">
                      {gs.length === 0 ? <span className="adm-ecos-sub">Sin invitados registrados todavía.</span> : gs.map((g) => (
                        <label key={g.id} className="adm-ecos-check">
                          <input type="checkbox" checked={g.attended} onChange={(e) => setAttended(g.id, e.target.checked)} />
                          {g.name} · {g.email}{g.whatsapp ? ` · ${g.whatsapp}` : ""}{g.converted_id ? " · ya es miembro" : ""} <span className="adm-ecos-sub">(asistió)</span>
                        </label>
                      ))}
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
