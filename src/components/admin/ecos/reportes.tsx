import { useMemo } from "react";
import { useEcosGuests, useEcosMembers, useEcosPayments, useEcosRpc, useEcosSessions, useEcosSettings, type AttendanceCount } from "@/lib/ecos-admin-store";
import { ECOS, fmtDate, leerReparto, repartoMensual, usd } from "@/lib/ecos";

function ym(iso: string) { return iso.slice(0, 7); }
function label(k: string) { return new Date(`${k}-01T12:00:00`).toLocaleDateString("es-US", { month: "long", year: "numeric" }); }

/** Los cuatro reportes: ingresos y reparto · altas, bajas y retención · asistencia · de dónde vienen. */
export function EcosReportes() {
  const { data: members } = useEcosMembers();
  const { data: payments } = useEcosPayments();
  const { data: sessions } = useEcosSessions();
  const { data: guests } = useEcosGuests();
  const { data: counts } = useEcosRpc<AttendanceCount>("ecos_attendance_counts", "ecos_attendance_counts");
  // Las mismas plazas y porcentajes que se editan en Reparto, para que los dos no se contradigan.
  const { data: ajustes } = useEcosSettings();
  const cfg = useMemo(() => leerReparto(ajustes.find((a) => a.key === "reparto")?.value), [ajustes]);
  const ocupadas = cfg.plazas.filter((p) => p.teacher.trim()).length;
  const miPlaza = cfg.plazas.some((p) => p.teacher.trim().toLowerCase() === (cfg.socios[0]?.nombre ?? "").toLowerCase());

  // 1) Ingresos reales por mes (facturas de Stripe) y reparto sobre ese ingreso.
  const ingresos = useMemo(() => {
    const m = new Map<string, { total: number; n: number }>();
    for (const p of payments) { const k = ym(p.paid_at); const cur = m.get(k) ?? { total: 0, n: 0 }; m.set(k, { total: cur.total + Number(p.amount_usd), n: cur.n + 1 }); }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [payments]);

  // 2) Altas, bajas y retención por mes.
  const flujo = useMemo(() => {
    const m = new Map<string, { altas: number; bajas: number }>();
    for (const x of members) {
      if (x.started_at) { const k = ym(x.started_at); const c = m.get(k) ?? { altas: 0, bajas: 0 }; m.set(k, { ...c, altas: c.altas + 1 }); }
      if (x.cancelled_at) { const k = ym(x.cancelled_at); const c = m.get(k) ?? { altas: 0, bajas: 0 }; m.set(k, { ...c, bajas: c.bajas + 1 }); }
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [members]);
  const activos = members.filter((x) => x.status === "activo").length;
  const cancelados = members.filter((x) => x.status === "cancelado");
  const duracion = cancelados.length
    ? cancelados.reduce((acc, x) => acc + (x.started_at && x.cancelled_at ? (new Date(x.cancelled_at).getTime() - new Date(x.started_at).getTime()) / (30 * 86400000) : 0), 0) / cancelados.length
    : null;

  // 3) Asistencia por sesión.
  const attendanceOf = useMemo(() => new Map(counts.map((c) => [c.session_id, c.n])), [counts]);
  const pasadas = sessions.filter((s) => new Date(s.starts_at).getTime() < Date.now()).slice(-12).reverse();

  // 4) De dónde vienen.
  const origen = useMemo(() => {
    const act = members.filter((x) => x.status === "activo");
    const porReferido = act.filter((x) => x.referred_by).length;
    const convertidos = new Set(guests.filter((g) => g.converted_id).map((g) => g.converted_id));
    const porMasterclass = act.filter((x) => convertidos.has(x.id) && !x.referred_by).length;
    const directo = act.length - porReferido - porMasterclass;
    const top = new Map<string, number>();
    for (const x of act) if (x.referred_by) top.set(x.referred_by, (top.get(x.referred_by) ?? 0) + 1);
    const byId = new Map(members.map((x) => [x.id, x]));
    const ranking = [...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => ({ name: byId.get(id)?.name || byId.get(id)?.email || id, n }));
    return { porReferido, porMasterclass, directo, ranking };
  }, [members, guests]);

  return (
    <div className="adm-ecos-reports">
      <div className="adm-card adm-card-pad">
        <div className="adm-card-head"><div className="adm-card-titlerow"><h2 className="adm-card-title">Ingresos y reparto, mes a mes</h2></div><span className="adm-card-sub">sobre lo cobrado de verdad en Stripe</span></div>
        <table className="adm-vend-table adm-ecos-breakdown">
          <thead><tr><th>Mes</th><th>Cobros</th><th>Ingreso</th><th>Cada plaza</th><th>{cfg.socios[0]?.nombre ?? "Socio 1"}</th><th>{cfg.socios[1]?.nombre ?? "Socio 2"}</th></tr></thead>
          <tbody>
            {ingresos.length === 0 ? <tr><td colSpan={6} className="adm-tx-empty">Todavía no hay cobros registrados. Aparecen con la primera factura pagada.</td></tr> : ingresos.map(([k, v]) => {
              const miembrosEq = v.total / ECOS.priceUsd;
              const r = repartoMensual(miembrosEq, ocupadas, ECOS.priceUsd, cfg);
              return <tr key={k}><td>{label(k)}</td><td>{v.n}</td><td>{usd(v.total)}</td><td>{usd(r.porPlaza)}</td><td>{usd((r.socios[0]?.monto ?? 0) + (miPlaza ? r.porPlaza : 0))}</td><td>{usd(r.socios[1]?.monto ?? 0)}</td></tr>;
            })}
          </tbody>
        </table>
        <p className="adm-ecos-note">El reparto se calcula sobre el ingreso real del mes con las mismas reglas del simulador (Stripe, embajadores, {ocupadas} {ocupadas === 1 ? "plaza ocupada" : "plazas ocupadas"} de ${cfg.plazaUsd}). Si cambias quién enseña en Reparto, esta tabla cambia con él.</p>
      </div>

      <div className="adm-card adm-card-pad">
        <div className="adm-card-head"><div className="adm-card-titlerow"><h2 className="adm-card-title">Altas, bajas y retención</h2></div><span className="adm-card-sub">{activos} activos · {duracion !== null ? `${duracion.toFixed(1)} meses de permanencia media` : "sin bajas todavía"}</span></div>
        <table className="adm-vend-table adm-ecos-breakdown">
          <thead><tr><th>Mes</th><th>Altas</th><th>Bajas</th></tr></thead>
          <tbody>
            {flujo.length === 0 ? <tr><td colSpan={3} className="adm-tx-empty">Sin movimientos todavía.</td></tr> : flujo.map(([k, v]) => <tr key={k}><td>{label(k)}</td><td>{v.altas}</td><td>{v.bajas}</td></tr>)}
          </tbody>
        </table>
      </div>

      <div className="adm-card adm-card-pad">
        <div className="adm-card-head"><div className="adm-card-titlerow"><h2 className="adm-card-title">Asistencia por sesión</h2></div><span className="adm-card-sub">últimas 12</span></div>
        <table className="adm-vend-table adm-ecos-breakdown">
          <thead><tr><th>Sesión</th><th>Asistieron</th><th>% de activos</th></tr></thead>
          <tbody>
            {pasadas.length === 0 ? <tr><td colSpan={3} className="adm-tx-empty">Aún no ha pasado ninguna sesión.</td></tr> : pasadas.map((s) => {
              const n = attendanceOf.get(s.id) ?? 0;
              return <tr key={s.id}><td>{fmtDate(s.starts_at)} · {s.title}</td><td>{n}</td><td>{activos ? Math.round((n / activos) * 100) : 0}%</td></tr>;
            })}
          </tbody>
        </table>
      </div>

      <div className="adm-card adm-card-pad">
        <div className="adm-card-head"><div className="adm-card-titlerow"><h2 className="adm-card-title">De dónde vienen</h2></div><span className="adm-card-sub">miembros activos</span></div>
        <div className="adm-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="adm-stat"><span className="adm-stat-title">Por referido</span><span className="adm-stat-value">{origen.porReferido}</span></div>
          <div className="adm-stat"><span className="adm-stat-title">Por masterclass</span><span className="adm-stat-value">{origen.porMasterclass}</span></div>
          <div className="adm-stat"><span className="adm-stat-title">Directo</span><span className="adm-stat-value">{origen.directo}</span></div>
        </div>
        <table className="adm-vend-table adm-ecos-breakdown">
          <thead><tr><th>Quiénes más traen</th><th>Miembros</th></tr></thead>
          <tbody>
            {origen.ranking.length === 0 ? <tr><td colSpan={2} className="adm-tx-empty">Nadie ha traído a nadie todavía.</td></tr> : origen.ranking.map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.n}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
