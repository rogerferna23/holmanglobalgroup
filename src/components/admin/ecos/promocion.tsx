import { useCallback, useContext, useEffect, useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import { AdminEcosMockContext } from "@/lib/ecos-admin-store";
import { PROMO_BASE, urlDePromo } from "@/lib/promocion";
import { fmtDate, type EcosPromo } from "@/lib/ecos";

const MAX_MB = 50;
const TIPOS: { id: EcosPromo["tipo"]; label: string }[] = [
  { id: "flyer", label: "Flyer" },
  { id: "video", label: "Video promocional" },
  { id: "otro", label: "Otra pieza" },
];

function limpio(nombre: string): string {
  return nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "-").slice(-80);
}

/**
 * ECOS → Promoción: lo que ven los embajadores en Negocio → Material. Holman
 * sube un flyer o un video (o pega un enlace) con un texto sugerido; a cada
 * embajador le sale ese texto con su propio enlace.
 */
export function EcosPromocion() {
  const mock = useContext(AdminEcosMockContext);
  const [piezas, setPiezas] = useState<EcosPromo[]>([]);
  const [tipo, setTipo] = useState<EcosPromo["tipo"]>("flyer");
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enlace, setEnlace] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [reinicio, setReinicio] = useState(0);

  const cargar = useCallback(async () => {
    if (mock) return;
    const { data, error } = await getSupabase().from("ecos_promo").select("*").order("created_at", { ascending: false });
    if (error) setMsg(error.message);
    else setPiezas((data ?? []) as EcosPromo[]);
  }, [mock]);
  useEffect(() => { void cargar(); }, [cargar]);

  async function subir(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (titulo.trim().length < 2) { setMsg("Ponle un título a la pieza."); return; }
    if (!archivo && !/^https?:\/\//i.test(enlace.trim())) { setMsg("Elige un archivo o pega un enlace que empiece por https://"); return; }
    if (archivo && archivo.size > MAX_MB * 1024 * 1024) { setMsg(`El archivo pasa de ${MAX_MB} MB. Súbelo a Drive o YouTube y pega el enlace.`); return; }
    if (mock) { setMsg("En la vista previa no se sube nada."); return; }

    setBusy(true);
    const sb = getSupabase();
    let file_path: string | null = null;
    if (archivo) {
      file_path = `${tipo}/${Date.now()}-${limpio(archivo.name)}`;
      const { error } = await sb.storage.from("ecos-promo").upload(file_path, archivo, { contentType: archivo.type || undefined });
      if (error) { setBusy(false); setMsg(`No se pudo subir: ${error.message}`); return; }
    }
    const { error } = await sb.from("ecos_promo").insert({
      tipo, titulo: titulo.trim(), texto: texto.trim() || null,
      file_path, file_name: archivo?.name ?? null, url: archivo ? null : enlace.trim(),
    });
    if (error) {
      if (file_path) await sb.storage.from("ecos-promo").remove([file_path]);
      setBusy(false); setMsg(`No se pudo guardar: ${error.message}`); return;
    }
    setTitulo(""); setTexto(""); setArchivo(null); setEnlace("");
    setReinicio((n) => n + 1); // vacía el campo de archivo
    await cargar();
    setBusy(false);
    setMsg("Listo: ya les aparece a los embajadores en Negocio → Material.");
  }

  async function quitar(p: EcosPromo) {
    if (!window.confirm(`¿Quitar «${p.titulo}» del material de los embajadores?`)) return;
    const sb = getSupabase();
    const { error } = await sb.from("ecos_promo").delete().eq("id", p.id);
    if (error) { setMsg(error.message); return; }
    if (p.file_path) await sb.storage.from("ecos-promo").remove([p.file_path]);
    await cargar();
  }

  return (
    <>
      <div className="adm-card adm-card-pad">
        <div className="adm-card-head">
          <div className="adm-card-titlerow"><h2 className="adm-card-title">Subir material de promoción</h2></div>
          <span className="adm-card-sub">Lo ven los embajadores en Negocio → Material</span>
        </div>
        <form onSubmit={subir} className="adm-ecos-promo-form">
          <div className="adm-field"><label htmlFor="promo-tipo">Tipo</label>
            <select id="promo-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as EcosPromo["tipo"])} disabled={busy}>
              {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div className="adm-field"><label htmlFor="promo-titulo">Título</label>
            <input id="promo-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Reel: qué es ECOS en 30 segundos" maxLength={140} disabled={busy} />
          </div>
          <div className="adm-field"><label htmlFor="promo-texto">Texto sugerido para publicar</label>
            <textarea id="promo-texto" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1500} disabled={busy}
              placeholder="El texto que va con la publicación. Escribe {enlace} donde quieras el enlace de cada embajador; si no lo pones, va al final." />
          </div>
          <div className="adm-field"><label htmlFor="promo-archivo">Archivo (imagen, video MP4/MOV o PDF · hasta {MAX_MB} MB)</label>
            <input key={reinicio} id="promo-archivo" type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,application/pdf" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} disabled={busy} />
          </div>
          {!archivo && (
            <div className="adm-field"><label htmlFor="promo-enlace">…o un enlace (YouTube, Drive, Canva)</label>
              <input id="promo-enlace" type="url" value={enlace} onChange={(e) => setEnlace(e.target.value)} placeholder="https://" disabled={busy} />
            </div>
          )}
          <button type="submit" className="adm-add-btn" disabled={busy}>{busy ? "Subiendo…" : "Publicar para los embajadores"}</button>
          {msg && <p className="adm-ecos-note">{msg}</p>}
        </form>
      </div>

      <div className="adm-card adm-card-pad">
        <div className="adm-card-head">
          <div className="adm-card-titlerow"><h2 className="adm-card-title">Lo que ven hoy</h2></div>
          <span className="adm-card-sub">{PROMO_BASE.length} flyers que vienen con el sitio + {piezas.length} que subiste</span>
        </div>
        <table className="adm-vend-table">
          <thead><tr><th>Pieza</th><th>Tipo</th><th>Subida</th><th></th></tr></thead>
          <tbody>
            {[...piezas, ...PROMO_BASE].map((p) => {
              const fija = p.id.startsWith("base-");
              return (
                <tr key={p.id}>
                  <td><a href={urlDePromo(p)} target="_blank" rel="noopener noreferrer">{p.titulo}</a></td>
                  <td>{TIPOS.find((t) => t.id === p.tipo)?.label}</td>
                  <td>{fija ? "Viene con el sitio" : fmtDate(p.created_at)}</td>
                  <td>{!fija && <button type="button" className="adm-ecos-del" onClick={() => quitar(p)}>Quitar</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
