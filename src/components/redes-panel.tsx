import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { fechaCorta } from "@/lib/proceso";
import {
  ESTADOS_PIEZA, REDES, TIPOS_PIEZA, labelEstado, labelRed, labelTipo, mesLargo, num, useRedes,
  type EstadoPieza, type NumerosMes,
} from "@/lib/redes-cliente";

const hoy = () => new Date().toISOString().slice(0, 10);

/**
 * Las redes de un cliente: notas de avance, publicaciones y números del mes.
 * Lo mismo en tres lugares:
 *   · «equipo»  → Sol en su panel: anota y edita.
 *   · «admin»   → Holman en la Torre: igual que Sol.
 *   · «cliente» → el cliente en «Mi proceso»: lee y aprueba piezas.
 */
export function RedesPanel({ programaId, modo, autor, encabezado }: {
  programaId: string; modo: "equipo" | "admin" | "cliente"; autor?: string;
  /** Título que se pinta arriba (el cliente lo usa); no se pinta si no hay nada que mostrar. */
  encabezado?: ReactNode;
}) {
  const redes = useRedes(useMemo(() => [programaId], [programaId]));
  const edita = modo !== "cliente";
  const [aviso, setAviso] = useState<string | null>(null);
  const avisar = (e: string | null) => setAviso(e);

  if (redes.loading) return modo === "cliente" ? null : <p className="rp-muted">Cargando redes…</p>;

  const vacio = !redes.publicaciones.length && !redes.numeros.length && !redes.notas.length;
  // El cliente sin nadie del equipo en sus redes no ve la sección.
  if (modo === "cliente" && vacio && !redes.equipo.length) return null;

  return (
    <div className="rp">
      {encabezado}
      {aviso && <p className="rp-error" role="alert">{aviso}</p>}
      {modo === "cliente" && redes.equipo.length > 0 && (
        <p className="rp-muted">Lleva tus redes: {redes.equipo.map((m) => m.nombre).join(" y ")}.</p>
      )}
      {vacio && !edita && <p className="rp-muted">Aquí vas a ver lo que se publica en tus redes, las piezas para aprobar y cómo crecen tus números cada mes.</p>}

      <Notas redes={redes} edita={edita} autor={autor} programaId={programaId} avisar={avisar} />
      <Publicaciones redes={redes} modo={modo} autor={autor} programaId={programaId} avisar={avisar} />
      <Numeros redes={redes} edita={edita} autor={autor} programaId={programaId} avisar={avisar} />
    </div>
  );
}

type Redes = ReturnType<typeof useRedes>;
type Props = { redes: Redes; programaId: string; autor?: string; avisar: (e: string | null) => void };

// --- Notas de avance -----------------------------------------------------------

function Notas({ redes, edita, programaId, autor, avisar }: Props & { edita: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [necesita, setNecesita] = useState("");
  const [verTodas, setVerTodas] = useState(false);
  const notas = verTodas ? redes.notas : redes.notas.slice(0, 3);
  if (!edita && !redes.notas.length) return null;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    const err = await redes.escribir("notas", { insertar: { programa_id: programaId, fecha: hoy(), texto: texto.trim(), necesita: necesita.trim() || null, autor: autor ?? null } });
    avisar(err);
    if (!err) { setTexto(""); setNecesita(""); setAbierto(false); }
  }

  return (
    <section className="rp-bloque">
      <div className="rp-head">
        <h3>Avance</h3>
        {edita && !abierto && <button type="button" className="rp-btn" onClick={() => setAbierto(true)}>+ Anotar avance</button>}
      </div>
      {abierto && (
        <form className="rp-form" onSubmit={guardar}>
          <label>Qué hiciste<textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Esta semana: 3 reels publicados, calendario de diciembre listo…" required /></label>
          <label>Qué necesitas del cliente (opcional)<input value={necesita} onChange={(e) => setNecesita(e.target.value)} placeholder="Fotos del consultorio, aprobar el carrusel…" /></label>
          <div className="rp-form-acciones">
            <button type="submit" className="rp-btn rp-btn-oro">Guardar avance</button>
            <button type="button" className="rp-btn" onClick={() => setAbierto(false)}>Cancelar</button>
          </div>
        </form>
      )}
      {redes.notas.length === 0 ? (
        <p className="rp-muted">Todavía no hay avances anotados.</p>
      ) : (
        <ul className="rp-notas">
          {notas.map((n) => (
            <li key={n.id}>
              <span className="rp-fecha">{fechaCorta(n.fecha)}{n.autor ? ` · ${n.autor}` : ""}</span>
              <p>{n.texto}</p>
              {n.necesita && <p className="rp-necesita"><strong>Se necesita:</strong> {n.necesita}</p>}
              {edita && <button type="button" className="rp-link" onClick={async () => avisar(await redes.escribir("notas", { borrar: n.id }))}>Borrar</button>}
            </li>
          ))}
        </ul>
      )}
      {redes.notas.length > 3 && (
        <button type="button" className="rp-link" onClick={() => setVerTodas((v) => !v)}>{verTodas ? "Ver menos" : `Ver todos (${redes.notas.length})`}</button>
      )}
    </section>
  );
}

// --- Publicaciones -------------------------------------------------------------

function Publicaciones({ redes, modo, programaId, autor, avisar }: Props & { modo: "equipo" | "admin" | "cliente" }) {
  const edita = modo !== "cliente";
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState<EstadoPieza | "todas">("todas");
  const [f, setF] = useState({ fecha: hoy(), red: "instagram", tipo: "reel", titulo: "", enlace: "", estado: "diseno" as EstadoPieza });
  if (!edita && !redes.publicaciones.length) return null;

  const cuenta = (e: EstadoPieza) => redes.publicaciones.filter((p) => p.estado === e).length;
  const lista = redes.publicaciones.filter((p) => filtro === "todas" || p.estado === filtro);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!f.titulo.trim()) return;
    const err = await redes.escribir("publicaciones", {
      insertar: { programa_id: programaId, fecha: f.fecha, red: f.red, tipo: f.tipo, titulo: f.titulo.trim(), enlace: f.enlace.trim() || null, estado: f.estado, autor: autor ?? null },
    });
    avisar(err);
    if (!err) { setF({ ...f, titulo: "", enlace: "" }); setAbierto(false); }
  }

  return (
    <section className="rp-bloque">
      <div className="rp-head">
        <h3>Publicaciones</h3>
        {edita && !abierto && <button type="button" className="rp-btn" onClick={() => setAbierto(true)}>+ Agregar pieza</button>}
      </div>
      {abierto && (
        <form className="rp-form rp-form-grid" onSubmit={guardar}>
          <label className="rp-span2">Qué es<input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Reel: 3 errores al empezar tu marca" required /></label>
          <label>Fecha<input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></label>
          <label>Red<select value={f.red} onChange={(e) => setF({ ...f, red: e.target.value })}>{REDES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
          <label>Tipo<select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>{TIPOS_PIEZA.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
          <label>Estado<select value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value as EstadoPieza })}>{ESTADOS_PIEZA.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
          <label className="rp-span2">Enlace (opcional: Canva, Drive o la publicación)<input type="url" value={f.enlace} onChange={(e) => setF({ ...f, enlace: e.target.value })} placeholder="https://…" /></label>
          <div className="rp-form-acciones rp-span2">
            <button type="submit" className="rp-btn rp-btn-oro">Guardar pieza</button>
            <button type="button" className="rp-btn" onClick={() => setAbierto(false)}>Cancelar</button>
          </div>
        </form>
      )}
      {redes.publicaciones.length > 0 && (
        <div className="rp-chips" role="group" aria-label="Filtrar por estado">
          <button type="button" className={`rp-chip${filtro === "todas" ? " is-on" : ""}`} onClick={() => setFiltro("todas")}>Todas ({redes.publicaciones.length})</button>
          {ESTADOS_PIEZA.map((s) => cuenta(s.id) > 0 && (
            <button key={s.id} type="button" className={`rp-chip${filtro === s.id ? " is-on" : ""}`} onClick={() => setFiltro(s.id)}>{s.label} ({cuenta(s.id)})</button>
          ))}
        </div>
      )}
      {redes.publicaciones.length === 0 ? (
        <p className="rp-muted">Todavía no hay piezas. Agrega la primera con su estado: en diseño, para aprobar, aprobada o publicada.</p>
      ) : (
        <ul className="rp-piezas">
          {lista.map((p) => (
            <li key={p.id} className="rp-pieza">
              <div className="rp-pieza-info">
                <span className="rp-fecha">{fechaCorta(p.fecha)} · {labelRed(p.red)} · {labelTipo(p.tipo)}</span>
                <strong>{p.titulo}</strong>
                {p.enlace && <a href={p.enlace} target="_blank" rel="noopener noreferrer" className="rp-link">Ver pieza</a>}
              </div>
              <div className="rp-pieza-estado">
                {edita ? (
                  <select aria-label="Estado" className={`rp-estado is-${p.estado}`} value={p.estado}
                    onChange={async (e) => avisar(await redes.escribir("publicaciones", { actualizar: { id: p.id, cambios: { estado: e.target.value as EstadoPieza } } }))}>
                    {ESTADOS_PIEZA.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                ) : (
                  <span className={`rp-estado is-${p.estado}`}>{labelEstado(p.estado)}</span>
                )}
                {modo === "cliente" && p.estado === "aprobar" && (
                  <button type="button" className="rp-btn rp-btn-oro" onClick={async () => avisar(await redes.aprobar(p.id))}>Aprobar</button>
                )}
                {edita && <button type="button" className="rp-link" onClick={async () => avisar(await redes.escribir("publicaciones", { borrar: p.id }))}>Borrar</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// --- Números del mes -----------------------------------------------------------

function Numeros({ redes, edita, programaId, autor, avisar }: Props & { edita: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [f, setF] = useState({ mes: hoy().slice(0, 7), red: "instagram", seguidores: "", alcance: "", mensajes: "" });
  // Por red: el último mes y el anterior, para mostrar cuánto creció.
  const porRed = useMemo(() => {
    const m = new Map<string, NumerosMes[]>();
    for (const n of [...redes.numeros].sort((a, b) => b.mes.localeCompare(a.mes))) {
      m.set(n.red, [...(m.get(n.red) ?? []), n]);
    }
    return [...m.entries()];
  }, [redes.numeros]);
  if (!edita && !redes.numeros.length) return null;

  const entero = (s: string) => (s.trim() === "" ? null : Math.max(0, Math.round(Number(s))));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const err = await redes.escribir("numeros", {
      insertar: { programa_id: programaId, mes: `${f.mes}-01`, red: f.red, seguidores: entero(f.seguidores), alcance: entero(f.alcance), mensajes: entero(f.mensajes), autor: autor ?? null },
    });
    avisar(err);
    if (!err) { setF({ ...f, seguidores: "", alcance: "", mensajes: "" }); setAbierto(false); }
  }

  return (
    <section className="rp-bloque">
      <div className="rp-head">
        <h3>Números del mes</h3>
        {edita && !abierto && <button type="button" className="rp-btn" onClick={() => setAbierto(true)}>+ Anotar números</button>}
      </div>
      {abierto && (
        <form className="rp-form rp-form-grid" onSubmit={guardar}>
          <label>Mes<input type="month" value={f.mes} onChange={(e) => setF({ ...f, mes: e.target.value })} required /></label>
          <label>Red<select value={f.red} onChange={(e) => setF({ ...f, red: e.target.value })}>{REDES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
          <label>Seguidores<input type="number" min={0} inputMode="numeric" value={f.seguidores} onChange={(e) => setF({ ...f, seguidores: e.target.value })} /></label>
          <label>Alcance del mes<input type="number" min={0} inputMode="numeric" value={f.alcance} onChange={(e) => setF({ ...f, alcance: e.target.value })} /></label>
          <label>Mensajes recibidos<input type="number" min={0} inputMode="numeric" value={f.mensajes} onChange={(e) => setF({ ...f, mensajes: e.target.value })} /></label>
          <p className="rp-muted rp-span2">Si ya hay números de ese mes y esa red, se reemplazan.</p>
          <div className="rp-form-acciones rp-span2">
            <button type="submit" className="rp-btn rp-btn-oro">Guardar números</button>
            <button type="button" className="rp-btn" onClick={() => setAbierto(false)}>Cancelar</button>
          </div>
        </form>
      )}
      {porRed.length === 0 ? (
        <p className="rp-muted">Una vez al mes: seguidores, alcance y mensajes de cada red, para ver cómo crece.</p>
      ) : (
        <div className="rp-numeros">
          {porRed.map(([red, meses]) => {
            const [ult, ant] = meses;
            return (
              <div key={red} className="rp-num-card">
                <span className="rp-fecha">{labelRed(red)} · {mesLargo(ult.mes)}</span>
                <dl>
                  <Dato label="Seguidores" v={ult.seguidores} antes={ant?.seguidores} />
                  <Dato label="Alcance" v={ult.alcance} antes={ant?.alcance} />
                  <Dato label="Mensajes" v={ult.mensajes} antes={ant?.mensajes} />
                </dl>
                {meses.length > 1 && (
                  <details className="rp-historial">
                    <summary>Meses anteriores</summary>
                    <ul>
                      {meses.slice(1).map((m) => (
                        <li key={m.id}>{mesLargo(m.mes)}: {num(m.seguidores)} seguidores · {num(m.alcance)} de alcance · {num(m.mensajes)} mensajes</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Dato({ label, v, antes }: { label: string; v: number | null; antes?: number | null }) {
  const d = v != null && antes != null ? v - antes : null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {num(v)}
        {d != null && d !== 0 && <span className={`rp-delta ${d > 0 ? "is-up" : "is-down"}`}>{d > 0 ? "+" : ""}{num(d)}</span>}
      </dd>
    </div>
  );
}
