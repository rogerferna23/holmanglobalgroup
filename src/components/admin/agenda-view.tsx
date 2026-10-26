import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  DIAS_SEMANA, ESTADO_CITA, ETAPA_CITA, PLANES_DW, diaLargo, horaCorta, nombreZona, ordenarSemana, useAgendaAdmin, validarSemana,
  type Ajustes, type Anfitrion, type Cita, type PlanDW, type EstadoCita, type EtapaCita, type TipoId, type Tramo,
} from "@/lib/agenda";
import { SITE } from "@/lib/config";
import { AGENDAR, REUNION, SESION } from "@/lib/routes";

const TABS = [
  { id: "citas", label: "Citas" },
  { id: "horario", label: "Mi horario" },
  { id: "equipo", label: "Equipo" },
] as const;
type Tab = (typeof TABS)[number]["id"];
type Filtro = "proximas" | "pasadas" | "canceladas";

const TIPO_CORTO: Record<TipoId, string> = { claridad: "Claridad", sesion: "Coaching", reunion: "Reunión" };

/**
 * Torre → Agenda. La agenda propia que reemplaza a DelegaMeet: las citas que
 * llegan por /agendar y /sesion (con su estado, como un CRM pequeño) y el
 * horario semanal que la gente ve libre.
 */
export function AgendaView() {
  const agenda = useAgendaAdmin();
  const [tab, setTab] = useState<Tab>("citas");

  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <h1>Agenda</h1>
        <p>Las Sesiones de Claridad y de coaching que la gente reserva en tu sitio. Cada reserva crea su Zoom y le llega la confirmación al instante.</p>
      </header>

      <div className="adm-ecos-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`adm-ecos-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {agenda.error && <p className="adm-ecos-error">{agenda.error}</p>}
      {agenda.loading ? (
        <div className="adm-card adm-card-pad"><p className="adm-tx-empty">Cargando…</p></div>
      ) : tab === "citas" ? (
        <Citas agenda={agenda} />
      ) : tab === "equipo" && agenda.ajustes ? (
        <Equipo agenda={agenda} ajustes={agenda.ajustes} />
      ) : agenda.ajustes ? (
        <Horario agenda={agenda} ajustes={agenda.ajustes} />
      ) : (
        <div className="adm-card adm-card-pad"><p className="adm-tx-empty">Falta crear las tablas de la agenda (migración 20261023_hgg_agenda.sql).</p></div>
      )}
    </div>
  );
}

type Api = ReturnType<typeof useAgendaAdmin>;

// ---------------------------------------------------------------------------
// Citas
// ---------------------------------------------------------------------------

function Citas({ agenda }: { agenda: Api }) {
  const [filtro, setFiltro] = useState<Filtro>("proximas");
  const [sel, setSel] = useState<string | null>(null);
  const zona = agenda.ajustes?.zona ?? "America/Bogota";
  const ahora = Date.now();

  const visibles = useMemo(() => {
    const lista = agenda.citas.filter((c) =>
      filtro === "canceladas" ? c.estado === "cancelada"
        : c.estado !== "cancelada" && (filtro === "proximas" ? Date.parse(c.fin) >= ahora : Date.parse(c.fin) < ahora));
    return filtro === "proximas" ? lista : [...lista].reverse();
  }, [agenda.citas, filtro, ahora]);

  useEffect(() => {
    if (sel && !visibles.some((c) => c.id === sel)) setSel(null);
  }, [visibles, sel]);

  const cita = agenda.citas.find((c) => c.id === sel) ?? null;

  return (
    <div className="adm-cli">
      <aside className="adm-card adm-cli-lista">
        <div className="adm-card-head">
          <div className="adm-ecos-filtros">
            <button type="button" className={filtro === "proximas" ? "on" : ""} onClick={() => setFiltro("proximas")}>Próximas</button>
            <button type="button" className={filtro === "pasadas" ? "on" : ""} onClick={() => setFiltro("pasadas")}>Pasadas</button>
            <button type="button" className={filtro === "canceladas" ? "on" : ""} onClick={() => setFiltro("canceladas")}>Canceladas</button>
          </div>
        </div>
        {visibles.length === 0 ? (
          <p className="adm-tx-empty">
            {filtro === "proximas" ? "Todavía no hay sesiones por delante. Comparte tu enlace de /agendar." : "Nada por aquí."}
          </p>
        ) : (
          <ul>
            {visibles.map((c) => (
              <li key={c.id}>
                <button type="button" className={`adm-cli-item${c.id === sel ? " is-sel" : ""}`} onClick={() => setSel(c.id)}>
                  <strong>{c.nombre}</strong>
                  <small>
                    {diaLargo(c.inicio, zona)} · {horaCorta(c.inicio, zona)}
                    {agenda.anfitriones.length > 1 && ` · ${nombreAnfitrion(agenda.anfitriones, c.anfitrion)}`}
                  </small>
                  <span className={`adm-pill ${c.tipo === "claridad" ? "ok" : "off"}`}>{TIPO_CORTO[c.tipo]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className="adm-cli-detalle">
        {cita ? (
          <DetalleCita key={cita.id} cita={cita} zona={zona} agenda={agenda} />
        ) : (
          <div className="adm-card adm-card-pad">
            <p className="adm-tx-empty">Elige una cita para ver sus datos, su Zoom y anotar cómo va.</p>
            <Enlaces />
          </div>
        )}
      </div>
    </div>
  );
}

const nombreAnfitrion = (lista: Anfitrion[], id?: string) =>
  lista.find((x) => x.id === (id ?? "holman"))?.nombre ?? "Holman";

function DetalleCita({ cita, zona, agenda }: { cita: Cita; zona: string; agenda: Api }) {
  const [notas, setNotas] = useState(cita.notas ?? "");
  const [zoom, setZoom] = useState(cita.zoom_url ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const pasada = Date.parse(cita.fin) < Date.now();
  const wa = cita.whatsapp ? `https://wa.me/${cita.whatsapp.replace(/[^\d]/g, "")}` : null;

  async function hacer(clave: string, fn: () => Promise<string | null>, ok: string) {
    setBusy(clave); setMsg(null);
    const e = await fn();
    setBusy(null);
    setMsg(e ? { ok: false, t: e } : { ok: true, t: ok });
  }

  return (
    <div className="adm-card adm-card-pad adm-agd-detalle">
      <div className="adm-card-head">
        <div className="adm-card-titlerow">
          <h2 className="adm-card-title">{cita.nombre}</h2>
          <span className={`adm-pill ${cita.estado === "cancelada" ? "off" : "ok"}`}>{ESTADO_CITA[cita.estado]}</span>
        </div>
      </div>

      <dl className="adm-agd-datos">
        <dt>Sesión</dt><dd>{agenda.ajustes?.tipos[cita.tipo]?.nombre ?? TIPO_CORTO[cita.tipo]}</dd>
        <dt>Cuándo</dt>
        <dd>
          {diaLargo(cita.inicio, zona)} · {horaCorta(cita.inicio, zona)} ({nombreZona(zona)})
          {cita.zona_cliente && cita.zona_cliente !== zona && (
            <small> · para la persona: {horaCorta(cita.inicio, cita.zona_cliente)} en {nombreZona(cita.zona_cliente)}</small>
          )}
        </dd>
        {agenda.anfitriones.length > 1 && (<><dt>La da</dt><dd>{nombreAnfitrion(agenda.anfitriones, cita.anfitrion)}</dd></>)}
        <dt>Correo</dt><dd><a href={`mailto:${cita.email}`}>{cita.email}</a></dd>
        <dt>WhatsApp</dt><dd>{wa ? <a href={wa} target="_blank" rel="noopener">{cita.whatsapp}</a> : "—"}</dd>
        {cita.ref_code && (<><dt>La trajo</dt><dd>Código {cita.ref_code}</dd></>)}
        {cita.motivo && (<><dt>Quiere trabajar</dt><dd className="adm-agd-motivo">{cita.motivo}</dd></>)}
        <dt>Reservó</dt><dd>{new Date(cita.created_at).toLocaleString("es", { dateStyle: "medium", timeStyle: "short", timeZone: zona })}</dd>
      </dl>

      {agenda.anfitriones.length > 1 && cita.tipo === "claridad" && cita.estado === "agendada" && !pasada && (
        <div className="adm-field">
          <label htmlFor="agd-anf">¿Quién la da?</label>
          <select id="agd-anf" value={cita.anfitrion ?? "holman"} disabled={busy !== null}
            onChange={(e) => {
              const quien = e.target.value;
              void hacer("asignar", () => agenda.asignarCita(cita.id, quien),
                `Ahora la da ${nombreAnfitrion(agenda.anfitriones, quien)}. Le llegó el aviso y la persona recibió el Zoom nuevo si cambió.`);
            }}>
            {agenda.anfitriones.filter((x) => (x.activo && x.tipos.includes(cita.tipo)) || x.id === (cita.anfitrion ?? "holman")).map((x) => (
              <option key={x.id} value={x.id}>{x.nombre}</option>
            ))}
          </select>
          <small className="adm-card-sub">Sentido y Marca → Zack · DelegaWork → Holman. Al cambiarla se crea su Zoom y se le avisa a la persona.</small>
        </div>
      )}

      <div className="adm-form-row">
        <div className="adm-field">
          <label htmlFor="agd-estado">¿Cómo fue?</label>
          <select id="agd-estado" value={cita.estado} disabled={cita.estado === "cancelada"}
            onChange={(e) => hacer("estado", () => agenda.actualizarCita(cita.id, { estado: e.target.value as EstadoCita }), "Guardado.")}>
            {(["agendada", "asistio", "no_asistio"] as EstadoCita[]).map((s) => <option key={s} value={s}>{ESTADO_CITA[s]}</option>)}
            {cita.estado === "cancelada" && <option value="cancelada">Cancelada</option>}
          </select>
        </div>
        <div className="adm-field">
          <label htmlFor="agd-etapa">Etapa</label>
          <select id="agd-etapa" value={cita.etapa}
            onChange={(e) => hacer("etapa", () => agenda.actualizarCita(cita.id, { etapa: e.target.value as EtapaCita }), "Guardado.")}>
            {(Object.keys(ETAPA_CITA) as EtapaCita[]).map((s) => <option key={s} value={s}>{ETAPA_CITA[s]}</option>)}
          </select>
        </div>
      </div>

      <div className="adm-field">
        <label htmlFor="agd-notas">Notas</label>
        <textarea id="agd-notas" rows={4} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Lo que te dijo, qué le propusiste, cuándo hacer seguimiento…" />
      </div>

      <div className="adm-field">
        <label htmlFor="agd-zoom">Enlace de Zoom</label>
        <input id="agd-zoom" value={zoom} onChange={(e) => setZoom(e.target.value)} placeholder="https://zoom.us/j/…" />
      </div>

      <div className="adm-mail-acciones">
        <button type="button" className="adm-add-btn" disabled={busy !== null}
          onClick={() => hacer("guardar", () => agenda.actualizarCita(cita.id, { notas: notas.trim() || null, zoom_url: zoom.trim() || null }), "Notas guardadas.")}>
          {busy === "guardar" ? "Guardando…" : "Guardar"}
        </button>
        {zoom && <a className="adm-tx-toolbar-btn" href={zoom} target="_blank" rel="noopener">Abrir Zoom</a>}
        {!cita.zoom_url && cita.estado === "agendada" && !pasada && (
          <button type="button" className="adm-tx-toolbar-btn" disabled={busy !== null}
            onClick={() => hacer("zoom", () => agenda.reintentarZoom(cita.id), "Zoom creado.")}>
            {busy === "zoom" ? "Creando…" : "Crear Zoom"}
          </button>
        )}
        {cita.estado === "agendada" && !pasada && (
          confirmar ? (
            <>
              <button type="button" className="adm-tx-toolbar-btn" onClick={() => setConfirmar(false)} disabled={busy !== null}>Volver</button>
              <button type="button" className="adm-ecos-del" disabled={busy !== null}
                onClick={() => hacer("cancelar", () => agenda.cancelarCita(cita.id), "Cancelada. Le avisamos por correo para que elija otro horario.")}>
                {busy === "cancelar" ? "Cancelando…" : "Sí, cancelar y avisarle"}
              </button>
            </>
          ) : (
            <button type="button" className="adm-ecos-del" onClick={() => setConfirmar(true)}>Cancelar sesión</button>
          )
        )}
      </div>
      {msg && <p className={msg.ok ? "adm-mail-ok" : "adm-ecos-error"}>{msg.t}</p>}
      {cita.tipo === "claridad" && cita.estado !== "cancelada" && <DelegaWorkCita cita={cita} agenda={agenda} />}
    </div>
  );
}

/**
 * «Cerró DelegaWork»: DelegaWork se cobra fuera del sitio, así que Holman lo
 * marca aquí una vez y la comisión del embajador aparece sola cada mes hasta
 * que marque que el cliente canceló. Las ventas de la tienda no pasan por
 * aquí: esas causan sus comisiones solas al aprobarse.
 */
function DelegaWorkCita({ cita, agenda }: { cita: Cita; agenda: Api }) {
  const cliente = agenda.clientesDW.find((x) => x.cita_id === cita.id && !x.cancelado_en)
    ?? agenda.clientesDW.find((x) => x.cita_id === cita.id);
  const [plan, setPlan] = useState<PlanDW>("starter");
  const [busy, setBusy] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  async function hacer(fn: () => Promise<string | null>, ok: string) {
    setBusy(true); setMsg(null);
    const e = await fn();
    setBusy(false); setConfirmar(false);
    setMsg(e ? { ok: false, t: e } : { ok: true, t: ok });
  }

  const nombrePlan = (id: PlanDW) => PLANES_DW.find((p) => p.id === id)?.nombre ?? id;
  const quien = cita.ref_code ? `el embajador (código ${cita.ref_code})` : "su embajador";

  return (
    <div className="adm-agd-dw">
      <p className="adm-ecos-sub">DelegaWork</p>
      {cliente && !cliente.cancelado_en ? (
        <>
          <p className="adm-card-sub">
            Cliente de DelegaWork <strong>{nombrePlan(cliente.plan)}</strong> (${cliente.precio_usd.toLocaleString("en-US")}/mes) desde el {cliente.inicio}.
            {cliente.referrer ? ` Cada 1 de mes se crea la comisión para ${quien}.` : " Llegó sin embajador: no hay comisión que pagar."}
          </p>
          <div className="adm-mail-acciones">
            {confirmar ? (
              <>
                <button type="button" className="adm-tx-toolbar-btn" onClick={() => setConfirmar(false)} disabled={busy}>Volver</button>
                <button type="button" className="adm-ecos-del" disabled={busy}
                  onClick={() => void hacer(() => agenda.cancelarDelegaWork(cliente.id), "Listo: desde el mes que viene ya no se crea su comisión.")}>
                  {busy ? "Guardando…" : "Sí, dejó DelegaWork"}
                </button>
              </>
            ) : (
              <button type="button" className="adm-ecos-del" onClick={() => setConfirmar(true)}>Marcar que canceló</button>
            )}
          </div>
        </>
      ) : (
        <>
          {cliente?.cancelado_en && <p className="adm-card-sub">Fue cliente {nombrePlan(cliente.plan)} hasta el {cliente.cancelado_en}.</p>}
          <div className="adm-form-row">
            <div className="adm-field">
              <label htmlFor={`dw-plan-${cita.id}`}>¿Cerró DelegaWork? Plan</label>
              <select id={`dw-plan-${cita.id}`} value={plan} onChange={(e) => setPlan(e.target.value as PlanDW)}>
                {PLANES_DW.map((p) => <option key={p.id} value={p.id}>{p.nombre} · ${p.usd.toLocaleString("en-US")}/mes</option>)}
              </select>
            </div>
          </div>
          <small className="adm-card-sub">
            {cita.referrer
              ? `Al guardarlo, ${quien} ve su comisión de este mes en su panel, y la de cada mes siguiente aparece sola.`
              : "Llegó sin embajador: queda registrado como cliente, sin comisión."}
          </small>
          <div className="adm-mail-acciones">
            <button type="button" className="adm-add-btn" disabled={busy}
              onClick={() => void hacer(() => agenda.registrarDelegaWork(cita, plan), "Cliente de DelegaWork registrado.")}>
              {busy ? "Guardando…" : "Cerró DelegaWork"}
            </button>
          </div>
        </>
      )}
      {msg && <p className={msg.ok ? "adm-mail-ok" : "adm-ecos-error"}>{msg.t}</p>}
    </div>
  );
}

function Enlaces() {
  const [copiado, setCopiado] = useState<string | null>(null);
  const enlaces = [
    { id: "claridad", label: "Sesión de Claridad (para todos)", url: `${SITE.url}${AGENDAR}` },
    { id: "sesion", label: "Sesión de coaching (clientes)", url: `${SITE.url}${SESION}` },
    { id: "reunion", label: "Reunión con Holman (cualquier otra reunión)", url: `${SITE.url}${REUNION}` },
  ];
  return (
    <div className="adm-agd-enlaces">
      <p className="adm-ecos-sub">Tus enlaces para compartir</p>
      {enlaces.map((e) => (
        <div key={e.id} className="adm-agd-enlace">
          <span>{e.label}</span>
          <code>{e.url}</code>
          <button type="button" className="adm-tx-toolbar-btn" onClick={() => {
            void navigator.clipboard?.writeText(e.url);
            setCopiado(e.id);
            setTimeout(() => setCopiado(null), 1800);
          }}>{copiado === e.id ? "Copiado" : "Copiar"}</button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Horario
// ---------------------------------------------------------------------------

function Horario({ agenda, ajustes }: { agenda: Api; ajustes: Ajustes }) {
  const [horario, setHorario] = useState<Record<string, Tramo[]>>(ajustes.horario);
  const [tipos, setTipos] = useState(ajustes.tipos);
  const [aviso, setAviso] = useState(ajustes.aviso_horas);
  const [dias, setDias] = useState(ajustes.dias_adelante);
  const [correo, setCorreo] = useState(ajustes.correo_avisos);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const v = validarSemana(horario);
    if (v) { setMsg({ ok: false, t: v }); return; }
    const ordenado = ordenarSemana(horario);
    setBusy(true); setMsg(null);
    const err = await agenda.guardarAjustes({ horario: ordenado, tipos, aviso_horas: aviso, dias_adelante: dias, correo_avisos: correo.trim() });
    setBusy(false);
    setMsg(err ? { ok: false, t: err } : { ok: true, t: "Horario guardado. Ya es lo que la gente ve libre." });
  }

  return (
    <div className="adm-agd-horario">
      <form className="adm-card adm-card-pad adm-ecos-form" onSubmit={guardar}>
        <div className="adm-card-head">
          <div className="adm-card-titlerow"><h2 className="adm-card-title">Horario semanal</h2></div>
          <p className="adm-card-sub">En hora de {nombreZona(ajustes.zona)}. Cada persona lo ve convertido a la hora de su país.</p>
        </div>

        <Semana horario={horario} onChange={setHorario} />

        <p className="adm-ecos-sub">Sesiones</p>
        {(Object.keys(tipos) as TipoId[]).map((id) => (
          <div key={id} className="adm-form-row">
            <div className="adm-field">
              <label>{tipos[id].nombre}</label>
              <label className="adm-agd-check">
                <input type="checkbox" checked={tipos[id].activo} onChange={(e) => setTipos((t) => ({ ...t, [id]: { ...t[id], activo: e.target.checked } }))} />
                Se puede reservar
              </label>
            </div>
            <div className="adm-field">
              <label htmlFor={`dur-${id}`}>Dura (min)</label>
              <input id={`dur-${id}`} type="number" min={15} max={180} step={5} value={tipos[id].duracion}
                onChange={(e) => setTipos((t) => ({ ...t, [id]: { ...t[id], duracion: Number(e.target.value) } }))} />
            </div>
            <div className="adm-field">
              <label htmlFor={`blo-${id}`}>Aparta en tu agenda (min)</label>
              <input id={`blo-${id}`} type="number" min={15} max={240} step={15} value={tipos[id].bloque}
                onChange={(e) => setTipos((t) => ({ ...t, [id]: { ...t[id], bloque: Number(e.target.value) } }))} />
            </div>
          </div>
        ))}

        <div className="adm-form-row">
          <div className="adm-field">
            <label htmlFor="agd-aviso">Reservar con al menos (horas)</label>
            <input id="agd-aviso" type="number" min={0} max={168} value={aviso} onChange={(e) => setAviso(Number(e.target.value))} />
          </div>
          <div className="adm-field">
            <label htmlFor="agd-dias">Mostrar hasta (días adelante)</label>
            <input id="agd-dias" type="number" min={1} max={90} value={dias} onChange={(e) => setDias(Number(e.target.value))} />
          </div>
          <div className="adm-field">
            <label htmlFor="agd-correo">Aviso de cada reserva a</label>
            <input id="agd-correo" type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </div>
        </div>

        <div className="adm-mail-acciones">
          <button type="submit" className="adm-add-btn" disabled={busy}>{busy ? "Guardando…" : "Guardar horario"}</button>
        </div>
        {msg && <p className={msg.ok ? "adm-mail-ok" : "adm-ecos-error"}>{msg.t}</p>}
      </form>

      <Bloqueos agenda={agenda} zona={ajustes.zona} />
    </div>
  );
}

/** Los siete días con sus tramos: el horario de Holman y el de cada anfitrión. */
function Semana({ horario, onChange, prefijo = "" }: {
  horario: Record<string, Tramo[]>; onChange: (h: Record<string, Tramo[]>) => void; prefijo?: string;
}) {
  const tramos = (d: string) => horario[d] ?? [];
  const ponerTramos = (d: string, t: Tramo[]) => {
    const n = { ...horario };
    if (t.length) n[d] = t; else delete n[d];
    onChange(n);
  };
  return (
        <div className="adm-agd-semana">
          {DIAS_SEMANA.map((d) => (
            <div key={d.id} className="adm-agd-dia">
              <strong>{d.nombre}</strong>
              <div className="adm-agd-tramos">
                {tramos(d.id).length === 0 && <span className="adm-agd-libre">No atiendo</span>}
                {tramos(d.id).map((t, i) => (
                  <span key={i} className="adm-agd-tramo">
                    <input type="time" step={900} value={t[0]} aria-label={`${prefijo}${d.nombre}: desde`}
                      onChange={(e) => ponerTramos(d.id, tramos(d.id).map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} />
                    <span>a</span>
                    <input type="time" step={900} value={t[1]} aria-label={`${prefijo}${d.nombre}: hasta`}
                      onChange={(e) => ponerTramos(d.id, tramos(d.id).map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
                    <button type="button" className="adm-agd-quitar" aria-label="Quitar tramo"
                      onClick={() => ponerTramos(d.id, tramos(d.id).filter((_, j) => j !== i))}>×</button>
                  </span>
                ))}
                <button type="button" className="adm-agd-mas"
                  onClick={() => ponerTramos(d.id, [...tramos(d.id), tramos(d.id).length ? ["14:00", "18:00"] : ["09:00", "12:00"]])}>
                  + tramo
                </button>
              </div>
            </div>
          ))}
        </div>
  );
}

// ---------------------------------------------------------------------------
// Equipo: quién da la Sesión de Claridad
// ---------------------------------------------------------------------------

function Equipo({ agenda, ajustes }: { agenda: Api; ajustes: Ajustes }) {
  const [zoom, setZoom] = useState<Record<string, boolean> | null>(null);
  const { zoomEstado } = agenda;
  useEffect(() => { void zoomEstado().then(setZoom); }, [zoomEstado]);

  if (!agenda.anfitriones.length) {
    return (
      <div className="adm-card adm-card-pad">
        <p className="adm-tx-empty">Falta correr la migración del equipo (20261031_hgg_agenda_anfitriones.sql). Mientras tanto, todas las citas son tuyas.</p>
      </div>
    );
  }
  return (
    <div className="adm-agd-horario">
      <div className="adm-card adm-card-pad">
        <div className="adm-card-head">
          <div className="adm-card-titlerow"><h2 className="adm-card-title">Quién da la Sesión de Claridad</h2></div>
          <p className="adm-card-sub">
            La gente ve libre toda hora en la que al menos uno puede. La cita queda con el primero libre (por orden) y tú la pasas al otro desde la cita.
            Sentido y Marca los cierra Zack; DelegaWork, tú.
          </p>
        </div>
      </div>
      {agenda.anfitriones.map((x) => <FichaAnfitrion key={x.id} anf={x} agenda={agenda} ajustes={ajustes} zoom={zoom?.[x.id] ?? null} />)}
    </div>
  );
}

function FichaAnfitrion({ anf, agenda, ajustes, zoom }: { anf: Anfitrion; agenda: Api; ajustes: Ajustes; zoom: boolean | null }) {
  const esHolman = anf.id === "holman";
  const [f, setF] = useState(anf);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const poner = <K extends keyof Anfitrion>(k: K, v: Anfitrion[K]) => setF((x) => ({ ...x, [k]: v }));
  const tieneTipo = (t: TipoId) => f.tipos.includes(t);
  const ponerTipo = (t: TipoId, si: boolean) => poner("tipos", si ? [...new Set([...f.tipos, t])] : f.tipos.filter((x) => x !== t));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!esHolman && f.horario) {
      const v = validarSemana(f.horario);
      if (v) { setMsg({ ok: false, t: v }); return; }
    }
    if (f.activo && !f.tipos.length) { setMsg({ ok: false, t: "Marca al menos una sesión que atienda." }); return; }
    const fijo = f.zoom_fijo?.trim() || null;
    if (fijo && !/^https:\/\/([a-z0-9-]+\.)?zoom\.us\//i.test(fijo)) { setMsg({ ok: false, t: "La sala fija debe ser un enlace de zoom.us." }); return; }
    setBusy(true); setMsg(null);
    const err = await agenda.guardarAnfitrion(anf.id, {
      nombre: f.nombre.trim(), correo: f.correo.trim(), tipos: f.tipos, orden: f.orden, activo: f.activo,
      zoom_fijo: fijo,
      ...(esHolman ? {} : { horario: f.horario ? ordenarSemana(f.horario) : {} }),
    });
    setBusy(false);
    setMsg(err ? { ok: false, t: err } : { ok: true, t: f.activo ? "Guardado. Sus horas ya se ofrecen." : "Guardado. Está apagado: no se ofrecen sus horas." });
  }

  return (
    <form className="adm-card adm-card-pad adm-ecos-form" onSubmit={guardar}>
      <div className="adm-card-head">
        <div className="adm-card-titlerow">
          <h2 className="adm-card-title">{anf.nombre}</h2>
          <span className={`adm-pill ${anf.activo ? "ok" : "off"}`}>{anf.activo ? "Recibe citas" : "Apagado"}</span>
          {zoom !== null && <span className={`adm-pill ${zoom ? "ok" : "off"}`}>{zoom ? "Su Zoom conectado" : "Zoom sin conectar"}</span>}
        </div>
      </div>
      <div className="adm-form-row">
        <div className="adm-field"><label htmlFor={`anf-n-${anf.id}`}>Nombre</label><input id={`anf-n-${anf.id}`} value={f.nombre} required onChange={(e) => poner("nombre", e.target.value)} /></div>
        <div className="adm-field"><label htmlFor={`anf-c-${anf.id}`}>Le llega cada cita a</label><input id={`anf-c-${anf.id}`} type="email" required value={f.correo} onChange={(e) => poner("correo", e.target.value)} /></div>
        <div className="adm-field"><label htmlFor={`anf-o-${anf.id}`}>Orden (1 = primero)</label><input id={`anf-o-${anf.id}`} type="number" min={1} max={99} value={f.orden} onChange={(e) => poner("orden", Number(e.target.value))} /></div>
      </div>
      <div className="adm-form-row">
        <label className="adm-agd-check"><input type="checkbox" checked={f.activo} onChange={(e) => poner("activo", e.target.checked)} /> Recibe citas</label>
        <label className="adm-agd-check"><input type="checkbox" checked={tieneTipo("claridad")} onChange={(e) => ponerTipo("claridad", e.target.checked)} /> {ajustes.tipos.claridad?.nombre ?? "Claridad"}</label>
        <label className="adm-agd-check"><input type="checkbox" checked={tieneTipo("sesion")} onChange={(e) => ponerTipo("sesion", e.target.checked)} /> {ajustes.tipos.sesion?.nombre ?? "Coaching"}</label>
        {esHolman && ajustes.tipos.reunion && (
          <label className="adm-agd-check"><input type="checkbox" checked={tieneTipo("reunion")} onChange={(e) => ponerTipo("reunion", e.target.checked)} /> {ajustes.tipos.reunion.nombre}</label>
        )}
      </div>
      {!esHolman && (
        <>
          <p className="adm-ecos-sub">Su Zoom</p>
          <small className="adm-card-sub">
            Cada reunión suya se crea en su propia cuenta de Zoom, así sus citas no dependen de la tuya.
            {zoom === false && ` Para conectarla, ${anf.nombre} crea en marketplace.zoom.us una app «Server-to-Server OAuth» y se cargan sus tres datos como secrets de la función agenda: ZOOM_${anf.id.toUpperCase()}_ACCOUNT_ID, ZOOM_${anf.id.toUpperCase()}_CLIENT_ID y ZOOM_${anf.id.toUpperCase()}_CLIENT_SECRET.`}
          </small>
          <div className="adm-field">
            <label htmlFor={`anf-zf-${anf.id}`}>Mientras tanto, su sala personal (opcional)</label>
            <input id={`anf-zf-${anf.id}`} value={f.zoom_fijo ?? ""} placeholder="https://zoom.us/j/…" onChange={(e) => poner("zoom_fijo", e.target.value)} />
          </div>
          <p className="adm-ecos-sub">Su horario (hora de {nombreZona(ajustes.zona)})</p>
          <Semana horario={f.horario ?? {}} onChange={(h) => poner("horario", h)} prefijo={`${anf.nombre}, `} />
        </>
      )}
      {esHolman && <small className="adm-card-sub">Tu horario se edita en «Mi horario».</small>}
      <div className="adm-mail-acciones">
        <button type="submit" className="adm-add-btn" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
      </div>
      {msg && <p className={msg.ok ? "adm-mail-ok" : "adm-ecos-error"}>{msg.t}</p>}
    </form>
  );
}

/** «2026-10-20» + «09:00» en la zona de Holman → ISO. */
function aInstante(fecha: string, hhmm: string, tz: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const pared = Date.UTC(y, m - 1, d, h, mi);
  const desfase = (ms: number) => {
    const p = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).formatToParts(new Date(ms));
    const v = (t: string) => Number(p.find((x) => x.type === t)?.value);
    return Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute")) - ms;
  };
  let ms = pared - desfase(pared);
  ms = pared - desfase(ms);
  return new Date(ms).toISOString();
}

function Bloqueos({ agenda, zona }: { agenda: Api; zona: string }) {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: zona });
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [diaEntero, setDiaEntero] = useState(true);
  const [hDesde, setHDesde] = useState("09:00");
  const [hHasta, setHHasta] = useState("12:00");
  const [motivo, setMotivo] = useState("");
  const [para, setPara] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function agregar(e: FormEvent) {
    e.preventDefault();
    const ini = aInstante(desde, diaEntero ? "00:00" : hDesde, zona);
    // Día entero: hasta la medianoche del último día.
    const fin = diaEntero
      ? new Date(Date.parse(aInstante(hasta, "00:00", zona)) + 86_400_000).toISOString()
      : aInstante(hasta, hHasta, zona);
    if (Date.parse(fin) <= Date.parse(ini)) { setMsg("El final debe ir después del inicio."); return; }
    const err = await agenda.agregarBloqueo({
      desde: ini, hasta: fin, motivo: motivo.trim() || null,
      ...(agenda.anfitriones.length > 1 ? { anfitrion: para || null } : {}),
    });
    setMsg(err);
    if (!err) setMotivo("");
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString("es", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: zona });

  return (
    <div className="adm-card adm-card-pad">
      <div className="adm-card-head">
        <div className="adm-card-titlerow"><h2 className="adm-card-title">Días bloqueados</h2></div>
        <p className="adm-card-sub">Vacaciones, un viaje o una tarde con otra cosa: esas horas no se ofrecen.</p>
      </div>
      <form className="adm-ecos-form" onSubmit={agregar}>
        <div className="adm-form-row">
          <div className="adm-field"><label htmlFor="blq-desde">Desde</label><input id="blq-desde" type="date" value={desde} onChange={(e) => { setDesde(e.target.value); if (e.target.value > hasta) setHasta(e.target.value); }} /></div>
          <div className="adm-field"><label htmlFor="blq-hasta">Hasta</label><input id="blq-hasta" type="date" min={desde} value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
        </div>
        <label className="adm-agd-check">
          <input type="checkbox" checked={diaEntero} onChange={(e) => setDiaEntero(e.target.checked)} /> Días completos
        </label>
        {!diaEntero && (
          <div className="adm-form-row">
            <div className="adm-field"><label htmlFor="blq-hd">Desde la hora</label><input id="blq-hd" type="time" step={900} value={hDesde} onChange={(e) => setHDesde(e.target.value)} /></div>
            <div className="adm-field"><label htmlFor="blq-hh">Hasta la hora</label><input id="blq-hh" type="time" step={900} value={hHasta} onChange={(e) => setHHasta(e.target.value)} /></div>
          </div>
        )}
        {agenda.anfitriones.length > 1 && (
          <div className="adm-field">
            <label htmlFor="blq-para">¿A quién?</label>
            <select id="blq-para" value={para} onChange={(e) => setPara(e.target.value)}>
              <option value="">A todo el equipo</option>
              {agenda.anfitriones.map((x) => <option key={x.id} value={x.id}>Solo a {x.nombre}</option>)}
            </select>
          </div>
        )}
        <div className="adm-field"><label htmlFor="blq-motivo">Motivo (solo lo ves tú)</label><input id="blq-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Viaje, evento, descanso…" /></div>
        <div className="adm-mail-acciones"><button type="submit" className="adm-add-btn">Bloquear</button></div>
        {msg && <p className="adm-ecos-error">{msg}</p>}
      </form>

      {agenda.bloqueos.length > 0 && (
        <ul className="adm-agd-bloqueos">
          {agenda.bloqueos.map((b) => (
            <li key={b.id}>
              <span>
                {fmt(b.desde)} → {fmt(b.hasta)}{b.motivo ? ` · ${b.motivo}` : ""}
                {agenda.anfitriones.length > 1 && ` · ${b.anfitrion ? nombreAnfitrion(agenda.anfitriones, b.anfitrion) : "todos"}`}
              </span>
              <button type="button" className="adm-ecos-del" onClick={() => void agenda.borrarBloqueo(b.id)}>Quitar</button>
            </li>
          ))}
        </ul>
      )}
      <Enlaces />
    </div>
  );
}
