import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { BADGES, fmtDate, nivelEcos } from "@/lib/ecos";
import { CLUB } from "@/lib/routes";
import { SkillBars } from "@/club/SkillBars";

export default function Cuenta() {
  const { member, progress, openPortal, updateProfile } = useClub();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: member?.name ?? "", whatsapp: member?.whatsapp ?? "", city: member?.city ?? "", country: member?.country ?? "",
    business: member?.business ?? "", goal: member?.goal ?? "", show_in_directory: member?.show_in_directory ?? true,
  });

  async function portal() {
    setBusy(true); setError(null);
    const r = await openPortal();
    if (r.error) { setError(r.error); setBusy(false); }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setSaved(null);
    const r = await updateProfile({
      name: form.name.trim() || null, whatsapp: form.whatsapp.trim() || null, city: form.city.trim() || null, country: form.country.trim() || null,
      business: form.business.trim() || null, goal: form.goal.trim() || null, show_in_directory: form.show_in_directory,
    });
    setBusy(false);
    setSaved(r.error ?? "Guardado.");
    if (!r.error) setEditing(false);
  }

  async function logout() {
    await signOut();
    navigate(CLUB.entrar, { replace: true });
  }

  const inTrial = !!member?.current_period_end && member.founder && member.plan === "mensual" && Date.now() < new Date("2026-11-01T05:00:00Z").getTime();

  return (
    <div className="club-page">
      <header className="club-page-head">
        <p className="club-eyebrow">Tu membresía</p>
        <h1>Mi cuenta</h1>
      </header>

      <section className="club-account">
        <dl className="club-dl">
          <div><dt>Plan</dt><dd>{member?.plan === "anual" ? "Anual" : "Mensual"}<span className="club-tag">Activa</span>{member?.founder && <span className="club-tag ghost">Fundador</span>}</dd></div>
          <div><dt>Precio</dt><dd>${member?.price_usd} {member?.plan === "anual" ? "al año" : "al mes"}</dd></div>
          <div><dt>Miembro desde</dt><dd>{fmtDate(member?.started_at)}</dd></div>
          <div><dt>{inTrial ? "Primer cobro" : "Próximo cobro"}</dt><dd>{fmtDate(member?.current_period_end)}</dd></div>
        </dl>
        {error && <p className="club-error">{error}</p>}
        <div className="club-account-actions">
          <button type="button" className="club-btn" onClick={portal} disabled={busy}>{busy ? "Abriendo…" : "Cambiar tarjeta o ver recibos"}</button>
          <p className="club-muted">Desde ahí también puedes cancelar cuando quieras. Tu acceso sigue hasta el final del período pagado; tu avance se conserva 14 días por si vuelves.</p>
        </div>
      </section>

      <section className="club-account">
        <div className="club-list-head"><h3>Tu perfil</h3>{!editing && <button type="button" className="club-side-link" onClick={() => setEditing(true)}>Editar</button>}</div>
        {editing ? (
          <form onSubmit={save} className="club-form">
            <div className="club-form-grid">
              <label className="club-field"><span>Nombre</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
              <label className="club-field"><span>WhatsApp</span><input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></label>
              <label className="club-field"><span>Ciudad</span><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
              <label className="club-field"><span>País</span><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></label>
              <label className="club-field full"><span>A qué te dedicas</span><input value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} /></label>
              <label className="club-field full"><span>Qué quieres lograr</span><input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} /></label>
            </div>
            <label className="club-check"><input type="checkbox" checked={form.show_in_directory} onChange={(e) => setForm({ ...form, show_in_directory: e.target.checked })} /> Aparecer en el directorio de la comunidad</label>
            <div className="club-next-actions">
              <button type="submit" className="club-btn small" disabled={busy}>Guardar</button>
              <button type="button" className="club-side-link" onClick={() => setEditing(false)}>Cancelar</button>
            </div>
          </form>
        ) : (
          <dl className="club-dl">
            <div><dt>Nombre</dt><dd>{member?.name || "—"}</dd></div>
            <div><dt>Correo</dt><dd>{member?.email}</dd></div>
            <div><dt>WhatsApp</dt><dd>{member?.whatsapp || "—"}</dd></div>
            <div><dt>Ciudad</dt><dd>{[member?.city, member?.country].filter(Boolean).join(", ") || "—"}</dd></div>
            <div><dt>A qué te dedicas</dt><dd>{member?.business || "—"}</dd></div>
            <div><dt>Qué quieres lograr</dt><dd>{member?.goal || "—"}</dd></div>
            <div><dt>Directorio</dt><dd>{member?.show_in_directory ? "Apareces" : "No apareces"}</dd></div>
          </dl>
        )}
        {saved && <p className="club-muted">{saved}</p>}
      </section>

      <section className="club-account">
        <div className="club-list-head"><h3>Tu avance</h3><span className="club-muted">Nivel ECOS {nivelEcos(progress.xp)} · racha de {progress.streak}</span></div>
        <SkillBars xp={progress.xp} />
        <div className="club-badges-grid">
          {Object.entries(BADGES).map(([key, b]) => {
            const got = progress.badges.find((x) => x.badge === key);
            return (
              <div key={key} className={`club-badge-card${got ? " got" : ""}`} title={b.desc}>
                <span className="club-badge-icon">{b.icon}</span>
                <strong>{b.label}</strong>
                <span className="club-muted">{got ? fmtDate(got.at) : b.desc}</span>
              </div>
            );
          })}
        </div>
      </section>

      <button type="button" className="club-side-link" onClick={logout}>Cerrar sesión</button>
    </div>
  );
}
