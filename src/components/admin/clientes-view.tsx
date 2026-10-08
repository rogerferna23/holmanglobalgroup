import { useMemo, useState, type FormEvent } from "react";
import { CLUB } from "@/lib/routes";
import {
  AREAS, ESTADO_LABEL, PRODUCTOS_PROGRAMA, fechaCorta, newId, promedioRueda, useProcesosAdmin,
  type Compromiso, type EstadoPrograma, type Medicion, type Programa, type SesionPrograma,
} from "@/lib/proceso";
import type { AreaId } from "@/lib/test-heridas";

const hoy = () => new Date().toISOString().slice(0, 10);
const enDias = (iso: string, dias: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

/**
 * Torre → Clientes. Holman abre el programa de cada cliente y, después de cada
 * sesión, deja aquí el acta, los compromisos y la medición. El cliente lo ve
 * en «Mi proceso» dentro del club, que queda incluido mientras dure su programa.
 */
export function ClientesView() {
  const admin = useProcesosAdmin();
  const [sel, setSel] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const programa = admin.programas.find((p) => p.id === sel) ?? null;

  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <h1>Clientes</h1>
        <p>El proceso de cada cliente: su meta, sus sesiones con el acta, sus compromisos y su Rueda de la Vida. Lo ven en «Mi proceso», dentro del club.</p>
      </header>
      {admin.error && <p className="adm-ecos-error">{admin.error}</p>}

      <div className="adm-cli">
        <aside className="adm-card adm-cli-lista">
          <div className="adm-card-head">
            <div className="adm-card-titlerow"><h2 className="adm-card-title">Programas</h2></div>
            <button type="button" className="adm-add-btn" onClick={() => { setCreando(true); setSel(null); }}>+ Nuevo</button>
          </div>
          {admin.loading ? <p className="adm-tx-empty">Cargando…</p> : admin.programas.length === 0 ? (
            <p className="adm-tx-empty">Todavía no hay programas. Abre el primero con «+ Nuevo».</p>
          ) : (
            <ul>
              {admin.programas.map((p) => (
                <li key={p.id}>
                  <button type="button" className={`adm-cli-item${p.id === sel ? " is-sel" : ""}`} onClick={() => { setSel(p.id); setCreando(false); }}>
                    <strong>{p.nombre}</strong>
                    <small>{p.titulo}</small>
                    <span className={`adm-pill ${p.estado === "activo" ? "ok" : "off"}`}>{ESTADO_LABEL[p.estado]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="adm-cli-detalle">
          {creando ? (
            <NuevoPrograma alCrear={(id) => { setCreando(false); setSel(id); }} escribir={admin.escribir} />
          ) : programa ? (
            <Detalle
              key={programa.id}
              programa={programa}
              sesiones={admin.sesiones.filter((s) => s.programa_id === programa.id)}
              compromisos={admin.compromisos.filter((c) => c.programa_id === programa.id)}
              mediciones={admin.mediciones.filter((m) => m.programa_id === programa.id)}
              escribir={admin.escribir}
              subirActa={admin.subirActa}
            />
          ) : (
            <div className="adm-card adm-card-pad"><p className="adm-tx-empty">Elige un cliente de la lista o abre un programa nuevo.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

type Escribir = ReturnType<typeof useProcesosAdmin>["escribir"];

function NuevoPrograma({ alCrear, escribir }: { alCrear: (id: string) => void; escribir: Escribir }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [producto, setProducto] = useState(PRODUCTOS_PROGRAMA[2].id);
  const [inicio, setInicio] = useState(hoy());
  const [meta, setMeta] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function crear(e: FormEvent) {
    e.preventDefault();
    const prod = PRODUCTOS_PROGRAMA.find((p) => p.id === producto)!;
    const fila: Programa = {
      id: newId("prog"), user_id: null, email: email.trim().toLowerCase(), nombre: nombre.trim(),
      producto, titulo: prod.titulo, etapas: prod.etapas, etapa_actual: 0,
      meta: meta.trim() || null, meta_fecha: enDias(inicio, 90), sesiones_total: prod.sesiones,
      inicio, estado: "activo", pausado_at: null, terminado_at: null, created_at: new Date().toISOString(),
    };
    setBusy(true); setMsg(null);
    // user_id lo llena la base si ya existe una cuenta con ese correo.
    const { user_id: _u, pausado_at: _p, terminado_at: _t, created_at: _c, ...insertar } = fila;
    const err = await escribir("programas", "hgg_programas", { insertar: insertar as Programa });
    setBusy(false);
    if (err) { setMsg(err); return; }
    alCrear(fila.id);
  }

  return (
    <div className="adm-card adm-card-pad">
      <div className="adm-card-head"><div className="adm-card-titlerow"><h2 className="adm-card-title">Nuevo programa</h2></div></div>
      <form className="adm-ecos-form" onSubmit={crear}>
        <div className="adm-form-row">
          <div className="adm-field"><label htmlFor="c-nombre">Nombre</label><input id="c-nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
          <div className="adm-field"><label htmlFor="c-email">Correo (el de su cuenta)</label><input id="c-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        </div>
        <div className="adm-form-row">
          <div className="adm-field"><label htmlFor="c-prod">Programa</label><select id="c-prod" value={producto} onChange={(e) => setProducto(e.target.value)}>{PRODUCTOS_PROGRAMA.map((p) => <option key={p.id} value={p.id}>{p.titulo}{p.sesiones ? ` · ${p.sesiones} sesiones` : ""}</option>)}</select></div>
          <div className="adm-field"><label htmlFor="c-inicio">Inicio</label><input id="c-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
        </div>
        <div className="adm-field"><label htmlFor="c-meta">Meta a 90 días (opcional; se puede poner después de la primera sesión)</label><textarea id="c-meta" rows={2} value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="Ej.: lanzar mi oferta y tener mis primeros 3 clientes" /></div>
        {msg && <p className="adm-ecos-error">{msg}</p>}
        <button type="submit" className="adm-add-btn" disabled={busy}>{busy ? "Abriendo…" : "Abrir programa"}</button>
      </form>
      <p className="adm-ecos-note">
        Al abrirlo, el cliente tiene el club incluido. Si todavía no tiene cuenta, mándale el enlace{" "}
        <code className="adm-ecos-code">holmanglobalgroup.com{CLUB.entrar}</code> para que la cree con este mismo correo: su programa aparece solo.
      </p>
    </div>
  );
}

function Detalle({ programa: p, sesiones, compromisos, mediciones, escribir, subirActa }: {
  programa: Programa; sesiones: SesionPrograma[]; compromisos: Compromiso[]; mediciones: Medicion[];
  escribir: Escribir; subirActa: ReturnType<typeof useProcesosAdmin>["subirActa"];
}) {
  return (
    <div className="adm-cli-bloques">
      <Ficha programa={p} escribir={escribir} />
      <NuevaSesion programa={p} numero={sesiones.length + 1} escribir={escribir} subirActa={subirActa} />
      <ListaCompromisos compromisos={compromisos} escribir={escribir} />
      <NuevaMedicion programa={p} mediciones={mediciones} escribir={escribir} />
      <ListaSesiones sesiones={sesiones} escribir={escribir} />
    </div>
  );
}

function Ficha({ programa: p, escribir }: { programa: Programa; escribir: Escribir }) {
  const [meta, setMeta] = useState(p.meta ?? "");
  const [metaFecha, setMetaFecha] = useState(p.meta_fecha ?? "");
  const [etapa, setEtapa] = useState(p.etapa_actual);
  const [estado, setEstado] = useState<EstadoPrograma>(p.estado);
  const [msg, setMsg] = useState<string | null>(null);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const err = await escribir("programas", "hgg_programas", {
      actualizar: { id: p.id, cambios: { meta: meta.trim() || null, meta_fecha: metaFecha || null, etapa_actual: etapa, estado } },
    });
    setMsg(err ?? "Guardado.");
  }

  return (
    <div className="adm-card adm-card-pad">
      <div className="adm-card-head">
        <div className="adm-card-titlerow"><h2 className="adm-card-title">{p.nombre}</h2></div>
        <span className="adm-card-sub">{p.titulo} · desde el {fechaCorta(p.inicio)}</span>
      </div>
      <p className="adm-ecos-sub">
        {p.email} · {p.user_id ? "con cuenta: ya lo ve en su panel" : "sin cuenta todavía: que la cree con este correo"}
      </p>
      <form className="adm-ecos-form" onSubmit={guardar}>
        <div className="adm-field"><label htmlFor="f-meta">Meta a 90 días</label><textarea id="f-meta" rows={2} value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="Un resultado concreto que se pueda ver y medir" /></div>
        <div className="adm-form-row">
          <div className="adm-field"><label htmlFor="f-mfecha">Fecha de la meta</label><input id="f-mfecha" type="date" value={metaFecha} onChange={(e) => setMetaFecha(e.target.value)} /></div>
          <div className="adm-field"><label htmlFor="f-etapa">Etapa actual</label><select id="f-etapa" value={etapa} onChange={(e) => setEtapa(Number(e.target.value))}>{p.etapas.map((et, i) => <option key={et} value={i}>{String(i + 1).padStart(2, "0")} · {et}</option>)}</select></div>
          <div className="adm-field"><label htmlFor="f-estado">Estado</label><select id="f-estado" value={estado} onChange={(e) => setEstado(e.target.value as EstadoPrograma)}>{(Object.keys(ESTADO_LABEL) as EstadoPrograma[]).map((k) => <option key={k} value={k}>{ESTADO_LABEL[k]}</option>)}</select></div>
        </div>
        <p className="adm-ecos-note">
          En pausa: lo sigue viendo y el club le dura 14 días más (por ejemplo, si no pagó el mes). Terminado: le queda un mes de club.
        </p>
        {msg && <p className="adm-ecos-note">{msg}</p>}
        <button type="submit" className="adm-add-btn">Guardar</button>
      </form>
    </div>
  );
}

function NuevaSesion({ programa: p, numero, escribir, subirActa }: {
  programa: Programa; numero: number; escribir: Escribir; subirActa: ReturnType<typeof useProcesosAdmin>["subirActa"];
}) {
  const [fecha, setFecha] = useState(hoy());
  const [titulo, setTitulo] = useState(`Sesión ${numero}`);
  const [resumen, setResumen] = useState("");
  const [acta, setActa] = useState<File | null>(null);
  const [comps, setComps] = useState("");
  const [limite, setLimite] = useState(enDias(hoy(), 7));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    let acta_path: string | null = null;
    if (acta) {
      const r = await subirActa(p.id, acta);
      if (r.error) { setBusy(false); setMsg(`No se pudo subir el acta: ${r.error}`); return; }
      acta_path = r.path;
    }
    const sesion: SesionPrograma = { id: newId("ses"), programa_id: p.id, fecha, titulo: titulo.trim(), resumen: resumen.trim() || null, acta_path, created_at: new Date().toISOString() };
    const { created_at: _c, ...insertarSesion } = sesion;
    const err = await escribir("sesiones", "hgg_programa_sesiones", { insertar: insertarSesion as SesionPrograma });
    if (err) { setBusy(false); setMsg(err); return; }
    for (const texto of comps.split("\n").map((t) => t.trim()).filter(Boolean)) {
      const c: Compromiso = { id: newId("comp"), programa_id: p.id, sesion_id: sesion.id, texto, fecha_limite: limite || null, hecho: false, hecho_at: null, created_at: new Date().toISOString() };
      const { created_at: _cc, hecho_at: _h, ...insertar } = c;
      const e2 = await escribir("compromisos", "hgg_compromisos", { insertar: insertar as Compromiso });
      if (e2) { setBusy(false); setMsg(`La sesión quedó, pero un compromiso no: ${e2}`); return; }
    }
    setBusy(false);
    setTitulo(`Sesión ${numero + 1}`); setResumen(""); setActa(null); setComps("");
    setMsg("Sesión guardada. Ya la ve en su panel.");
  }

  return (
    <div className="adm-card adm-card-pad">
      <div className="adm-card-head"><div className="adm-card-titlerow"><h2 className="adm-card-title">Registrar sesión</h2></div><span className="adm-card-sub">después de cada sesión</span></div>
      <form className="adm-ecos-form" onSubmit={guardar}>
        <div className="adm-form-row">
          <div className="adm-field"><label htmlFor="s-fecha">Fecha</label><input id="s-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div className="adm-field"><label htmlFor="s-titulo">Título</label><input id="s-titulo" required value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
        </div>
        <div className="adm-field"><label htmlFor="s-resumen">Resumen corto (lo que se trabajó)</label><textarea id="s-resumen" rows={2} value={resumen} onChange={(e) => setResumen(e.target.value)} /></div>
        <div className="adm-field"><label htmlFor="s-acta">Acta en PDF</label><input id="s-acta" type="file" accept="application/pdf" onChange={(e) => setActa(e.target.files?.[0] ?? null)} /></div>
        <div className="adm-form-row">
          <div className="adm-field"><label htmlFor="s-comps">Compromisos (uno por línea)</label><textarea id="s-comps" rows={3} value={comps} onChange={(e) => setComps(e.target.value)} placeholder={"Escribir mi oferta en una frase\nHablar con 3 clientes potenciales"} /></div>
          <div className="adm-field"><label htmlFor="s-limite">Para cuándo</label><input id="s-limite" type="date" value={limite} onChange={(e) => setLimite(e.target.value)} /></div>
        </div>
        {msg && <p className="adm-ecos-note">{msg}</p>}
        <button type="submit" className="adm-add-btn" disabled={busy}>{busy ? "Guardando…" : "Guardar sesión"}</button>
      </form>
    </div>
  );
}

function ListaCompromisos({ compromisos, escribir }: { compromisos: Compromiso[]; escribir: Escribir }) {
  if (compromisos.length === 0) return null;
  const hechos = compromisos.filter((c) => c.hecho).length;
  return (
    <div className="adm-card">
      <div className="adm-card-head adm-card-pad"><div className="adm-card-titlerow"><h2 className="adm-card-title">Compromisos</h2></div><span className="adm-card-sub">{hechos} de {compromisos.length} cumplidos</span></div>
      <table className="adm-vend-table">
        <tbody>
          {compromisos.map((c) => (
            <tr key={c.id}>
              <td>{c.texto}<br /><small className="adm-ecos-sub">{c.fecha_limite ? `para el ${fechaCorta(c.fecha_limite)}` : "sin fecha"}{c.hecho && c.hecho_at ? ` · cumplido el ${fechaCorta(c.hecho_at)}` : ""}</small></td>
              <td><button type="button" className={`adm-pill ${c.hecho ? "ok" : "off"} adm-ecos-pillbtn`} onClick={() => escribir("compromisos", "hgg_compromisos", { actualizar: { id: c.id, cambios: { hecho: !c.hecho, hecho_at: c.hecho ? null : new Date().toISOString() } } })}>{c.hecho ? "Cumplido" : "Pendiente"}</button></td>
              <td><button type="button" className="adm-ecos-del" onClick={() => { if (confirm("¿Borrar este compromiso?")) void escribir("compromisos", "hgg_compromisos", { borrar: c.id }); }}>Borrar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NuevaMedicion({ programa: p, mediciones, escribir }: { programa: Programa; mediciones: Medicion[]; escribir: Escribir }) {
  const ultima = mediciones[mediciones.length - 1];
  const [fecha, setFecha] = useState(hoy());
  const [valores, setValores] = useState<Partial<Record<AreaId, number>>>(() => ({ ...(ultima?.valores ?? {}) }));
  const [nota, setNota] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const completas = useMemo(() => AREAS.filter((a) => typeof valores[a.id] === "number").length, [valores]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const m: Medicion = { id: newId("med"), programa_id: p.id, tipo: "rueda", fecha, valores, nota: nota.trim() || null, created_at: new Date().toISOString() };
    const { created_at: _c, ...insertar } = m;
    const err = await escribir("mediciones", "hgg_mediciones", { insertar: insertar as Medicion });
    setMsg(err ?? "Medición guardada.");
    if (!err) setNota("");
  }

  return (
    <div className="adm-card adm-card-pad">
      <div className="adm-card-head">
        <div className="adm-card-titlerow"><h2 className="adm-card-title">Rueda de la Vida</h2></div>
        <span className="adm-card-sub">{mediciones.length === 0 ? "la primera es su punto de partida" : "una vez al mes"}</span>
      </div>
      {mediciones.length > 0 && (
        <ul className="adm-cli-meds">
          {mediciones.map((m, i) => (
            <li key={m.id}>
              <span>{i === 0 ? "Inicio" : `Medición ${i + 1}`} · {fechaCorta(m.fecha)}</span>
              <strong>{promedioRueda(m) ?? "—"}</strong>
              <button type="button" className="adm-ecos-del" onClick={() => { if (confirm("¿Borrar esta medición?")) void escribir("mediciones", "hgg_mediciones", { borrar: m.id }); }}>Borrar</button>
            </li>
          ))}
        </ul>
      )}
      <form className="adm-ecos-form" onSubmit={guardar}>
        <div className="adm-cli-rueda">
          {AREAS.map((a) => (
            <div key={a.id} className="adm-field">
              <label htmlFor={`r-${a.id}`}>{a.nombre}</label>
              <input id={`r-${a.id}`} type="number" min={1} max={10} step={1} value={valores[a.id] ?? ""} onChange={(e) => setValores((v) => ({ ...v, [a.id]: e.target.value === "" ? undefined : Math.min(10, Math.max(1, Number(e.target.value))) }))} />
            </div>
          ))}
        </div>
        <div className="adm-form-row">
          <div className="adm-field"><label htmlFor="r-fecha">Fecha</label><input id="r-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div className="adm-field"><label htmlFor="r-nota">Nota (opcional)</label><input id="r-nota" value={nota} onChange={(e) => setNota(e.target.value)} /></div>
        </div>
        <p className="adm-ecos-note">Del 1 al 10, como en el test. Vienen cargados los valores de la última medición para que solo cambies lo que se movió.</p>
        {msg && <p className="adm-ecos-note">{msg}</p>}
        <button type="submit" className="adm-add-btn" disabled={completas === 0}>Guardar medición ({completas}/10)</button>
      </form>
    </div>
  );
}

function ListaSesiones({ sesiones, escribir }: { sesiones: SesionPrograma[]; escribir: Escribir }) {
  if (sesiones.length === 0) return null;
  return (
    <div className="adm-card">
      <div className="adm-card-head adm-card-pad"><div className="adm-card-titlerow"><h2 className="adm-card-title">Sesiones</h2></div><span className="adm-card-sub">{sesiones.length}</span></div>
      <table className="adm-vend-table">
        <tbody>
          {sesiones.map((s) => (
            <tr key={s.id}>
              <td><strong>{s.titulo}</strong><br /><small className="adm-ecos-sub">{fechaCorta(s.fecha)}{s.acta_path ? " · con acta" : " · sin acta"}</small></td>
              <td><button type="button" className="adm-ecos-del" onClick={() => { if (confirm("¿Borrar esta sesión? Sus compromisos se quedan.")) void escribir("sesiones", "hgg_programa_sesiones", { borrar: s.id }); }}>Borrar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
