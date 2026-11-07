import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { NegocioTabs } from "@/club/NegocioTabs";
import { leerAgenda, planearImportacion, type Lectura } from "@/lib/contactos-agenda";
import {
  BENEFICIOS_SUGERIDOS, ESTADOS, ESTADO_LABEL, TIPOS, enlaceWhatsApp, useContactosEmbajador,
  type ContactoEmbajador, type EstadoContacto, type TipoContacto,
} from "@/lib/embajador-contactos";

const PAGINA = 100;
const ORDEN = Object.fromEntries(ESTADOS.map((e, i) => [e.id, i])) as Record<EstadoContacto, number>;
type Crm = ReturnType<typeof useContactosEmbajador>;
type FiltroTipo = TipoContacto | "todos" | "sin";
type FiltroActivo = "activos" | "inactivos" | "todos";

/**
 * Negocio → Mis contactos: el CRM del embajador. Sube la agenda de su celular
 * (CSV o vCard) y trabaja cada contacto: persona o empresa, qué le va a
 * regalar, en qué estado va y si el número sigue activo (los inactivos quedan
 * en gris y al final). Solo él ve su lista.
 */
export default function MisContactos() {
  const crm = useContactosEmbajador();
  const [estado, setEstado] = useState<EstadoContacto | "todos">("todos");
  const [tipo, setTipo] = useState<FiltroTipo>("todos");
  const [activo, setActivo] = useState<FiltroActivo>("activos");
  const [buscar, setBuscar] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [mostrar, setMostrar] = useState(PAGINA);
  const [importando, setImportando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const q = buscar.trim().toLowerCase();
  const qTel = q.replace(/\D/g, "");
  const porActivo = crm.contactos.filter((c) => activo === "todos" || (activo === "activos" ? c.activo : !c.activo));
  const porTipo = porActivo.filter((c) => tipo === "todos" || (tipo === "sin" ? !c.tipo : c.tipo === tipo));
  const lista = porTipo
    .filter((c) => estado === "todos" || c.estado === estado)
    .filter((c) => !q
      || c.nombre.toLowerCase().includes(q)
      || (c.beneficio ?? "").toLowerCase().includes(q)
      || (c.notas ?? "").toLowerCase().includes(q)
      || (qTel.length >= 3 && (c.telefono ?? "").replace(/\D/g, "").includes(qTel)))
    .sort((a, b) => Number(b.activo) - Number(a.activo) || ORDEN[a.estado] - ORDEN[b.estado] || a.created_at.localeCompare(b.created_at));

  const beneficios = useMemo(
    () => [...new Set([...crm.contactos.map((c) => c.beneficio?.trim()).filter((x): x is string => !!x), ...BENEFICIOS_SUGERIDOS])],
    [crm.contactos],
  );

  const filtrar = (f: () => void) => { f(); setMostrar(PAGINA); setSel(new Set()); };
  const seleccion = [...sel];
  const todosVisibles = lista.length > 0 && lista.every((c) => sel.has(c.id));
  const inactivos = crm.contactos.filter((c) => !c.activo).length;

  /** Al abrir el chat de alguien sin contactar, queda como «Le escribí». */
  function abrirChat(c: ContactoEmbajador) {
    const cambios: Partial<ContactoEmbajador> = { ultimo_contacto: new Date().toISOString() };
    if (c.estado === "sin_contactar") cambios.estado = "escrito";
    void crm.actualizar(c.id, cambios).then((e) => e && setMsg(e));
  }

  return (
    <div className="club-page mc">
      <header className="club-page-head">
        <p className="club-eyebrow">Negocio</p>
        <h1>Mis contactos</h1>
        <p className="club-page-sub">
          Tu lista de WhatsApp, ordenada. Sube los contactos de tu celular y marca a cada persona: si es persona o
          empresa, qué le vas a regalar y en qué va. Solo tú ves esta lista.
        </p>
        <NegocioTabs />
      </header>

      {crm.error && <p className="club-notice">{crm.error}</p>}

      <div className="mc-barra">
        <input className="mc-buscar" type="search" placeholder="Buscar nombre, número, beneficio o nota" value={buscar} onChange={(e) => filtrar(() => setBuscar(e.target.value))} />
        <button type="button" className="club-btn small" onClick={() => setImportando((x) => !x)} aria-expanded={importando}>
          Subir mis contactos
        </button>
      </div>

      {importando && <Importar crm={crm} cerrar={(m) => { setImportando(false); if (m) { setMsg(m); filtrar(() => { setEstado("sin_contactar"); setActivo("activos"); }); } }} />}

      <div className="mc-estados" role="group" aria-label="Estado">
        <button type="button" className={`mc-estado${estado === "todos" ? " is-on" : ""}`} onClick={() => filtrar(() => setEstado("todos"))}>
          <strong>{porTipo.length}</strong>Todos
        </button>
        {ESTADOS.map((e) => (
          <button key={e.id} type="button" className={`mc-estado is-${e.id}${estado === e.id ? " is-on" : ""}`} onClick={() => filtrar(() => setEstado(e.id))}>
            <strong>{porTipo.filter((c) => c.estado === e.id).length}</strong>{e.label}
          </button>
        ))}
      </div>

      <div className="mc-filtros">
        <div className="mc-chips" role="group" aria-label="Tipo">
          {([["todos", "Todos"], ["persona", "Personas"], ["empresa", "Empresas"], ["sin", "Sin definir"]] as const).map(([id, label]) => (
            <button key={id} type="button" className={`mc-chip${tipo === id ? " is-on" : ""}`} onClick={() => filtrar(() => setTipo(id))}>{label}</button>
          ))}
        </div>
        <div className="mc-chips" role="group" aria-label="Activos o inactivos">
          {([["activos", "Activos"], ["inactivos", `Inactivos${inactivos ? ` · ${inactivos}` : ""}`], ["todos", "Todos"]] as const).map(([id, label]) => (
            <button key={id} type="button" className={`mc-chip${activo === id ? " is-on" : ""}`} onClick={() => filtrar(() => setActivo(id))}>{label}</button>
          ))}
        </div>
      </div>

      {msg && <p className="club-notice">{msg}</p>}

      <datalist id="mc-beneficios">{beneficios.map((b) => <option key={b} value={b} />)}</datalist>

      {lista.length > 0 && (
        <div className="mc-sel">
          <label>
            <input type="checkbox" checked={todosVisibles} onChange={() => setSel(todosVisibles ? new Set() : new Set(lista.map((c) => c.id)))} />
            {seleccion.length ? `${seleccion.length} seleccionados` : `Seleccionar los ${lista.length}`}
          </label>
          {seleccion.length > 0 && <EnGrupo ids={seleccion} crm={crm} listo={(m) => { setMsg(m); setSel(new Set()); }} />}
        </div>
      )}

      {crm.loading ? <p className="club-muted">Cargando…</p> : lista.length === 0 ? (
        <div className="mc-vacio">
          {crm.contactos.length === 0 ? (
            <>
              <strong>Tu lista está vacía</strong>
              <p className="club-muted">Sube los contactos de tu celular (un archivo .csv o .vcf) o agrega a alguien a mano abajo.</p>
              <button type="button" className="club-btn small" onClick={() => setImportando(true)}>Subir mis contactos</button>
            </>
          ) : <p className="club-muted">No hay contactos con este filtro.</p>}
        </div>
      ) : (
        <>
          <ul className="mc-lista">
            {lista.slice(0, mostrar).map((c) => (
              <Fila
                key={c.id}
                c={c}
                abierto={abierto === c.id}
                marcado={sel.has(c.id)}
                marcar={() => setSel((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}
                alternar={() => setAbierto((a) => (a === c.id ? null : c.id))}
                abrirChat={() => abrirChat(c)}
                actualizar={async (cambios) => { const e = await crm.actualizar(c.id, cambios); if (e) setMsg(e); }}
                borrar={async () => { if (confirm(`¿Borrar a ${c.nombre} de tu lista?`)) setMsg(await crm.borrarVarios([c.id])); }}
              />
            ))}
          </ul>
          {lista.length > mostrar && (
            <button type="button" className="club-btn small ghost mc-mas" onClick={() => setMostrar((m) => m + PAGINA)}>
              Mostrar {Math.min(PAGINA, lista.length - mostrar)} más · van {mostrar} de {lista.length}
            </button>
          )}
        </>
      )}

      <Agregar agregar={crm.agregar} />
    </div>
  );
}

function Fila({ c, abierto, marcado, marcar, alternar, abrirChat, actualizar, borrar }: {
  c: ContactoEmbajador; abierto: boolean; marcado: boolean; marcar: () => void; alternar: () => void;
  abrirChat: () => void; actualizar: (cambios: Partial<ContactoEmbajador>) => Promise<void>; borrar: () => void;
}) {
  const [beneficio, setBeneficio] = useState(c.beneficio ?? "");
  const [notas, setNotas] = useState(c.notas ?? "");
  const [telefono, setTelefono] = useState(c.telefono ?? "");
  const wa = enlaceWhatsApp(c);
  const guardarBeneficio = () => { const b = beneficio.trim(); if (b !== (c.beneficio ?? "")) void actualizar({ beneficio: b || null }); };

  return (
    <li className={`mc-fila is-${c.estado}${c.activo ? "" : " is-inactivo"}${marcado ? " is-sel" : ""}`}>
      <div className="mc-cabeza">
        <input type="checkbox" className="mc-check" checked={marcado} onChange={marcar} aria-label={`Seleccionar a ${c.nombre}`} />
        <button type="button" className="mc-nombre" onClick={alternar} aria-expanded={abierto}>
          <strong>{c.nombre}</strong>
          <small>{c.telefono ?? "Sin número"}{!c.activo && " · inactivo"}</small>
        </button>
        <button
          type="button"
          className={`mc-activo${c.activo ? " is-on" : ""}`}
          role="switch"
          aria-checked={c.activo}
          aria-label={`${c.nombre}: ${c.activo ? "activo" : "inactivo"}`}
          title={c.activo ? "Márcalo inactivo si cambió de número o ya no tiene WhatsApp" : "Volver a activar"}
          onClick={() => void actualizar({ activo: !c.activo })}
        >
          <span aria-hidden />{c.activo ? "Activo" : "Inactivo"}
        </button>
      </div>

      <div className="mc-campos">
        <div className="mc-tipo" role="group" aria-label={`Tipo de ${c.nombre}`}>
          {(Object.keys(TIPOS) as TipoContacto[]).map((t) => (
            <button key={t} type="button" className={c.tipo === t ? "is-on" : ""} aria-pressed={c.tipo === t} onClick={() => void actualizar({ tipo: c.tipo === t ? null : t })}>{TIPOS[t]}</button>
          ))}
        </div>
        <select className="mc-select" aria-label={`Estado de ${c.nombre}`} value={c.estado} onChange={(e) => void actualizar({ estado: e.target.value as EstadoContacto })}>
          {ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
        <input
          className="mc-beneficio"
          list="mc-beneficios"
          value={beneficio}
          onChange={(e) => setBeneficio(e.target.value)}
          onBlur={guardarBeneficio}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          placeholder="¿Qué le vas a regalar?"
          aria-label={`Beneficio para ${c.nombre}`}
        />
        {wa
          ? <a className="club-btn small mc-wa" href={wa} target="_blank" rel="noopener noreferrer" onClick={abrirChat}>WhatsApp</a>
          : <span className="mc-wa-no">{c.activo ? "Sin número" : "Inactivo"}</span>}
      </div>

      {abierto && (
        <div className="mc-detalle">
          <label className="club-field">
            <span>WhatsApp (con indicativo)</span>
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} onBlur={() => telefono.trim() !== (c.telefono ?? "") && void actualizar({ telefono: telefono.trim() || null })} placeholder="+57 300 000 0000" />
          </label>
          <label className="club-field">
            <span>Notas</span>
            <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} onBlur={() => notas.trim() !== (c.notas ?? "") && void actualizar({ notas: notas.trim() || null })} placeholder="Qué te dijo, qué necesita, cuándo volver a escribirle" />
          </label>
          <div className="mc-pie">
            <span className="club-muted">
              {ESTADO_LABEL[c.estado]}
              {c.ultimo_contacto && ` · le escribiste el ${new Date(c.ultimo_contacto).toLocaleDateString("es", { day: "numeric", month: "short" })}`}
              {c.origen === "agenda" && " · de tu celular"}
            </span>
            <button type="button" className="mc-borrar" onClick={borrar}>Borrar</button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Lo que se hace con los seleccionados: tipo, estado, beneficio, activo, borrar. */
function EnGrupo({ ids, crm, listo }: { ids: string[]; crm: Crm; listo: (msg: string | null) => void }) {
  const [beneficio, setBeneficio] = useState("");
  const n = ids.length;
  const b = beneficio.trim();
  const hacer = async (cambios: Partial<ContactoEmbajador>, ok: string) => listo((await crm.actualizarVarios(ids, cambios)) ?? ok);

  return (
    <div className="mc-grupo">
      <select className="mc-select" aria-label="Tipo para los seleccionados" value="" onChange={(e) => { const t = e.target.value as TipoContacto; if (t) void hacer({ tipo: t }, `${n} marcados como ${TIPOS[t].toLowerCase()}.`); }}>
        <option value="">Tipo…</option>
        {(Object.keys(TIPOS) as TipoContacto[]).map((t) => <option key={t} value={t}>{TIPOS[t]}</option>)}
      </select>
      <select className="mc-select" aria-label="Estado para los seleccionados" value="" onChange={(e) => { const s = e.target.value as EstadoContacto; if (s) void hacer({ estado: s }, `${n} en «${ESTADO_LABEL[s]}».`); }}>
        <option value="">Estado…</option>
        {ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
      </select>
      <input className="mc-beneficio" list="mc-beneficios" value={beneficio} onChange={(e) => setBeneficio(e.target.value)} placeholder="Beneficio" aria-label="Beneficio para los seleccionados" />
      <button type="button" className="club-btn small" disabled={!b} onClick={() => void hacer({ beneficio: b }, `«${b}» puesto a ${n}.`)}>Poner</button>
      <button type="button" className="club-btn small ghost" onClick={() => void hacer({ activo: false }, `${n} marcados inactivos.`)}>Inactivos</button>
      <button type="button" className="club-btn small ghost" onClick={() => void hacer({ activo: true }, `${n} activos de nuevo.`)}>Activos</button>
      <button type="button" className="mc-borrar" onClick={async () => { if (confirm(`¿Borrar ${n} contactos de tu lista? No se puede deshacer.`)) listo((await crm.borrarVarios(ids)) ?? `${n} borrados.`); }}>Borrar</button>
    </div>
  );
}

/**
 * Subir la agenda del celular. WhatsApp usa los contactos del teléfono, así
 * que esa agenda es su lista de WhatsApp. Se lee en el navegador, se muestra
 * qué pasaría y solo se guarda al confirmar.
 */
function Importar({ crm, cerrar }: { crm: Crm; cerrar: (msg: string | null) => void }) {
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [archivo, setArchivo] = useState("");
  const [indicativo, setIndicativo] = useState("57");
  const [tipo, setTipo] = useState<TipoContacto | "">("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = useMemo(() => (lectura ? planearImportacion(lectura, crm.contactos, indicativo) : null), [lectura, crm.contactos, indicativo]);
  const total = plan ? plan.nuevos.length + plan.completar.length : 0;

  async function elegir(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    const l = leerAgenda(await f.text());
    setArchivo(f.name);
    setLectura(l);
    if (l.contactos.length === 0) setError("No encontré contactos con número en ese archivo. Debe ser un .csv o un .vcf.");
  }

  async function guardar() {
    if (!plan) return;
    setGuardando(true);
    const err = await crm.importar(plan, tipo || null);
    setGuardando(false);
    if (err) { setError(err); return; }
    cerrar(`Listo: ${plan.nuevos.length} contactos nuevos en tu lista${plan.completar.length ? ` y ${plan.completar.length} con su número completado` : ""}.`);
  }

  return (
    <section className="mc-importar">
      <div className="mc-importar-head">
        <h2>Subir mis contactos</h2>
        <button type="button" className="mc-cerrar" onClick={() => cerrar(null)} aria-label="Cerrar">×</button>
      </div>
      <ol className="mc-pasos">
        <li><strong>Android o Google:</strong> entra a contacts.google.com → Exportar → «CSV de Google». También sirve la app Contactos → Ajustes → Exportar (.vcf).</li>
        <li><strong>iPhone:</strong> entra a icloud.com/contacts → selecciona todo → Exportar vCard. O en el Mac: app Contactos → Archivo → Exportar → vCard.</li>
        <li>Sube el archivo aquí. Nada se guarda hasta que pulses «Agregar».</li>
      </ol>
      <div className="mc-importar-campos">
        <label className="club-field"><span>Archivo (.csv o .vcf)</span><input type="file" accept=".csv,.vcf,.vcard,text/csv,text/vcard" onChange={elegir} /></label>
        <label className="club-field"><span>Indicativo de tu país</span><input value={indicativo} onChange={(e) => setIndicativo(e.target.value)} inputMode="numeric" placeholder="57" /></label>
        <label className="club-field">
          <span>Marcar a todos como</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoContacto | "")}>
            <option value="">Sin definir</option>
            {(Object.keys(TIPOS) as TipoContacto[]).map((t) => <option key={t} value={t}>{TIPOS[t]}</option>)}
          </select>
        </label>
      </div>
      <p className="club-muted">El indicativo se pone a los números que no traen «+» (57 Colombia, 52 México, 1 Estados Unidos…).</p>

      {error && <p className="club-notice">{error}</p>}

      {plan && lectura && lectura.contactos.length > 0 && (
        <>
          <ul className="mc-resumen">
            <li><strong>{lectura.contactos.length}</strong>con número en {archivo}</li>
            <li className="is-oro"><strong>{plan.nuevos.length}</strong>nuevos</li>
            {plan.completar.length > 0 && <li><strong>{plan.completar.length}</strong>ya estaban, se les pone el número</li>}
            <li><strong>{plan.repetidos}</strong>ya están en tu lista</li>
            {(plan.sinTelefono + plan.invalidos) > 0 && <li><strong>{plan.sinTelefono + plan.invalidos}</strong>sin número válido</li>}
          </ul>
          {plan.nuevos.length > 0 && (
            <details className="mc-muestra">
              <summary>Ver los nuevos</summary>
              <ul>{plan.nuevos.slice(0, 300).map((a) => <li key={a.telefono}><span>{a.nombre}</span><small>{a.telefono}</small></li>)}</ul>
              {plan.nuevos.length > 300 && <p className="club-muted">…y {plan.nuevos.length - 300} más.</p>}
            </details>
          )}
          <button type="button" className="club-btn" disabled={!total || guardando} onClick={guardar}>
            {guardando ? "Agregando…" : total ? `Agregar ${total}` : "No hay nada nuevo"}
          </button>
        </>
      )}
    </section>
  );
}

function Agregar({ agregar }: { agregar: Crm["agregar"] }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipo, setTipo] = useState<TipoContacto | "">("");
  const [msg, setMsg] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    const err = await agregar(nombre, telefono, tipo || null);
    setMsg(err);
    if (!err) { setNombre(""); setTelefono(""); }
  }

  return (
    <form className="mc-agregar" onSubmit={enviar}>
      <h2>Agregar a alguien</h2>
      <div className="mc-importar-campos">
        <label className="club-field"><span>Nombre</span><input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" /></label>
        <label className="club-field"><span>WhatsApp</span><input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+57 300 000 0000" /></label>
        <label className="club-field">
          <span>Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoContacto | "")}>
            <option value="">Sin definir</option>
            {(Object.keys(TIPOS) as TipoContacto[]).map((t) => <option key={t} value={t}>{TIPOS[t]}</option>)}
          </select>
        </label>
      </div>
      {msg && <p className="club-notice">{msg}</p>}
      <button type="submit" className="club-btn small" disabled={!nombre.trim()}>Agregar</button>
    </form>
  );
}
