import { useState, type FormEvent } from "react";
import {
  ETAPAS, ETAPA_LABEL, GRUPOS, enlaceWhatsApp, primerMensaje, useContactos,
  type Contacto, type EtapaContacto, type GrupoContacto,
} from "@/lib/contactos";
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

/**
 * Torre → Clientes → Contactos. El CRM de Holman: a quién escribirle, en qué
 * va cada persona y a quién le toca seguimiento hoy (cadencia día 0, 2 y 5).
 */
export function ContactosView() {
  const crm = useContactos();
  const [grupo, setGrupo] = useState<GrupoContacto | "todos">("todos");
  const [etapa, setEtapa] = useState<EtapaContacto | "hoy" | "todas">("todas");
  const [buscar, setBuscar] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const delGrupo = crm.contactos.filter((c) => grupo === "todos" || c.grupo === grupo);
  const paraHoy = (c: Contacto) => !!c.proximo && c.proximo <= hoy() && ABIERTA.includes(c.etapa);
  const q = buscar.trim().toLowerCase();
  const lista = delGrupo
    .filter((c) => (etapa === "todas" ? true : etapa === "hoy" ? paraHoy(c) : c.etapa === etapa))
    .filter((c) => !q || c.nombre.toLowerCase().includes(q) || (c.notas ?? "").toLowerCase().includes(q))
    .sort((a, b) => Number(paraHoy(b)) - Number(paraHoy(a)) || ORDEN[a.etapa] - ORDEN[b.etapa] || a.created_at.localeCompare(b.created_at));

  const cuenta = (e: EtapaContacto) => delGrupo.filter((c) => c.etapa === e).length;
  const nHoy = delGrupo.filter(paraHoy).length;

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
    const err = await crm.actualizar(c.id, {
      etapa: c.etapa === "por_contactar" ? "contactado" : c.etapa,
      ultimo_contacto: new Date().toISOString(),
      proximo: enDias(c.etapa === "por_contactar" ? 2 : 3),
    });
    setMsg(err ?? `Listo: ${c.nombre}, seguimiento el ${fechaCorta(enDias(c.etapa === "por_contactar" ? 2 : 3))}.`);
  }

  return (
    <div className="adm-crm">
      {crm.error && <p className="adm-ecos-error">{crm.error}</p>}

      <div className="adm-crm-barra">
        <div className="adm-crm-grupos" role="group" aria-label="Grupo">
          {(["todos", "fundador", "general"] as const).map((g) => (
            <button key={g} type="button" className={`adm-crm-chip${grupo === g ? " is-on" : ""}`} onClick={() => setGrupo(g)}>
              {g === "todos" ? "Todos" : GRUPOS[g]} <span>{g === "todos" ? crm.contactos.length : crm.contactos.filter((c) => c.grupo === g).length}</span>
            </button>
          ))}
        </div>
        <input className="adm-crm-buscar" type="search" placeholder="Buscar por nombre o nota" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
      </div>

      <div className="adm-crm-embudo" role="group" aria-label="Etapa">
        <button type="button" className={`adm-crm-etapa${etapa === "todas" ? " is-on" : ""}`} onClick={() => setEtapa("todas")}><strong>{delGrupo.length}</strong>Todas</button>
        <button type="button" className={`adm-crm-etapa is-hoy${etapa === "hoy" ? " is-on" : ""}`} onClick={() => setEtapa("hoy")}><strong>{nHoy}</strong>Seguimiento hoy</button>
        {ETAPAS.map((e) => (
          <button key={e.id} type="button" className={`adm-crm-etapa${etapa === e.id ? " is-on" : ""}`} onClick={() => setEtapa(e.id)}><strong>{cuenta(e.id)}</strong>{e.label}</button>
        ))}
      </div>

      {msg && <p className="adm-ecos-note adm-crm-msg">{msg}</p>}

      {crm.loading ? <p className="adm-tx-empty">Cargando…</p> : lista.length === 0 ? (
        <p className="adm-tx-empty">{etapa === "hoy" ? "Nadie pide seguimiento hoy." : "No hay contactos aquí."}</p>
      ) : (
        <ul className="adm-crm-lista">
          {lista.map((c) => (
            <Fila
              key={c.id}
              c={c}
              hoy={paraHoy(c)}
              abierto={abierto === c.id}
              alternar={() => setAbierto((a) => (a === c.id ? null : c.id))}
              copiar={() => copiar(c)}
              leEscribi={() => leEscribi(c)}
              actualizar={async (cambios) => setMsg(await crm.actualizar(c.id, cambios))}
              borrar={async () => { if (confirm(`¿Borrar a ${c.nombre}?`)) setMsg(await crm.borrar(c.id)); }}
            />
          ))}
        </ul>
      )}

      <Agregar agregar={crm.agregar} />
    </div>
  );
}

function Fila({ c, hoy: esHoy, abierto, alternar, copiar, leEscribi, actualizar, borrar }: {
  c: Contacto; hoy: boolean; abierto: boolean; alternar: () => void; copiar: () => void; leEscribi: () => void;
  actualizar: (cambios: Partial<Contacto>) => Promise<void>; borrar: () => void;
}) {
  const [notas, setNotas] = useState(c.notas ?? "");
  const [telefono, setTelefono] = useState(c.telefono ?? "");
  const wa = enlaceWhatsApp(c);

  return (
    <li className={`adm-crm-fila is-${c.etapa}${esHoy ? " is-hoy" : ""}`}>
      <div className="adm-crm-linea">
        <button type="button" className="adm-crm-nombre" onClick={alternar} aria-expanded={abierto}>
          <strong>{c.nombre}</strong>
          <small>
            {c.grupo === "fundador" ? "Fundador" : "Claridad"}
            {c.ultimo_contacto && ` · le escribiste el ${fechaCorta(c.ultimo_contacto)}`}
            {c.proximo && ABIERTA.includes(c.etapa) && <em className={esHoy ? "is-hoy" : ""}> · seguimiento {esHoy ? "hoy" : `el ${fechaCorta(c.proximo)}`}</em>}
          </small>
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
          <p className="adm-crm-mensaje">{primerMensaje(c)}</p>
          <div className="adm-form-row">
            <div className="adm-field"><label htmlFor={`t-${c.id}`}>WhatsApp (con indicativo)</label><input id={`t-${c.id}`} value={telefono} onChange={(e) => setTelefono(e.target.value)} onBlur={() => telefono !== (c.telefono ?? "") && void actualizar({ telefono: telefono.trim() || null })} placeholder="+57 300 000 0000" /></div>
            <div className="adm-field"><label htmlFor={`p-${c.id}`}>Próximo seguimiento</label><input id={`p-${c.id}`} type="date" value={c.proximo ?? ""} onChange={(e) => void actualizar({ proximo: e.target.value || null })} /></div>
            <div className="adm-field"><label htmlFor={`g-${c.id}`}>Grupo</label><select id={`g-${c.id}`} value={c.grupo} onChange={(e) => void actualizar({ grupo: e.target.value as GrupoContacto })}>{(Object.keys(GRUPOS) as GrupoContacto[]).map((g) => <option key={g} value={g}>{GRUPOS[g]}</option>)}</select></div>
          </div>
          <div className="adm-field"><label htmlFor={`n-${c.id}`}>Notas</label><textarea id={`n-${c.id}`} rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} onBlur={() => notas !== (c.notas ?? "") && void actualizar({ notas: notas.trim() || null })} placeholder="Qué te dijo, qué necesita, cuándo volver a escribirle" /></div>
          <div className="adm-crm-pie">
            <span className="adm-ecos-sub">Etapa: {ETAPA_LABEL[c.etapa]}</span>
            <button type="button" className="adm-ecos-del" onClick={borrar}>Borrar</button>
          </div>
        </div>
      )}
    </li>
  );
}

function Agregar({ agregar }: { agregar: ReturnType<typeof useContactos>["agregar"] }) {
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
