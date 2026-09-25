import { useState } from "react";
import { EcosPago } from "@/components/ecos-pago";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ROLES_ADMIN, useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { ECOS, enPrueba, fmtDate, graceDaysLeft, isFounderWindowOpen, type EcosMember, type Plan } from "@/lib/ecos";
import { ADMIN, CLUB } from "@/lib/routes";
import { useFounderSpots } from "@/lib/club-store";
import { leerReferido } from "@/lib/referido";
import { getSupabase } from "@/lib/supabase";
import { Seo } from "@/components/seo";

/**
 * Lo que ve alguien con sesión pero sin membresía activa: es lo ÚNICO que ve
 * del panel hasta activarla. Quien acaba de crear su cuenta llega aquí (el
 * registro ya no abre el pago), así que esta pantalla tiene que dejar claro,
 * antes de pedir la tarjeta, cuánto se paga hoy: nada, si es fundador.
 *
 * No es un error suyo:
 * o no ha pagado todavía, o un cobro no entró, o canceló. En los tres casos
 * hay un solo botón que resuelve.
 */
export function MembresiaInactiva({ member, volver }: { member: EcosMember | null; volver?: boolean }) {
  const { startCheckout, openPortal, refresh } = useClub();
  const { signOut, session, profile } = useAuth();
  const spots = useFounderSpots();
  const [plan, setPlan] = useState<Plan>(() => ((sessionStorage.getItem("ecos_plan") as Plan) || member?.plan || "mensual") as Plan);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const status = member?.status ?? "pendiente";
  // Mes gratis al activar: dentro de la fecha y con lugar de fundador (ya
  // ganado al registrarse, o todavía libre). El servidor decide igual.
  const ventana = isFounderWindowOpen();
  const founder = ventana && (member?.founder === true || (spots ? spots.left > 0 : true));
  const prueba = enPrueba(member);
  const pruebaTerminada = !ventana && member?.status === "pendiente" && member.founder;
  // Le toca el mes gratis pero todavía no se abrió (falló la conexión al
  // entrar, por ejemplo). Lo primero que ve es entrar gratis; la tarjeta queda
  // como segunda opción, nunca como el único camino.
  const pruebaPendiente = ventana && !!spots && spots.left > 0 &&
    (!member || (member.status === "pendiente" && !member.founder));
  const [verPlanes, setVerPlanes] = useState(false);

  async function entrarGratis() {
    setBusy(true);
    setError(null);
    const { error: e } = await getSupabase().rpc("ecos_unirse_prueba", { p_ref: leerReferido() })
      .then((r) => r, (x: unknown) => ({ error: x }));
    await refresh();
    setBusy(false);
    if (e) setError("No pudimos abrir tu mes gratis. Intenta de nuevo en un momento.");
  }
  const esAdmin = !!profile && ROLES_ADMIN.includes(profile.role);
  const md = (session?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const nombre = typeof md.name === "string" ? md.name.trim().split(" ")[0] : "";
  const graceLeft = graceDaysLeft(member?.inactive_since ?? null);
  const graceLine = member?.inactive_since
    ? graceLeft > 0
      ? ` Tienes ${graceLeft} ${graceLeft === 1 ? "día" : "días"} para recuperar tu avance: niveles, racha e insignias te esperan.`
      : " Tu avance anterior ya se borró; al volver empiezas desde cero, con la misma comunidad."
    : "";

  const copy = {
    pendiente: {
      title: prueba
        ? "Activa tu membresía"
        : pruebaTerminada
        ? "Tu mes gratis terminó"
        : ventana && !founder
        ? "Los lugares con octubre gratis ya se llenaron"
        : nombre ? `${nombre}, tu cuenta está lista` : "Tu cuenta está lista",
      body: prueba
        ? `Estás usando tu mes gratis. Actívala ahora y el ${ECOS.primerCobroTexto} sigues sin cortes. Al activarla se abren también tu ${ECOS.descuentoMiembroPct}% de descuento y tu ${ECOS.comisionReferidoPct}% de comisión.`
        : pruebaTerminada
        ? "Tus clases, grabaciones y la comunidad siguen aquí. Activa tu membresía y vuelves a entrar."
        : ventana && !founder
        ? "Puedes entrar hoy mismo activando tu membresía."
        : "Activa tu membresía y se abre tu panel: clases, grabaciones, comunidad y tu enlace de embajador.",
      cta: "Activar mi membresía",
      action: "checkout" as const,
    },
    pausado: {
      title: "Tu último pago no entró",
      body: "Suele ser una tarjeta vencida o un límite del banco. Actualízala y tu acceso vuelve solo." + graceLine,
      cta: "Actualizar mi tarjeta",
      action: "portal" as const,
    },
    cancelado: {
      title: "Tu membresía terminó",
      body: `Tu lugar sigue aquí. Vuelve cuando quieras: tus meses de permanencia${member?.started_at ? ` desde ${fmtDate(member.started_at)}` : ""} y tu código de referido se conservan.` + graceLine,
      cta: "Volver a ECOS",
      action: "checkout" as const,
    },
    activo: { title: "", body: "", cta: "", action: "checkout" as const },
  }[status];

  async function go() {
    setBusy(true);
    setError(null);
    const ref = leerReferido() || undefined;
    sessionStorage.setItem("ecos_plan", plan);
    if (copy.action === "portal") {
      const r = await openPortal();
      if (r.error) setError(r.error);
      setBusy(false);
      return;
    }
    const r = await startCheckout(ref, plan);
    if (r.error && /membres[ií]a activa/i.test(r.error)) {
      // El pago ya pasó y esta pantalla se quedó atrás: se vuelve a leer y sale.
      await refresh();
      setBusy(false);
      return;
    }
    if (r.error) setError(r.error);
    else setClientSecret(r.clientSecret);
    setBusy(false);
  }

  async function logout() {
    await signOut();
    navigate(CLUB.entrar, { replace: true });
  }

  return (
    <div className="club-gate">
      <div className="club-gate-card wide">
        <p className="club-gate-brand">
          <span>{ECOS.brand}</span> {ECOS.category}
        </p>
        {clientSecret ? (
          <EcosPago
            clientSecret={clientSecret}
            onCerrar={() => setClientSecret(null)}
            aviso={founder && plan === "mensual" && status === "pendiente"
              ? `Hoy no se te cobra nada. Octubre es gratis y el primer cobro de $${ECOS.priceUsd} es el ${ECOS.primerCobroTexto}. Si cancelas antes desde tu cuenta, no se te cobra.`
              : undefined}
          />
        ) : pruebaPendiente && !verPlanes ? (
        <>
        <h1 className="club-gate-title">{nombre ? `${nombre}, tu mes gratis te espera` : "Tu mes gratis te espera"}</h1>
        <p className="club-gate-body">
          Tu cuenta está lista. Entra y usa todo el club en octubre —clases, grabaciones y comunidad—
          sin tarjeta y sin pagar nada.
        </p>
        {error && <p className="club-error">{error}</p>}
        <button type="button" className="club-btn" onClick={entrarGratis} disabled={busy}>
          {busy ? "Abriendo…" : "Entrar a mi mes gratis"}
        </button>
        <p className="club-form-nota" style={{ marginTop: 12 }}>
          <button type="button" className="club-link-back" onClick={() => setVerPlanes(true)}>
            Prefiero activar mi membresía ya
          </button>
        </p>
        </>
        ) : (
        <>
        <h1 className="club-gate-title">{copy.title}</h1>
        <p className="club-gate-body">{copy.body}</p>
        {copy.action === "checkout" && (
          <>
            <div className="club-plans" role="radiogroup" aria-label="Plan">
              <button type="button" role="radio" aria-checked={plan === "mensual"} className={`club-plan${plan === "mensual" ? " active" : ""}`} onClick={() => setPlan("mensual")}>
                <span className="club-plan-name">Mensual</span>
                <span className="club-plan-price">${ECOS.priceUsd}<small>/mes</small></span>
                <span className="club-plan-note">Cancelas cuando quieras</span>
              </button>
              <button type="button" role="radio" aria-checked={plan === "anual"} className={`club-plan${plan === "anual" ? " active" : ""}`} onClick={() => setPlan("anual")}>
                <span className="club-plan-name">Anual</span>
                <span className="club-plan-price">${ECOS.priceAnualUsd}<small>/año</small></span>
                <span className="club-plan-note">Dos meses gratis · se paga al activar</span>
              </button>
            </div>
            {status === "pendiente" && founder && plan === "mensual" ? (
              <div className="club-hoy">
                <div className="club-hoy-fila"><span>Hoy pagas</span><strong>$0</strong></div>
                <div className="club-hoy-fila"><span>Octubre</span><strong>Gratis</strong></div>
                <div className="club-hoy-fila"><span>Primer cobro · {ECOS.primerCobroTexto}</span><strong>${ECOS.priceUsd}</strong></div>
                <p>Registras tu tarjeta y el primer cobro es el {ECOS.primerCobroTexto}. Si cancelas antes, no se te cobra nada.</p>
              </div>
            ) : plan === "anual" ? (
              <div className="club-hoy">
                <div className="club-hoy-fila"><span>Hoy pagas</span><strong>${ECOS.priceAnualUsd}</strong></div>
                <p>Doce meses de club por el precio de diez.</p>
              </div>
            ) : (
              <div className="club-hoy">
                <div className="club-hoy-fila"><span>Hoy pagas</span><strong>${ECOS.priceUsd}</strong></div>
                <p>Y lo mismo cada mes. Cancelas cuando quieras desde tu cuenta.</p>
              </div>
            )}
          </>
        )}
        {error && <p className="club-error">{error}</p>}
        <button type="button" className="club-btn" onClick={go} disabled={busy}>
          {busy ? "Abriendo…" : copy.cta}
        </button>
        </>
        )}
        <div className="club-gate-foot">
          {volver ? <Link to={CLUB.panel}>Volver al panel</Link> : <Link to={CLUB.landing}>Ver qué incluye el club</Link>}
          <span aria-hidden="true">·</span>
          <button type="button" onClick={logout}>Cerrar sesión</button>
          {esAdmin && (
            <>
              <span aria-hidden="true">·</span>
              <Link to={ADMIN.home}>Panel de administración</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * /ecos/activar — la misma pantalla, a pedido: la abre el aviso del mes gratis
 * para quien quiere activar antes de que se le acabe. Quien ya pagó no tiene
 * nada que hacer aquí y vuelve al panel.
 */
export default function ActivarMembresia() {
  const { member } = useClub();
  if (member && (member.status === "activo" || member.teacher || member.cortesia)) {
    return <Navigate to={CLUB.panel} replace />;
  }
  return (
    <>
      <Seo title={`Activar membresía — ${ECOS.brand} ${ECOS.category}`} description="Activa tu membresía de ECOS Business Club." noindex />
      <MembresiaInactiva member={member} volver />
    </>
  );
}
