import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Seo } from "@/components/seo";
import { getSupabase } from "@/lib/supabase";
import { ECOS } from "@/lib/ecos";
import { CLUB } from "@/lib/routes";

/**
 * Recuperar la contraseña. Dos momentos en una sola pantalla:
 *
 *  1. Sin sesión de recuperación: se pide el correo y Supabase manda el enlace.
 *  2. Llegando desde ese enlace (hay sesión), se escribe la contraseña nueva.
 *
 * El aviso de "te mandamos el enlace" no dice si el correo existe o no: si lo
 * dijera, cualquiera podría averiguar quién está en el club probando correos.
 */
export default function EcosClave() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"pedir" | "cambiar">("pedir");
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [clave2, setClave2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  // Supabase abre sesión al entrar por el enlace del correo (evento RECOVERY).
  useEffect(() => {
    const sb = getSupabase();
    const { data } = sb.auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY") setModo("cambiar");
    });
    void sb.auth.getSession().then(({ data: s }) => {
      if (s.session && /type=recovery/.test(window.location.hash)) setModo("cambiar");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function pedirEnlace(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    await getSupabase().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${CLUB.clave}`,
    });
    // Se responde igual exista o no la cuenta: no se confirma quién es miembro.
    setEnviado(true);
    setBusy(false);
  }

  async function cambiarClave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (clave.length < 8) { setError("La contraseña necesita al menos 8 caracteres."); return; }
    if (clave !== clave2) { setError("Las dos contraseñas no coinciden."); return; }
    setBusy(true);
    const { error: err } = await getSupabase().auth.updateUser({ password: clave });
    setBusy(false);
    if (err) { setError(err.message); return; }
    navigate(CLUB.panel, { replace: true });
  }

  return (
    <div className="club-gate">
      <Seo title={`Recuperar contraseña — ${ECOS.brand} ${ECOS.category}`} description="Restablece tu contraseña del club." noindex />
      <div className="club-gate-card">
        <Link to={CLUB.landing} className="club-gate-brand"><span>{ECOS.brand}</span> {ECOS.category}</Link>

        {modo === "cambiar" ? (
          <>
            <h1 className="club-gate-title">Tu contraseña nueva</h1>
            <p className="club-gate-body">Escríbela dos veces y entras directo al panel.</p>
            <form onSubmit={cambiarClave} className="club-form">
              <label className="club-field"><span>Contraseña nueva</span><input type="password" autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} placeholder="Mínimo 8 caracteres" minLength={8} required disabled={busy} /></label>
              <label className="club-field"><span>Repítela</span><input type="password" autoComplete="new-password" value={clave2} onChange={(e) => setClave2(e.target.value)} placeholder="La misma" minLength={8} required disabled={busy} /></label>
              {error && <p className="club-error">{error}</p>}
              <button type="submit" className="club-btn" disabled={busy}>{busy ? "Guardando…" : "Guardar y entrar"}</button>
            </form>
          </>
        ) : enviado ? (
          <>
            <h1 className="club-gate-title">Revisa tu correo</h1>
            <p className="club-gate-body">
              Si <strong>{email}</strong> tiene cuenta en el club, ahí llega un enlace para poner una
              contraseña nueva. Vence en una hora.
            </p>
            <p className="club-muted">¿No llega? Mira en spam, o escríbenos y te ayudamos a entrar.</p>
            <p className="club-gate-foot"><Link to={CLUB.entrar}>Volver al ingreso</Link></p>
          </>
        ) : (
          <>
            <h1 className="club-gate-title">¿Olvidaste tu contraseña?</h1>
            <p className="club-gate-body">Déjanos tu correo y te mandamos un enlace para cambiarla.</p>
            <form onSubmit={pedirEnlace} className="club-form">
              <label className="club-field"><span>Correo</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required disabled={busy} /></label>
              {error && <p className="club-error">{error}</p>}
              <button type="submit" className="club-btn" disabled={busy}>{busy ? "Enviando…" : "Mandarme el enlace"}</button>
            </form>
            <p className="club-gate-foot"><Link to={CLUB.entrar}>Volver al ingreso</Link></p>
          </>
        )}
      </div>
      <p className="club-gate-firma">· Holman Global Group</p>
    </div>
  );
}
