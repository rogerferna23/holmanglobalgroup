import { useState } from "react";
import { EcosPago } from "@/components/ecos-pago";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { ECOS, fmtDate, graceDaysLeft, isFounderWindowOpen, type EcosMember, type Plan } from "@/lib/ecos";
import { CLUB } from "@/lib/routes";

/**
 * Lo que ve alguien con sesión pero sin membresía activa. No es un error suyo:
 * o no ha pagado todavía, o un cobro no entró, o canceló. En los tres casos
 * hay un solo botón que resuelve.
 */
export function MembresiaInactiva({ member }: { member: EcosMember | null }) {
  const { startCheckout, openPortal } = useClub();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const status = member?.status ?? "pendiente";
  const founder = isFounderWindowOpen();
  const graceLeft = graceDaysLeft(member?.inactive_since ?? null);
  const graceLine = member?.inactive_since
    ? graceLeft > 0
      ? ` Tienes ${graceLeft} ${graceLeft === 1 ? "día" : "días"} para recuperar tu avance: niveles, racha e insignias te esperan.`
      : " Tu avance anterior ya se borró; al volver empiezas desde cero, con la misma comunidad."
    : "";

  const copy = {
    pendiente: {
      title: "Falta un paso para entrar",
      body: founder
        ? `Tu cuenta está lista. Registra tu tarjeta y entras hoy mismo: octubre es gratis para los primeros ${ECOS.founderCap} fundadores, y el primer cobro es el 1 de noviembre.`
        : `Tu cuenta está lista. Registra tu tarjeta y entras hoy mismo por ${ECOS.priceUsd} dólares al mes.`,
      cta: "Completar mi inscripción",
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
    const ref = sessionStorage.getItem("ecos_ref") || undefined;
    const plan = ((sessionStorage.getItem("ecos_plan") as Plan) || member?.plan || "mensual") as Plan;
    if (copy.action === "portal") {
      const r = await openPortal();
      if (r.error) setError(r.error);
      setBusy(false);
      return;
    }
    const r = await startCheckout(ref, plan);
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
      <div className={`club-gate-card${clientSecret ? " wide" : ""}`}>
        <p className="club-gate-brand">
          <span>{ECOS.brand}</span> {ECOS.category}
        </p>
        {clientSecret ? (
          <EcosPago clientSecret={clientSecret} onCerrar={() => setClientSecret(null)} />
        ) : (
        <>
        <h1 className="club-gate-title">{copy.title}</h1>
        <p className="club-gate-body">{copy.body}</p>
        {error && <p className="club-error">{error}</p>}
        <button type="button" className="club-btn" onClick={go} disabled={busy}>
          {busy ? "Abriendo…" : copy.cta}
        </button>
        </>
        )}
        <div className="club-gate-foot">
          <Link to={CLUB.landing}>Ver qué incluye el club</Link>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={logout}>Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}
