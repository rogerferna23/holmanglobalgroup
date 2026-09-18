import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Seo } from "@/components/seo";
import { EcosPago } from "@/components/ecos-pago";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { getSupabase } from "@/lib/supabase";
import { ECOS, isFounderWindowOpen, type Plan } from "@/lib/ecos";
import { CLUB } from "@/lib/routes";

type Mode = "crear" | "entrar";

/**
 * Puerta del club. Crear cuenta (con el perfil que pide la comunidad) o
 * entrar. Al terminar cualquiera de las dos, si la membresía está activa se
 * abre el panel; si no, se va directo al pago con el plan elegido.
 */
export default function EcosEntrar() {
  const { session, signIn, loading: authLoading } = useAuth();
  const { signUp, startCheckout } = useClub();
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
  const [plan, setPlan] = useState<Plan>(() => (sessionStorage.getItem("ecos_plan") as Plan) || "mensual");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  // Cuando llega, el pago se muestra aquí mismo en vez de salir a Stripe.
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  // Sesión abierta pero sin pagar: se muestran los datos para confirmar y elegir
  // plan. Antes se saltaba directo al pago y nadie alcanzaba a llenar nada.
  const [confirmar, setConfirmar] = useState(false);

  const founder = isFounderWindowOpen();
  const cancelado = new URLSearchParams(location.search).get("cancelado") === "1";

  useEffect(() => {
    if (cancelado) setNotice("El pago se canceló. Puedes retomarlo cuando quieras: tu cuenta sigue aquí.");
  }, [cancelado]);

  useEffect(() => {
    sessionStorage.setItem("ecos_plan", plan);
  }, [plan]);

  // Con sesión ya abierta, se decide solo a dónde ir.
  useEffect(() => {
    if (authLoading || !session?.user) return;
    void routeAfterLogin(session.user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.user?.id]);

  async function routeAfterLogin(userId: string) {
    const { data } = await getSupabase().from("ecos_members").select("status").eq("id", userId).maybeSingle();
    if (data?.status === "activo") {
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from.startsWith(CLUB.panel) ? from : CLUB.panel, { replace: true });
      return;
    }
    // Sin membresía activa no se cobra nada todavía: se le muestran sus datos
    // para que los revise y elija plan. El pago lo abre él con el botón.
    const md = (session?.user?.user_metadata ?? {}) as Record<string, unknown>;
    const val = (k: string) => (typeof md[k] === "string" ? (md[k] as string) : "");
    if (val("name")) setName(val("name"));
    if (val("whatsapp")) setWhatsapp(val("whatsapp"));
    if (val("city")) setCity(val("city"));
    if (val("country")) setCountry(val("country"));
    if (val("business")) setBusiness(val("business"));
    if (val("goal")) setGoal(val("goal"));
    if (typeof md.show_in_directory === "boolean") setShowInDirectory(md.show_in_directory);
    setConfirmar(true);
  }

  /** Con la cuenta ya creada: guarda lo que haya cambiado y abre el pago. */
  async function confirmarYPagar() {
    if (name.trim().length < 2) { setError("Dinos tu nombre, así te llamamos por él en la sala."); setBusy(false); return; }
    if (whatsapp.replace(/\D/g, "").length < 8) { setError("Tu WhatsApp con código de país: ahí te llegan los recordatorios de clase."); setBusy(false); return; }
    await getSupabase().auth.updateUser({
      data: {
        name: name.trim(), whatsapp: whatsapp.trim(), city: city.trim() || null,
        country: country.trim() || null, business: business.trim() || null,
        goal: goal.trim() || null, show_in_directory: showInDirectory,
      },
    });
    const r = await startCheckout(sessionStorage.getItem("ecos_ref") || undefined, plan);
    if (r.error) setError(r.error);
    else setClientSecret(r.clientSecret);
    setBusy(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);

    if (confirmar) { await confirmarYPagar(); return; }

    if (mode === "crear") {
      if (name.trim().length < 2) { setError("Dinos tu nombre, así te llamamos por él en la sala."); setBusy(false); return; }
      if (whatsapp.replace(/\D/g, "").length < 8) { setError("Tu WhatsApp con código de país: ahí te llegan los recordatorios de clase."); setBusy(false); return; }
      const r = await signUp({
        name: name.trim(), email: email.trim(), password,
        whatsapp: whatsapp.trim(), city: city.trim() || null, country: country.trim() || null,
        business: business.trim() || null, goal: goal.trim() || null, show_in_directory: showInDirectory,
      });
      if (r.error) {
        setError(/already|registered|exists/i.test(r.error) ? "Ya existe una cuenta con ese correo. Entra con tu contraseña." : r.error);
        setBusy(false);
        return;
      }
      if (r.needsConfirm) { setConfirmSent(true); setBusy(false); return; }
      return; // con sesión creada, el efecto de arriba lleva al pago
    }

    const r = await signIn(email.trim(), password);
    if (r.error) { setError("Correo o contraseña incorrectos."); setBusy(false); }
  }

  return (
    <div className="club-gate">
      <Seo title={`Ingreso al club — ${ECOS.brand} ${ECOS.category}`} description="Entra a tu panel de miembro de ECOS Business Club." noindex />
      <div className={`club-gate-card${mode === "crear" || confirmar ? " wide" : ""}`}>
        <Link to={CLUB.landing} className="club-gate-brand"><span>{ECOS.brand}</span> {ECOS.category}</Link>

        {clientSecret ? (
          <EcosPago clientSecret={clientSecret} onCerrar={() => setClientSecret(null)} />
        ) : confirmSent ? (
          <>
            <h1 className="club-gate-title">Revisa tu correo</h1>
            <p className="club-gate-body">Te enviamos un enlace a <strong>{email}</strong> para confirmar tu cuenta. Al abrirlo vuelves aquí y pasas directo al pago.</p>
            <p className="club-muted">¿No llega? Mira en spam, o vuelve a intentarlo en unos minutos.</p>
          </>
        ) : (
          <>
            {!confirmar && (
              <div className="club-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={mode === "crear"} className={mode === "crear" ? "active" : ""} onClick={() => setMode("crear")}>Crear cuenta</button>
                <button type="button" role="tab" aria-selected={mode === "entrar"} className={mode === "entrar" ? "active" : ""} onClick={() => setMode("entrar")}>Ya soy miembro</button>
              </div>
            )}

            <h1 className="club-gate-title">{confirmar ? "Revisa tus datos" : mode === "crear" ? "Entra a la comunidad" : "Bienvenido de vuelta"}</h1>
            <p className="club-gate-body">
              {confirmar
                ? "Ya tienes cuenta. Confirma que todo está bien, elige tu plan y sigue al pago."
                : mode === "crear"
                ? "Cuéntanos quién eres: así te llamamos por tu nombre en la sala y la comunidad sabe a qué te dedicas."
                : "Tu panel te espera con las clases de la semana."}
            </p>

            {notice && <p className="club-notice">{notice}</p>}

            <form onSubmit={onSubmit} className="club-form">
              {(mode === "crear" || confirmar) && (
                <div className="club-form-grid">
                  <label className="club-field"><span>Tu nombre</span><input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como quieres que te llamemos" required disabled={busy} /></label>
                  <label className="club-field"><span>WhatsApp</span><input type="tel" autoComplete="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+1 305 555 0100" required disabled={busy} /></label>
                  <label className="club-field"><span>Ciudad</span><input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Houston" disabled={busy} /></label>
                  <label className="club-field"><span>País</span><input type="text" value={country} onChange={(e) => setCountry(e.target.value)} disabled={busy} /></label>
                  <label className="club-field full"><span>A qué te dedicas</span><input type="text" value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="Diseñadora de interiores · Contador · Coach…" disabled={busy} /></label>
                  <label className="club-field full"><span>Qué quieres lograr en ECOS</span><input type="text" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Una frase. Te la recordamos a los tres meses." disabled={busy} /></label>
                </div>
              )}
              {!confirmar && (
              <div className={mode === "crear" ? "club-form-grid" : undefined}>
                <label className="club-field"><span>Correo</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required disabled={busy} /></label>
                <label className="club-field"><span>Contraseña</span><input type="password" autoComplete={mode === "crear" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "crear" ? "Mínimo 8 caracteres" : "••••••••"} minLength={8} required disabled={busy} /></label>
              </div>
              )}

              {(mode === "crear" || confirmar) && (
                <>
                  <label className="club-check"><input type="checkbox" checked={showInDirectory} onChange={(e) => setShowInDirectory(e.target.checked)} /> Aparecer en el directorio de la comunidad (nombre, ciudad y a qué te dedicas)</label>

                  <div className="club-plans" role="radiogroup" aria-label="Plan">
                    <button type="button" role="radio" aria-checked={plan === "mensual"} className={`club-plan${plan === "mensual" ? " active" : ""}`} onClick={() => setPlan("mensual")}>
                      <span className="club-plan-name">Mensual</span>
                      <span className="club-plan-price">${ECOS.priceUsd}<small>/mes</small></span>
                      <span className="club-plan-note">{founder ? "Octubre gratis · primer cobro el 1 de noviembre" : "Cancelas cuando quieras"}</span>
                    </button>
                    <button type="button" role="radio" aria-checked={plan === "anual"} className={`club-plan${plan === "anual" ? " active" : ""}`} onClick={() => setPlan("anual")}>
                      <span className="club-plan-name">Anual</span>
                      <span className="club-plan-price">${ECOS.priceAnualUsd}<small>/año</small></span>
                      <span className="club-plan-note">Dos meses gratis · se cobra hoy · doce meses</span>
                    </button>
                  </div>
                </>
              )}

              {error && <p className="club-error">{error}</p>}

              <button type="submit" className="club-btn" disabled={busy}>
                {busy ? "Un momento…" : mode === "entrar" && !confirmar ? "Entrar" : "Continuar al pago"}
              </button>
            </form>

            {!confirmar && (
            <p className="club-gate-foot">
              {mode === "crear"
                ? <>¿Ya tienes cuenta? <button type="button" onClick={() => setMode("entrar")}>Entra aquí</button></>
                : <>¿Primera vez? <button type="button" onClick={() => setMode("crear")}>Crea tu cuenta</button></>}
            </p>
            )}
          </>
        )}
      </div>
      <p className="club-gate-firma">· Holman Global Group</p>
    </div>
  );
}
