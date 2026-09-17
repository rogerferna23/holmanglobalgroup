import { useEffect, useMemo, useRef, useState } from "react";
import { useEcosMembers, useEcosSettings } from "@/lib/ecos-admin-store";
import { ECOS, leerReparto, repartoMensual, usd, type ConfigReparto } from "@/lib/ecos";

/**
 * El reparto lo calcula el panel, no una persona. Los mismos números para
 * Holman, para Roger y para cada profesor — sin cuentas a mano.
 *
 * Quién ocupa cada plaza se edita aquí y se guarda en ecos_settings. El modelo
 * reparte por plazas, no por personas: si alguien no puede dar su materia, se
 * deja la plaza vacía o se escribe otro nombre, sin tocar el código ni volver a
 * negociar el acuerdo.
 */
export function EcosReparto() {
  const { data: members } = useEcosMembers();
  const { data: rows, save } = useEcosSettings();
  const activos = useMemo(() => members.filter((m) => m.status === "activo").length, [members]);
  const [simulados, setSimulados] = useState<number | "">("");

  const guardado = rows.find((r) => r.key === "reparto")?.value;
  const [cfg, setCfg] = useState<ConfigReparto>(() => leerReparto(guardado));
  const [tocado, setTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Solo se recarga cuando la base trae algo distinto a lo último que vimos. Así
  // no se pisa lo que acabas de guardar mientras la tabla se refresca.
  const visto = useRef<string | undefined>(guardado);
  useEffect(() => {
    if (guardado === visto.current) return;
    visto.current = guardado;
    if (!tocado) setCfg(leerReparto(guardado));
  }, [guardado, tocado]);

  const editar = (cambio: Partial<ConfigReparto>) => { setCfg({ ...cfg, ...cambio }); setTocado(true); setMsg(null); };
  const editarPlaza = (i: number, campo: "label" | "teacher", valor: string) =>
    editar({ plazas: cfg.plazas.map((p, k) => (k === i ? { ...p, [campo]: valor } : p)) });
  const editarSocio = (i: number, campo: "nombre" | "pct", valor: string) =>
    editar({ socios: cfg.socios.map((s, k) => (k === i ? { ...s, [campo]: campo === "pct" ? Number(valor) || 0 : valor } : s)) });

  async function guardar() {
    setGuardando(true);
    setMsg(null);
    const err = await save("reparto", JSON.stringify(cfg));
    setGuardando(false);
    if (err) { setMsg(err); return; }
    setTocado(false);
    setMsg("Guardado.");
  }

  const ocupadas = cfg.plazas.filter((p) => p.teacher.trim()).length;
  const sumaPct = cfg.socios.reduce((a, s) => a + s.pct, 0);
  const n = simulados === "" ? activos : Number(simulados);
  const r = repartoMensual(n, ocupadas, ECOS.priceUsd, cfg);
  const yo = r.socios[0];
  // La plaza solo suma a tu columna si de verdad la estás dando tú.
  const miPlaza = cfg.plazas.some((p) => p.teacher.trim().toLowerCase() === yo.nombre.toLowerCase()) ? r.porPlaza : 0;

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
          <span className="adm-stat-hint">${cfg.plazaUsd} × {n} miembros</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-title">Queda para la sociedad</span>
          <span className="adm-stat-value">{usd(r.sociedad)}</span>
          <span className="adm-stat-hint">tras Stripe, embajadores y profesores</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-title">Para ti ({yo.pct}%)</span>
          <span className="adm-stat-value">{usd(yo.monto + miPlaza)}</span>
          <span className="adm-stat-hint">{miPlaza ? "incluye tu plaza" : "sin plaza de profesor"}</span>
        </div>
      </div>

      <div className="adm-ecos-grid">
        <div className="adm-card adm-card-pad">
          <div className="adm-card-head">
            <div className="adm-card-titlerow"><h2 className="adm-card-title">De cada mes</h2></div>
            <span className="adm-card-sub">{n} miembros · {ocupadas} {ocupadas === 1 ? "plaza ocupada" : "plazas ocupadas"}</span>
          </div>
          <table className="adm-vend-table adm-ecos-breakdown">
            <tbody>
              <tr><td>Ingreso bruto</td><td>{usd(r.bruto)}</td></tr>
              <tr><td>Stripe (2.9% + $0.30)</td><td>− {usd(r.stripe)}</td></tr>
              <tr><td>Embajadores (≈4% promedio)</td><td>− {usd(r.embajadores)}</td></tr>
              {cfg.plazas.map((p, i) => (
                <tr key={i} className={p.teacher.trim() ? undefined : "adm-ecos-vacante"}>
                  <td>Plaza {p.label || "sin nombre"} · {p.teacher.trim() || "vacante"}</td>
                  <td>{p.teacher.trim() ? `− ${usd(r.porPlaza)}` : "—"}</td>
                </tr>
              ))}
              <tr className="adm-ecos-total"><td>Sociedad</td><td>{usd(r.sociedad)}</td></tr>
              {r.socios.map((s, i) => (
                <tr key={i}><td>{s.nombre} · {s.pct}%</td><td>{usd(s.monto)}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="adm-ecos-note">
            {miPlaza
              ? `Tú recibes además tu plaza: ${usd(yo.monto + miPlaza)} en total.`
              : "Ahora mismo ninguna plaza está a tu nombre, así que tu columna es solo el porcentaje de la sociedad."}
            {" "}Una plaza vacante no se paga: ese dinero se queda en la sociedad. Las comisiones de Stripe y de embajadores son un supuesto para planear; el cobro real lo hace Stripe.
          </p>
        </div>

        <div className="adm-card adm-card-pad">
          <div className="adm-card-head">
            <div className="adm-card-titlerow"><h2 className="adm-card-title">Quién enseña</h2></div>
            <span className="adm-card-sub">{msg ?? (tocado ? "Sin guardar" : "")}</span>
          </div>
          <p className="adm-ecos-note">
            Deja el nombre en blanco si la plaza está vacante. Los números de arriba se mueven mientras escribes; nada queda hasta que pulses Guardar.
          </p>

          {cfg.plazas.map((p, i) => (
            <div key={i} className="adm-field">
              <label htmlFor={`plaza-${i}`}>Plaza {i + 1}</label>
              <div className="adm-ecos-setting-row">
                <input id={`plaza-${i}`} type="text" placeholder="Materia" value={p.label} onChange={(e) => editarPlaza(i, "label", e.target.value)} />
                <input type="text" placeholder="Quién la da" aria-label={`Quién da ${p.label || `la plaza ${i + 1}`}`} value={p.teacher} onChange={(e) => editarPlaza(i, "teacher", e.target.value)} />
                <button type="button" className="adm-icon-btn-sm" aria-label={`Quitar la plaza ${p.label || i + 1}`} onClick={() => editar({ plazas: cfg.plazas.filter((_, k) => k !== i) })}>−</button>
              </div>
            </div>
          ))}
          <button type="button" className="adm-add-btn" onClick={() => editar({ plazas: [...cfg.plazas, { label: "", teacher: "" }] })}>
            + Añadir plaza
          </button>

          <div className="adm-field">
            <label htmlFor="plaza-usd">Lo que paga cada plaza, por miembro</label>
            <input id="plaza-usd" type="number" min={0} step={0.5} value={cfg.plazaUsd} onChange={(e) => editar({ plazaUsd: Number(e.target.value) || 0 })} />
            <span className="adm-ecos-sub">En dólares. Con ${cfg.plazaUsd} y {n} miembros, cada profesor recibe {usd(r.porPlaza)} al mes.</span>
          </div>

          {cfg.socios.map((s, i) => (
            <div key={i} className="adm-field">
              <label htmlFor={`socio-${i}`}>Socio {i + 1}</label>
              <div className="adm-ecos-setting-row">
                <input id={`socio-${i}`} type="text" placeholder="Nombre" value={s.nombre} onChange={(e) => editarSocio(i, "nombre", e.target.value)} />
                <input type="number" min={0} max={100} aria-label={`Porcentaje de ${s.nombre}`} value={s.pct} onChange={(e) => editarSocio(i, "pct", e.target.value)} />
              </div>
            </div>
          ))}
          {sumaPct !== 100 && <p className="adm-ecos-note">Los porcentajes de los socios suman {sumaPct}%. Revísalos: deberían sumar 100.</p>}

          <div className="adm-ecos-setting-row">
            <button type="button" className="adm-add-btn" disabled={guardando || !tocado} onClick={guardar}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            {tocado && (
              <button type="button" className="adm-add-btn" onClick={() => { setCfg(leerReparto(guardado)); setTocado(false); setMsg(null); }}>
                Deshacer
              </button>
            )}
          </div>
        </div>

        <div className="adm-card adm-card-pad">
          <div className="adm-card-head">
            <div className="adm-card-titlerow"><h2 className="adm-card-title">Simular</h2></div>
          </div>
          <div className="adm-field">
            <label htmlFor="sim-miembros">Miembros</label>
            <input id="sim-miembros" type="number" min={0} placeholder={String(activos)} value={simulados} onChange={(e) => setSimulados(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <p className="adm-ecos-note">
            Con {ocupadas} {ocupadas === 1 ? "plaza ocupada" : "plazas ocupadas"}. Regla: cada profesor nuevo pide unos $5 más en el precio (3 → $47 · 4 → $52 · 5 → $57).
          </p>
          <table className="adm-vend-table adm-ecos-breakdown">
            <thead>
              <tr>
                <th>Miembros</th><th>Profesor</th>
                <th>{cfg.socios[0]?.nombre ?? "Socio 1"} ({cfg.socios[0]?.pct ?? 0}%)</th>
                <th>{cfg.socios[1]?.nombre ?? "Socio 2"} ({cfg.socios[1]?.pct ?? 0}%)</th>
              </tr>
            </thead>
            <tbody>
              {[50, 100, 130, 200, 300].map((k) => {
                const x = repartoMensual(k, ocupadas, ECOS.priceUsd, cfg);
                const mia = miPlaza ? x.porPlaza : 0;
                return (
                  <tr key={k}>
                    <td>{k}</td><td>{usd(x.porPlaza)}</td>
                    <td>{usd((x.socios[0]?.monto ?? 0) + mia)}</td>
                    <td>{usd(x.socios[1]?.monto ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
