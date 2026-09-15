import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Seo } from "@/components/seo";
import { getSupabase } from "@/lib/supabase";
import { ECOS, fmtDate } from "@/lib/ecos";
import { CLUB } from "@/lib/routes";

type OpenSession = { id: string; title: string; starts_at: string; teacher: string | null; description: string | null };

/**
 * Formulario público para invitados a una masterclass abierta. Llega por el
 * enlace que comparte un miembro (?s=SESION&by=CODIGO). Sin login: el registro
 * entra por RLS (insert público) y queda ligado a quien invitó.
 */
export default function EcosInvitado() {
  const [params] = useSearchParams();
  const sessionId = params.get("s") ?? "";
  const by = (params.get("by") ?? "").toUpperCase();
  const [session, setSession] = useState<OpenSession | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getSupabase().rpc("ecos_open_session", { p_session: sessionId });
        const row = Array.isArray(data) ? data[0] : data;
        setSession((row as OpenSession | undefined) ?? null);
      } catch {
        setSession(null);
      }
    })();
  }, [sessionId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const sb = getSupabase();
    let invitedBy: string | null = null;
    if (by) {
      const { data } = await sb.rpc("ecos_resolve_referral", { code: by });
      invitedBy = (data as string | null) ?? null;
    }
    const { error: err } = await sb.from("ecos_guests").insert({
      session_id: session?.id ?? null, name: name.trim(), email: email.trim().toLowerCase(), whatsapp: whatsapp.trim() || null, invited_by: invitedBy,
    });
    setBusy(false);
    if (err) { setError("No se pudo registrar. Inténtalo de nuevo en un momento."); return; }
    if (by) sessionStorage.setItem("ecos_ref", by);
    setDone(true);
  }

  return (
    <div className="club-gate">
      <Seo title={`Invitación — ${ECOS.brand} ${ECOS.category}`} description="Regístrate como invitado a la masterclass de ECOS." noindex />
      <div className="club-gate-card">
        <Link to={CLUB.landing} className="club-gate-brand"><span>{ECOS.brand}</span> {ECOS.category}</Link>

        {session === undefined ? (
          <p className="club-muted">Cargando…</p>
        ) : session === null ? (
          <>
            <h1 className="club-gate-title">Esta invitación ya no está abierta</h1>
            <p className="club-gate-body">La masterclass a la que te invitaron ya pasó o no admite invitados. Pero el club sigue abierto.</p>
            <Link to={CLUB.landing} className="club-btn">Conocer ECOS</Link>
          </>
        ) : done ? (
          <>
            <h1 className="club-gate-title">Estás dentro</h1>
            <p className="club-gate-body">Te esperamos el <strong>{fmtDate(session.starts_at, true)}</strong>. El enlace de Zoom te llega por correo y por WhatsApp el mismo día.</p>
            <p className="club-muted">Si después quieres quedarte, la persona que te invitó ya tiene tu lugar reservado.</p>
            <Link to={CLUB.landing} className="club-btn ghost">Mientras tanto, conoce el club</Link>
          </>
        ) : (
          <>
            <p className="club-eyebrow">Te invitaron a una masterclass</p>
            <h1 className="club-gate-title">{session.title}</h1>
            <p className="club-gate-body">
              {fmtDate(session.starts_at, true)}{session.teacher ? ` · con ${session.teacher}` : ""}. Es gratis: déjanos tus datos y te mandamos el enlace.
            </p>
            {session.description && <p className="club-muted" style={{ marginBottom: 18 }}>{session.description}</p>}
            <form onSubmit={onSubmit} className="club-form">
              <label className="club-field"><span>Tu nombre</span><input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={busy} /></label>
              <label className="club-field"><span>Correo</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} /></label>
              <label className="club-field"><span>WhatsApp</span><input type="tel" autoComplete="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+1 305 555 0100" disabled={busy} /></label>
              {error && <p className="club-error">{error}</p>}
              <button type="submit" className="club-btn" disabled={busy}>{busy ? "Registrando…" : "Reservar mi lugar"}</button>
            </form>
          </>
        )}
      </div>
      <p className="club-gate-firma">· Holman Global Group</p>
    </div>
  );
}
