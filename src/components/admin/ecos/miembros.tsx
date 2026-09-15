import { Fragment, useMemo, useState } from "react";
import { useEcosMembers, useEcosPayments, useEcosRpc, type RankingRow } from "@/lib/ecos-admin-store";
import { fmtDate, graceDaysLeft, levelOf, usd, type EcosMember, type MemberStatus } from "@/lib/ecos";

const PILL: Record<MemberStatus, { cls: string; label: string }> = {
  activo: { cls: "ok", label: "Activo" },
  pendiente: { cls: "off", label: "Pendiente de pago" },
  pausado: { cls: "off", label: "Pago fallido" },
  cancelado: { cls: "off", label: "Cancelado" },
};

export function EcosMiembros() {
  const { data: members, loading, error } = useEcosMembers();
  const { data: payments } = useEcosPayments();
  const { data: ranking } = useEcosRpc<RankingRow>("ecos_ranking", "ecos_ranking");
  const [open, setOpen] = useState<string | null>(null);

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const rankOf = useMemo(() => new Map(ranking.map((r) => [r.id, r])), [ranking]);
  const paymentsOf = useMemo(() => {
    const m = new Map<string, typeof payments>();
    for (const p of payments) if (p.member_id) m.set(p.member_id, [...(m.get(p.member_id) ?? []), p]);
    return m;
  }, [payments]);

  const stats = useMemo(() => {
    const activos = members.filter((m) => m.status === "activo");
    return {
      activos: activos.length,
      fundadores: activos.filter((m) => m.founder).length,
      anuales: activos.filter((m) => m.plan === "anual").length,
      enGracia: members.filter((m) => m.status !== "activo" && m.inactive_since && graceDaysLeft(m.inactive_since) > 0).length,
    };
  }, [members]);

  return (
    <>
      <div className="adm-stats">
        <Stat title="Miembros activos" value={stats.activos} />
        <Stat title="Fundadores" value={stats.fundadores} hint="cupo 50" />
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
                    <td><span className={`adm-pill ${pill.cls}`}>{pill.label}</span>{m.founder && <span className="adm-pill ok adm-ecos-founder">Fundador</span>}{grace !== null && <><br /><small className="adm-ecos-sub">{grace > 0 ? `${grace} días de gracia` : "avance borrado"}</small></>}</td>
                    <td>{m.plan === "anual" ? "Anual" : "Mensual"} · ${m.price_usd}</td>
                    <td>{fmtDate(m.started_at)}</td>
                    <td>{fmtDate(m.current_period_end)}</td>
                    <td>{r ? `V${levelOf(r.xp_ventas)} M${levelOf(r.xp_marketing)} O${levelOf(r.xp_oratoria)}` : "—"}</td>
                    <td>{referrer ? referrer.name || referrer.email : "—"}</td>
                    <td><button type="button" className="adm-ecos-del" onClick={() => setOpen(isOpen ? null : m.id)}>{isOpen ? "Cerrar" : "Ficha"}</button></td>
                  </tr>
                  {isOpen && <tr><td colSpan={8} className="adm-ecos-guests"><Ficha m={m} r={r} pays={paymentsOf.get(m.id) ?? []} /></td></tr>}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Ficha({ m, r, pays }: { m: EcosMember; r?: RankingRow; pays: { stripe_invoice_id: string; amount_usd: number; paid_at: string; plan: string | null }[] }) {
  return (
    <div className="adm-ecos-ficha">
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
