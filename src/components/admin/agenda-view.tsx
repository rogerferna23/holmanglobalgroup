import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  DIAS_SEMANA, ESTADO_CITA, ETAPA_CITA, diaLargo, horaCorta, nombreZona, useAgendaAdmin,
  type Ajustes, type Cita, type EstadoCita, type EtapaCita, type TipoId, type Tramo,
} from "@/lib/agenda";
import { SITE } from "@/lib/config";
import { AGENDAR, SESION } from "@/lib/routes";

const TABS = [
  { id: "citas", label: "Citas" },
  { id: "horario", label: "Mi horario" },
] as const;
type Tab = (typeof TABS)[number]["id"];
type Filtro = "proximas" | "pasadas" | "canceladas";

const TIPO_CORTO: Record<TipoId, string> = { claridad: "Claridad", sesion: "Coaching" };

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
                  <small>{diaLargo(c.inicio, zona)} · {horaCorta(c.inicio, zona)}</small>
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
        <dt>Sesión</dt><dd>{cita.tipo === "claridad" ? "Sesión de Claridad" : "Sesión de coaching"}</dd>
        <dt>Cuándo</dt>
        <dd>
          {diaLargo(cita.inicio, zona)} · {horaCorta(cita.inicio, zona)} ({nombreZona(zona)})
          {cita.zona_cliente && cita.zona_cliente !== zona && (
            <small> · para la persona: {horaCorta(cita.inicio, cita.zona_cliente)} en {nombreZona(cita.zona_cliente)}</small>
          )}
        </dd>
        <dt>Correo</dt><dd><a href={`mailto:${cita.email}`}>{cita.email}</a></dd>
        <dt>WhatsApp</dt><dd>{wa ? <a href={wa} target="_blank" rel="noopener">{cita.whatsapp}</a> : "—"}</dd>
        {cita.ref_code && (<><dt>La trajo</dt><dd>Código {cita.ref_code}</dd></>)}
        {cita.motivo && (<><dt>Quiere trabajar</dt><dd className="adm-agd-motivo">{cita.motivo}</dd></>)}
        <dt>Reservó</dt><dd>{new Date(cita.created_at).toLocaleString("es", { dateStyle: "medium", timeStyle: "short", timeZone: zona })}</dd>
      </dl>

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
    </div>
  );
}

function Enlaces() {
  const [copiado, setCopiado] = useState<string | null>(null);
  const enlaces = [
    { id: "claridad", label: "Sesión de Claridad (para todos)", url: `${SITE.url}${AGENDAR}` },
    { id: "sesion", label: "Sesión de coaching (clientes)", url: `${SITE.url}${SESION}` },
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

  const tramos = (d: string) => horario[d] ?? [];
  const ponerTramos = (d: string, t: Tramo[]) => setHorario((h) => {
    const n = { ...h };
    if (t.length) n[d] = t; else delete n[d];
    return n;
  });

  function validar(): string | null {
    for (const d of DIAS_SEMANA) {
      const ts = [...tramos(d.id)].sort((a, b) => a[0].localeCompare(b[0]));
      for (let i = 0; i < ts.length; i++) {
        if (ts[i][0] >= ts[i][1]) return `${d.nombre}: cada tramo debe terminar después de empezar.`;
        if (i > 0 && ts[i][0] < ts[i - 1][1]) return `${d.nombre}: hay tramos que se pisan.`;
      }
    }
    return null;
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const v = validar();
    if (v) { setMsg({ ok: false, t: v }); return; }
    const ordenado = Object.fromEntries(Object.entries(horario).map(([d, t]) => [d, [...t].sort((a, b) => a[0].localeCompare(b[0]))]));
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

        <div className="adm-agd-semana">
          {DIAS_SEMANA.map((d) => (
            <div key={d.id} className="adm-agd-dia">
              <strong>{d.nombre}</strong>
              <div className="adm-agd-tramos">
                {tramos(d.id).length === 0 && <span className="adm-agd-libre">No atiendo</span>}
                {tramos(d.id).map((t, i) => (
                  <span key={i} className="adm-agd-tramo">
                    <input type="time" step={900} value={t[0]} aria-label={`${d.nombre}: desde`}
                      onChange={(e) => ponerTramos(d.id, tramos(d.id).map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} />
                    <span>a</span>
                    <input type="time" step={900} value={t[1]} aria-label={`${d.nombre}: hasta`}
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
  const [msg, setMsg] = useState<string | null>(null);

  async function agregar(e: FormEvent) {
    e.preventDefault();
    const ini = aInstante(desde, diaEntero ? "00:00" : hDesde, zona);
    // Día entero: hasta la medianoche del último día.
    const fin = diaEntero
      ? new Date(Date.parse(aInstante(hasta, "00:00", zona)) + 86_400_000).toISOString()
      : aInstante(hasta, hHasta, zona);
    if (Date.parse(fin) <= Date.parse(ini)) { setMsg("El final debe ir después del inicio."); return; }
    const err = await agenda.agregarBloqueo({ desde: ini, hasta: fin, motivo: motivo.trim() || null });
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
        <div className="adm-field"><label htmlFor="blq-motivo">Motivo (solo lo ves tú)</label><input id="blq-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Viaje, evento, descanso…" /></div>
        <div className="adm-mail-acciones"><button type="submit" className="adm-add-btn">Bloquear</button></div>
        {msg && <p className="adm-ecos-error">{msg}</p>}
      </form>

      {agenda.bloqueos.length > 0 && (
        <ul className="adm-agd-bloqueos">
          {agenda.bloqueos.map((b) => (
            <li key={b.id}>
              <span>{fmt(b.desde)} → {fmt(b.hasta)}{b.motivo ? ` · ${b.motivo}` : ""}</span>
              <button type="button" className="adm-ecos-del" onClick={() => void agenda.borrarBloqueo(b.id)}>Quitar</button>
            </li>
          ))}
        </ul>
      )}
      <Enlaces />
    </div>
  );
}
