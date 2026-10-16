import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ADMIN } from "@/lib/routes";
import { calcularTablero, pct, PERIODOS, useTablero, type Periodo } from "@/lib/tablero";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/**
 * Los números del negocio en la portada de la Torre: la meta de la etapa, el
 * embudo, los ingresos, ECOS hoy, lo que hay que atender y de dónde viene la
 * gente. Va antes de las tarjetas viejas de ventas.
 */
export function TableroNumeros() {
  const [periodo, setPeriodo] = useState<Periodo>("30");
  const { datos, loading, error, recargar } = useTablero();
  const t = useMemo(() => calcularTablero(datos, periodo), [datos, periodo]);

  const e = t.embudo;
  const etapa = t.etapa1;
  const avance = Math.min(100, (etapa.cobrado / etapa.meta) * 100);
  const marcaMinimo = (etapa.minimo / etapa.meta) * 100;
  const hayCampanas = t.fuentes.some((f) => f.fuente.tipo === "campana");

  const pasos: { label: string; n: number; nota?: string }[] = [
    { label: "Registros a la masterclass", n: e.masterclass },
    { label: "Cuentas nuevas en ECOS", n: e.cuentas },
    { label: "Claridad agendadas", n: e.claridad },
    { label: "Claridad hechas", n: e.claridadHechas, nota: tasa(e.claridadHechas, e.claridad, "asistió") },
    { label: "Clientes nuevos", n: e.clientes, nota: tasa(e.clientes, e.claridadHechas, "cerró") },
  ];

  return (
    <section className="tab-wrap" aria-labelledby="tab-titulo">
      <header className="tab-head">
        <div>
          <h2 id="tab-titulo" className="tab-titulo">Tus números</h2>
          <p className="tab-sub">De dónde llega la gente y cuánto se vuelve venta.</p>
        </div>
        <div className="tab-controles">
          <div className="tab-periodos" role="group" aria-label="Periodo">
            {PERIODOS.map((p) => (
              <button key={p.id} type="button" aria-pressed={periodo === p.id}
                className={periodo === p.id ? "active" : ""} onClick={() => setPeriodo(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          <button type="button" className="tab-recargar" onClick={() => void recargar()} aria-label="Actualizar" title="Actualizar">↻</button>
        </div>
      </header>

      {error && <p className="tab-error">No pude leer todos los datos: {error}</p>}

      {/* Meta de la etapa 1 */}
      <div className="adm-card adm-card-pad tab-meta">
        <div className="tab-meta-fila">
          <span className="tab-label">Meta de la etapa 1</span>
          <span className="tab-meta-cifra">
            <strong>{usd(etapa.cobrado)}</strong> de {usd(etapa.minimo)}–{usd(etapa.meta)}
          </span>
        </div>
        <div className="tab-barra" role="progressbar" aria-valuemin={0} aria-valuemax={etapa.meta} aria-valuenow={Math.round(etapa.cobrado)}>
          <span style={{ width: `${avance}%` }} />
          <i style={{ left: `${marcaMinimo}%` }} title={`Mínimo: ${usd(etapa.minimo)}`} />
        </div>
        <p className="tab-nota">
          {etapa.cobrado >= etapa.meta
            ? "¡Meta cumplida! Hora de delegar."
            : etapa.cobrado >= etapa.minimo
              ? `Pasaste el mínimo. Faltan ${usd(etapa.meta - etapa.cobrado)} para la meta.`
              : `Faltan ${usd(etapa.minimo - etapa.cobrado)} para el mínimo. Cuenta lo cobrado en la tienda y en ECOS desde el 1 de octubre.`}
        </p>
      </div>

      {/* Embudo */}
      <div className="tab-embudo">
        {pasos.map((p, i) => (
          <div key={p.label} className="tab-paso">
            <span className="tab-paso-n">{loading ? "…" : p.n}</span>
            <span className="tab-paso-label">{p.label}</span>
            {p.nota && <span className="tab-paso-nota">{p.nota}</span>}
            {i < pasos.length - 1 && <span className="tab-flecha" aria-hidden>›</span>}
          </div>
        ))}
      </div>

      <div className="tab-tres">
        <div className="adm-card adm-card-pad">
          <span className="tab-label">Ingresos del periodo</span>
          <div className="tab-grande">{usd(t.ingresos.total)}</div>
          <ul className="tab-lista">
            <li><span>Tienda ({e.ventas} {e.ventas === 1 ? "venta" : "ventas"})</span><strong>{usd(t.ingresos.tienda)}</strong></li>
            <li><span>ECOS (cobros)</span><strong>{usd(t.ingresos.ecos)}</strong></li>
          </ul>
        </div>

        <div className="adm-card adm-card-pad">
          <span className="tab-label">ECOS hoy</span>
          <div className="tab-grande">{t.ecos.pagando} <small>pagando</small></div>
          <ul className="tab-lista">
            <li><span>Ingreso mensual</span><strong>{usd(t.ecos.mrr)}</strong></li>
            <li><span>En prueba gratis</span><strong>{t.ecos.enPrueba}</strong></li>
            <li><span>Bajas en el periodo</span><strong>{t.ecos.cancelados}</strong></li>
          </ul>
        </div>

        <div className="adm-card adm-card-pad tab-atender">
          <span className="tab-label">Qué atender</span>
          <ul className="tab-lista">
            <li>
              <span>Fundadores por activar antes del {t.pendientes.fechaCobro}</span>
              <Link to={ADMIN.ecos}>{t.pendientes.porActivar}</Link>
            </li>
            <li>
              <span>Claridad hechas sin cerrar</span>
              <Link to={ADMIN.agenda}>{t.pendientes.claridadSinCerrar}</Link>
            </li>
            <li>
              <span>Citas en los próximos 7 días</span>
              <Link to={ADMIN.agenda}>{t.pendientes.citasProximas}</Link>
            </li>
          </ul>
        </div>
      </div>

      {/* De dónde viene */}
      <div className="adm-card adm-card-pad">
        <header className="adm-card-head">
          <h3 className="adm-card-title gold">De dónde viene</h3>
        </header>
        {t.fuentes.length === 0 ? (
          <p className="tab-nota">{loading ? "Cargando…" : "Todavía no hay movimientos en este periodo."}</p>
        ) : (
          <div className="tab-tabla-wrap">
            <table className="tab-tabla">
              <thead>
                <tr>
                  <th>Fuente</th><th>Masterclass</th><th>Cuentas ECOS</th><th>Claridad</th><th>Ventas</th><th>Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {t.fuentes.map((f) => (
                  <tr key={f.fuente.clave} className={`is-${f.fuente.tipo}`}>
                    <td>{f.fuente.label}</td>
                    <td>{f.masterclass}</td>
                    <td>{f.cuentas}</td>
                    <td>{f.citas}</td>
                    <td>{f.ventas}</td>
                    <td>{usd(f.ingresos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!hayCampanas && (
          <p className="tab-nota">
            Para que una campaña aparezca aquí, el enlace del anuncio lleva <code>utm_medium=paid</code> y{" "}
            <code>utm_source</code> con la red (instagram, facebook, tiktok, google). Ejemplo:{" "}
            <code>holmanglobalgroup.com/masterclass?utm_source=instagram&amp;utm_medium=paid&amp;utm_campaign=masterclass-nov</code>
          </p>
        )}
      </div>
    </section>
  );
}

function tasa(parte: number, total: number, verbo: string): string | undefined {
  const p = pct(parte, total);
  return p === null ? undefined : `${p}% ${verbo}`;
}
