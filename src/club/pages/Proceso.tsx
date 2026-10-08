import { useState } from "react";
import { useClub } from "@/contexts/ClubContext";
import { CLARIDAD_WA_URL, WHATSAPP_URL } from "@/lib/config";
import { ECOS, tieneBeneficios } from "@/lib/ecos";
import {
  AREAS, ESTADO_LABEL, enlaceActa, fechaCorta, programaPrincipal, promedioRueda, useMiProceso,
  type Compromiso, type Medicion, type Programa,
} from "@/lib/proceso";
import { Candado } from "@/club/PanelBloqueado";

/**
 * «Mi proceso»: el avance del cliente de HGG. Quien está en el club sin un
 * programa ve la sección con candado y una muestra de lo que tendría: es la
 * invitación a la Sesión de Claridad, no un regaño.
 */
export default function Proceso() {
  const { member } = useClub();
  const proceso = useMiProceso();

  if (proceso.loading) return <div className="club-page"><p className="club-muted">Cargando tu proceso…</p></div>;

  const programa = programaPrincipal(proceso.programas);
  if (!programa) return <ProcesoBloqueado descuento={tieneBeneficios(member)} />;

  const sesiones = proceso.sesiones.filter((s) => s.programa_id === programa.id);
  const compromisos = proceso.compromisos.filter((c) => c.programa_id === programa.id);
  const mediciones = proceso.mediciones.filter((m) => m.programa_id === programa.id);

  return (
    <div className="club-page proc">
      <header className="club-page-head">
        <p className="club-eyebrow">Mi proceso</p>
        <h1>{programa.titulo}</h1>
        <p className="club-page-sub">
          Desde el {fechaCorta(programa.inicio)}
          {programa.sesiones_total ? ` · ${sesiones.length} de ${programa.sesiones_total} sesiones` : sesiones.length ? ` · ${sesiones.length} sesiones` : ""}
          {programa.estado !== "activo" && <> · <span className={`proc-estado is-${programa.estado}`}>{ESTADO_LABEL[programa.estado]}</span></>}
        </p>
      </header>

      <AvisoEstado programa={programa} />

      <section className="proc-meta">
        <span className="proc-label">Tu meta</span>
        {programa.meta ? (
          <>
            <p className="proc-meta-texto">{programa.meta}</p>
            {programa.meta_fecha && <span className="proc-meta-fecha">Para el {fechaCorta(programa.meta_fecha)}</span>}
          </>
        ) : (
          <p className="club-muted">La definimos juntos en tu primera sesión: un resultado concreto que puedas ver y medir.</p>
        )}
      </section>

      <Camino programa={programa} />

      <Compromisos compromisos={compromisos} marcar={proceso.marcar} />

      <Rueda mediciones={mediciones} />

      <section className="proc-bloque">
        <div className="club-row-head"><h2>Tus sesiones</h2></div>
        {sesiones.length === 0 ? (
          <p className="club-muted">Aquí van a quedar tus sesiones, cada una con su acta para descargar.</p>
        ) : (
          <ol className="proc-sesiones">
            {sesiones.map((s, i) => (
              <li key={s.id} className="proc-sesion">
                <span className="proc-sesion-num">{String(sesiones.length - i).padStart(2, "0")}</span>
                <div className="proc-sesion-info">
                  <span className="proc-sesion-fecha">{fechaCorta(s.fecha)}</span>
                  <h3>{s.titulo}</h3>
                  {s.resumen && <p>{s.resumen}</p>}
                </div>
                {s.acta_path && <BotonActa path={s.acta_path} preview={proceso.preview} />}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function AvisoEstado({ programa }: { programa: Programa }) {
  if (programa.estado === "pausado") {
    return (
      <div className="club-prueba" role="status">
        <p><strong>Tu programa está en pausa.</strong> Todo tu avance sigue aquí. Escríbele a Holman y lo retomamos donde lo dejaste.</p>
        <a className="club-prueba-btn" href={`${WHATSAPP_URL}?text=${encodeURIComponent("Hola Holman, quiero retomar mi programa.")}`} target="_blank" rel="noopener noreferrer">Retomar</a>
      </div>
    );
  }
  if (programa.estado === "terminado") {
    return (
      <div className="club-prueba" role="status">
        <p><strong>Completaste tu programa{programa.terminado_at ? ` el ${fechaCorta(programa.terminado_at)}` : ""}.</strong> Tu historial queda guardado aquí, y tu club sigue incluido un mes más.</p>
      </div>
    );
  }
  return null;
}

function Camino({ programa }: { programa: Programa }) {
  const n = programa.etapas.length;
  const actual = Math.min(Math.max(programa.etapa_actual, 0), n - 1);
  const terminado = programa.estado === "terminado";
  return (
    <section className="proc-bloque">
      <div className="club-row-head"><h2>Tu camino</h2></div>
      <ol className="proc-camino" style={{ ["--n" as string]: n }}>
        {programa.etapas.map((e, i) => {
          const estado = terminado || i < actual ? "hecha" : i === actual ? "actual" : "siguiente";
          return (
            <li key={e} className={`proc-etapa is-${estado}`}>
              <span className="proc-etapa-num">{estado === "hecha" ? "✓" : String(i + 1).padStart(2, "0")}</span>
              <span className="proc-etapa-nombre">{e}</span>
              <span className="proc-etapa-estado">{estado === "hecha" ? "Lograda" : estado === "actual" ? "Estás aquí" : "Siguiente"}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Compromisos({ compromisos, marcar }: { compromisos: Compromiso[]; marcar: (id: string, hecho: boolean) => Promise<string | null> }) {
  const [verHechos, setVerHechos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendientes = compromisos.filter((c) => !c.hecho);
  const hechos = compromisos.filter((c) => c.hecho);

  const fila = (c: Compromiso) => (
    <li key={c.id} className={`proc-comp${c.hecho ? " is-hecho" : ""}`}>
      <label>
        <input type="checkbox" checked={c.hecho} onChange={async (e) => setError(await marcar(c.id, e.target.checked))} />
        <span className="proc-comp-texto">{c.texto}</span>
      </label>
      {c.fecha_limite && !c.hecho && <span className="proc-comp-fecha">Para el {fechaCorta(c.fecha_limite)}</span>}
    </li>
  );

  return (
    <section className="proc-bloque">
      <div className="club-row-head">
        <h2>Tus compromisos</h2>
        {compromisos.length > 0 && <span className="club-muted">{hechos.length} de {compromisos.length} cumplidos</span>}
      </div>
      {compromisos.length === 0 ? (
        <p className="club-muted">Cada sesión deja un compromiso. Cuando lo cumplas, márcalo aquí.</p>
      ) : (
        <>
          {pendientes.length > 0 ? <ul className="proc-comps">{pendientes.map(fila)}</ul> : <p className="club-muted">Cumpliste todos tus compromisos. 👏</p>}
          {hechos.length > 0 && (
            <>
              <button type="button" className="club-link proc-ver" onClick={() => setVerHechos((v) => !v)}>
                {verHechos ? "Ocultar los cumplidos" : `Ver los cumplidos (${hechos.length})`}
              </button>
              {verHechos && <ul className="proc-comps">{hechos.map(fila)}</ul>}
            </>
          )}
        </>
      )}
      {error && <p className="club-error">{error}</p>}
    </section>
  );
}

function Rueda({ mediciones }: { mediciones: Medicion[] }) {
  const inicio = mediciones[0];
  const hoy = mediciones.length > 1 ? mediciones[mediciones.length - 1] : undefined;
  const pInicio = promedioRueda(inicio);
  const pHoy = promedioRueda(hoy);

  return (
    <section className="proc-bloque">
      <div className="club-row-head">
        <h2>Tu Rueda de la Vida</h2>
        {pInicio !== null && (
          <span className="club-muted">
            Promedio {pInicio}{pHoy !== null && <> → <strong className="proc-sube">{pHoy}</strong></>}
          </span>
        )}
      </div>
      {!inicio ? (
        <p className="club-muted">En tu primera sesión medimos tu punto de partida. Cada mes la volvemos a medir para que veas tu avance.</p>
      ) : (
        <>
          <p className="proc-leyenda">
            <span className="proc-dot is-inicio" /> Inicio · {fechaCorta(inicio.fecha)}
            {hoy && <><span className="proc-dot is-hoy" /> Ahora · {fechaCorta(hoy.fecha)}</>}
          </p>
          <ul className="proc-rueda">
            {AREAS.map((a) => {
              const v0 = inicio.valores[a.id];
              const v1 = hoy?.valores[a.id];
              if (v0 == null && v1 == null) return null;
              const dif = v0 != null && v1 != null ? v1 - v0 : 0;
              return (
                <li key={a.id}>
                  <span className="proc-rueda-area">{a.nombre}</span>
                  <span className="proc-rueda-barras">
                    {v0 != null && <span className="proc-barra is-inicio" style={{ width: `${v0 * 10}%` }} />}
                    {v1 != null && <span className="proc-barra is-hoy" style={{ width: `${v1 * 10}%` }} />}
                  </span>
                  <span className="proc-rueda-valor">
                    {v1 ?? v0}{dif > 0 && <em className="proc-sube"> +{dif}</em>}
                  </span>
                </li>
              );
            })}
          </ul>
          {!hoy && <p className="club-muted">Este es tu punto de partida. En la próxima medición vas a ver aquí cuánto has avanzado.</p>}
        </>
      )}
    </section>
  );
}

function BotonActa({ path, preview }: { path: string; preview: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="club-btn small ghost"
      disabled={busy || preview}
      title={preview ? "En la vista previa no hay archivo" : undefined}
      onClick={async () => {
        setBusy(true);
        const url = await enlaceActa(path);
        setBusy(false);
        if (url) window.open(url, "_blank", "noopener");
      }}
    >
      {busy ? "Abriendo…" : "Descargar acta"}
    </button>
  );
}

/** Lo que ve quien está en el club sin programa: una muestra borrosa y la invitación. */
function ProcesoBloqueado({ descuento }: { descuento: boolean }) {
  return (
    <div className="club-lock proc-lock">
      <div className="club-lock-fondo proc-lock-fondo" aria-hidden="true">
        <div className="proc-meta"><span className="proc-label">Tu meta</span><p className="proc-meta-texto">Lanzar mi oferta y tener mis primeros tres clientes.</p></div>
        <ol className="proc-camino" style={{ ["--n" as string]: 3 }}>
          {["Claridad", "Identidad", "Acción"].map((e, i) => (
            <li key={e} className={`proc-etapa is-${i === 0 ? "hecha" : i === 1 ? "actual" : "siguiente"}`}>
              <span className="proc-etapa-num">{i === 0 ? "✓" : `0${i + 1}`}</span>
              <span className="proc-etapa-nombre">{e}</span>
            </li>
          ))}
        </ol>
        <ul className="proc-rueda">
          {AREAS.slice(0, 5).map((a, i) => (
            <li key={a.id}>
              <span className="proc-rueda-area">{a.nombre}</span>
              <span className="proc-rueda-barras">
                <span className="proc-barra is-inicio" style={{ width: `${30 + i * 8}%` }} />
                <span className="proc-barra is-hoy" style={{ width: `${55 + i * 7}%` }} />
              </span>
              <span className="proc-rueda-valor">{6 + (i % 3)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="club-lock-caja">
        <span className="club-lock-icono"><Candado /></span>
        <h1>Mi proceso</h1>
        <p>
          Así acompañamos a quienes trabajan su proceso con nosotros: tu meta, tu camino por etapas,
          tus compromisos, tus sesiones con su acta y tu Rueda de la Vida antes y ahora.
        </p>
        <a href={CLARIDAD_WA_URL} target="_blank" rel="noopener noreferrer" className="club-btn">Agenda tu Sesión de Claridad</a>
        <small>
          {descuento
            ? `Como miembro de ${ECOS.brand} tienes ${ECOS.descuentoMiembroPct}% de descuento en cualquier programa.`
            : "Se abre con cualquier programa de Holman Global Group."}
        </small>
      </div>
    </div>
  );
}
