import { useMemo, useState, type ReactNode } from "react";
import { ROLES_ADMIN, useAuth } from "@/contexts/AuthContext";
import {
  CATEGORIAS, COSTOS_CONOCIDOS, ESTADOS_DEUDA, TIPOS_DEUDA, armarMesSiguiente, calcDeuda, calcVenta, cop, cumplimiento,
  enMes, faltaCosto, faltaDeuda, faltaEmbajador, faltaVenta, faltantes, indicadores, mesSiguiente, nombreMes, periodoNuevo,
  pctTxt, prioridades, semanaDe, semanasDe, separar, useFinanzas, vacio, valorCosto,
  type Costo, type Deuda, type Embajador, type Escenario, type Fila, type Hoja, type Indicadores, type Libro,
  type Periodo, type SemanaDatos, type SemanaFlujo, type Venta,
} from "@/lib/finanzas";

type Tab = "resumen" | "flujo" | "ventas" | "embajadores" | "costos" | "deudas" | "ajustes";
const TABS: { id: Tab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "flujo", label: "Flujo de caja" },
  { id: "ventas", label: "Ventas" },
  { id: "embajadores", label: "Embajadores" },
  { id: "costos", label: "Costos" },
  { id: "deudas", label: "Deudas" },
  { id: "ajustes", label: "Ajustes del mes" },
];

const hoyISO = () => new Date().toISOString().slice(0, 10);
const mesPorDefecto = () => {
  const d = new Date();
  const actual = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  return d.getDate() >= 15 ? mesSiguiente(actual) : actual;
};

type Api = ReturnType<typeof useFinanzas>;

/**
 * Torre → Finanzas. La plantilla financiera de Holman: cada mes se proyecta
 * (ventas, costos, deudas, flujo semanal) y se registra lo real, y el Resumen
 * mide si se cumplió. Se descarga en Excel con fórmulas.
 */
export function FinanzasView() {
  const api = useFinanzas();
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>("resumen");
  const [msg, setMsg] = useState<string | null>(null);
  const [bajando, setBajando] = useState(false);

  if (!api.preview && profile && (!ROLES_ADMIN.includes(profile.role) || profile.role === "vendor")) {
    return <div className="adm-page"><p className="adm-tx-empty">Finanzas es solo para administración.</p></div>;
  }

  async function descargar() {
    if (!api.libro) return;
    setBajando(true);
    try {
      const { descargarExcel } = await import("@/lib/finanzas-excel");
      await descargarExcel(api.libro);
    } catch (e) {
      setMsg(`No se pudo generar el Excel: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBajando(false);
    }
  }

  const avisar = (m: string | null) => setMsg(m);

  return (
    <div className="adm-page fin">
      <header className="adm-page-head fin-head">
        <div>
          <h1>Finanzas</h1>
          <p>Proyecta el mes, registra lo real y mide si se logró. Vendido, cobrado y pendiente van siempre separados, y nada se cuenta dos veces.</p>
        </div>
        {api.periodo && (
          <div className="fin-controles">
            <select aria-label="Mes" value={api.periodo.id} onChange={(e) => api.elegir(e.target.value)}>
              {api.periodos.map((p) => <option key={p.id} value={p.id}>{nombreMes(p.mes)}</option>)}
            </select>
            <button type="button" className="fin-btn is-oro" onClick={() => void descargar()} disabled={bajando}>
              {bajando ? "Generando…" : "Descargar Excel"}
            </button>
          </div>
        )}
      </header>

      {api.error && <p className="adm-ecos-error">{api.error}</p>}
      {msg && <p className="adm-ecos-note fin-msg" onClick={() => setMsg(null)}>{msg}</p>}

      {api.loading ? <p className="adm-tx-empty">Cargando…</p> : !api.libro ? (
        <Empezar api={api} avisar={avisar} />
      ) : (
        <>
          <nav className="adm-tabs fin-tabs" aria-label="Finanzas">
            {TABS.map((t) => (
              <button key={t.id} type="button" className={`adm-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </nav>
          <Contenido tab={tab} api={api} libro={api.libro} avisar={avisar} irA={setTab} />
        </>
      )}
    </div>
  );
}

function Contenido({ tab, api, libro, avisar, irA }: { tab: Tab; api: Api; libro: Libro; avisar: (m: string | null) => void; irA: (t: Tab) => void }) {
  const ind = useMemo(() => indicadores(libro), [libro]);
  switch (tab) {
    case "resumen": return <Resumen libro={libro} ind={ind} irA={irA} />;
    case "flujo": return <Flujo api={api} libro={libro} ind={ind} avisar={avisar} />;
    case "ventas": return <Ventas api={api} libro={libro} avisar={avisar} />;
    case "embajadores": return <Embajadores api={api} libro={libro} avisar={avisar} />;
    case "costos": return <Costos api={api} libro={libro} avisar={avisar} />;
    case "deudas": return <Deudas api={api} libro={libro} ind={ind} avisar={avisar} />;
    case "ajustes": return <Ajustes api={api} libro={libro} avisar={avisar} />;
  }
}

/* ================================================================== Empezar */

function Empezar({ api, avisar }: { api: Api; avisar: (m: string | null) => void }) {
  const [mes, setMes] = useState(mesPorDefecto().slice(0, 7));
  return (
    <div className="adm-card adm-card-pad fin-empezar">
      <h2 className="adm-card-title">Empieza tu primer mes</h2>
      <p className="fin-nota">Se crea con tu presupuesto personal mínimo (3.000.000 COP) y las herramientas que ya pagas, sin montos: los pones tú. Lo demás queda vacío y marcado como pendiente.</p>
      <div className="adm-form-row">
        <div className="adm-field"><label htmlFor="fin-mes">Mes a planificar</label><input id="fin-mes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></div>
      </div>
      <button type="button" className="adm-add-btn" disabled={!mes} onClick={async () => {
        const conocidos = COSTOS_CONOCIDOS.map((c, i) => ({ hoja: "costos" as Hoja, orden: i, datos: { ...vacio("costos"), ...c } }));
        avisar(await api.crearPeriodo(periodoNuevo(`${mes}-01`), conocidos));
      }}>Crear {mes ? nombreMes(`${mes}-01`) : "mes"}</button>
    </div>
  );
}

/* ================================================================== Resumen */

function Resumen({ libro, ind, irA }: { libro: Libro; ind: Indicadores; irA: (t: Tab) => void }) {
  const cum = cumplimiento(ind);
  const falta = faltantes(libro);
  const respuestaPlan = ind.minPlan >= 0
    ? { clase: "ok", txt: "Con lo proyectado alcanza todo el mes sin pedir prestado." }
    : { clase: "lejos", txt: `Con lo proyectado faltan ${cop(-ind.minPlan)} en la peor semana. Sube ventas o cobros, o mueve abonos y ahorro.` };
  const hayReal = ind.vendidoReal > 0 || ind.cobradoReal > 0 || ind.costosReal > 0 || ind.personalesReal > 0;
  const respuestaReal = !hayReal ? null : ind.minReal >= 0
    ? { clase: "ok", txt: "Con lo cobrado de verdad, alcanza." }
    : ind.minRealPrev >= 0
      ? { clase: "cerca", txt: "Alcanza solo si entran a tiempo los cobros pendientes." }
      : { clase: "lejos", txt: `Con lo cobrado faltan ${cop(-ind.minReal)} en la peor semana.` };

  return (
    <div className="fin-resumen">
      <div className={`fin-veredicto is-${respuestaPlan.clase}`}>
        <span className="tab-label">¿Alcanza sin nuevos préstamos?</span>
        <strong>{respuestaPlan.txt}</strong>
        {respuestaReal && <em className={`is-${respuestaReal.clase}`}>Real: {respuestaReal.txt}</em>}
      </div>

      <section className="adm-card adm-card-pad">
        <div className="fin-card-head"><h2 className="adm-card-title">¿Se logró?</h2><span className="adm-card-sub">Proyectado vs. real del mes</span></div>
        <div className="fin-tabla-wrap">
          <table className="fin-tabla fin-cum">
            <thead><tr><th>Concepto</th><th>Proyectado</th><th>Real</th><th>Diferencia</th><th>Cumplimiento</th></tr></thead>
            <tbody>
              {cum.map((c) => (
                <tr key={c.id} title={c.nota}>
                  <td>{c.label}</td>
                  <td>{c.plan === null ? "Falta dato" : cop(c.plan)}</td>
                  <td>{cop(c.real)}</td>
                  <td className={c.plan === null ? "" : (c.mejor === "mas" ? c.real - c.plan >= 0 : c.real - c.plan <= 0) ? "is-bien" : "is-mal"}>
                    {c.plan === null ? "—" : cop(c.real - c.plan)}
                  </td>
                  <td>
                    <div className={`fin-barra is-${c.estado}`}><span style={{ width: `${Math.min(100, Math.max(0, (c.pct ?? 0) * 100))}%` }} /></div>
                    <small>{pctTxt(c.pct)}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ind.descuadre !== null && Math.abs(ind.descuadre) >= 1 && (
          <p className="fin-nota is-alerta">En tus cuentas hay {cop(libro.periodo.saldo_final_real)} y el flujo real dice {cop(ind.saldoFinalReal)}: {ind.descuadre > 0 ? "entró" : "salió"} {cop(Math.abs(ind.descuadre))} que no está registrado.</p>
        )}
      </section>

      <div className="fin-tres">
        <section className="adm-card adm-card-pad">
          <span className="tab-label">Ventas reales del mes</span>
          <ul className="tab-lista">
            <li><span>Vendido</span><strong>{cop(ind.vendidoReal)}</strong></li>
            <li><span>Cobrado en el mes</span><strong>{cop(ind.cobradoReal)}</strong></li>
            <li><span>… de ventas de este mes</span><strong>{cop(ind.cobradoDeVentasDelMes)}</strong></li>
            <li><span>Pendiente por cobrar</span><strong>{cop(ind.pendiente)}</strong></li>
            <li><span>… sin fecha estimada</span><strong>{cop(ind.pendienteSinFecha)}</strong></li>
            <li><span>Margen después de costos</span><strong>{cop(ind.margenVendido)}</strong></li>
            <li><span>Margen de caja (sobre lo cobrado)</span><strong>{cop(ind.margenCaja)}</strong></li>
          </ul>
        </section>
        <section className="adm-card adm-card-pad">
          <span className="tab-label">Meta mínima de ventas</span>
          <div className="tab-grande">{cop(ind.metaPiso)} <small>piso</small></div>
          <ul className="tab-lista">
            <li><span>Plan completo (con abonos y ahorro)</span><strong>{cop(ind.metaCompleta)}</strong></li>
            <li><span>Semanal (plan completo)</span><strong>{ind.metaCompleta === null ? "—" : cop(ind.metaCompleta / (semanasDe(libro.periodo.mes).length))}</strong></li>
            <li><span>En USD</span><strong>{libro.periodo.tasa && ind.metaCompleta !== null ? `US$${Math.round(ind.metaCompleta / libro.periodo.tasa).toLocaleString("en-US")}` : "Falta la tasa"}</strong></li>
            <li><span>Faltan para el plan completo</span><strong>{ind.metaCompleta === null ? "—" : cop(Math.max(0, ind.metaCompleta - ind.vendidoReal))}</strong></li>
          </ul>
          {(ind.supuestos.sinComision || ind.supuestos.sinCobro) && (
            <p className="fin-nota is-alerta">La meta sale corta: falta el {[ind.supuestos.sinComision && "% de comisiones", ind.supuestos.sinCobro && "% que se cobra en el mes"].filter(Boolean).join(" y el ")} en <button type="button" className="fin-link" onClick={() => irA("ajustes")}>Ajustes del mes</button>.</p>
          )}
        </section>
        <section className="adm-card adm-card-pad">
          <span className="tab-label">Vivir y pagar deudas</span>
          <ul className="tab-lista">
            <li><span>Necesidades del mes (vivir + cuotas)</span><strong>{cop(ind.necesidades)}</strong></li>
            <li><span>Capacidad de pago (proyectada)</span><strong>{cop(ind.capacidadPlan)}</strong></li>
            <li><span>Cuotas del mes</span><strong>{cop(ind.cuotasPlan)}</strong></li>
            <li><span>Cobertura de cuotas</span><strong>{ind.cuotasPlan ? `${(ind.capacidadPlan / ind.cuotasPlan).toFixed(2)}x` : "—"}</strong></li>
            <li><span>Excedente para abonos</span><strong>{cop(ind.capacidadPlan - ind.cuotasPlan)}</strong></li>
            <li><span>Deuda al inicio → cierre proyectado</span><strong>{cop(ind.deudaInicio)} → {cop(ind.deudaCierrePlan)}</strong></li>
            <li><span>Intereses del mes</span><strong>{cop(ind.intereses)}</strong></li>
          </ul>
        </section>
      </div>

      <section className="adm-card adm-card-pad">
        <div className="fin-card-head"><h2 className="adm-card-title">Datos que faltan</h2><span className="adm-card-sub">Complétalos para que los números sean reales</span></div>
        <ul className="fin-faltan">
          {falta.map((f) => (
            <li key={f.label} className={f.falta ? "is-falta" : "is-ok"}>
              <span>{f.falta ? "Falta" : "Listo"}</span>{f.label}{f.detalle && <small> · {f.detalle}</small>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ================================================================== Flujo */

const FILAS_FLUJO: { k: keyof SemanaFlujo; label: string; editable?: "otros" | "personales" | "ahorro"; fuerte?: boolean; solo?: Escenario; nota?: string }[] = [
  { k: "saldoInicial", label: "Saldo inicial" },
  { k: "ventas", label: "Cobros de ventas", nota: "Proyectado: anticipos y saldos esperados. Real: lo que entró, por fecha." },
  { k: "otros", label: "Otros ingresos (fuera de ventas)", editable: "otros" },
  { k: "ingresos", label: "Total ingresos", fuerte: true },
  { k: "previstos", label: "Previstos (pendientes con fecha)", solo: "real", nota: "Solo informativo: no entra al saldo hasta que se cobre." },
  { k: "personales", label: "Gastos personales", editable: "personales", nota: "Proyectado vacío = el presupuesto repartido por días." },
  { k: "hgg", label: "Gastos de HGG" },
  { k: "comisiones", label: "Comisiones (sobre lo cobrado)" },
  { k: "cuotas", label: "Cuotas de deudas" },
  { k: "abonos", label: "Abonos extraordinarios" },
  { k: "ahorro", label: "Ahorro", editable: "ahorro" },
  { k: "salidas", label: "Total salidas", fuerte: true },
  { k: "neto", label: "Flujo neto" },
  { k: "saldoFinal", label: "Saldo final (solo lo cobrado)", fuerte: true },
  { k: "saldoConPrevistos", label: "Saldo si entran los previstos", solo: "real" },
];

function Flujo({ api, libro, ind, avisar }: { api: Api; libro: Libro; ind: Indicadores; avisar: (m: string | null) => void }) {
  const [vista, setVista] = useState<Escenario | "comparar">("plan");
  const p = libro.periodo;

  async function editar(i: number, campo: keyof SemanaDatos, valor: number | null) {
    const semanas = p.semanas.map((s, j) => (j === i ? { ...s, [campo]: valor } : s));
    avisar(await api.actualizarPeriodo({ semanas }));
  }

  const totalDe = (f: SemanaFlujo[], k: keyof SemanaFlujo) =>
    k === "saldoInicial" ? f[0]?.saldoInicial ?? 0 : k === "saldoFinal" || k === "saldoConPrevistos" ? f[f.length - 1]?.[k] ?? 0 : f.reduce((a, w) => a + (w[k] as number), 0);

  return (
    <section className="adm-card adm-card-pad">
      <div className="fin-card-head">
        <h2 className="adm-card-title">Flujo semanal · {nombreMes(p.mes)}</h2>
        <div className="tab-periodos" role="group" aria-label="Escenario">
          {(["plan", "real", "comparar"] as const).map((v) => (
            <button key={v} type="button" className={vista === v ? "active" : ""} aria-pressed={vista === v} onClick={() => setVista(v)}>
              {v === "plan" ? "Proyección" : v === "real" ? "Real" : "Comparar"}
            </button>
          ))}
        </div>
      </div>
      <p className="fin-nota">
        {vista === "plan" && "Lo que esperas que pase. Las celdas con borde dorado las escribes tú; lo demás sale de Ventas, Costos y Deudas."}
        {vista === "real" && "Lo que pasó de verdad: cobros registrados en Ventas, lo real de Costos y lo pagado en Deudas. Escribe aquí tus gastos personales y tu ahorro reales."}
        {vista === "comparar" && "Totales del mes, proyectado contra real."}
      </p>
      <div className="fin-tabla-wrap">
        {vista === "comparar" ? (
          <table className="fin-tabla">
            <thead><tr><th>Concepto</th><th>Proyectado</th><th>Real</th><th>Diferencia</th></tr></thead>
            <tbody>
              {FILAS_FLUJO.filter((f) => !f.solo).map((f) => {
                const a = totalDe(ind.plan, f.k), b = totalDe(ind.real, f.k);
                return <tr key={f.k} className={f.fuerte ? "is-fuerte" : ""}><td>{f.label}</td><td>{cop(a)}</td><td>{cop(b)}</td><td className={b - a < 0 ? "is-neg" : ""}>{cop(b - a)}</td></tr>;
              })}
            </tbody>
          </table>
        ) : (
          <table className="fin-tabla">
            <thead>
              <tr><th>Concepto</th>{ind[vista].map((w) => <th key={w.n}>Semana {w.n}<small>{w.desde.slice(8)}–{w.hasta.slice(8)}</small></th>)}<th>Total del mes</th></tr>
            </thead>
            <tbody>
              {FILAS_FLUJO.filter((f) => !f.solo || f.solo === vista).map((f) => (
                <tr key={f.k} className={`${f.fuerte ? "is-fuerte" : ""}${f.k === "saldoFinal" ? " is-saldo" : ""}`} title={f.nota}>
                  <td>{f.label}</td>
                  {ind[vista].map((w, i) => {
                    if (f.editable) {
                      const campo = `${f.editable}_${vista}` as keyof SemanaDatos;
                      const guardado = p.semanas[i]?.[campo] ?? null;
                      return (
                        <td key={w.n}>
                          <CeldaNumero label={`${f.label}, semana ${w.n}`} valor={guardado} placeholder={guardado === null ? Math.round(w[f.k] as number).toLocaleString("es-CO") : ""}
                            onGuardar={(v) => void editar(i, campo, v)} />
                        </td>
                      );
                    }
                    const v = w[f.k] as number;
                    return <td key={w.n} className={v < 0 ? "is-neg" : ""}>{cop(v)}</td>;
                  })}
                  <td className={totalDe(ind[vista], f.k) < 0 ? "is-neg" : ""}>{cop(totalDe(ind[vista], f.k))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

/* ================================================================== Tabla editable */

type ColEdit<T> = {
  k: keyof T & string;
  label: string;
  tipo: "texto" | "numero" | "fecha" | "lista";
  opciones?: readonly string[];
  sugerencias?: string[];
  ancho?: number;
  total?: boolean;
};
type ColCalc<T> = { label: string; calc: (d: T, i: number, fila: Fila<T>) => ReactNode; ancho?: number; total?: (fs: Fila<T>[]) => ReactNode; clase?: string };
type Col<T> = ColEdit<T> | ColCalc<T>;
const esEdit = <T,>(c: Col<T>): c is ColEdit<T> => "k" in c;

function Tabla<T extends object>({ filas, cols, onCambiar, onBorrar, acciones, vacioTxt }: {
  filas: Fila<T>[]; cols: Col<T>[];
  onCambiar: (id: string, datos: T) => void; onBorrar: (f: Fila<T>) => void;
  acciones?: (f: Fila<T>) => ReactNode; vacioTxt: string;
}) {
  const hayTotal = cols.some((c) => c.total);
  return (
    <div className="fin-tabla-wrap">
      <table className="fin-tabla fin-edit">
        <thead>
          <tr>
            {cols.map((c) => <th key={c.label} style={c.ancho ? { minWidth: c.ancho } : undefined}>{c.label}</th>)}
            <th aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr><td colSpan={cols.length + 1} className="fin-vacio">{vacioTxt}</td></tr>
          ) : filas.map((f, i) => (
            <tr key={f.id}>
              {cols.map((c) => (
                <td key={c.label} className={esEdit(c) ? "is-in" : `is-calc ${c.clase ?? ""}`}>
                  {esEdit(c) ? (
                    <Celda col={c} valor={f.datos[c.k] as unknown} onGuardar={(v) => onCambiar(f.id, { ...f.datos, [c.k]: v })} />
                  ) : c.calc(f.datos, i, f)}
                </td>
              ))}
              <td className="fin-acciones">
                {acciones?.(f)}
                <button type="button" className="fin-borrar" title="Borrar fila" aria-label="Borrar fila" onClick={() => onBorrar(f)}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
        {hayTotal && filas.length > 0 && (
          <tfoot>
            <tr>
              {cols.map((c, j) => (
                <td key={c.label}>
                  {j === 0 ? "Total" : esEdit(c) ? (c.total ? cop(filas.reduce((a, f) => a + (Number(f.datos[c.k]) || 0), 0)) : "") : c.total?.(filas)}
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function Celda<T>({ col, valor, onGuardar }: { col: ColEdit<T>; valor: unknown; onGuardar: (v: unknown) => void }) {
  if (col.tipo === "numero") return <CeldaNumero label={col.label} valor={(valor as number | null) ?? null} onGuardar={onGuardar} />;
  if (col.tipo === "fecha") {
    return <input type="date" aria-label={col.label} value={(valor as string | null) ?? ""} onChange={(e) => onGuardar(e.target.value || null)} />;
  }
  if (col.tipo === "lista") {
    return (
      <select aria-label={col.label} value={(valor as string) ?? ""} onChange={(e) => onGuardar(e.target.value)}>
        <option value="">—</option>
        {col.opciones?.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return <CeldaTexto valor={(valor as string) ?? ""} sugerencias={col.sugerencias} label={col.label} onGuardar={onGuardar} />;
}

function CeldaTexto({ valor, sugerencias, label, onGuardar }: { valor: string; sugerencias?: string[]; label: string; onGuardar: (v: string) => void }) {
  const [t, setT] = useState(valor);
  const [id] = useState(() => `sug-${Math.random().toString(36).slice(2, 8)}`);
  return (
    <>
      <input aria-label={label} value={t} list={sugerencias ? id : undefined} onChange={(e) => setT(e.target.value)} onBlur={() => t !== valor && onGuardar(t.trim())} />
      {sugerencias && <datalist id={id}>{sugerencias.map((s) => <option key={s} value={s} />)}</datalist>}
    </>
  );
}

function CeldaNumero({ valor, onGuardar, placeholder, label }: { valor: number | null; onGuardar: (v: number | null) => void; placeholder?: string; label?: string }) {
  const fmt = (x: number | null) => (x === null ? "" : x.toLocaleString("es-CO", { maximumFractionDigits: 4 }));
  const [t, setT] = useState(fmt(valor));
  const [foco, setFoco] = useState(false);
  const leer = (s: string): number | null => {
    // Formato colombiano: punto de miles y coma decimal. Un solo punto que no
    // separa miles («2.5») se toma como decimal, para tasas y porcentajes.
    const s1 = s.replace(/\s|\$|%/g, "");
    const limpio = s1.includes(",") ? s1.replace(/\./g, "").replace(",", ".")
      : /^-?\d{1,3}(\.\d{3})+$/.test(s1) ? s1.replace(/\./g, "") : s1;
    if (limpio === "") return null;
    const x = Number(limpio);
    return Number.isFinite(x) ? x : valor;
  };
  return (
    <input
      inputMode="decimal"
      aria-label={label}
      className="fin-num"
      placeholder={placeholder}
      value={foco ? t : fmt(valor)}
      onFocus={() => { setT(fmt(valor)); setFoco(true); }}
      onChange={(e) => setT(e.target.value)}
      onBlur={() => { setFoco(false); const v = leer(t); if (v !== valor) onGuardar(v); }}
    />
  );
}

const Faltan = ({ lista }: { lista: string[] }) => (lista.length ? <span className="fin-faltan-celda">{lista.join(" · ")}</span> : <span className="fin-ok">✓</span>);

function useFilas<T>(api: Api, libro: Libro, hoja: Hoja, avisar: (m: string | null) => void) {
  const fs = separar(libro.filas)[hoja] as unknown as Fila<T>[];
  return {
    filas: fs,
    cambiar: async (id: string, d: T) => avisar(await api.actualizarFila(id, d)),
    borrar: async (f: Fila<T>) => { if (confirm("¿Borrar esta fila?")) avisar(await api.borrarFila(f.id)); },
    agregar: async (d: T) => avisar(await api.agregarFila(hoja, d)),
  };
}

/* ================================================================== Ventas */

function Ventas({ api, libro, avisar }: { api: Api; libro: Libro; avisar: (m: string | null) => void }) {
  const [filtro, setFiltro] = useState<"todas" | Venta["tipo"]>("todas");
  const t = useFilas<Venta>(api, libro, "ventas", avisar);
  const emb = separar(libro.filas).embajadores.map((f) => f.datos);
  const vendedores = [...emb.map((e) => e.nombre).filter(Boolean), "Holman"];
  const mes = libro.periodo.mes;
  const lista = t.filas.filter((f) => filtro === "todas" || f.datos.tipo === filtro);
  const cerradas = new Set(t.filas.map((f) => f.datos.de_proyeccion).filter(Boolean));
  const c = (v: Venta) => calcVenta(v, emb);
  const sum = (fs: Fila<Venta>[], k: "valor" | "cobrado" | "pendiente" | "comEmb" | "comCloser" | "margen") => cop(fs.reduce((a, f) => a + c(f.datos)[k], 0));

  const cols: Col<Venta>[] = [
    { label: "Tipo", calc: (v) => <span className={`fin-tipo is-${v.tipo}`}>{v.tipo === "real" ? "Real" : "Proyectada"}</span> },
    { k: "fecha", label: "Fecha de venta", tipo: "fecha" },
    { k: "cliente", label: "Cliente", tipo: "texto", ancho: 130 },
    { k: "servicio", label: "Servicio", tipo: "texto", ancho: 140 },
    { k: "usd", label: "Valor (USD)", tipo: "numero" },
    { k: "tasa", label: "Tasa (COP/USD)", tipo: "numero" },
    { k: "cop_directo", label: "Valor en COP (si se vendió en pesos)", tipo: "numero" },
    { label: "Valor vendido (COP)", calc: (v) => cop(c(v).valor), total: (fs) => sum(fs, "valor") },
    { k: "anticipo", label: "Anticipo (COP)", tipo: "numero", total: true },
    { k: "fecha_anticipo", label: "Fecha del anticipo", tipo: "fecha" },
    { k: "saldo_cobrado", label: "Saldo cobrado después (solo real)", tipo: "numero", total: true },
    { k: "fecha_saldo", label: "Fecha del cobro del saldo", tipo: "fecha" },
    { label: "Total cobrado", calc: (v) => (v.tipo === "real" ? cop(c(v).cobrado) : "—"), total: (fs) => sum(fs.filter((f) => f.datos.tipo === "real"), "cobrado") },
    { label: "Saldo pendiente", calc: (v) => cop(c(v).pendiente), total: (fs) => sum(fs.filter((f) => f.datos.tipo === "real"), "pendiente") },
    { k: "fecha_estimada", label: "Fecha estimada de cobro", tipo: "fecha" },
    { label: "Estado", calc: (v) => c(v).estado },
    { k: "vendedor", label: "Vendedor", tipo: "texto", sugerencias: vendedores, ancho: 110 },
    { label: "% embajador", calc: (v) => `${c(v).pctEmb}%` },
    { label: "Comisión embajador", calc: (v) => cop(c(v).comEmb), total: (fs) => sum(fs, "comEmb") },
    { k: "closer", label: "Closer", tipo: "texto", ancho: 100 },
    { k: "pct_closer", label: "% closer", tipo: "numero" },
    { label: "Comisión closer", calc: (v) => cop(c(v).comCloser), total: (fs) => sum(fs, "comCloser") },
    { label: "Margen (antes de costos fijos)", calc: (v) => cop(c(v).margen), total: (fs) => sum(fs, "margen") },
    { label: "Datos faltantes", calc: (v) => <Faltan lista={faltaVenta(v, mes)} />, ancho: 150, clase: "is-faltan" },
  ];

  async function seCerro(f: Fila<Venta>) {
    const v = f.datos;
    await t.agregar({ ...vacio("ventas", "real"), fecha: hoyISO(), cliente: v.cliente, servicio: v.servicio, usd: v.usd, tasa: v.tasa, cop_directo: v.cop_directo, vendedor: v.vendedor, closer: v.closer, pct_closer: v.pct_closer, de_proyeccion: f.id });
    avisar("Listo: quedó como venta real con fecha de hoy. Completa el anticipo y lo que falte. La proyección se queda para comparar.");
  }

  return (
    <section className="adm-card adm-card-pad">
      <div className="fin-card-head">
        <div className="tab-periodos" role="group" aria-label="Tipo de venta">
          {(["todas", "proyectada", "real"] as const).map((x) => (
            <button key={x} type="button" className={filtro === x ? "active" : ""} onClick={() => setFiltro(x)}>
              {x === "todas" ? "Todas" : x === "proyectada" ? "Proyectadas" : "Reales"} ({x === "todas" ? t.filas.length : t.filas.filter((f) => f.datos.tipo === x).length})
            </button>
          ))}
        </div>
        <div className="fin-botones">
          <button type="button" className="fin-btn" onClick={() => void t.agregar(vacio("ventas", "proyectada"))}>+ Venta proyectada</button>
          <button type="button" className="fin-btn is-oro" onClick={() => void t.agregar(vacio("ventas", "real"))}>+ Venta real</button>
        </div>
      </div>
      <p className="fin-nota">Proyectada = lo que esperas vender este mes. Real = lo que se vendió. Cada venta real va una sola vez: cuando entre un pago, súmalo en «Saldo cobrado» con su fecha. Cuando una proyectada se cierre, usa «Se cerró».</p>
      <Tabla filas={lista} cols={cols} onCambiar={t.cambiar} onBorrar={t.borrar} vacioTxt="Sin ventas todavía. Empieza por tus ventas proyectadas del mes."
        acciones={(f) => f.datos.tipo === "proyectada" ? (cerradas.has(f.id) ? <span className="fin-ok" title="Ya tiene su venta real">Cerrada</span> : <button type="button" className="fin-mini" onClick={() => void seCerro(f)}>Se cerró</button>) : null} />
    </section>
  );
}

/* ================================================================== Embajadores */

function Embajadores({ api, libro, avisar }: { api: Api; libro: Libro; avisar: (m: string | null) => void }) {
  const t = useFilas<Embajador>(api, libro, "embajadores", avisar);
  const mes = libro.periodo.mes;
  const sem = semanasDe(mes);
  const semHoy = semanaDe(hoyISO(), mes);
  const ventas = separar(libro.filas).ventas.map((f) => f.datos);
  const emb = t.filas.map((f) => f.datos);
  const de = (e: Embajador, tipo: Venta["tipo"], semana?: number | null) => ventas.filter((v) =>
    v.tipo === tipo && v.vendedor.trim().toLowerCase() === e.nombre.trim().toLowerCase() && e.nombre.trim() &&
    (semana ? semanaDe(v.fecha, mes) === semana : enMes(v.fecha, mes)));
  const total = (vs: Venta[], k: "valor" | "comEmb") => vs.reduce((a, v) => a + calcVenta(v, emb)[k], 0);
  const metaSem = (e: Embajador) => (e.meta === null ? null : (e.meta * 7) / (sem.reduce((a, w) => a + w.dias, 0)));

  const cols: Col<Embajador>[] = [
    { k: "nombre", label: "Nombre", tipo: "texto", ancho: 130 },
    { k: "meta", label: "Meta mensual (COP)", tipo: "numero", total: true },
    { label: "Ventas reales del mes", calc: (e) => cop(total(de(e, "real"), "valor")), total: (fs) => cop(fs.reduce((a, f) => a + total(de(f.datos, "real"), "valor"), 0)) },
    { label: "Ventas proyectadas", calc: (e) => cop(total(de(e, "proyectada"), "valor")) },
    { label: "Meta semanal", calc: (e) => cop(metaSem(e)) },
    { label: semHoy ? `Logrado semana ${semHoy}` : "Logrado esta semana", calc: (e) => (semHoy ? cop(total(de(e, "real", semHoy), "valor")) : "—") },
    { label: "N.º ventas reales", calc: (e) => de(e, "real").length },
    { k: "pct", label: "% comisión", tipo: "numero" },
    { label: "Comisión generada", calc: (e) => cop(total(de(e, "real"), "comEmb")), total: (fs) => cop(fs.reduce((a, f) => a + total(de(f.datos, "real"), "comEmb"), 0)) },
    { label: "Brecha mensual", calc: (e) => (e.meta === null ? "—" : cop(Math.max(0, e.meta - total(de(e, "real"), "valor")))) },
    { label: "Brecha semanal", calc: (e) => { const m = metaSem(e); return m === null || !semHoy ? "—" : cop(Math.max(0, m - total(de(e, "real", semHoy), "valor"))); } },
    { label: "Avance", calc: (e) => (e.meta ? <Avance pct={total(de(e, "real"), "valor") / e.meta} /> : "—") },
    { label: "Datos faltantes", calc: (e) => <Faltan lista={faltaEmbajador(e)} />, clase: "is-faltan" },
  ];
  return (
    <section className="adm-card adm-card-pad">
      <div className="fin-card-head">
        <h2 className="adm-card-title">Embajadores</h2>
        <button type="button" className="fin-btn is-oro" onClick={() => void t.agregar(vacio("embajadores"))}>+ Embajador</button>
      </div>
      <p className="fin-nota">Las ventas y comisiones se leen de Ventas por el nombre del vendedor (escrito igual). El % se escribe como número: 10 = 10 %.</p>
      <Tabla filas={t.filas} cols={cols} onCambiar={t.cambiar} onBorrar={t.borrar} vacioTxt="Sin embajadores todavía." />
    </section>
  );
}

const Avance = ({ pct }: { pct: number }) => (
  <span className="fin-avance"><span className={`fin-barra is-${pct >= 1 ? "ok" : pct >= 0.8 ? "cerca" : "lejos"}`}><span style={{ width: `${Math.min(100, pct * 100)}%` }} /></span>{pctTxt(pct)}</span>
);

/* ================================================================== Costos */

function Costos({ api, libro, avisar }: { api: Api; libro: Libro; avisar: (m: string | null) => void }) {
  const t = useFilas<Costo>(api, libro, "costos", avisar);
  const p = libro.periodo;
  const v = (c: Costo, e: Escenario) => valorCosto(c, e, p.tasa);
  const sum = (fs: Fila<Costo>[], e: Escenario) => fs.reduce((a, f) => a + v(f.datos, e), 0);
  const cols: Col<Costo>[] = [
    { k: "concepto", label: "Concepto", tipo: "texto", ancho: 170 },
    { k: "categoria", label: "Categoría", tipo: "lista", opciones: CATEGORIAS },
    { k: "proveedor", label: "Proveedor", tipo: "texto", ancho: 100 },
    { k: "moneda", label: "Moneda", tipo: "lista", opciones: ["COP", "USD"] },
    { k: "presupuesto", label: "Presupuesto (en su moneda)", tipo: "numero" },
    { k: "real", label: "Real pagado (en su moneda)", tipo: "numero" },
    { k: "tasa", label: "Tasa (si es USD)", tipo: "numero" },
    { label: "Presupuesto (COP)", calc: (c) => cop(v(c, "plan")), total: (fs) => cop(sum(fs, "plan")) },
    { label: "Real (COP)", calc: (c) => (c.real === null ? "—" : cop(v(c, "real"))), total: (fs) => cop(sum(fs, "real")) },
    { label: "Diferencia", calc: (c) => (c.real === null ? "—" : <span className={v(c, "real") > v(c, "plan") ? "is-neg" : ""}>{cop(v(c, "real") - v(c, "plan"))}</span>), total: (fs) => cop(sum(fs, "real") - sum(fs, "plan")) },
    { k: "fecha", label: "Fecha de pago", tipo: "fecha" },
    { label: "Semana", calc: (c) => (c.fecha ? semanaDe(c.fecha, p.mes) ?? "Fuera del mes" : "1 (sin fecha)") },
    { k: "fijo", label: "Fijo o variable", tipo: "lista", opciones: ["Fijo", "Variable"] },
    { k: "notas", label: "Notas", tipo: "texto", ancho: 150 },
    { label: "Datos faltantes", calc: (c) => <Faltan lista={faltaCosto(c, p.mes, p.tasa)} />, clase: "is-faltan" },
  ];
  const porCat = [...CATEGORIAS, ""].map((cat) => {
    const fs = t.filas.filter((f) => (cat ? f.datos.categoria === cat : !CATEGORIAS.includes(f.datos.categoria as typeof CATEGORIAS[number])));
    return { cat: cat || "Sin categoría", plan: sum(fs, "plan"), real: sum(fs, "real") };
  }).filter((x) => x.cat !== "Sin categoría" || x.plan || x.real);
  const faltanConocidos = COSTOS_CONOCIDOS.filter((k) => !t.filas.some((f) => f.datos.concepto === k.concepto));

  return (
    <>
      <section className="adm-card adm-card-pad">
        <div className="fin-card-head">
          <h2 className="adm-card-title">Costos empresariales</h2>
          <div className="fin-botones">
            {faltanConocidos.length > 0 && (
              <button type="button" className="fin-btn" onClick={async () => { for (const k of faltanConocidos) await t.agregar({ ...vacio("costos"), ...k }); }}>
                + Herramientas que ya pagas ({faltanConocidos.length})
              </button>
            )}
            <button type="button" className="fin-btn is-oro" onClick={() => void t.agregar(vacio("costos"))}>+ Costo</button>
          </div>
        </div>
        <p className="fin-nota">Lo que se paga EN ESTE MES. Las comisiones de embajadores y closers no van aquí: salen solas de Ventas. Sin fecha, el costo cae en la semana 1 (prudente).</p>
        <Tabla filas={t.filas} cols={cols} onCambiar={t.cambiar} onBorrar={t.borrar} vacioTxt="Sin costos todavía." />
      </section>
      <section className="adm-card adm-card-pad">
        <h2 className="adm-card-title">Por categoría</h2>
        <div className="fin-tabla-wrap">
          <table className="fin-tabla">
            <thead><tr><th>Categoría</th><th>Presupuesto</th><th>Real</th><th>Diferencia</th></tr></thead>
            <tbody>
              {porCat.map((x) => <tr key={x.cat}><td>{x.cat}</td><td>{cop(x.plan)}</td><td>{cop(x.real)}</td><td className={x.real > x.plan ? "is-neg" : ""}>{cop(x.real - x.plan)}</td></tr>)}
              <tr className="is-fuerte"><td>Total costos de HGG</td><td>{cop(sum(t.filas, "plan"))}</td><td>{cop(sum(t.filas, "real"))}</td><td>{cop(sum(t.filas, "real") - sum(t.filas, "plan"))}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* ================================================================== Deudas */

function Deudas({ api, libro, ind, avisar }: { api: Api; libro: Libro; ind: Indicadores; avisar: (m: string | null) => void }) {
  const t = useFilas<Deuda>(api, libro, "deudas", avisar);
  const mes = libro.periodo.mes;
  const prio = prioridades(t.filas.map((f) => f.datos));
  const sumC = (fs: Fila<Deuda>[], k: "interes" | "pagoPlan" | "cierrePlan" | "cierreReal") => cop(fs.reduce((a, f) => a + calcDeuda(f.datos)[k], 0));
  const cols: Col<Deuda>[] = [
    { k: "entidad", label: "Entidad o acreedor", tipo: "texto", ancho: 140 },
    { k: "tipo", label: "Tipo", tipo: "lista", opciones: TIPOS_DEUDA },
    { k: "saldo", label: "Saldo total (COP)", tipo: "numero", total: true },
    { k: "cuota", label: "Cuota mensual", tipo: "numero", total: true },
    { k: "minimo", label: "Pago mínimo", tipo: "numero", total: true },
    { k: "tasa", label: "Interés mensual (%)", tipo: "numero" },
    { label: "Tasa E.A.", calc: (d) => pctTxt(calcDeuda(d).ea) },
    { k: "fecha_limite", label: "Fecha límite", tipo: "fecha" },
    { k: "estado", label: "Estado", tipo: "lista", opciones: ESTADOS_DEUDA },
    { label: "Prioridad sugerida", calc: (_d, i) => prio[i] ?? "—" },
    { k: "prioridad_propia", label: "Tu prioridad", tipo: "numero" },
    { label: "Pago planeado", calc: (d) => cop(calcDeuda(d).pagoPlan), total: (fs) => sumC(fs, "pagoPlan") },
    { k: "pagado_real", label: "Pagado real", tipo: "numero", total: true },
    { k: "abono_plan", label: "Abono extra planeado", tipo: "numero", total: true },
    { k: "abono_real", label: "Abono extra real", tipo: "numero", total: true },
    { k: "fecha_abono", label: "Fecha del abono", tipo: "fecha" },
    { label: "Interés del mes", calc: (d) => cop(calcDeuda(d).interes), total: (fs) => sumC(fs, "interes") },
    { label: "Saldo al cierre (proyectado)", calc: (d) => cop(calcDeuda(d).cierrePlan), total: (fs) => sumC(fs, "cierrePlan") },
    { label: "Saldo al cierre (real)", calc: (d) => (calcDeuda(d).hayReal ? cop(calcDeuda(d).cierreReal) : "—"), total: (fs) => sumC(fs, "cierreReal") },
    { label: "Meses para liquidar", calc: (d) => calcDeuda(d).meses ?? "—" },
    { label: "Datos faltantes", calc: (d) => <Faltan lista={faltaDeuda(d, mes)} />, clase: "is-faltan" },
  ];
  return (
    <section className="adm-card adm-card-pad">
      <div className="fin-card-head">
        <h2 className="adm-card-title">Deudas personales</h2>
        <button type="button" className="fin-btn is-oro" onClick={() => void t.agregar(vacio("deudas"))}>+ Deuda</button>
      </div>
      <p className="fin-nota">
        Prioridad sugerida (avalancha): primero las que están en mora, después la de mayor tasa. El pago planeado es la cuota; si no hay cuota fija, el mínimo. Pagar de más va como abono extra.
        {" "}Capacidad de pago proyectada: <strong>{cop(ind.capacidadPlan)}</strong> para <strong>{cop(ind.cuotasPlan)}</strong> de cuotas.
      </p>
      <Tabla filas={t.filas} cols={cols} onCambiar={t.cambiar} onBorrar={t.borrar} vacioTxt="Sin deudas registradas." />
    </section>
  );
}

/* ================================================================== Ajustes */

function Ajustes({ api, libro, avisar }: { api: Api; libro: Libro; avisar: (m: string | null) => void }) {
  const p = libro.periodo;
  const sig = mesSiguiente(p.mes);
  const yaExiste = api.periodos.some((x) => x.mes === sig);
  const [notas, setNotas] = useState(p.notas ?? "");
  const campo = (k: keyof Periodo, label: string, ayuda: string) => (
    <div className="adm-field fin-param">
      <label>{label}</label>
      <CeldaNumero label={label} valor={p[k] as number | null} onGuardar={async (v) => avisar(await api.actualizarPeriodo({ [k]: v }))} />
      <small>{ayuda}</small>
    </div>
  );
  return (
    <>
      <section className="adm-card adm-card-pad">
        <h2 className="adm-card-title">Parámetros de {nombreMes(p.mes)}</h2>
        <div className="fin-params">
          {campo("saldo_inicial", "Saldo en caja al inicio (COP)", "Lo disponible el día 1 (cuentas + efectivo).")}
          {campo("presupuesto_personal", "Presupuesto personal mínimo (COP)", "Tu meta: vivir con 3.000.000 al mes.")}
          {campo("tasa", "Tasa de cambio de referencia (COP por USD)", "Para costos en USD sin tasa y la meta en USD.")}
          {campo("pct_comision", "% de comisiones sobre ventas (estimado)", "Embajadores + closer + pasarela. 20 = 20 %.")}
          {campo("pct_cobro", "% de lo vendido que se cobra en el mes", "Si cobras 50 % de anticipo, escribe 50.")}
          {campo("saldo_final_real", "Saldo real en cuentas al cerrar el mes", "Al cierre: cuadra lo registrado contra el banco.")}
        </div>
        <div className="adm-field">
          <label htmlFor="fin-notas">Notas del mes</label>
          <textarea id="fin-notas" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} onBlur={async () => notas !== (p.notas ?? "") && avisar(await api.actualizarPeriodo({ notas: notas.trim() || null }))} placeholder="Qué decidiste, qué aprendiste, qué cambiarías" />
        </div>
      </section>
      <section className="adm-card adm-card-pad">
        <h2 className="adm-card-title">El mes siguiente</h2>
        <p className="fin-nota">Crea {nombreMes(sig)} con lo que sigue vigente: embajadores, costos (sin lo real, fechas un mes después), deudas con el saldo al cierre y el saldo inicial igual al saldo real. Las ventas no pasan: las que esperes cobrar, escríbelas como proyectadas.</p>
        <button type="button" className="adm-add-btn" disabled={yaExiste} onClick={async () => {
          const { periodo, filas } = armarMesSiguiente(libro);
          avisar(await api.crearPeriodo(periodo, filas));
        }}>{yaExiste ? `${nombreMes(sig)} ya existe` : `Crear ${nombreMes(sig)}`}</button>
      </section>
    </>
  );
}
