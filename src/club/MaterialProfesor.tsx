import { useMemo, useState, type FormEvent } from "react";
import { useClub } from "@/contexts/ClubContext";
import { useClubMaterial } from "@/lib/club-store";
import { getSupabase } from "@/lib/supabase";
import { fmtDate, SUBJECT_LABEL, type EcosMaterial, type SessionSubject } from "@/lib/ecos";
import { tipoDeMaterial } from "@/club/pages/Material";

const MATERIAS: SessionSubject[] = ["oratoria", "ventas", "marketing", "abierta"];
const MAX_MB = 25;
const EXTENSIONES = ".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.mp3,.m4a,.txt";

/** Nombre de archivo sin tildes ni espacios: así Storage no se queja. */
function limpio(nombre: string): string {
  return nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "-").slice(-80);
}

/**
 * «Material de estudio» dentro de Mis clases: el profesor sube un archivo o pega
 * un enlace, y le aparece a todo el club en la sección Material. Opcional.
 */
export function MaterialProfesor({ materiaSugerida }: { materiaSugerida?: SessionSubject }) {
  const { member } = useClub();
  const { material, refresh } = useClubMaterial();
  const mios = useMemo(() => material.filter((m) => m.teacher_id === member?.id), [material, member?.id]);

  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [materia, setMateria] = useState<SessionSubject>(materiaSugerida ?? "oratoria");
  const [descripcion, setDescripcion] = useState("");
  const [modo, setModo] = useState<"archivo" | "enlace">("archivo");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enlace, setEnlace] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function subir(e: FormEvent) {
    e.preventDefault();
    if (!member) return;
    setMsg(null);
    if (titulo.trim().length < 2) { setMsg("Ponle un título al material."); return; }
    if (modo === "archivo" && !archivo) { setMsg("Elige el archivo que vas a compartir."); return; }
    if (modo === "archivo" && archivo && archivo.size > MAX_MB * 1024 * 1024) { setMsg(`El archivo pasa de ${MAX_MB} MB. Súbelo a Drive y comparte el enlace.`); return; }
    if (modo === "enlace" && !/^https?:\/\//i.test(enlace.trim())) { setMsg("El enlace tiene que empezar por https://"); return; }

    setBusy(true);
    const sb = getSupabase();
    let file_path: string | null = null;
    if (modo === "archivo" && archivo) {
      file_path = `${member.id}/${Date.now()}-${limpio(archivo.name)}`;
      const { error } = await sb.storage.from("ecos-material").upload(file_path, archivo, { contentType: archivo.type || undefined });
      if (error) { setBusy(false); setMsg(`No se pudo subir el archivo: ${error.message}`); return; }
    }
    const fila = {
      teacher_id: member.id,
      teacher_name: member.name,
      subject: materia,
      title: titulo.trim(),
      description: descripcion.trim() || null,
      file_path,
      file_name: modo === "archivo" && archivo ? archivo.name : null,
      url: modo === "enlace" ? enlace.trim() : null,
    };
    const { error } = await sb.from("ecos_material").insert(fila);
    if (error) {
      // Que no quede un archivo huérfano en Storage.
      if (file_path) await sb.storage.from("ecos-material").remove([file_path]);
      setBusy(false);
      setMsg(`No se pudo guardar: ${error.message}`);
      return;
    }
    await refresh();
    setBusy(false);
    setTitulo(""); setDescripcion(""); setArchivo(null); setEnlace(""); setAbierto(false);
    setMsg("Listo: ya le aparece a todo el club en Material.");
  }

  async function borrar(m: EcosMaterial) {
    if (!window.confirm(`¿Quitar «${m.title}» del material del club?`)) return;
    const sb = getSupabase();
    const { error } = await sb.from("ecos_material").delete().eq("id", m.id);
    if (error) { setMsg(error.message); return; }
    if (m.file_path) await sb.storage.from("ecos-material").remove([m.file_path]);
    await refresh();
  }

  return (
    <section className="club-material-prof">
      <div className="club-list-head">
        <h2 className="club-section-title">Material de estudio</h2>
        {!abierto && <button type="button" className="club-btn small" onClick={() => { setAbierto(true); setMsg(null); if (materiaSugerida) setMateria(materiaSugerida); }}>Compartir material</button>}
      </div>
      <p className="club-muted">Opcional: guías, presentaciones o recursos para repasar. Le aparecen a todo el club en la sección Material.</p>

      {msg && <p className="club-notice">{msg}</p>}

      {abierto && (
        <form onSubmit={subir} className="club-form club-card">
          <div className="club-form-grid">
            <label className="club-field"><span>Título</span><input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Guía: tu oferta en 90 segundos" maxLength={140} disabled={busy} /></label>
            <label className="club-field"><span>Materia</span>
              <select value={materia} onChange={(e) => setMateria(e.target.value as SessionSubject)} disabled={busy}>
                {MATERIAS.map((s) => <option key={s} value={s}>{s === "abierta" ? "General" : SUBJECT_LABEL[s]}</option>)}
              </select>
            </label>
            <label className="club-field full"><span>De qué se trata (opcional)</span><input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={600} placeholder="Para qué sirve y cuándo usarlo" disabled={busy} /></label>
          </div>
          <div className="club-material-modo" role="radiogroup" aria-label="Qué vas a compartir">
            <label><input type="radio" checked={modo === "archivo"} onChange={() => setModo("archivo")} /> Un archivo</label>
            <label><input type="radio" checked={modo === "enlace"} onChange={() => setModo("enlace")} /> Un enlace (Drive, YouTube, Canva…)</label>
          </div>
          {modo === "archivo" ? (
            <label className="club-field"><span>Archivo (PDF, presentación, documento, imagen o audio · hasta {MAX_MB} MB)</span>
              <input type="file" accept={EXTENSIONES} onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} disabled={busy} />
            </label>
          ) : (
            <label className="club-field"><span>Enlace</span><input type="url" value={enlace} onChange={(e) => setEnlace(e.target.value)} placeholder="https://" disabled={busy} /></label>
          )}
          <div className="club-misclase-acciones">
            <button type="submit" className="club-btn" disabled={busy}>{busy ? "Subiendo…" : "Compartir con el club"}</button>
            <button type="button" className="club-link-btn" onClick={() => setAbierto(false)} disabled={busy}>Cancelar</button>
          </div>
        </form>
      )}

      {mios.length > 0 && (
        <ul className="club-material-lista">
          {mios.map((m) => (
            <li key={m.id} className="club-material">
              <div>
                <span className="club-material-tipo">{tipoDeMaterial(m)} · {m.subject === "abierta" ? "General" : SUBJECT_LABEL[m.subject]}</span>
                <h3>{m.title}</h3>
                <small className="club-muted">Compartido el {fmtDate(m.created_at)}</small>
              </div>
              <button type="button" className="club-link-btn" onClick={() => borrar(m)}>Quitar</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
