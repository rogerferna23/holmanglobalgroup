import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Seo } from "@/components/seo";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { getSupabase } from "@/lib/supabase";
import { ECOS, isFounderWindowOpen } from "@/lib/ecos";
import { CLUB } from "@/lib/routes";

type Mode = "crear" | "entrar";

/**
 * Puerta del club: crear cuenta o entrar. Aquí NO se cobra ni se pide tarjeta.
 *
 * Antes el registro terminaba en el pago, y la gente se iba creyendo que le
 * cobraban en ese momento. Ahora crear la cuenta es solo eso; al terminar,
 * quien no tiene membresía cae en el panel, que le muestra una sola cosa:
 * activar su membresía (MembresiaInactiva), con el «hoy pagas $0» bien claro.
 */
export default function EcosEntrar() {
  const { session, signIn, loading: authLoading } = useAuth();
  const { signUp } = useClub();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<Mode>("crear");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Estados Unidos");
  const [business, setBusiness] = useState("");
  const [goal, setGoal] = useState("");
  const [showInDirectory, setShowInDirectory] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const [cuentaLista, setCuentaLista] = useState(false);

  // Invitación para quien va a dar clase: crea su cuenta y para ahí. No le
  // corresponde pagar. El enlace no da acceso por sí solo —eso lo decide Holman
  // desde el panel—, así que no importa quién lo tenga.
  const comoProfesor = new URLSearchParams(location.search).get("profesor") === "1";
  const founder = isFounderWindowOpen();

  // Con sesión abierta, se decide solo a dónde ir.
  useEffect(() => {
    if (authLoading || !session?.user) return;
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

    if (mode === "crear") {
      if (name.trim().length < 2) { setError("Dinos tu nombre, así te llamamos por él en la sala."); setBusy(false); return; }
      if (whatsapp.replace(/\D/g, "").length < 8) { setError("Tu WhatsApp con código de país: ahí te llegan los recordatorios de clase."); setBusy(false); return; }
      const r = await signUp({
        name: name.trim(), email: email.trim(), password,
        whatsapp: whatsapp.trim(), city: city.trim() || null, country: country.trim() || null,
        business: business.trim() || null, goal: goal.trim() || null, show_in_directory: showInDirectory,
        ...(comoProfesor ? { profesor: true } : {}),
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
              <button type="button" role="tab" aria-selected={mode === "entrar"} className={mode === "entrar" ? "active" : ""} onClick={() => setMode("entrar")}>Ya soy miembro</button>
            </div>

            <h1 className="club-gate-title">{comoProfesor && mode === "crear" ? "Crea tu cuenta de profesor" : mode === "crear" ? "Crea tu cuenta" : "Bienvenido de vuelta"}</h1>
            <p className="club-gate-body">
              {comoProfesor && mode === "crear"
                ? "Das una de las materias, así que no pagas nada. Crea tu cuenta y avísale a Holman para que te abra el acceso."
                : mode === "crear"
                ? "Crear tu cuenta es gratis y aquí no se pide tarjeta. Cuéntanos quién eres: así te llamamos por tu nombre en la sala y la comunidad sabe a qué te dedicas."
                : "Tu panel te espera con las clases de la semana."}
            </p>

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
                <label className="club-field"><span>Contraseña</span><input type="password" autoComplete={mode === "crear" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "crear" ? "Mínimo 8 caracteres" : "••••••••"} minLength={8} required disabled={busy} /></label>
              </div>

              {mode === "crear" && !comoProfesor && (
                <label className="club-check"><input type="checkbox" checked={showInDirectory} onChange={(e) => setShowInDirectory(e.target.checked)} /> Aparecer en el directorio de la comunidad (nombre, ciudad y a qué te dedicas)</label>
              )}

              {error && <p className="club-error">{error}</p>}

              <button type="submit" className="club-btn" disabled={busy}>
                {busy ? "Un momento…" : mode === "entrar" ? "Entrar" : "Crear mi cuenta"}
              </button>
              {mode === "crear" && !comoProfesor && founder && (
                <p className="club-form-nota">Octubre es gratis para los fundadores. El primer cobro es el {ECOS.primerCobroTexto}.</p>
              )}
            </form>

            <p className="club-gate-foot">
              {mode === "crear"
                ? <>¿Ya tienes cuenta? <button type="button" onClick={() => setMode("entrar")}>Entra aquí</button></>
                : <>¿Primera vez? <button type="button" onClick={() => setMode("crear")}>Crea tu cuenta</button></>}
              {mode === "entrar" && <> <span aria-hidden="true">·</span> <Link to={CLUB.clave}>Olvidé mi contraseña</Link></>}
            </p>
          </>
        )}
      </div>
      <p className="club-gate-firma">· Holman Global Group</p>
    </div>
  );
}
