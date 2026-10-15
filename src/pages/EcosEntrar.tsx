import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Seo } from "@/components/seo";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { getSupabase } from "@/lib/supabase";
import { ECOS, isFounderWindowOpen } from "@/lib/ecos";
import { CLUB } from "@/lib/routes";
import { leerReferido, useQuienInvita } from "@/lib/referido";
import { leerCampana } from "@/lib/campana";
import { TERMINOS_ECOS_VERSION } from "@/pages/policies/TerminosEcos";

type Mode = "crear" | "entrar" | "enlace";

/** En este navegador ya hubo una cuenta: la puerta abre en «Ya soy miembro» y no en «Crear cuenta». */
const MARCA_CUENTA = "ecos-tiene-cuenta";

function yaTuvoCuenta(): boolean {
  try {
    return localStorage.getItem(MARCA_CUENTA) === "1";
  } catch {
    return false;
  }
}

/**
 * Puerta del club: crear cuenta o entrar. Aquí NO se cobra ni se pide tarjeta.
 *
 * Antes el registro terminaba en el pago, y la gente se iba creyendo que le
 * cobraban en ese momento. Ahora crear la cuenta es solo eso; al terminar,
 * quien no tiene membresía cae en el panel, que le muestra una sola cosa:
 * activar su membresía (MembresiaInactiva), con el «hoy pagas $0» bien claro.
 *
 * Para quien ya es miembro: abre en «Ya soy miembro» si viene del panel o si en
 * este navegador ya hubo cuenta, y ofrece «Entrar sin contraseña» (la función
 * ecos-acceso manda un botón al correo; al volver con ?acceso= se canjea aquí).
 */
export default function EcosEntrar() {
  const { session, signIn, loading: authLoading } = useAuth();
  const { signUp } = useClub();
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const acceso = params.get("acceso");
  const [mode, setMode] = useState<Mode>(() =>
    (location.state as { from?: string } | null)?.from || params.has("entrar") || acceso || yaTuvoCuenta() ? "entrar" : "crear");
  const [enlaceEnviado, setEnlaceEnviado] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Estados Unidos");
  const [business, setBusiness] = useState("");
  const [goal, setGoal] = useState("");
  const [showInDirectory, setShowInDirectory] = useState(true);
  const [acepto, setAcepto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const [cuentaLista, setCuentaLista] = useState(false);

  // Invitación para quien va a dar clase: crea su cuenta y para ahí. No le
  // corresponde pagar. El enlace no da acceso por sí solo —eso lo decide Holman
  // desde el panel—, así que no importa quién lo tenga.
  const comoProfesor = params.get("profesor") === "1";
  const founder = isFounderWindowOpen();
  const invita = useQuienInvita();

  // Volvió con el botón del correo «Entrar sin contraseña»: se canjea y queda dentro.
  const canjeado = useRef(false);
  useEffect(() => {
    if (!acceso || canjeado.current) return;
    canjeado.current = true;
    setBusy(true);
    void getSupabase().auth.verifyOtp({ token_hash: acceso, type: "magiclink" }).then(({ error: err }) => {
      if (err) {
        setError("Ese botón ya se usó o venció. Pide uno nuevo y entras en un momento.");
        setMode("enlace");
      }
      setBusy(false);
    });
  }, [acceso]);

  // Con sesión abierta, se decide solo a dónde ir.
  useEffect(() => {
    if (authLoading || !session?.user) return;
    try { localStorage.setItem(MARCA_CUENTA, "1"); } catch { /* sin almacenamiento */ }
    void routeAfterLogin(session.user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.user?.id]);

  async function routeAfterLogin(userId: string) {
    if (comoProfesor) {
      const { data } = await getSupabase().from("ecos_members").select("teacher").eq("id", userId).maybeSingle();
      if (!data?.teacher) { setCuentaLista(true); return; }
    }
    // Con o sin membresía, al panel: si no la tiene, el panel solo le muestra
    // cómo activarla.
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from && from.startsWith(CLUB.panel) ? from : CLUB.panel, { replace: true });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    if (mode === "enlace") {
      const { data, error: err } = await getSupabase().functions.invoke("ecos-acceso", { body: { email: email.trim() } });
      setBusy(false);
      if (err || data?.error) { setError("No pudimos enviar el correo. Revisa la dirección e intenta de nuevo."); return; }
      setEnlaceEnviado(true);
      return;
    }

    if (mode === "crear") {
      if (name.trim().length < 2) { setError("Dinos tu nombre, así te llamamos por él en la sala."); setBusy(false); return; }
      if (whatsapp.replace(/\D/g, "").length < 8) { setError("Tu WhatsApp con código de país: ahí te llegan los recordatorios de clase."); setBusy(false); return; }
      if (!acepto) { setError("Para crear tu cuenta, acepta los términos de ECOS."); setBusy(false); return; }
      const r = await signUp({
        name: name.trim(), email: email.trim(), password,
        whatsapp: whatsapp.trim(), city: city.trim() || null, country: country.trim() || null,
        business: business.trim() || null, goal: goal.trim() || null, show_in_directory: showInDirectory,
        ...(comoProfesor ? { profesor: true } : {}),
        ref: leerReferido(),
        campana: leerCampana(),
        terminos_ecos: TERMINOS_ECOS_VERSION,
        terminos_aceptados_at: new Date().toISOString(),
      });
      if (r.error) {
        setError(/already|registered|exists/i.test(r.error) ? "Ya existe una cuenta con ese correo. Entra con tu contraseña." : r.error);
        setBusy(false);
        return;
      }
      if (r.needsConfirm) { setConfirmSent(true); setBusy(false); return; }
      return; // con la sesión creada, el efecto de arriba lleva al panel
    }

    const r = await signIn(email.trim(), password);
    if (r.error) { setError("Correo o contraseña incorrectos."); setBusy(false); }
  }

  return (
    <div className="club-gate">
      <Seo title={`Ingreso al club — ${ECOS.brand} ${ECOS.category}`} description="Entra a tu panel de miembro de ECOS Business Club." noindex />
      <div className={`club-gate-card${mode === "crear" ? " wide" : ""}`}>
        <Link to={CLUB.landing} className="club-gate-brand"><span>{ECOS.brand}</span> {ECOS.category}</Link>

        {cuentaLista ? (
          <>
            <h1 className="club-gate-title">Tu cuenta está lista</h1>
            <p className="club-gate-body">
              No tienes que pagar nada: das una de las materias. Avísale a Holman que ya te
              registraste y te abre el acceso. Entras por aquí mismo con tu correo y tu contraseña.
            </p>
            <p className="club-gate-foot"><Link to={CLUB.landing}>Ver qué incluye el club</Link></p>
          </>
        ) : enlaceEnviado ? (
          <>
            <h1 className="club-gate-title">Revisa tu correo</h1>
            <p className="club-gate-body">Si <strong>{email}</strong> es la cuenta de un miembro, te acaba de llegar un botón para entrar a tu panel sin contraseña. Sirve una vez y durante la próxima hora.</p>
            <p className="club-muted">¿No llega? Mira en promociones o spam, o revisa que sea el correo con el que te registraste.</p>
            <p className="club-gate-foot"><button type="button" onClick={() => { setEnlaceEnviado(false); setMode("entrar"); }}>Volver</button></p>
          </>
        ) : confirmSent ? (
          <>
            <h1 className="club-gate-title">Revisa tu correo</h1>
            <p className="club-gate-body">Te enviamos un enlace a <strong>{email}</strong> para confirmar tu cuenta. Al abrirlo vuelves aquí y entras a tu panel.</p>
            <p className="club-muted">¿No llega? Mira en spam, o vuelve a intentarlo en unos minutos.</p>
          </>
        ) : (
          <>
            <div className="club-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={mode === "crear"} className={mode === "crear" ? "active" : ""} onClick={() => setMode("crear")}>Crear cuenta</button>
              <button type="button" role="tab" aria-selected={mode !== "crear"} className={mode !== "crear" ? "active" : ""} onClick={() => setMode("entrar")}>Ya soy miembro</button>
            </div>

            <h1 className="club-gate-title">{comoProfesor && mode === "crear" ? "Crea tu cuenta de profesor" : mode === "crear" ? "Crea tu cuenta" : mode === "enlace" ? "Entra sin contraseña" : "Bienvenido de vuelta"}</h1>
            <p className="club-gate-body">
              {comoProfesor && mode === "crear"
                ? "Das una de las materias, así que no pagas nada. Crea tu cuenta y avísale a Holman para que te abra el acceso."
                : mode === "crear"
                ? "Crear tu cuenta es gratis y aquí no se pide tarjeta. Cuéntanos quién eres: así te llamamos por tu nombre en la sala y la comunidad sabe a qué te dedicas."
                : mode === "enlace"
                ? "Escribe el correo con el que te registraste y te mandamos un botón para entrar de un toque."
                : "Tu panel te espera con las clases de la semana."}
            </p>

            {mode === "crear" && !comoProfesor && invita && (
              <p className="ecos-hero-invita club-gate-invita">
                <span aria-hidden>✦</span>
                <span>Te invitó <b>{invita}</b>.</span>
              </p>
            )}

            <form onSubmit={onSubmit} className="club-form">
              {mode === "crear" && (
                <div className="club-form-grid">
                  <label className="club-field"><span>Tu nombre</span><input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como quieres que te llamemos" required disabled={busy} /></label>
                  <label className="club-field"><span>WhatsApp</span><input type="tel" autoComplete="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+1 305 555 0100" required disabled={busy} /></label>
                  <label className="club-field"><span>Ciudad</span><input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Houston" disabled={busy} /></label>
                  <label className="club-field"><span>País</span><input type="text" value={country} onChange={(e) => setCountry(e.target.value)} disabled={busy} /></label>
                  <label className="club-field full"><span>A qué te dedicas</span><input type="text" value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="Diseñadora de interiores · Contador · Coach…" disabled={busy} /></label>
                  <label className="club-field full"><span>Qué quieres lograr en ECOS</span><input type="text" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Una frase. Te la recordamos a los tres meses." disabled={busy} /></label>
                </div>
              )}
              <div className={mode === "crear" ? "club-form-grid" : undefined}>
                <label className="club-field"><span>Correo</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required disabled={busy} /></label>
                {mode !== "enlace" && (
                  <label className="club-field"><span>Contraseña</span><input type="password" autoComplete={mode === "crear" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "crear" ? "Mínimo 8 caracteres" : "••••••••"} minLength={8} required disabled={busy} /></label>
                )}
              </div>

              {mode === "crear" && !comoProfesor && (
                <label className="club-check"><input type="checkbox" checked={showInDirectory} onChange={(e) => setShowInDirectory(e.target.checked)} /> Aparecer en el directorio de la comunidad (nombre, ciudad y a qué te dedicas)</label>
              )}
              {mode === "crear" && (
                <label className="club-check">
                  <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} required />
                  <span>
                    Acepto los <Link to={CLUB.terminos} target="_blank" rel="noopener">términos de ECOS</Link>, incluida la
                    grabación de las clases, y la <Link to="/privacidad" target="_blank" rel="noopener">política de privacidad</Link>
                  </span>
                </label>
              )}

              {error && <p className="club-error">{error}</p>}

              <button type="submit" className="club-btn" disabled={busy}>
                {busy ? "Un momento…" : mode === "entrar" ? "Entrar" : mode === "enlace" ? "Envíame el botón para entrar" : "Crear mi cuenta"}
              </button>
              {mode === "entrar" && (
                <button type="button" className="club-btn ghost" onClick={() => { setError(null); setMode("enlace"); }} disabled={busy}>
                  Entrar sin contraseña
                </button>
              )}
              {mode === "enlace" && (
                <button type="button" className="club-link-back" onClick={() => { setError(null); setMode("entrar"); }}>
                  Prefiero usar mi contraseña
                </button>
              )}
              {mode === "crear" && !comoProfesor && founder && (
                <p className="club-form-nota">Los fundadores usan todo octubre gratis, sin tarjeta.</p>
              )}
              {mode === "crear" && !comoProfesor && !founder && (
                <p className="club-form-nota">Usas todo el club {ECOS.pruebaDias} días gratis, sin tarjeta.</p>
              )}
            </form>

            <p className="club-gate-foot">
              {mode === "crear"
                ? <>¿Ya tienes cuenta? <button type="button" onClick={() => setMode("entrar")}>Entra aquí</button></>
                : <>¿Primera vez? <button type="button" onClick={() => setMode("crear")}>Crea tu cuenta</button></>}
              {mode !== "crear" && <> <span aria-hidden="true">·</span> <Link to={CLUB.clave}>Olvidé mi contraseña</Link></>}
            </p>
          </>
        )}
      </div>
      <p className="club-gate-firma">· Holman Global Group</p>
    </div>
  );
}
