import { useMemo, useState } from "react";
import { useClub } from "@/contexts/ClubContext";
import { ECOS, fmtDate, icsFor, SESSION_KIND_LABEL, SUBJECT_LABEL, zonaHoraria, type EcosSession } from "@/lib/ecos";
import { CLUB } from "@/lib/routes";
import { canMarkAttendance, useClubLibrary, useClubSessions, useClubSettings } from "@/lib/club-store";
import { Cover, toneFor } from "@/club/Cover";

function monthKey(iso: string) { return new Date(iso).toLocaleDateString("es-US", { month: "long", year: "numeric" }); }

export default function Clases() {
  const { member, progress, markAttendance } = useClub();
  const { sessions, loading } = useClubSessions();
  const { settings } = useClubSettings();
  const { items: recordings } = useClubLibrary("grabacion");
  const [msg, setMsg] = useState<Record<string, string>>({});

  const hasRecording = useMemo(() => new Set(recordings.filter((r) => r.url || r.bunny_video_id).map((r) => r.id)), [recordings]);
  const groups = useMemo(() => {
    const map = new Map<string, EcosSession[]>();
    for (const s of sessions) map.set(monthKey(s.starts_at), [...(map.get(monthKey(s.starts_at)) ?? []), s]);
    return [...map.entries()];
  }, [sessions]);
  const now = Date.now();

  async function attend(s: EcosSession) {
    const r = await markAttendance(s.id);
    const skill = s.kind === "masterclass" ? "las tres" : SUBJECT_LABEL[s.subject];
    setMsg((m) => ({ ...m, [s.id]: r.error ?? (r.points ? `+${r.points} XP en ${skill}` : "Ya estaba marcada") }));
  }
  const inviteLink = (s: EcosSession) => `${window.location.origin}/ecos/invitado?s=${s.id}&by=${member?.referral_code ?? ""}`;

  return (
    <div className="club-page">
      <header className="club-page-head">
        <p className="club-eyebrow">Calendario</p>
        <h1>Clases y prácticas</h1>
        <p className="club-page-sub">Clase +{ECOS.xp.clase} XP · práctica +{ECOS.xp.practica} · masterclass +{ECOS.xp.masterclass} en las tres. {settings.horario}</p>
        <p className="club-page-sub club-tz">Las horas están en la tuya: <strong>{zonaHoraria()}</strong>. No tienes que convertir nada.</p>
      </header>

      {loading ? <p className="club-muted">Cargando…</p> : groups.length === 0 ? <p className="club-muted">El calendario del mes se publica pronto.</p> : groups.map(([month, list]) => (
        <section key={month} className="club-month">
          <h2 className="club-month-title">{month}</h2>
          <ul className="club-sessions">
            {list.map((s) => {
              const past = new Date(s.starts_at).getTime() + 90 * 60 * 1000 < now;
              const zoom = s.zoom_url || settings.zoom_url;
              const attended = progress.attended.includes(s.id);
              const canMark = !attended && canMarkAttendance(s, now);
              const rec = s.recording_id && hasRecording.has(s.recording_id);
              return (
                <li key={s.id} className={`club-session${past ? " past" : ""}`}>
                  <Cover tone={toneFor(s.subject, s.kind)} size="sm" tag={SESSION_KIND_LABEL[s.kind]} />
                  <div className="club-session-body">
                    <span className="club-session-when">{fmtDate(s.starts_at, true)}{s.teacher ? ` · ${s.teacher}` : ""}{attended ? " · Asististe ✓" : ""}</span>
                    <h3>{s.title}</h3>
                    {s.description && <p className="club-session-desc">{s.description}</p>}
                    {s.open_to_guests && !past && (
                      <p className="club-session-invite">Abierta a invitados · <button type="button" className="club-link" onClick={() => navigator.clipboard?.writeText(inviteLink(s))}>Copiar enlace para invitar</button></p>
                    )}
                    {msg[s.id] && <p className="club-muted">{msg[s.id]}</p>}
                  </div>
                  <div className="club-session-action">
                    {canMark && <button type="button" className="club-btn small" onClick={() => attend(s)}>Asistí</button>}
                    {!canMark && !past && zoom && <a className="club-btn small" href={zoom} target="_blank" rel="noopener noreferrer">Zoom</a>}
                    {!past && <a className="club-link" href={icsFor(s, zoom)} download={`ecos-${s.id}.ics`}>Al calendario</a>}
                    {past && (rec ? <a className="club-btn small ghost" href={`${CLUB.grabaciones}#${s.recording_id}`}>Ver grabación</a> : <span className="club-muted">Grabación pronto</span>)}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
