import { useMemo, useState, type FormEvent } from "react";
import {
  DIAS_SEMANA, ESTADO_CITA, ETAPA_CITA, diaLargo, horaCorta, nombreZona, ordenarSemana, useMiAgenda,
  useMiAnfitrion, validarSemana, zonaDelNavegador,
  type Cita, type EstadoCita, type EtapaCita, type MiAnfitrion, type Tramo,
} from "@/lib/agenda";
import { SITE } from "@/lib/config";
import { AGENDAR } from "@/lib/routes";

/**
 * «Mi agenda»: solo para quien da Sesiones de Claridad y no es Holman (hoy,
 * Zack). Sus citas con todo lo de la persona, cómo le fue y en qué etapa va,
 * su enlace de ventas y su horario. Cancelar o pasar una cita lo hace Holman
 * desde la Torre, porque le avisa a la persona.
 */
export default function MiAgenda() {
  const yo = useMiAnfitrion();
  if (!yo) {
    return (
      <div className="club-page">
        <p className="club-muted">Esta sección es para quien da las Sesiones de Claridad del equipo.</p>
      </div>
    );
  }
  return <Agenda yo={yo} />;
}

type Filtro = "proximas" | "pasadas";

function Agenda({ yo }: { yo: MiAnfitrion }) {
  const agenda = useMiAgenda();
  const [filtro, setFiltro] = useState<Filtro>("proximas");
  const zona = zonaDelNavegador();
  const ahora = Date.now();

  const visibles = useMemo(() => {
    const vivas = agenda.citas.filter((c) => c.estado !== "cancelada");
    const lista = vivas.filter((c) => (filtro === "proximas" ? Date.parse(c.fin) >= ahora : Date.parse(c.fin) < ahora));
    return filtro === "proximas" ? lista : [...lista].reverse();
  }, [agenda.citas, filtro, ahora]);

  const semana = agenda.citas.filter((c) => c.estado !== "cancelada" && Date.parse(c.inicio) >= ahora && Date.parse(c.inicio) < ahora + 7 * 86_400_000).length;
  const clientes = agenda.citas.filter((c) => c.etapa === "cliente").length;

  return (
    <div className="club-page mag">
      <header className="club-page-head">
        <p className="club-eyebrow">Ventas</p>
        <h1>Mi agenda</h1>
        <p className="club-page-sub">
          Tus Sesiones de Claridad. Cada reserva crea su Zoom en tu cuenta y te llega el aviso al correo.
          {!yo.activo && <> <strong>Ahora mismo no recibes citas nuevas:</strong> Holman te activa desde la Torre.</>}
        </p>
      </header>

      <div className="mag-resumen">
        <div><strong>{semana}</strong><span>en los próximos 7 días</span></div>
        <div><strong>{clientes}</strong><span>{clientes === 1 ? "cliente cerrado" : "clientes cerrados"}</span></div>
      </div>

      <MiEnlace yo={yo} />

      <section className="proc-bloque">
        <div className="club-list-head">
          <h3>Citas</h3>
          <div className="mag-filtros" role="tablist">
            <button type="button" role="tab" aria-selected={filtro === "proximas"} className={filtro === "proximas" ? "on" : ""} onClick={() => setFiltro("proximas")}>Próximas</button>
            <button type="button" role="tab" aria-selected={filtro === "pasadas"} className={filtro === "pasadas" ? "on" : ""} onClick={() => setFiltro("pasadas")}>Pasadas</button>
          </div>
        </div>
        {agenda.error && <p className="club-error">{agenda.error}</p>}
        {agenda.loading ? (
          <p className="club-muted">Cargando tus citas…</p>
        ) : visibles.length === 0 ? (
          <p className="club-muted">
            {filtro === "proximas" ? "Todavía no tienes sesiones por delante. Comparte tu enlace y aparecen aquí." : "Aún no hay sesiones pasadas."}
          </p>
        ) : (
          <ul className="mag-citas">
            {visibles.map((c) => <CitaItem key={c.id} cita={c} zona={zona} anotar={agenda.anotar} />)}
          </ul>
        )}
      </section>

      <MiHorario yo={yo} guardar={agenda.guardarHorario} />
    </div>
  );
}

function MiEnlace({ yo }: { yo: MiAnfitrion }) {
  const url = `${SITE.url}${AGENDAR}?con=${yo.id}`;
  const [copiado, setCopiado] = useState(false);
  return (
    <section className="proc-meta mag-enlace">
      <span className="proc-label">Tu enlace de ventas</span>
      <code>{url}</code>
      <p className="club-muted">
        Quien entra por aquí agenda directo contigo. Si te lo pasa un embajador, que le agregue su código al final:
        {" "}<code>&amp;ref=SU_CÓDIGO</code>, y la comisión queda a su nombre.
      </p>
      <button type="button" className="club-btn small" onClick={() => {
        navigator.clipboard?.writeText(url).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1800); }, () => {});
      }}>{copiado ? "Copiado" : "Copiar enlace"}</button>
    </section>
  );
}

function CitaItem({ cita, zona, anotar }: {
  cita: Cita; zona: string;
  anotar: (id: string, c: { estado: EstadoCita; etapa: EtapaCita; notas: string | null }) => Promise<string | null>;
}) {
  const [abierta, setAbierta] = useState(false);
  const [estado, setEstado] = useState<EstadoCita>(cita.estado);
  const [etapa, setEtapa] = useState<EtapaCita>(cita.etapa);
  const [notas, setNotas] = useState(cita.notas ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const wa = cita.whatsapp ? `https://wa.me/${cita.whatsapp.replace(/[^\d]/g, "")}` : null;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const err = await anotar(cita.id, { estado, etapa, notas: notas.trim() || null });
    setBusy(false);
    setMsg(err ? { ok: false, t: err } : { ok: true, t: "Guardado." });
  }

  return (
    <li className="mag-cita">
      <button type="button" className="mag-cita-head" aria-expanded={abierta} onClick={() => setAbierta((v) => !v)}>
        <span className="mag-cita-cuando">{diaLargo(cita.inicio, zona)} · {horaCorta(cita.inicio, zona)}</span>
        <strong>{cita.nombre}</strong>
        <span className={`mag-etapa is-${cita.etapa}`}>{ETAPA_CITA[cita.etapa]}</span>
      </button>
      {abierta && (
        <form className="mag-cita-cuerpo" onSubmit={guardar}>
          <dl>
            <dt>Correo</dt><dd>{cita.email}</dd>
            <dt>WhatsApp</dt><dd>{wa ? <a href={wa} target="_blank" rel="noopener">{cita.whatsapp}</a> : "—"}</dd>
            {cita.zona_cliente && cita.zona_cliente !== zona && (
              <><dt>Su hora</dt><dd>{horaCorta(cita.inicio, cita.zona_cliente)} en {nombreZona(cita.zona_cliente)}</dd></>
            )}
            {cita.ref_code && (<><dt>La trajo</dt><dd>Código {cita.ref_code}</dd></>)}
            {cita.motivo && (<><dt>Quiere trabajar</dt><dd>{cita.motivo}</dd></>)}
          </dl>
          {cita.zoom_url && <a className="club-btn small ghost" href={cita.zoom_url} target="_blank" rel="noopener">Abrir Zoom</a>}
          <div className="mag-campos">
            <label htmlFor={`mag-e-${cita.id}`}>¿Cómo fue?
              <select id={`mag-e-${cita.id}`} value={estado} onChange={(e) => setEstado(e.target.value as EstadoCita)}>
                {(["agendada", "asistio", "no_asistio"] as EstadoCita[]).map((s) => <option key={s} value={s}>{ESTADO_CITA[s]}</option>)}
              </select>
            </label>
            <label htmlFor={`mag-t-${cita.id}`}>Etapa
              <select id={`mag-t-${cita.id}`} value={etapa} onChange={(e) => setEtapa(e.target.value as EtapaCita)}>
                {(Object.keys(ETAPA_CITA) as EtapaCita[]).map((s) => <option key={s} value={s}>{ETAPA_CITA[s]}</option>)}
              </select>
            </label>
          </div>
          <label htmlFor={`mag-n-${cita.id}`} className="mag-notas">Notas
            <textarea id={`mag-n-${cita.id}`} rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Qué necesita, qué le propusiste, cuándo hacer seguimiento…" />
          </label>
          <div className="mag-acciones">
            <button type="submit" className="club-btn small" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
            {msg && <span className={msg.ok ? "mag-ok" : "club-error"}>{msg.t}</span>}
          </div>
          <p className="club-muted">¿Hay que cancelarla o moverla? Escríbele a Holman: él le avisa a la persona.</p>
        </form>
      )}
    </li>
  );
}

function MiHorario({ yo, guardar }: { yo: MiAnfitrion; guardar: (h: Record<string, Tramo[]>) => Promise<string | null> }) {
  const [horario, setHorario] = useState<Record<string, Tramo[]>>(yo.horario ?? {});
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const tramos = (d: string) => horario[d] ?? [];
  const poner = (d: string, t: Tramo[]) => setHorario((h) => {
    const n = { ...h };
    if (t.length) n[d] = t; else delete n[d];
    return n;
  });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const v = validarSemana(horario);
    if (v) { setMsg({ ok: false, t: v }); return; }
    setBusy(true); setMsg(null);
    const err = await guardar(ordenarSemana(horario));
    setBusy(false);
    setMsg(err ? { ok: false, t: err } : { ok: true, t: "Horario guardado. Ya es lo que la gente ve libre contigo." });
  }

  return (
    <form className="proc-bloque" onSubmit={enviar}>
      <div className="club-list-head"><h3>Mi horario</h3></div>
      <p className="club-muted">En hora de {nombreZona(yo.zona)}. Cada persona lo ve en la hora de su país. Cada Sesión de Claridad dura 30 minutos.</p>
      <div className="mag-semana">
        {DIAS_SEMANA.map((d) => (
          <div key={d.id} className="mag-dia">
            <strong>{d.nombre}</strong>
            <div className="mag-tramos">
              {tramos(d.id).length === 0 && <span className="club-muted">No atiendo</span>}
              {tramos(d.id).map((t, i) => (
                <span key={i} className="mag-tramo">
                  <input type="time" step={900} value={t[0]} aria-label={`${d.nombre}: desde`}
                    onChange={(e) => poner(d.id, tramos(d.id).map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} />
                  <span>a</span>
                  <input type="time" step={900} value={t[1]} aria-label={`${d.nombre}: hasta`}
                    onChange={(e) => poner(d.id, tramos(d.id).map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
                  <button type="button" aria-label="Quitar tramo" onClick={() => poner(d.id, tramos(d.id).filter((_, j) => j !== i))}>×</button>
                </span>
              ))}
              <button type="button" className="mag-mas"
                onClick={() => poner(d.id, [...tramos(d.id), tramos(d.id).length ? ["14:00", "18:00"] : ["09:00", "12:00"]])}>
                + tramo
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mag-acciones">
        <button type="submit" className="club-btn small" disabled={busy}>{busy ? "Guardando…" : "Guardar horario"}</button>
        {msg && <span className={msg.ok ? "mag-ok" : "club-error"}>{msg.t}</span>}
      </div>
    </form>
  );
}
