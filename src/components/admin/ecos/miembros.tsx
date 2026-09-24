import { Fragment, useMemo, useState } from "react";
import { darCortesia, useEcosMembers, useEcosPayments, useEcosRpc, useEcosSettings, type AccesoGratis, type CuentaSinMembresia, type RankingRow } from "@/lib/ecos-admin-store";
import { CuentasSinMembresia } from "./sin-membresia";
import { ECOS, enPrueba, fmtDate, graceDaysLeft, levelOf, usd, type EcosMember, type MemberStatus } from "@/lib/ecos";

const PILL: Record<MemberStatus, { cls: string; label: string }> = {
  activo: { cls: "ok", label: "Activo" },
  pendiente: { cls: "off", label: "Pendiente de pago" },
  pausado: { cls: "off", label: "Pago fallido" },
  cancelado: { cls: "off", label: "Cancelado" },
};

export function EcosMiembros() {
  const { data: members, loading, error, refresh: refrescarMiembros } = useEcosMembers();
  const { data: payments } = useEcosPayments();
  const [avisoCortesia, setAvisoCortesia] = useState<string | null>(null);

  async function cambiarAcceso(
    m: { id: string; name: string | null; email: string },
    activar: boolean,
    tipo: AccesoGratis = "cortesia",
  ): Promise<string | null> {
    setAvisoCortesia(null);
    const r = await darCortesia(m.id, activar, tipo);
    if (r.error) return r.error;
    const quien = m.name || m.email;
    const que = tipo === "profesor" ? "profesor" : "cortesía";
    setAvisoCortesia(
      activar
        ? `${quien} entra al club sin pagar, como ${que}.${r.cancelada ? " Su suscripción en Stripe quedó cancelada: no se le va a cobrar nada." : ""}`
        : `${quien} ya no es ${que}. Si quiere seguir en el club, se suscribe como cualquiera.`
    );
    await refrescarMiembros();
    return null;
  }
  const { data: ranking } = useEcosRpc<RankingRow>("ecos_ranking", "ecos_ranking");
  const [open, setOpen] = useState<string | null>(null);

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const rankOf = useMemo(() => new Map(ranking.map((r) => [r.id, r])), [ranking]);
  const paymentsOf = useMemo(() => {
    const m = new Map<string, typeof payments>();
    for (const p of payments) if (p.member_id) m.set(p.member_id, [...(m.get(p.member_id) ?? []), p]);
    return m;
  }, [payments]);

  // El cupo vive en Ajustes; aquí solo se muestra.

  const { data: ajustes } = useEcosSettings();

  const cupo = Number(ajustes.find((a) => a.key === "founder_cap")?.value) || ECOS.founderCap;

  const stats = useMemo(() => {
    const activos = members.filter((m) => m.status === "activo");
    return {
      activos: activos.length,
      // Igual que el contador público: el lugar se ocupa al registrarse.
      fundadores: members.filter((m) => m.founder && (m.status === "activo" || m.status === "pendiente" || m.cortesia || m.teacher)).length,
      enPrueba: members.filter((m) => enPrueba(m)).length,
      cortesias: members.filter((m) => m.cortesia).length,
      anuales: activos.filter((m) => m.plan === "anual").length,
      enGracia: members.filter((m) => m.status !== "activo" && m.inactive_since && graceDaysLeft(m.inactive_since) > 0).length,
    };
  }, [members]);

  return (
    <>
      <div className="adm-stats">
        <Stat title="Miembros activos" value={stats.activos} hint={stats.cortesias ? `+ ${stats.cortesias} de cortesía` : "que pagan"} />
        <Stat title="Fundadores" value={stats.fundadores} hint={`cupo ${cupo}${stats.enPrueba ? ` · ${stats.enPrueba} en mes gratis, sin activar` : ""}`} />
        <Stat title="Plan anual" value={stats.anuales} />
        <Stat title="En días de gracia" value={stats.enGracia} hint="inactivos que aún pueden recuperar su avance" />
      </div>

      <div className="adm-card">
        {error && <p className="adm-ecos-error">{error}</p>}
        <table className="adm-vend-table">
          <thead><tr><th>Miembro</th><th>Estado</th><th>Plan</th><th>Desde</th><th>Próximo cobro</th><th>Nivel</th><th>Referido por</th><th></th></tr></thead>
          <tbody>
            {members.length === 0 ? (
              <tr><td colSpan={8} className="adm-tx-empty">{loading ? "Cargando…" : "Todavía no hay miembros. Aparecen aquí en cuanto alguien crea su cuenta."}</td></tr>
            ) : members.map((m) => {
              const pill = PILL[m.status];
              const r = rankOf.get(m.id);
              const grace = m.status !== "activo" && m.inactive_since ? graceDaysLeft(m.inactive_since) : null;
              const isOpen = open === m.id;
              const referrer = m.referred_by ? byId.get(m.referred_by) : undefined;
              return (
                <Fragment key={m.id}>
                  <tr>
                    <td><div className="adm-vend-cell"><span className="adm-vend-avatar">{(m.name || m.email).slice(0, 2).toUpperCase()}</span><span>{m.name || "—"}<br /><small className="adm-ecos-sub">{m.email}</small></span></div></td>
                    <td>{m.teacher ? <span className="adm-pill ok">Profesor</span> : m.cortesia ? <span className="adm-pill ok">Cortesía</span> : enPrueba(m) ? <span className="adm-pill ok">Mes gratis</span> : <span className={`adm-pill ${pill.cls}`}>{pill.label}</span>}{m.founder && <span className="adm-pill ok adm-ecos-founder">Fundador</span>}{grace !== null && <><br /><small className="adm-ecos-sub">{grace > 0 ? `${grace} días de gracia` : "avance borrado"}</small></>}</td>
                    <td>{m.plan === "anual" ? "Anual" : "Mensual"} · ${m.price_usd}</td>
                    <td>{fmtDate(m.started_at)}</td>
                    <td>{fmtDate(m.current_period_end)}</td>
                    <td>{r ? `V${levelOf(r.xp_ventas)} M${levelOf(r.xp_marketing)} O${levelOf(r.xp_oratoria)}` : "—"}</td>
                    <td>{referrer ? referrer.name || referrer.email : "—"}</td>
                    <td><button type="button" className="adm-ecos-del" onClick={() => setOpen(isOpen ? null : m.id)}>{isOpen ? "Cerrar" : "Ficha"}</button></td>
                  </tr>
                  {isOpen && <tr><td colSpan={8} className="adm-ecos-guests"><Ficha m={m} r={r} pays={paymentsOf.get(m.id) ?? []} onAcceso={cambiarAcceso} /></td></tr>}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {avisoCortesia && <p className="adm-ecos-note">{avisoCortesia}</p>}
      <CuentasSinMembresia
        titulo="Cuentas sin acceso"
        explicacion="Se registraron pero no tienen membresía. Si da clase, nómbralo profesor. Si quieres invitarlo sin cobrarle, dale cortesía. En los dos casos entra de inmediato y nunca se le cobra."
        acciones={[
          { etiqueta: "Nombrar profesor", hacer: (c: CuentaSinMembresia) => cambiarAcceso(c, true, "profesor") },
          { etiqueta: "Dar cortesía", hacer: (c: CuentaSinMembresia) => cambiarAcceso(c, true, "cortesia") },
        ]}
      />
    </>
  );
}

function Ficha({ m, r, pays, onAcceso }: {
  m: EcosMember; r?: RankingRow;
  pays: { stripe_invoice_id: string; amount_usd: number; paid_at: string; plan: string | null }[];
  onAcceso: (m: EcosMember, activar: boolean, tipo: AccesoGratis) => Promise<string | null>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function cambiar(tipo: AccesoGratis, activar: boolean) {
    setBusy(true); setError(null);
    const e = await onAcceso(m, activar, tipo);
    setBusy(false);
    if (e) setError(e);
  }
  const suscrito = !!m.stripe_subscription_id && m.status !== "cancelado";
  const acceso = m.teacher
    ? "Profesor: entra sin pagar y prepara sus clases."
    : m.cortesia
    ? "Cortesía: entra sin pagar, con los beneficios de miembro."
    : suscrito
    ? "Paga su membresía."
    : "Sin acceso: no paga ni tiene cortesía.";
  return (
    <div className="adm-ecos-ficha">
      <div style={{ gridColumn: "1 / -1" }}>
        <b>Acceso</b>{acceso}
        <div className="adm-cuenta-acciones" style={{ justifyContent: "flex-start", marginTop: 8 }}>
          <button type="button" className="adm-add-btn" disabled={busy} onClick={() => cambiar("profesor", !m.teacher)}>
            {busy ? "…" : m.teacher ? "Quitar de profesores" : "Nombrar profesor"}
          </button>
          {!m.teacher && (
            <button type="button" className="adm-add-btn" disabled={busy} onClick={() => cambiar("cortesia", !m.cortesia)}>
              {busy ? "…" : m.cortesia ? "Quitar cortesía" : "Dar cortesía"}
            </button>
          )}
        </div>
        {suscrito && !m.teacher && !m.cortesia && (
          <small className="adm-ecos-sub" style={{ display: "block", marginTop: 6 }}>
            Tiene suscripción en Stripe: al nombrarlo profesor o darle cortesía se cancela en el acto y no se le cobra nada más.
          </small>
        )}
        {error && <small className="adm-ecos-error" style={{ display: "block", marginTop: 6 }}>{error}</small>}
      </div>
      <div><b>Suscripción en Stripe</b>{m.stripe_subscription_id ? (m.status === "cancelado" ? "Cancelada" : "Sí, activa") : "No tiene: nunca puso tarjeta"}</div>
      <div><b>WhatsApp</b>{m.whatsapp || "—"}</div>
      <div><b>Ciudad</b>{[m.city, m.country].filter(Boolean).join(", ") || "—"}</div>
      <div><b>A qué se dedica</b>{m.business || "—"}</div>
      <div><b>Qué quiere lograr</b>{m.goal || "—"}</div>
      <div><b>Directorio</b>{m.show_in_directory ? "Aparece" : "No aparece"}</div>
      <div><b>Código</b><code className="adm-ecos-code">{m.referral_code}</code></div>
      <div><b>Racha</b>{r?.streak ?? 0} semanas</div>
      <div><b>Insignias</b>{r?.badges ?? 0}</div>
      <div><b>Meses gratis</b>{m.free_months_earned} ganados · {m.free_months_used} usados</div>
      <div style={{ gridColumn: "1 / -1" }}><b>Pagos</b>{pays.length === 0 ? "Ninguno todavía" : pays.map((p) => `${fmtDate(p.paid_at)} · ${usd(Number(p.amount_usd))}${p.plan ? ` · ${p.plan}` : ""}`).join("  ·  ")}</div>
    </div>
  );
}

function Stat({ title, value, hint }: { title: string; value: number | string; hint?: string }) {
  return <div className="adm-stat"><span className="adm-stat-title">{title}</span><span className="adm-stat-value">{value}</span>{hint && <span className="adm-stat-hint">{hint}</span>}</div>;
}
