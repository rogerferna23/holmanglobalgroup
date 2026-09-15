import { useMemo, useState } from "react";
import { BADGES } from "@/lib/ecos";
import { useClubDirectory, useClubSettings } from "@/lib/club-store";

export default function Comunidad() {
  const { directory, loading } = useClubDirectory();
  const { settings } = useClubSettings();
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return directory;
    return directory.filter((d) => [d.name, d.city, d.country, d.business].some((v) => (v ?? "").toLowerCase().includes(t)));
  }, [directory, q]);

  return (
    <div className="club-page">
      <header className="club-page-head">
        <p className="club-eyebrow">Rodeado de las personas correctas</p>
        <h1>Comunidad</h1>
        <p className="club-page-sub">Quién está en ECOS, de dónde y a qué se dedica. Si buscas a alguien, empieza aquí antes que afuera.</p>
      </header>

      <div className="club-community-row">
        {settings.whatsapp_group_url && <a className="club-btn small" href={settings.whatsapp_group_url} target="_blank" rel="noopener noreferrer">Grupo de WhatsApp</a>}
        <input className="club-search" type="search" placeholder="Buscar por ciudad o por oficio…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar en la comunidad" />
      </div>

      {loading ? <p className="club-muted">Cargando…</p> : list.length === 0 ? <p className="club-muted">{q ? "Nadie con esa búsqueda todavía." : "La comunidad se está formando. Serás de los primeros."}</p> : (
        <ul className="club-people">
          {list.map((d) => (
            <li key={d.id} className="club-person">
              <span className="club-person-avatar">{(d.name || "?").slice(0, 2).toUpperCase()}</span>
              <div className="club-person-body">
                <strong>{d.name}</strong>
                <span className="club-muted">{[d.business, [d.city, d.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</span>
                <span className="club-person-levels">V{d.level_ventas} · M{d.level_marketing} · O{d.level_oratoria}</span>
              </div>
              <div className="club-person-badges">
                {d.badges.slice(0, 4).map((b) => <span key={b} title={BADGES[b]?.label}>{BADGES[b]?.icon ?? "◆"}</span>)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
