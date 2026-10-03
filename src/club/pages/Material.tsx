import { useMemo, useState } from "react";
import { abrirMaterial, useClubMaterial } from "@/lib/club-store";
import { fmtDate, SUBJECT_LABEL, type EcosMaterial, type SessionSubject } from "@/lib/ecos";
import { BibliotecaTabs } from "@/club/BibliotecaTabs";

const ORDEN: SessionSubject[] = ["oratoria", "ventas", "marketing", "abierta"];

/** Qué es cada cosa, en una palabra: se lee antes de abrirla. */
export function tipoDeMaterial(m: EcosMaterial): string {
  if (m.url && !m.file_path) return "Enlace";
  const ext = (m.file_name ?? m.file_path ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "PDF";
  if (["ppt", "pptx"].includes(ext)) return "Presentación";
  if (["doc", "docx", "txt"].includes(ext)) return "Documento";
  if (["xls", "xlsx"].includes(ext)) return "Hoja de cálculo";
  if (["png", "jpg", "jpeg", "webp"].includes(ext)) return "Imagen";
  if (["mp3", "m4a"].includes(ext)) return "Audio";
  return "Archivo";
}

/**
 * Material de estudio: lo que suben los profesores para acompañar sus clases.
 * Opcional para ellos; para el alumno, un lugar donde encontrarlo todo junto,
 * ordenado por materia.
 */
export default function Material() {
  const { material, loading } = useClubMaterial();
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const porMateria = useMemo(() => {
    const m = new Map<SessionSubject, EcosMaterial[]>();
    for (const it of material) m.set(it.subject, [...(m.get(it.subject) ?? []), it]);
    return ORDEN.filter((s) => m.has(s)).map((s) => [s, m.get(s)!] as const);
  }, [material]);

  async function abrir(m: EcosMaterial) {
    setAbriendo(m.id);
    setError(null);
    // La pestaña se abre ya (antes de esperar el enlace) para que el navegador no la bloquee.
    // (Con «noopener» window.open devuelve null; por eso se corta el vínculo a mano.)
    const ventana = window.open("", "_blank");
    if (ventana) ventana.opener = null;
    const enlace = await abrirMaterial(m);
    setAbriendo(null);
    if (!enlace) { ventana?.close(); setError("No se pudo abrir. Intenta de nuevo en un momento."); return; }
    if (ventana) ventana.location.href = enlace; else window.location.href = enlace;
  }

  return (
    <div className="club-page">
      <header className="club-page-head">
        <p className="club-eyebrow">Biblioteca</p>
        <h1>Material de estudio</h1>
        <p className="club-page-sub">Lo que comparten los profesores para acompañar sus clases: guías, presentaciones y recursos.</p>
        <BibliotecaTabs />
      </header>

      {error && <p className="club-error">{error}</p>}

      {loading ? (
        <p className="club-muted">Cargando…</p>
      ) : porMateria.length === 0 ? (
        <p className="club-muted">Aquí va apareciendo el material que compartan los profesores.</p>
      ) : (
        porMateria.map(([materia, items]) => (
          <section key={materia} className="club-material-grupo">
            <h2 className="club-section-title">{materia === "abierta" ? "General" : SUBJECT_LABEL[materia]}</h2>
            <ul className="club-material-lista">
              {items.map((m) => (
                <li key={m.id} className="club-material">
                  <div>
                    <span className="club-material-tipo">{tipoDeMaterial(m)}</span>
                    <h3>{m.title}</h3>
                    {m.description && <p>{m.description}</p>}
                    <small className="club-muted">{m.teacher_name ? `${m.teacher_name} · ` : ""}{fmtDate(m.created_at)}</small>
                  </div>
                  <button type="button" className="club-btn small" onClick={() => abrir(m)} disabled={abriendo === m.id}>
                    {abriendo === m.id ? "Abriendo…" : "Abrir"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
