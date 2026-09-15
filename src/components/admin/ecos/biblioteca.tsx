import { useMemo, useState, type FormEvent } from "react";
import { useEcosCourseAccess, useEcosLibrary, useEcosMembers } from "@/lib/ecos-admin-store";
import { SKILL_LABEL, SKILLS, usd, type LibraryKind, type Skill } from "@/lib/ecos";

const KIND_LABEL: Record<LibraryKind, string> = { curso: "Curso", grabacion: "Grabación", recurso: "Recurso" };

export function EcosBiblioteca() {
  const { data: items, loading, add, update, remove } = useEcosLibrary();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<LibraryKind>("grabacion");
  const [skill, setSkill] = useState<Skill | "">("");
  const [description, setDescription] = useState("");
  const [bunny, setBunny] = useState("");
  const [url, setUrl] = useState("");
  const [cover, setCover] = useState("");
  const [price, setPrice] = useState<string>("");
  const { data: members } = useEcosMembers();
  const { data: access, grant, revoke } = useEcosCourseAccess();
  const [accMember, setAccMember] = useState("");
  const [accCourse, setAccCourse] = useState("");
  const [accMsg, setAccMsg] = useState<string | null>(null);
  const [parent, setParent] = useState("");
  const [published, setPublished] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const courses = useMemo(() => items.filter((i) => i.kind === "curso" && !i.parent_id), [items]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const err = await add({
      title: title.trim(), kind, skill: skill || null, description: description.trim() || null,
      bunny_video_id: bunny.trim() || null, url: url.trim() || null, cover_url: cover.trim() || null,
      unlock_month: 0, parent_id: kind === "curso" && parent ? parent : null,
      price_usd: kind === "curso" && !parent && price.trim() ? Number(price) : null,
      published, sort_order: items.length,
    });
    setBusy(false);
    if (err) { setMsg(err); return; }
    setTitle(""); setDescription(""); setBunny(""); setUrl(""); setCover("");
    setMsg("Guardado.");
  }

  return (
    <div className="adm-ecos-grid">
      <div className="adm-card adm-card-pad">
        <div className="adm-card-head"><div className="adm-card-titlerow"><h2 className="adm-card-title">Nuevo contenido</h2></div></div>
        <form onSubmit={onSubmit} className="adm-ecos-form">
          <div className="adm-form-row">
            <div className="adm-field"><label htmlFor="l-kind">Tipo</label><select id="l-kind" value={kind} onChange={(e) => setKind(e.target.value as LibraryKind)}>{(Object.keys(KIND_LABEL) as LibraryKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></div>
            <div className="adm-field"><label htmlFor="l-skill">Habilidad (da XP ahí)</label><select id="l-skill" value={skill} onChange={(e) => setSkill(e.target.value as Skill | "")}><option value="">—</option>{SKILLS.map((k) => <option key={k} value={k}>{SKILL_LABEL[k]}</option>)}</select></div>
          </div>
          {kind === "curso" && (
            <div className="adm-form-row">
              <div className="adm-field"><label htmlFor="l-parent">Es lección de…</label><select id="l-parent" value={parent} onChange={(e) => setParent(e.target.value)}><option value="">— es un curso nuevo —</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
              <div className="adm-field"><label htmlFor="l-price">Precio USD (vacío = incluido para todos)</label><input id="l-price" type="number" min={0} step={1} value={price} disabled={!!parent} onChange={(e) => setPrice(e.target.value)} placeholder="197" /></div>
            </div>
          )}
          <div className="adm-field"><label htmlFor="l-title">Título</label><input id="l-title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="adm-field"><label htmlFor="l-desc">Descripción</label><textarea id="l-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="adm-field"><label htmlFor="l-bunny">Video de Bunny (id del video)</label><input id="l-bunny" type="text" value={bunny} onChange={(e) => setBunny(e.target.value)} placeholder="ej. 8f3c1a2e-…" /></div>
          <div className="adm-field"><label htmlFor="l-url">O enlace externo (si no está en Bunny)</label><input id="l-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></div>
          <div className="adm-field"><label htmlFor="l-cover">Portada (URL de imagen, opcional)</label><input id="l-cover" type="url" value={cover} onChange={(e) => setCover(e.target.value)} /></div>
          <label className="adm-ecos-check"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Publicado</label>
          {msg && <p className="adm-ecos-note">{msg}</p>}
          <button type="submit" className="adm-add-btn" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
        </form>
        <p className="adm-ecos-note">El id de la biblioteca de Bunny va en Ajustes; aquí solo el id de cada video.</p>

        <div className="adm-card-head" style={{ marginTop: 22 }}><div className="adm-card-titlerow"><h2 className="adm-card-title">Dar acceso a un curso</h2></div><span className="adm-card-sub">a mano o por compra</span></div>
        <form className="adm-ecos-form" onSubmit={async (e) => { e.preventDefault(); if (!accMember || !accCourse) return; const err = await grant(accMember, accCourse); setAccMsg(err ?? "Acceso dado."); }}>
          <div className="adm-form-row">
            <div className="adm-field"><label htmlFor="a-member">Miembro</label><select id="a-member" value={accMember} onChange={(e) => setAccMember(e.target.value)} required><option value="">— elige —</option>{members.filter((m) => m.status === "activo").map((m) => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}</select></div>
            <div className="adm-field"><label htmlFor="a-course">Curso</label><select id="a-course" value={accCourse} onChange={(e) => setAccCourse(e.target.value)} required><option value="">— elige —</option>{courses.filter((c) => c.price_usd).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
          </div>
          {accMsg && <p className="adm-ecos-note">{accMsg}</p>}
          <button type="submit" className="adm-add-btn">Dar acceso</button>
        </form>
        {access.length > 0 && (
          <table className="adm-vend-table adm-ecos-breakdown" style={{ marginTop: 12 }}>
            <tbody>
              {access.map((a) => (
                <tr key={`${a.member_id}-${a.library_id}`}>
                  <td>{members.find((m) => m.id === a.member_id)?.name ?? a.member_id}<br /><small className="adm-ecos-sub">{items.find((i) => i.id === a.library_id)?.title ?? a.library_id}</small></td>
                  <td><button type="button" className="adm-ecos-del" onClick={() => revoke(a.member_id, a.library_id)}>Quitar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="adm-card">
        <table className="adm-vend-table">
          <thead><tr><th>Contenido</th><th>Tipo</th><th>Video</th><th>Precio</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={6} className="adm-tx-empty">{loading ? "Cargando…" : "La biblioteca está vacía. Sube el primer contenido con el formulario."}</td></tr> : items.map((it) => (
              <tr key={it.id}>
                <td><strong>{it.parent_id ? "↳ " : ""}{it.title}</strong><br /><small className="adm-ecos-sub">{it.skill ? SKILL_LABEL[it.skill] : "sin habilidad"}{it.parent_id ? ` · lección de ${items.find((c) => c.id === it.parent_id)?.title ?? "…"}` : ""}</small></td>
                <td>{KIND_LABEL[it.kind]}</td>
                <td>{it.bunny_video_id ? "Bunny" : it.url ? "Enlace" : "—"}</td>
                <td>{it.kind === "curso" && !it.parent_id ? (it.price_usd ? usd(Number(it.price_usd)) : "Incluido") : "—"}</td>
                <td><button type="button" className={`adm-pill ${it.published ? "ok" : "off"} adm-ecos-pillbtn`} onClick={() => update(it.id, { published: !it.published })}>{it.published ? "Publicado" : "Oculto"}</button></td>
                <td><button type="button" className="adm-ecos-del" onClick={() => { if (confirm("¿Borrar este contenido?")) void remove(it.id); }}>Borrar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
