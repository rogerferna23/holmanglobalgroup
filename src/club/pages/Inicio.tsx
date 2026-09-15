import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useClub } from "@/contexts/ClubContext";
import { BADGES, ECOS, fmtDate, nivelEcos, SESSION_KIND_LABEL, SUBJECT_LABEL } from "@/lib/ecos";
import { currentReto, monthSessions, nextSession, useClubDirectory, useClubLibrary, useClubRetos, useClubSessions, useClubSettings } from "@/lib/club-store";
import { SkillBars } from "@/club/SkillBars";
import { Cover, toneFor } from "@/club/Cover";

export default function Inicio() {
  const { member, progress, markReto } = useClub();
  const { sessions, loading } = useClubSessions();
  const { settings } = useClubSettings();
  const { retos } = useClubRetos();
  const { directory } = useClubDirectory();
  const { items: recordings } = useClubLibrary("grabacion");
  const [params, setParams] = useSearchParams();
  const [welcome, setWelcome] = useState(params.get("bienvenida") === "1");
  const [retoMsg, setRetoMsg] = useState<string | null>(null);

  useEffect(() => {
    if (params.get("bienvenida") === "1") { params.delete("bienvenida"); setParams(params, { replace: true }); }
  }, [params, setParams]);

  const next = useMemo(() => nextSession(sessions), [sessions]);
  const month = useMemo(() => monthSessions(sessions), [sessions]);
  const reto = useMemo(() => currentReto(retos), [retos]);
  const retoDone = reto ? progress.retos_done.includes(reto.id) : false;
  const zoom = next?.zoom_url || settings.zoom_url || "";
  const firstName = (member?.name || "").split(" ")[0];
  const lastBadges = [...progress.badges].slice(-4).reverse();
  const recent = directory.filter((d) => d.id !== member?.id).slice(0, 5);

  async function doReto() {
    if (!reto) return;
    const r = await markReto(reto.id);
    setRetoMsg(r.error ?? (r.points ? `+${r.points} XP en ${SUBJECT_LABEL[reto.skill]}.` : "Ya estaba marcado."));
  }

  return (
    <div className="club-page">
      {welcome && (
        <div className="club-toast" role="status">
          <strong>Bienvenido a la comunidad{firstName ? `, ${firstName}` : ""}.</strong> Ya estás dentro. Ven a la próxima clase: tu primera insignia te espera.
          <button type="button" aria-label="Cerrar" onClick={() => setWelcome(false)}>×</button>
        </div>
      )}

      {/* HERO: la próxima sesión, con imagen */}
      <section className="club-hero">
        <img className="club-hero-bg" src="/hero-elefante-bg.jpg" alt="" />
        <span className="club-hero-veil" />
        <div className="club-hero-brand">
          <span className="club-plate-brand">{ECOS.brand}</span>
          <span className="club-plate-cat">{ECOS.category}</span>
          <span className="club-plate-sub">{ECOS.descriptor}</span>
        </div>
        <div className="club-hero-body">
          {loading ? <p className="club-muted">Cargando…</p> : next ? (
            <>
              <p className="club-eyebrow">Próxima sesión · {SESSION_KIND_LABEL[next.kind]}{next.subject !== "abierta" ? ` de ${SUBJECT_LABEL[next.subject]}` : ""}</p>
              <h1 className="club-hero-title">{next.title}</h1>
              <p className="club-hero-when">{fmtDate(next.starts_at, true)}{next.teacher ? ` · con ${next.teacher}` : ""}</p>
              <div className="club-hero-actions">
                {zoom ? <a className="club-btn" href={zoom} target="_blank" rel="noopener noreferrer">Entrar por Zoom</a> : <span className="club-muted">El enlace se publica el mismo día.</span>}
                {settings.zoom_passcode && <span className="club-passcode">Código <strong>{settings.zoom_passcode}</strong></span>}
                <Link to="clases" className="club-link">Ver el mes →</Link>
              </div>
            </>
          ) : (
            <><p className="club-eyebrow">Esta semana</p><h1 className="club-hero-title">El calendario se publica pronto.</h1></>
          )}
        </div>
      </section>

      {/* AVANCE: compacto */}
      <section className="club-row-head"><h2>Tu avance</h2><Link to="cuenta">Ver todo</Link></section>
      <section className="club-avance">
        <div className="club-avance-num"><span className="club-tile-num">{nivelEcos(progress.xp)}</span><span className="club-tile-label">nivel ECOS</span></div>
        <div className="club-avance-num"><span className="club-tile-num">{progress.streak}</span><span className="club-tile-label">semanas de racha</span></div>
        <div className="club-avance-bars"><SkillBars xp={progress.xp} compact /></div>
        {lastBadges.length > 0 && (
          <div className="club-avance-badges">
            {lastBadges.map((b) => <span key={b.badge} className="club-badge" title={BADGES[b.badge]?.desc}><i>{BADGES[b.badge]?.icon ?? "◆"}</i>{BADGES[b.badge]?.label ?? b.badge}</span>)}
          </div>
        )}
      </section>

      {/* ESTE MES: fila de tarjetas con portada */}
      {month.length > 0 && (
        <>
          <section className="club-row-head"><h2>Este mes</h2><Link to="clases">Ver el calendario</Link></section>
          <section className="club-row">
            {month.map((s) => (
              <Link key={s.id} to="clases" className="club-tile-card">
                <Cover tone={toneFor(s.subject, s.kind)} tag={SESSION_KIND_LABEL[s.kind]} />
                <span className="club-tile-card-title">{s.title}</span>
                <span className="club-tile-card-meta">{fmtDate(s.starts_at)}{s.teacher ? ` · ${s.teacher}` : ""}</span>
              </Link>
            ))}
          </section>
        </>
      )}

      {/* RETO */}
      {reto && (
        <section className="club-reto">
          <div>
            <p className="club-eyebrow">Reto del mes · {SUBJECT_LABEL[reto.skill]} · +50 XP</p>
            <h2>{reto.title}</h2>
            {reto.description && <p>{reto.description}</p>}
          </div>
          <div className="club-reto-action">
            {retoDone ? <span className="club-tag">Presentado</span> : <button type="button" className="club-btn small ghost" onClick={doReto}>Lo presenté</button>}
            {retoMsg && <span className="club-muted">{retoMsg}</span>}
          </div>
        </section>
      )}

      {/* GRABACIONES RECIENTES */}
      {recordings.length > 0 && (
        <>
          <section className="club-row-head"><h2>Grabaciones recientes</h2><Link to="grabaciones">Mostrar más</Link></section>
          <section className="club-row">
            {recordings.slice(-6).reverse().map((r) => (
              <Link key={r.id} to={`grabaciones#${r.id}`} className="club-tile-card">
                <Cover tone={toneFor(r.skill)} src={r.cover_url} tag={progress.viewed.includes(r.id) ? "Visto" : "Grabación"} />
                <span className="club-tile-card-title">{r.title}</span>
                {r.skill && <span className="club-tile-card-meta">{SUBJECT_LABEL[r.skill]}</span>}
              </Link>
            ))}
          </section>
        </>
      )}

      {/* COMUNIDAD */}
      <section className="club-row-head"><h2>La comunidad</h2><Link to="comunidad">Ver el directorio</Link></section>
      <section className="club-community-strip">
        <div className="club-faces">
          {recent.map((r) => <span key={r.id} className="club-face" title={r.name ?? ""}>{(r.name || "?").slice(0, 2).toUpperCase()}</span>)}
          {directory.length > recent.length && <span className="club-face more">+{directory.length - recent.length}</span>}
        </div>
        <span className="club-muted">{directory.length} {directory.length === 1 ? "persona" : "personas"} en ECOS</span>
        {settings.whatsapp_group_url && <a className="club-btn small" href={settings.whatsapp_group_url} target="_blank" rel="noopener noreferrer">Grupo de WhatsApp</a>}
      </section>
    </div>
  );
}
