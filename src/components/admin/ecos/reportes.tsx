import { useMemo } from "react";
import { useComisiones, useEcosGuests, useEcosMembers, useEcosPayments, useEcosRpc, useEcosSessions, useEcosSettings, type AttendanceCount } from "@/lib/ecos-admin-store";
import { ECOS, fmtDate, leerReparto, repartoSobreIngreso, usd } from "@/lib/ecos";

function ym(iso: string) { return iso.slice(0, 7); }
function label(k: string) { return new Date(`${k}-01T12:00:00`).toLocaleDateString("es-US", { month: "long", year: "numeric" }); }

/** Los cuatro reportes: ingresos y reparto · altas, bajas y retención · asistencia · de dónde vienen. */
export function EcosReportes() {
  const { data: members } = useEcosMembers();
  const { data: payments } = useEcosPayments();
  const { data: comisiones } = useComisiones();
  const { data: sessions } = useEcosSessions();
  const { data: guests } = useEcosGuests();
  const { data: counts } = useEcosRpc<AttendanceCount>("ecos_attendance_counts", "ecos_attendance_counts");
  // Las mismas plazas y porcentajes que se editan en Reparto, para que los dos no se contradigan.
  const { data: ajustes } = useEcosSettings();
  const cfg = useMemo(() => leerReparto(ajustes.find((a) => a.key === "reparto")?.value), [ajustes]);
  const ocupadas = cfg.plazas.filter((p) => p.teacher.trim()).length;
  const miPlaza = cfg.plazas.some((p) => p.teacher.trim().toLowerCase() === (cfg.socios[0]?.nombre ?? "").toLowerCase());
  const plazasOcupadas = cfg.plazas.filter((p) => p.teacher.trim());

  // 1) Ingresos reales por mes (facturas de Stripe) y reparto sobre ese ingreso.
  const ingresos = useMemo(() => {
    // Las facturas en $0 (mes gratis, cupón del 100%) se cuentan aparte: no dejan
    // dinero, no pagan comisión fija de Stripe y no dan de qué pagarle al profesor.
    const m = new Map<string, { total: number; n: number; gratis: number }>();
    for (const p of payments) {
      const k = ym(p.paid_at);
      const cur = m.get(k) ?? { total: 0, n: 0, gratis: 0 };
      const monto = Number(p.amount_usd);
      m.set(k, { total: cur.total + monto, n: cur.n + (monto > 0 ? 1 : 0), gratis: cur.gratis + (monto > 0 ? 0 : 1) });
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [payments]);
  // Comisiones reales del club por mes: lo que de verdad hay que pagar a
  // embajadores y afiliados, en vez del porcentaje estimado del Reparto.
  const comisionesMes = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of comisiones) {
      if (c.source !== "club" || c.status === "anulada") continue;
      const k = ym(c.created_at);
      m.set(k, (m.get(k) ?? 0) + Number(c.amount));
    }
    return m;
  }, [comisiones]);
  const ultimo = ingresos[0] ?? null;
  const mes = repartoSobreIngreso(ultimo?.[1].total ?? 0, ultimo?.[1].n ?? 0, ocupadas, cfg, ECOS.priceUsd, ultimo ? comisionesMes.get(ultimo[0]) ?? 0 : undefined);

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
        <div className="adm-card-head">
          <div className="adm-card-titlerow"><h2 className="adm-card-title">Lo que hay que pagar</h2></div>
          <span className="adm-card-sub">{ultimo ? label(ultimo[0]) : "sin cobros todavía"}</span>
        </div>
        {!ultimo ? (
          <p className="adm-tx-empty">Todavía no ha entrado ningún cobro. Esta tarjeta se llena sola con la primera factura pagada.</p>
        ) : (
          <>
            <table className="adm-vend-table adm-ecos-breakdown">
              <tbody>
                <tr><td>Entró en Stripe</td><td>{usd(ultimo[1].total)}</td><td className="adm-ecos-sub">{ultimo[1].n} {ultimo[1].n === 1 ? "cobro" : "cobros"}{ultimo[1].gratis ? ` · ${ultimo[1].gratis} en $0` : ""}</td></tr>
                {plazasOcupadas.length === 0
                  ? <tr className="adm-ecos-vacante"><td colSpan={3}>Ninguna plaza tiene profesor asignado.</td></tr>
                  : plazasOcupadas.map((p, i) => (
                      <tr key={i}><td>{p.teacher.trim()}</td><td>{usd(mes.porPlaza)}</td><td className="adm-ecos-sub">plaza de {p.label || `la materia ${i + 1}`}</td></tr>
                    ))}
                <tr className="adm-ecos-total"><td>Sociedad</td><td>{usd(mes.sociedad)}</td><td /></tr>
                {mes.socios.map((x, i) => (
                  <tr key={i}><td>{x.nombre} · {x.pct}%</td><td>{usd(x.monto + (i === 0 && miPlaza ? mes.porPlaza : 0))}</td><td className="adm-ecos-sub">{i === 0 && miPlaza ? "con su plaza incluida" : ""}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="adm-ecos-note">
              {mes.bruto === 0
                ? "Este mes no entró dinero, así que a nadie le corresponde nada. Es lo que pasa en el mes gratis de los fundadores: la clase se da igual, pero no hay de dónde pagar la plaza."
                : `Estas son las cifras del mes, sobre ${usd(mes.bruto)} cobrados de verdad. Quien esté en el mes gratis no aporta nada y quien use cupón aporta menos: ambos ya están descontados aquí, porque solo se cuenta lo que Stripe cobró.`}
              {" "}El panel calcula; el pago a cada profesor lo haces tú por fuera.
            </p>
          </>
        )}
      </div>

      <div className="adm-card adm-card-pad">
        <div className="adm-card-head"><div className="adm-card-titlerow"><h2 className="adm-card-title">Ingresos y reparto, mes a mes</h2></div><span className="adm-card-sub">sobre lo cobrado de verdad en Stripe</span></div>
        <table className="adm-vend-table adm-ecos-breakdown">
          <thead><tr><th>Mes</th><th>Cobros</th><th>Ingreso</th><th>Cada plaza</th><th>{cfg.socios[0]?.nombre ?? "Socio 1"}</th><th>{cfg.socios[1]?.nombre ?? "Socio 2"}</th></tr></thead>
          <tbody>
            {ingresos.length === 0 ? <tr><td colSpan={6} className="adm-tx-empty">Todavía no hay cobros registrados. Aparecen con la primera factura pagada.</td></tr> : ingresos.map(([k, v]) => {
              const r = repartoSobreIngreso(v.total, v.n, ocupadas, cfg, ECOS.priceUsd, comisionesMes.get(k) ?? 0);
              return <tr key={k}><td>{label(k)}</td><td>{v.n}</td><td>{usd(v.total)}</td><td>{usd(r.porPlaza)}</td><td>{usd((r.socios[0]?.monto ?? 0) + (miPlaza ? r.porPlaza : 0))}</td><td>{usd(r.socios[1]?.monto ?? 0)}</td></tr>;
            })}
          </tbody>
        </table>
        <p className="adm-ecos-note">Todo sale de lo que Stripe cobró de verdad, no de cuántos miembros hay, y antes de repartir se descuentan las comisiones del club que se causaron ese mes. Cada plaza se lleva su parte de cada dólar que entra (${cfg.plazaUsd} de cada ${ECOS.priceUsd}, el {((cfg.plazaUsd / ECOS.priceUsd) * 100).toFixed(1)}%), con {ocupadas} {ocupadas === 1 ? "plaza ocupada" : "plazas ocupadas"}. Si cambias quién enseña en Reparto, esta tabla cambia con él.</p>
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
