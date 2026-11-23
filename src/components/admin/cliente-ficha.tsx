import { useState } from "react";
import {
  AREAS, enlaceActa, fechaCorta, promedioRueda,
  type Compromiso, type Medicion, type Programa, type SesionPrograma,
} from "@/lib/proceso";

/**
 * Torre → Clientes → ficha del cliente, pestaña «Resumen»: todo en bloques y
 * gráficas para leerlo de un vistazo (Holman es muy visual, nov 2026).
 * Solo lectura: lo que se edita vive en las otras pestañas.
 */

const diasDesde = (iso: string) => Math.floor((Date.now() - new Date(`${iso.slice(0, 10)}T12:00:00`).getTime()) / 86400000);
const haceDias = (d: number) => (d <= 0 ? "hoy" : d === 1 ? "ayer" : `hace ${d} días`);

export function ResumenVisual({ programa: p, sesiones, compromisos, mediciones, preview, irA }: {
  programa: Programa; sesiones: SesionPrograma[]; compromisos: Compromiso[]; mediciones: Medicion[];
  preview: boolean; irA: (tab: "sesiones" | "m2h2" | "rueda") => void;
}) {
  const hechos = compromisos.filter((c) => c.hecho).length;
  const pendientes = compromisos.filter((c) => !c.hecho);
  const ultima = [...sesiones].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  const dias = ultima ? diasDesde(ultima.fecha) : null;
  const inicio = mediciones[0];
  const ahora = mediciones.length > 1 ? mediciones[mediciones.length - 1] : undefined;
  const pInicio = promedioRueda(inicio);
  const pAhora = promedioRueda(ahora);

  return (
    <div className="cf">
      {/* Bloques de números */}
      <div className="cf-kpis">
        <Kpi titulo="Sesiones" valor={`${sesiones.length}${p.sesiones_total ? ` / ${p.sesiones_total}` : ""}`}
          pie={p.sesiones_total ? `${Math.max(0, p.sesiones_total - sesiones.length)} por hacer` : p.sesiones_total === 0 ? "sin sesiones en su plan" : "sin tope"}
          pct={p.sesiones_total ? sesiones.length / p.sesiones_total : null} />
        <Kpi titulo="Compromisos" valor={compromisos.length ? `${hechos} / ${compromisos.length}` : "—"}
          pie={compromisos.length ? `${Math.round((hechos / compromisos.length) * 100)} % cumplidos` : "ninguno todavía"}
          pct={compromisos.length ? hechos / compromisos.length : null} />
        <Kpi titulo="Última sesión" valor={ultima ? fechaCorta(ultima.fecha) : "—"}
          pie={dias != null ? haceDias(dias) : "ninguna todavía"} alerta={p.estado === "activo" && dias != null && dias > 21} />
        <Kpi titulo="Rueda de la Vida" valor={pAhora != null ? `${pInicio} → ${pAhora}` : pInicio != null ? `${pInicio}` : "—"}
          pie={pAhora != null && pInicio != null ? `${pAhora - pInicio >= 0 ? "+" : ""}${Math.round((pAhora - pInicio) * 10) / 10} de promedio` : pInicio != null ? "punto de partida" : "sin medir"} />
      </div>

      {/* Camino por etapas */}
      <section className="cf-bloque">
        <div className="cf-head"><h3>Su camino</h3><span>{p.titulo} · desde el {fechaCorta(p.inicio)}</span></div>
        <ol className="cf-camino">
          {p.etapas.map((e, i) => (
            <li key={e} className={i < p.etapa_actual ? "is-hecha" : i === p.etapa_actual ? "is-actual" : ""}>
              <span className="cf-camino-num">{i < p.etapa_actual ? "✓" : i + 1}</span>
              <span>{e}</span>
            </li>
          ))}
        </ol>
        {(p.meta || p.sentido) && (
          <div className="cf-meta">
            {p.sentido && <p className="cf-sentido">{p.sentido}</p>}
            {p.meta && <p className="cf-meta-texto">{p.meta}</p>}
            {p.meta_fecha && <span className="cf-muted">Meta para el {fechaCorta(p.meta_fecha)}</span>}
          </div>
        )}
      </section>

      <div className="cf-dos">
        {/* Rueda de la Vida */}
        <section className="cf-bloque">
          <div className="cf-head">
            <h3>Rueda de la Vida</h3>
            <button type="button" className="cf-link" onClick={() => irA("rueda")}>{inicio ? "Nueva medición" : "Cargar la primera"}</button>
          </div>
          {inicio ? (
            <>
              <RadarDoble inicio={inicio} ahora={ahora} />
              <div className="cf-leyenda">
                <span className="cf-ley-inicio">Inicio · {fechaCorta(inicio.fecha)}</span>
                {ahora && <span className="cf-ley-ahora">Ahora · {fechaCorta(ahora.fecha)}</span>}
              </div>
              <AreasDestacadas inicio={inicio} ahora={ahora} />
            </>
          ) : (
            <p className="cf-muted">Todavía no tiene medición. La primera es su punto de partida.</p>
          )}
        </section>

        {/* Mentalidad y habilidades */}
        <section className="cf-bloque">
          <div className="cf-head">
            <h3>Mentalidad y habilidades</h3>
            <button type="button" className="cf-link" onClick={() => irA("m2h2")}>Editar</button>
          </div>
          {(p.creencias ?? []).length === 0 && (p.habilidades ?? []).length === 0 && !p.tarjeta ? (
            <p className="cf-muted">Se llena con la Fórmula M2H2 a medida que avanzan las sesiones.</p>
          ) : (
            <>
              {p.tarjeta && <p className="cf-tarjeta">{p.tarjeta}</p>}
              {(p.creencias ?? []).length > 0 && (
                <ul className="cf-creencias">
                  {(p.creencias ?? []).map((c, i) => (
                    <li key={i}><span className="cf-antes">{c.antes}</span><span aria-hidden="true">→</span><span>{c.ahora}</span></li>
                  ))}
                </ul>
              )}
              {(p.habilidades ?? []).length > 0 && (
                <ul className="cf-barras">
                  {(p.habilidades ?? []).map((h) => (
                    <li key={h.nombre}>
                      <span>{h.nombre}</span>
                      <span className="cf-barra"><span style={{ width: `${h.nivel * 10}%` }} /></span>
                      <strong>{h.nivel}/10</strong>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>

      <div className="cf-dos">
        {/* Compromisos pendientes */}
        <section className="cf-bloque">
          <div className="cf-head">
            <h3>Compromisos pendientes</h3>
            <button type="button" className="cf-link" onClick={() => irA("sesiones")}>Ver todos</button>
          </div>
          {pendientes.length === 0 ? (
            <p className="cf-muted">{compromisos.length ? "Todo cumplido." : "Se crean al registrar cada sesión."}</p>
          ) : (
            <ul className="cf-lista">
              {pendientes.slice(0, 5).map((c) => {
                const vencido = c.fecha_limite ? diasDesde(c.fecha_limite) > 0 : false;
                return (
                  <li key={c.id}>
                    <span>{c.texto}</span>
                    <small className={vencido ? "is-alerta" : ""}>{c.fecha_limite ? `${vencido ? "venció el" : "para el"} ${fechaCorta(c.fecha_limite)}` : "sin fecha"}</small>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Sesiones */}
        <section className="cf-bloque">
          <div className="cf-head">
            <h3>Sesiones</h3>
            <button type="button" className="cf-link" onClick={() => irA("sesiones")}>Registrar sesión</button>
          </div>
          {sesiones.length === 0 ? (
            <p className="cf-muted">Todavía no hay sesiones.</p>
          ) : (
            <ol className="cf-sesiones">
              {[...sesiones].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((s) => (
                <li key={s.id}>
                  <span className="cf-sesion-fecha">{fechaCorta(s.fecha)}</span>
                  <div>
                    <strong>{s.titulo}</strong>
                    {s.resumen && <p>{s.resumen}</p>}
                  </div>
                  {s.acta_path && <BotonActa path={s.acta_path} preview={preview} />}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({ titulo, valor, pie, pct, alerta }: { titulo: string; valor: string; pie: string; pct?: number | null; alerta?: boolean }) {
  return (
    <div className={`cf-kpi${alerta ? " is-alerta" : ""}`}>
      <span className="cf-kpi-titulo">{titulo}</span>
      <strong>{valor}</strong>
      {pct != null && <span className="cf-barra"><span style={{ width: `${Math.min(100, Math.round(pct * 100))}%` }} /></span>}
      <small>{pie}</small>
    </div>
  );
}

function BotonActa({ path, preview }: { path: string; preview: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className="cf-link" disabled={busy || preview} title={preview ? "En la vista previa no hay actas" : undefined}
      onClick={async () => {
        setBusy(true);
        const url = await enlaceActa(path);
        setBusy(false);
        if (url) window.open(url, "_blank", "noopener");
      }}>
      {busy ? "Abriendo…" : "Ver acta"}
    </button>
  );
}

/** Las 3 más altas y las 3 que piden atención (con lo que se movieron). */
function AreasDestacadas({ inicio, ahora }: { inicio: Medicion; ahora?: Medicion }) {
  const base = ahora ?? inicio;
  const filas = AREAS.map((a) => ({ a, v: base.valores[a.id], antes: ahora ? inicio.valores[a.id] : undefined }))
    .filter((f): f is { a: (typeof AREAS)[number]; v: number; antes: number | undefined } => typeof f.v === "number")
    .sort((x, y) => y.v - x.v);
  if (!filas.length) return null;
  const top = filas.slice(0, 3);
  const bajas = filas.slice(-3).reverse();
  const Fila = ({ f }: { f: (typeof filas)[number] }) => {
    const d = typeof f.antes === "number" ? f.v - f.antes : 0;
    return (
      <li>
        <span>{f.a.nombre}</span>
        <span className="cf-barra"><span style={{ width: `${f.v * 10}%` }} /></span>
        <strong>{f.v}{d !== 0 && <em className={d > 0 ? "is-up" : "is-down"}>{d > 0 ? `+${d}` : d}</em>}</strong>
      </li>
    );
  };
  return (
    <div className="cf-areas">
      <div><span className="cf-areas-t">Lo más fuerte</span><ul className="cf-barras">{top.map((f) => <Fila key={f.a.id} f={f} />)}</ul></div>
      <div><span className="cf-areas-t">Pide atención</span><ul className="cf-barras is-baja">{bajas.map((f) => <Fila key={f.a.id} f={f} />)}</ul></div>
    </div>
  );
}

/** Radar de las 10 áreas: inicio (línea punteada) y ahora (dorado). */
function RadarDoble({ inicio, ahora }: { inicio: Medicion; ahora?: Medicion }) {
  const size = 300, c = size / 2, r = 105, n = AREAS.length;
  const punto = (i: number, v: number) => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + Math.cos(ang) * r * (v / 10), c + Math.sin(ang) * r * (v / 10)] as const;
  };
  const poly = (m: Medicion) => AREAS.map((a, i) => punto(i, m.valores[a.id] ?? 0).join(",")).join(" ");
  const principal = ahora ?? inicio;
  return (
    <svg className="cf-radar" viewBox={`-80 -8 ${size + 160} ${size + 16}`} role="img"
      aria-label={`Rueda de la Vida: ${AREAS.map((a) => `${a.nombre} ${principal.valores[a.id] ?? "—"}`).join(", ")}`}>
      {[2, 4, 6, 8, 10].map((lv) => (
        <polygon key={lv} points={AREAS.map((_, i) => punto(i, lv).join(",")).join(" ")} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={lv === 10 ? 1 : 0.6} />
      ))}
      {AREAS.map((_, i) => {
        const [x, y] = punto(i, 10);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth={0.6} />;
      })}
      {ahora && <polygon points={poly(inicio)} fill="rgba(184,190,199,0.06)" stroke="#B8BEC7" strokeWidth={1.2} strokeDasharray="4 3" strokeLinejoin="round" />}
      <polygon points={poly(principal)} fill="rgba(240,184,0,0.16)" stroke="#F0B800" strokeWidth={1.8} strokeLinejoin="round" />
      {AREAS.map((a, i) => {
        const v = principal.valores[a.id];
        if (typeof v !== "number") return null;
        const [x, y] = punto(i, v);
        return <circle key={a.id} cx={x} cy={y} r={3} fill="#F0B800" />;
      })}
      {AREAS.map((a, i) => {
        const [x, y] = punto(i, 12.4);
        const anchor = Math.abs(x - c) < 8 ? "middle" : x > c ? "start" : "end";
        const v = principal.valores[a.id];
        return (
          <text key={a.id} x={x} y={y + 3} textAnchor={anchor} className="cf-radar-label">
            {a.nombre} <tspan className="cf-radar-num">{typeof v === "number" ? v : "—"}</tspan>
          </text>
        );
      })}
    </svg>
  );
}
