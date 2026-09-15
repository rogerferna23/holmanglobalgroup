import { useMemo, useState } from "react";
import { useEcosMembers } from "@/lib/ecos-admin-store";
import { ECOS, repartoMensual, usd } from "@/lib/ecos";

/**
 * El reparto lo calcula el panel, no una persona. Los mismos números para
 * Holman, para Roger y para cada profesor — sin cuentas a mano.
 */
export function EcosReparto() {
  const { data: members } = useEcosMembers();
  const activos = useMemo(() => members.filter((m) => m.status === "activo").length, [members]);
  const [simulados, setSimulados] = useState<number | "">("");
  const [plazas, setPlazas] = useState<number>(ECOS.plazas.length);

  const n = simulados === "" ? activos : Number(simulados);
  const r = repartoMensual(n, plazas);

  return (
    <>
      <div className="adm-stats">
        <div className="adm-stat">
          <span className="adm-stat-title">Miembros activos hoy</span>
          <span className="adm-stat-value">{activos}</span>
          <span className="adm-stat-hint">a ${ECOS.priceUsd} al mes</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-title">Cada plaza de profesor</span>
          <span className="adm-stat-value">{usd(r.porPlaza)}</span>
          <span className="adm-stat-hint">${ECOS.plazaUsd} × {n} miembros</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-title">Queda para la sociedad</span>
          <span className="adm-stat-value">{usd(r.sociedad)}</span>
          <span className="adm-stat-hint">tras Stripe, embajadores y profesores</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-title">Cada socio (50/50)</span>
          <span className="adm-stat-value">{usd(r.porSocio)}</span>
          <span className="adm-stat-hint">{ECOS.socios.join(" · ")}</span>
        </div>
      </div>

      <div className="adm-ecos-grid">
        <div className="adm-card adm-card-pad">
          <div className="adm-card-head">
            <div className="adm-card-titlerow"><h2 className="adm-card-title">De cada mes</h2></div>
            <span className="adm-card-sub">{n} miembros · {plazas} plazas</span>
          </div>
          <table className="adm-vend-table adm-ecos-breakdown">
            <tbody>
              <tr><td>Ingreso bruto</td><td>{usd(r.bruto)}</td></tr>
              <tr><td>Stripe (2.9% + $0.30)</td><td>− {usd(r.stripe)}</td></tr>
              <tr><td>Embajadores (≈4% promedio)</td><td>− {usd(r.embajadores)}</td></tr>
              {ECOS.plazas.slice(0, plazas).map((p) => (
                <tr key={p.id}><td>Plaza {p.label} · {p.teacher}</td><td>− {usd(r.porPlaza)}</td></tr>
              ))}
              {plazas > ECOS.plazas.length && Array.from({ length: plazas - ECOS.plazas.length }).map((_, i) => (
                <tr key={`extra-${i}`}><td>Plaza adicional {i + 1}</td><td>− {usd(r.porPlaza)}</td></tr>
              ))}
              <tr className="adm-ecos-total"><td>Sociedad</td><td>{usd(r.sociedad)}</td></tr>
              {ECOS.socios.map((s) => (
                <tr key={s}><td>{s}</td><td>{usd(r.porSocio)}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="adm-ecos-note">
            Holman recibe además su plaza de oratoria: {usd(r.porSocio + r.porPlaza)} en total. Las comisiones de Stripe y de embajadores son un supuesto para planear; el cobro real lo hace Stripe.
          </p>
        </div>

        <div className="adm-card adm-card-pad">
          <div className="adm-card-head">
            <div className="adm-card-titlerow"><h2 className="adm-card-title">Simular</h2></div>
          </div>
          <div className="adm-field">
            <label htmlFor="sim-miembros">Miembros</label>
            <input id="sim-miembros" type="number" min={0} placeholder={String(activos)} value={simulados} onChange={(e) => setSimulados(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <div className="adm-field">
            <label htmlFor="sim-plazas">Plazas de profesor ocupadas</label>
            <select id="sim-plazas" value={plazas} onChange={(e) => setPlazas(Number(e.target.value))}>
              {[3, 4, 5].map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <p className="adm-ecos-note">
            Regla: cada profesor nuevo pide unos $5 más en el precio (3 → $47 · 4 → $52 · 5 → $57) para que cada socio conserve al menos $15 por miembro.
          </p>
          <table className="adm-vend-table adm-ecos-breakdown">
            <thead><tr><th>Miembros</th><th>Profesor</th><th>Socio</th></tr></thead>
            <tbody>
              {[50, 100, 130, 200, 300].map((k) => {
                const x = repartoMensual(k, plazas);
                return <tr key={k}><td>{k}</td><td>{usd(x.porPlaza)}</td><td>{usd(x.porSocio)}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
