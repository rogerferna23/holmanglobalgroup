import { useState, type FormEvent } from "react";
import { giveBonus, useEcosMembers, useEcosRetos, useEcosRpc, type RankingRow } from "@/lib/ecos-admin-store";
import { levelOf, SKILL_LABEL, SKILLS, type Skill } from "@/lib/ecos";

/** Retos del mes, XP a mano y ranking: lo que hace que el RPG se sienta vivo. */
export function EcosRetos() {
  const { data: retos, loading, add, update, remove } = useEcosRetos();
  const { data: members } = useEcosMembers();
  const { data: ranking, refresh } = useEcosRpc<RankingRow>("ecos_ranking", "ecos_ranking");

  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [skill, setSkill] = useState<Skill>("ventas");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [bMember, setBMember] = useState("");
  const [bSkill, setBSkill] = useState<Skill>("ventas");
  const [bPoints, setBPoints] = useState(25);
  const [bNote, setBNote] = useState("");
  const [bMsg, setBMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const err = await add({ month: `${month}-01`, skill, title: title.trim(), description: desc.trim() || null, active: true });
    setBusy(false);
    setMsg(err ?? "Reto publicado.");
    if (!err) { setTitle(""); setDesc(""); }
  }

  async function onBonus(e: FormEvent) {
    e.preventDefault();
    if (!bMember) return;
    setBMsg(null);
    const err = await giveBonus(bMember, bSkill, bPoints, bNote.trim());
    setBMsg(err ?? `+${bPoints} XP en ${SKILL_LABEL[bSkill]}.`);
    if (!err) { setBNote(""); await refresh(); }
  }

  const activos = members.filter((m) => m.status === "activo");

  return (
    <div className="adm-ecos-grid">
      <div>
        <div className="adm-card adm-card-pad" style={{ marginBottom: 16 }}>
          <div className="adm-card-head"><div className="adm-card-titlerow"><h2 className="adm-card-title">Reto del mes</h2></div><span className="adm-card-sub">opcional · +50 XP</span></div>
          <form onSubmit={onSubmit} className="adm-ecos-form">
            <div className="adm-form-row">
              <div className="adm-field"><label htmlFor="r-month">Mes</label><input id="r-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} required /></div>
              <div className="adm-field"><label htmlFor="r-skill">Habilidad</label><select id="r-skill" value={skill} onChange={(e) => setSkill(e.target.value as Skill)}>{SKILLS.map((k) => <option key={k} value={k}>{SKILL_LABEL[k]}</option>)}</select></div>
            </div>
            <div className="adm-field"><label htmlFor="r-title">Reto</label><input id="r-title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tu oferta en 90 segundos" /></div>
            <div className="adm-field"><label htmlFor="r-desc">Descripción</label><textarea id="r-desc" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
            {msg && <p className="adm-ecos-note">{msg}</p>}
            <button type="submit" className="adm-add-btn" disabled={busy}>Publicar reto</button>
          </form>
          <table className="adm-vend-table adm-ecos-breakdown" style={{ marginTop: 14 }}>
            <tbody>
              {retos.length === 0 ? <tr><td className="adm-tx-empty">{loading ? "Cargando…" : "Sin retos todavía."}</td></tr> : retos.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.title}</strong><br /><small className="adm-ecos-sub">{r.month.slice(0, 7)} · {SKILL_LABEL[r.skill]}</small></td>
                  <td>
                    <button type="button" className={`adm-pill ${r.active ? "ok" : "off"} adm-ecos-pillbtn`} onClick={() => update(r.id, { active: !r.active })}>{r.active ? "Activo" : "Cerrado"}</button>{" "}
                    <button type="button" className="adm-ecos-del" onClick={() => { if (confirm("¿Borrar este reto?")) void remove(r.id); }}>Borrar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="adm-card adm-card-pad">
          <div className="adm-card-head"><div className="adm-card-titlerow"><h2 className="adm-card-title">XP a mano</h2></div><span className="adm-card-sub">«esa presentación fue de otro nivel»</span></div>
          <form onSubmit={onBonus} className="adm-ecos-form">
            <div className="adm-field"><label htmlFor="b-member">Miembro</label>
              <select id="b-member" value={bMember} onChange={(e) => setBMember(e.target.value)} required>
                <option value="">— elige —</option>
                {activos.map((m) => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
              </select></div>
            <div className="adm-form-row">
              <div className="adm-field"><label htmlFor="b-skill">Habilidad</label><select id="b-skill" value={bSkill} onChange={(e) => setBSkill(e.target.value as Skill)}>{SKILLS.map((k) => <option key={k} value={k}>{SKILL_LABEL[k]}</option>)}</select></div>
              <div className="adm-field"><label htmlFor="b-points">Puntos</label><input id="b-points" type="number" min={1} max={500} value={bPoints} onChange={(e) => setBPoints(Number(e.target.value))} /></div>
            </div>
            <div className="adm-field"><label htmlFor="b-note">Motivo (lo ve el miembro)</label><input id="b-note" type="text" value={bNote} onChange={(e) => setBNote(e.target.value)} placeholder="Presentación de otro nivel en la práctica" /></div>
            {bMsg && <p className="adm-ecos-note">{bMsg}</p>}
            <button type="submit" className="adm-add-btn">Dar XP</button>
          </form>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head" style={{ padding: "15px 17px 0" }}><div className="adm-card-titlerow"><h2 className="adm-card-title">Ranking</h2></div><span className="adm-card-sub">miembros activos · por XP total</span></div>
        <table className="adm-vend-table">
          <thead><tr><th>#</th><th>Miembro</th><th>Ventas</th><th>Marketing</th><th>Oratoria</th><th>Racha</th><th>Insignias</th></tr></thead>
          <tbody>
            {ranking.length === 0 ? <tr><td colSpan={7} className="adm-tx-empty">Todavía nadie ha sumado XP.</td></tr> : ranking.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td>{r.name}</td>
                <td>N{levelOf(r.xp_ventas)} <small className="adm-ecos-sub">{r.xp_ventas}</small></td>
                <td>N{levelOf(r.xp_marketing)} <small className="adm-ecos-sub">{r.xp_marketing}</small></td>
                <td>N{levelOf(r.xp_oratoria)} <small className="adm-ecos-sub">{r.xp_oratoria}</small></td>
                <td>{r.streak}</td>
                <td>{r.badges}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
