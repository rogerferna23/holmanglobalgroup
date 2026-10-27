import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ETAPAS, ETAPA_LABEL, ETIQUETAS_SUGERIDAS, GRUPOS, enlaceWhatsApp, primerMensaje, useContactos,
  type Contacto, type EtapaContacto, type GrupoContacto,
} from "@/lib/contactos";
import { leerAgenda, planearImportacion, type Lectura } from "@/lib/contactos-agenda";
import { fechaCorta } from "@/lib/proceso";

const hoy = () => new Date().toISOString().slice(0, 10);
const enDias = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};
const ORDEN = Object.fromEntries(ETAPAS.map((e, i) => [e.id, i])) as Record<EtapaContacto, number>;
/** Etapas en las que la persona sigue abierta: las que piden seguimiento. */
const ABIERTA: EtapaContacto[] = ["contactado", "conversando", "claridad"];
/** Antes del primer mensaje: aquí se muestra el mensaje para copiar. */
const SIN_ESCRIBIR: EtapaContacto[] = ["base", "por_contactar"];
/** Cuántas filas se pintan de una vez (la agenda puede tener miles). */
const PAGINA = 100;
const SIN_ETIQUETA = "__sin__";

type Crm = ReturnType<typeof useContactos>;

/**
 * Torre → Clientes → Contactos. El CRM de Holman: toda su agenda de WhatsApp,
 * con etiquetas, a quién escribirle, en qué va cada persona y a quién le toca
 * seguimiento hoy (cadencia día 0, 2 y 5).
 */
export function ContactosView() {
  const crm = useContactos();
  const [grupo, setGrupo] = useState<GrupoContacto | "todos">("todos");
  const [etapa, setEtapa] = useState<EtapaContacto | "hoy" | "todas">("todas");
  const [etiqueta, setEtiqueta] = useState<string | null>(null);
  const [buscar, setBuscar] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [mostrar, setMostrar] = useState(PAGINA);
  const [importando, setImportando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const delGrupo = crm.contactos.filter((c) => grupo === "todos" || c.grupo === grupo);
  const paraHoy = (c: Contacto) => !!c.proximo && c.proximo <= hoy() && ABIERTA.includes(c.etapa);
  const q = buscar.trim().toLowerCase();
  const qTel = q.replace(/\D/g, "");
  const lista = delGrupo
    .filter((c) => (etapa === "todas" ? true : etapa === "hoy" ? paraHoy(c) : c.etapa === etapa))
    .filter((c) => !etiqueta || (etiqueta === SIN_ETIQUETA ? c.etiquetas.length === 0 : c.etiquetas.includes(etiqueta)))
    .filter((c) => !q
      || c.nombre.toLowerCase().includes(q)
      || (c.notas ?? "").toLowerCase().includes(q)
      || c.etiquetas.some((x) => x.toLowerCase().includes(q))
      || (qTel.length >= 3 && (c.telefono ?? "").replace(/\D/g, "").includes(qTel)))
    .sort((a, b) => Number(paraHoy(b)) - Number(paraHoy(a)) || ORDEN[a.etapa] - ORDEN[b.etapa] || a.created_at.localeCompare(b.created_at));

  const cuenta = (e: EtapaContacto) => delGrupo.filter((c) => c.etapa === e).length;
  const nHoy = delGrupo.filter(paraHoy).length;
  /** Todas las etiquetas en uso, con cuántos las tienen; las más usadas primero. */
  const enUso = useMemo(() => {
    const n = new Map<string, number>();
    for (const c of crm.contactos) for (const x of c.etiquetas) n.set(x, (n.get(x) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [crm.contactos]);
  const todasLasEtiquetas = [...new Set([...enUso.map(([x]) => x), ...ETIQUETAS_SUGERIDAS])];

  const filtrar = (f: () => void) => { f(); setMostrar(PAGINA); setSel(new Set()); };
  const seleccion = [...sel];
  const todosVisibles = lista.length > 0 && lista.every((c) => sel.has(c.id));

  async function copiar(c: Contacto) {
    try {
      await navigator.clipboard.writeText(primerMensaje(c));
      setMsg(`Mensaje para ${c.nombre} copiado. Pégalo en su chat.`);
    } catch {
      setMsg("No se pudo copiar. Abre la ficha y cópialo a mano.");
      setAbierto(c.id);
    }
  }

  /** «Le escribí»: queda contactado hoy y el seguimiento a los 2 días. */
  async function leEscribi(c: Contacto) {
    const primera = SIN_ESCRIBIR.includes(c.etapa);
    const err = await crm.actualizar(c.id, {
      etapa: primera ? "contactado" : c.etapa,
      ultimo_contacto: new Date().toISOString(),
      proximo: enDias(primera ? 2 : 3),
    });
    setMsg(err ?? `Listo: ${c.nombre}, seguimiento el ${fechaCorta(enDias(primera ? 2 : 3))}.`);
  }

  return (
    <div className="adm-crm">
      {crm.error && <p className="adm-ecos-error">{crm.error}</p>}

      <div className="adm-crm-barra">
        <div className="adm-crm-grupos" role="group" aria-label="Grupo">
          {(["todos", "fundador", "general"] as const).map((g) => (
            <button key={g} type="button" className={`adm-crm-chip${grupo === g ? " is-on" : ""}`} onClick={() => filtrar(() => setGrupo(g))}>
              {g === "todos" ? "Todos" : GRUPOS[g]} <span>{g === "todos" ? crm.contactos.length : crm.contactos.filter((c) => c.grupo === g).length}</span>
            </button>
          ))}
        </div>
        <div className="adm-crm-derecha">
          <input className="adm-crm-buscar" type="search" placeholder="Buscar nombre, número, nota o etiqueta" value={buscar} onChange={(e) => filtrar(() => setBuscar(e.target.value))} />
          <button type="button" className="adm-crm-btn is-oro" onClick={() => setImportando((x) => !x)} aria-expanded={importando}>Importar agenda</button>
        </div>
      </div>

      {importando && <Importar crm={crm} cerrar={(m) => { setImportando(false); if (m) { setMsg(m); filtrar(() => setEtapa("base")); } }} />}

      <div className="adm-crm-embudo" role="group" aria-label="Etapa">
        <button type="button" className={`adm-crm-etapa${etapa === "todas" ? " is-on" : ""}`} onClick={() => filtrar(() => setEtapa("todas"))}><strong>{delGrupo.length}</strong>Todas</button>
        <button type="button" className={`adm-crm-etapa is-hoy${etapa === "hoy" ? " is-on" : ""}`} onClick={() => filtrar(() => setEtapa("hoy"))}><strong>{nHoy}</strong>Seguimiento hoy</button>
        {ETAPAS.map((e) => (
          <button key={e.id} type="button" className={`adm-crm-etapa${etapa === e.id ? " is-on" : ""}`} onClick={() => filtrar(() => setEtapa(e.id))}><strong>{cuenta(e.id)}</strong>{e.label}</button>
        ))}
      </div>

      {enUso.length > 0 && (
        <div className="adm-crm-etiquetas" role="group" aria-label="Etiqueta">
          {enUso.map(([x, n]) => (
            <button key={x} type="button" className={`adm-crm-tag${etiqueta === x ? " is-on" : ""}`} onClick={() => filtrar(() => setEtiqueta((e) => (e === x ? null : x)))}>
              {x} <span>{n}</span>
            </button>
          ))}
          <button type="button" className={`adm-crm-tag is-sin${etiqueta === SIN_ETIQUETA ? " is-on" : ""}`} onClick={() => filtrar(() => setEtiqueta((e) => (e === SIN_ETIQUETA ? null : SIN_ETIQUETA)))}>
            Sin etiqueta <span>{crm.contactos.filter((c) => c.etiquetas.length === 0).length}</span>
          </button>
        </div>
      )}

      {msg && <p className="adm-ecos-note adm-crm-msg">{msg}</p>}

      {lista.length > 0 && (
        <div className="adm-crm-sel">
          <label>
            <input type="checkbox" checked={todosVisibles} onChange={() => setSel(todosVisibles ? new Set() : new Set(lista.map((c) => c.id)))} />
            {seleccion.length ? `${seleccion.length} seleccionados` : `Seleccionar los ${lista.length}`}
          </label>
          {seleccion.length > 0 && (
            <EnGrupo
              ids={seleccion}
              etiquetas={todasLasEtiquetas}
              crm={crm}
              listo={(m) => { setMsg(m); setSel(new Set()); }}
            />
          )}
        </div>
      )}

      {crm.loading ? <p className="adm-tx-empty">Cargando…</p> : lista.length === 0 ? (
        <p className="adm-tx-empty">{etapa === "hoy" ? "Nadie pide seguimiento hoy." : crm.contactos.length === 0 ? "Aún no hay contactos. Importa la agenda de tu celular." : "No hay contactos aquí."}</p>
      ) : (
        <>
          <ul className="adm-crm-lista">
            {lista.slice(0, mostrar).map((c) => (
              <Fila
                key={c.id}
                c={c}
                hoy={paraHoy(c)}
                abierto={abierto === c.id}
                marcado={sel.has(c.id)}
                marcar={() => setSel((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}
                etiquetas={todasLasEtiquetas}
                alternar={() => setAbierto((a) => (a === c.id ? null : c.id))}
                copiar={() => copiar(c)}
                leEscribi={() => leEscribi(c)}
                actualizar={async (cambios) => setMsg(await crm.actualizar(c.id, cambios))}
                borrar={async () => { if (confirm(`¿Borrar a ${c.nombre}?`)) setMsg(await crm.borrar(c.id)); }}
              />
            ))}
          </ul>
          {lista.length > mostrar && (
            <button type="button" className="adm-crm-btn adm-crm-mas" onClick={() => setMostrar((m) => m + PAGINA)}>
              Mostrar {Math.min(PAGINA, lista.length - mostrar)} más · van {mostrar} de {lista.length}
            </button>
          )}
        </>
      )}

      <Agregar agregar={crm.agregar} />
    </div>
  );
}

function Fila({ c, hoy: esHoy, abierto, marcado, marcar, etiquetas, alternar, copiar, leEscribi, actualizar, borrar }: {
  c: Contacto; hoy: boolean; abierto: boolean; marcado: boolean; marcar: () => void; etiquetas: string[];
  alternar: () => void; copiar: () => void; leEscribi: () => void;
  actualizar: (cambios: Partial<Contacto>) => Promise<void>; borrar: () => void;
}) {
  const [notas, setNotas] = useState(c.notas ?? "");
  const [telefono, setTelefono] = useState(c.telefono ?? "");
  const [nueva, setNueva] = useState("");
  const wa = enlaceWhatsApp(c);
  const conEtiqueta = (x: string) => void actualizar({ etiquetas: c.etiquetas.includes(x) ? c.etiquetas.filter((y) => y !== x) : [...c.etiquetas, x] });

  return (
    <li className={`adm-crm-fila is-${c.etapa}${esHoy ? " is-hoy" : ""}${marcado ? " is-sel" : ""}`}>
      <div className="adm-crm-linea">
        <input type="checkbox" className="adm-crm-check" checked={marcado} onChange={marcar} aria-label={`Seleccionar a ${c.nombre}`} />
        <button type="button" className="adm-crm-nombre" onClick={alternar} aria-expanded={abierto}>
          <strong>{c.nombre}</strong>
          <small>
            {c.telefono ?? (c.grupo === "fundador" ? "Fundador" : "Sin número")}
            {c.ultimo_contacto && ` · le escribiste el ${fechaCorta(c.ultimo_contacto)}`}
            {c.proximo && ABIERTA.includes(c.etapa) && <em className={esHoy ? "is-hoy" : ""}> · seguimiento {esHoy ? "hoy" : `el ${fechaCorta(c.proximo)}`}</em>}
          </small>
          {c.etiquetas.length > 0 && <span className="adm-crm-pills">{c.etiquetas.map((x) => <i key={x}>{x}</i>)}</span>}
        </button>
        <select aria-label={`Etapa de ${c.nombre}`} value={c.etapa} onChange={(e) => void actualizar({ etapa: e.target.value as EtapaContacto })}>
          {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
        <div className="adm-crm-acciones">
          {wa
            ? <a className="adm-crm-btn" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            : <button type="button" className="adm-crm-btn" onClick={copiar}>Copiar mensaje</button>}
          <button type="button" className="adm-crm-btn is-oro" onClick={leEscribi}>Le escribí</button>
        </div>
      </div>

      {abierto && (
        <div className="adm-crm-detalle">
          {SIN_ESCRIBIR.includes(c.etapa) && <p className="adm-crm-mensaje">{primerMensaje(c)}</p>}
          <div className="adm-field">
            <label>Etiquetas</label>
            <div className="adm-crm-etiquetas">
              {[...new Set([...c.etiquetas, ...etiquetas])].map((x) => (
                <button key={x} type="button" className={`adm-crm-tag${c.etiquetas.includes(x) ? " is-on" : ""}`} onClick={() => conEtiqueta(x)} aria-pressed={c.etiquetas.includes(x)}>{x}</button>
              ))}
              <form className="adm-crm-tag-nueva" onSubmit={(e) => { e.preventDefault(); const x = nueva.trim(); if (x && !c.etiquetas.includes(x)) conEtiqueta(x); setNueva(""); }}>
                <input value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Nueva etiqueta" aria-label="Nueva etiqueta" />
              </form>
            </div>
          </div>
          <div className="adm-form-row">
            <div className="adm-field"><label htmlFor={`t-${c.id}`}>WhatsApp (con indicativo)</label><input id={`t-${c.id}`} value={telefono} onChange={(e) => setTelefono(e.target.value)} onBlur={() => telefono !== (c.telefono ?? "") && void actualizar({ telefono: telefono.trim() || null })} placeholder="+57 300 000 0000" /></div>
            <div className="adm-field"><label htmlFor={`p-${c.id}`}>Próximo seguimiento</label><input id={`p-${c.id}`} type="date" value={c.proximo ?? ""} onChange={(e) => void actualizar({ proximo: e.target.value || null })} /></div>
            <div className="adm-field"><label htmlFor={`g-${c.id}`}>Grupo</label><select id={`g-${c.id}`} value={c.grupo} onChange={(e) => void actualizar({ grupo: e.target.value as GrupoContacto })}>{(Object.keys(GRUPOS) as GrupoContacto[]).map((g) => <option key={g} value={g}>{GRUPOS[g]}</option>)}</select></div>
          </div>
          <div className="adm-field"><label htmlFor={`n-${c.id}`}>Notas</label><textarea id={`n-${c.id}`} rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} onBlur={() => notas !== (c.notas ?? "") && void actualizar({ notas: notas.trim() || null })} placeholder="Qué te dijo, qué necesita, cuándo volver a escribirle" /></div>
          <div className="adm-crm-pie">
            <span className="adm-ecos-sub">Etapa: {ETAPA_LABEL[c.etapa]}{c.origen === "agenda" && " · de la agenda del celular"}</span>
            <button type="button" className="adm-ecos-del" onClick={borrar}>Borrar</button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Lo que se hace con los seleccionados: etiquetar, mover de etapa, borrar. */
function EnGrupo({ ids, etiquetas, crm, listo }: { ids: string[]; etiquetas: string[]; crm: Crm; listo: (msg: string | null) => void }) {
  const [etiqueta, setEtiqueta] = useState("");
  const n = ids.length;
  const x = etiqueta.trim();

  return (
    <div className="adm-crm-grupo-acciones">
      <input list="crm-etiquetas" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} placeholder="Etiqueta" aria-label="Etiqueta para los seleccionados" />
      <datalist id="crm-etiquetas">{etiquetas.map((t) => <option key={t} value={t} />)}</datalist>
      <button type="button" className="adm-crm-btn is-oro" disabled={!x} onClick={async () => listo((await crm.etiquetar(ids, x)) ?? `«${x}» puesta a ${n}.`)}>Poner</button>
      <button type="button" className="adm-crm-btn" disabled={!x} onClick={async () => listo((await crm.etiquetar(ids, x, true)) ?? `«${x}» quitada a ${n}.`)}>Quitar</button>
      <select
        aria-label="Mover los seleccionados a la etapa"
        value=""
        onChange={async (e) => { const et = e.target.value as EtapaContacto; if (et) listo((await crm.actualizarVarios(ids, { etapa: et })) ?? `${n} movidos a «${ETAPA_LABEL[et]}».`); }}
      >
        <option value="">Mover a…</option>
        {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
      </select>
      <button type="button" className="adm-ecos-del" onClick={async () => { if (confirm(`¿Borrar ${n} contactos? No se puede deshacer.`)) listo((await crm.borrarVarios(ids)) ?? `${n} borrados.`); }}>Borrar</button>
    </div>
  );
}

/**
 * Importar la agenda del celular. WhatsApp usa los contactos del teléfono, así
 * que esa agenda es la lista de WhatsApp. Se lee aquí, se muestra qué pasaría
 * y solo se guarda al confirmar.
 */
function Importar({ crm, cerrar }: { crm: Crm; cerrar: (msg: string | null) => void }) {
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [archivo, setArchivo] = useState("");
  const [indicativo, setIndicativo] = useState("57");
  const [etiqueta, setEtiqueta] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = useMemo(() => (lectura ? planearImportacion(lectura, crm.contactos, indicativo) : null), [lectura, crm.contactos, indicativo]);

  async function elegir(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    const l = leerAgenda(await f.text());
    setArchivo(f.name);
    setLectura(l);
    if (l.contactos.length === 0) setError("No encontré contactos con número en ese archivo. Debe ser un .vcf (vCard) o un .csv.");
  }

  async function guardar() {
    if (!plan) return;
    setGuardando(true);
    const err = await crm.importar(plan, etiqueta.trim() ? [etiqueta.trim()] : []);
    setGuardando(false);
    if (err) { setError(err); return; }
    cerrar(`Listo: ${plan.nuevos.length} contactos nuevos en «En mi base»${plan.completar.length ? ` y ${plan.completar.length} con su número completado` : ""}.`);
  }

  const total = plan ? plan.nuevos.length + plan.completar.length : 0;

  return (
    <div className="adm-card adm-card-pad adm-crm-importar">
      <div className="adm-crm-importar-head">
        <h3>Importar la agenda del celular</h3>
        <button type="button" className="adm-crm-btn" onClick={() => cerrar(null)}>Cerrar</button>
      </div>
      <ol className="adm-crm-pasos">
        <li><strong>iPhone:</strong> en el Mac abre la app Contactos, selecciona todo (⌘A) y ve a Archivo → Exportar → Exportar vCard. También sirve icloud.com/contacts → seleccionar todo → Exportar vCard.</li>
        <li><strong>Android:</strong> app Contactos → Ajustes → Exportar → archivo .vcf; o contacts.google.com → Exportar → CSV de Google.</li>
        <li>Sube el archivo aquí. Nada se guarda hasta que pulses «Importar».</li>
      </ol>
      <div className="adm-form-row">
        <div className="adm-field"><label htmlFor="imp-archivo">Archivo (.vcf o .csv)</label><input id="imp-archivo" type="file" accept=".vcf,.vcard,.csv,text/vcard,text/csv" onChange={elegir} /></div>
        <div className="adm-field"><label htmlFor="imp-ind">Indicativo para números sin «+»</label><input id="imp-ind" value={indicativo} onChange={(e) => setIndicativo(e.target.value)} inputMode="numeric" placeholder="57" /></div>
        <div className="adm-field"><label htmlFor="imp-et">Etiqueta para todos (opcional)</label><input id="imp-et" list="crm-etiquetas-imp" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} placeholder="Ej.: Agenda oct 2026" /><datalist id="crm-etiquetas-imp">{ETIQUETAS_SUGERIDAS.map((t) => <option key={t} value={t} />)}</datalist></div>
      </div>

      {error && <p className="adm-ecos-error">{error}</p>}

      {plan && lectura && lectura.contactos.length > 0 && (
        <>
          <ul className="adm-crm-resumen">
            <li><strong>{lectura.contactos.length}</strong>con número en {archivo}</li>
            <li className="is-oro"><strong>{plan.nuevos.length}</strong>nuevos</li>
            <li><strong>{plan.completar.length}</strong>ya estaban, se les pone el número</li>
            <li><strong>{plan.repetidos}</strong>ya están (mismo número)</li>
            {(plan.sinTelefono + plan.invalidos) > 0 && <li><strong>{plan.sinTelefono + plan.invalidos}</strong>sin número válido, no entran</li>}
          </ul>
          {plan.nuevos.length > 0 && (
            <details className="adm-crm-muestra">
              <summary>Ver los nuevos</summary>
              <ul>{plan.nuevos.slice(0, 300).map((a) => <li key={a.telefono}><span>{a.nombre}</span><small>{a.telefono}</small></li>)}</ul>
              {plan.nuevos.length > 300 && <p className="adm-ecos-sub">…y {plan.nuevos.length - 300} más.</p>}
            </details>
          )}
          <button type="button" className="adm-add-btn" disabled={!total || guardando} onClick={guardar}>
            {guardando ? "Importando…" : total ? `Importar ${total}` : "No hay nada nuevo"}
          </button>
        </>
      )}
    </div>
  );
}

function Agregar({ agregar }: { agregar: Crm["agregar"] }) {
  const [nombre, setNombre] = useState("");
  const [grupo, setGrupo] = useState<GrupoContacto>("general");
  const [telefono, setTelefono] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    const err = await agregar(nombre, grupo, telefono);
    setMsg(err);
    if (!err) { setNombre(""); setTelefono(""); }
  }

  return (
    <form className="adm-card adm-card-pad adm-crm-agregar" onSubmit={enviar}>
      <div className="adm-form-row">
        <div className="adm-field"><label htmlFor="a-nombre">Nuevo contacto</label><input id="a-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" /></div>
        <div className="adm-field"><label htmlFor="a-tel">WhatsApp (opcional)</label><input id="a-tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+57 300 000 0000" /></div>
        <div className="adm-field"><label htmlFor="a-grupo">Grupo</label><select id="a-grupo" value={grupo} onChange={(e) => setGrupo(e.target.value as GrupoContacto)}>{(Object.keys(GRUPOS) as GrupoContacto[]).map((g) => <option key={g} value={g}>{GRUPOS[g]}</option>)}</select></div>
      </div>
      {msg && <p className="adm-ecos-error">{msg}</p>}
      <button type="submit" className="adm-add-btn" disabled={!nombre.trim()}>Agregar</button>
    </form>
  );
}
