import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BORRADOR_VACIO, ESTADO_ENVIO, PLANTILLAS, armarHtml, faltantes, paraVistaPrevia, useCorreosApi,
  type Bloqueado, type Borrador, type Contacto, type Envio, type Segmento,
} from "@/lib/correos";

const TABS = [
  { id: "redactar", label: "Redactar" },
  { id: "contactos", label: "Contactos" },
  { id: "historial", label: "Historial" },
  { id: "bloqueados", label: "Bloqueados" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const CLAVE_BORRADOR = "hgg-correos-borrador";
const CLAVE_PRUEBA = "hgg-correos-prueba-a";

function leer<T>(clave: string, base: T): T {
  try {
    const v = localStorage.getItem(clave);
    return v ? { ...base, ...JSON.parse(v) } : base;
  } catch {
    return base;
  }
}
function guardar(clave: string, valor: unknown) {
  try { localStorage.setItem(clave, typeof valor === "string" ? valor : JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
}

// Resend escribe «2026-10-11 14:00:00.123+00»: se lleva a ISO para que el navegador la lea.
const fecha = (iso: string | null) =>
  iso ? new Date(iso.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00")).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";

/** Personas de una lista que sí reciben (suscritas y sin bloqueo). */
const alcance = (contactos: Contacto[], segmento: string) =>
  contactos.filter((c) => c.segmentos.includes(segmento) && !c.unsubscribed && !c.bloqueado).length;

/**
 * Torre → Correos. Email marketing con Resend: redactar con vista previa,
 * prueba antes de enviar, contactos por lista (General, ECOS), historial y
 * bloqueados. Los correos automáticos del club no pasan por aquí.
 */
export function CorreosView() {
  const api = useCorreosApi();
  const [tab, setTab] = useState<Tab>("redactar");
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true); setError(null);
    try {
      const r = await api<{ segmentos: Segmento[]; contactos: Contacto[] }>("contactos");
      setSegmentos(r.segmentos);
      setContactos(r.contactos);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
    }
  }, [api]);

  useEffect(() => { void recargar(); }, [recargar]);

  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <h1>Correos</h1>
        <p>Email marketing con Resend: boletines, invitaciones y noticias para tus listas. Los correos automáticos del club (bienvenida, avisos de clase, recordatorios) siguen por su cuenta.</p>
      </header>

      <div className="adm-ecos-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`adm-ecos-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="adm-ecos-error">{error}</p>}

      {tab === "redactar" && <Redactar segmentos={segmentos} contactos={contactos} cargando={cargando} alEnviar={() => setTab("historial")} />}
      {tab === "contactos" && <Contactos segmentos={segmentos} contactos={contactos} cargando={cargando} recargar={recargar} />}
      {tab === "historial" && <Historial />}
      {tab === "bloqueados" && <Bloqueados alCambiar={recargar} />}
    </div>
  );
}

// ── Redactar ────────────────────────────────────────────────────────────────

function Redactar({ segmentos, contactos, cargando, alEnviar }: {
  segmentos: Segmento[]; contactos: Contacto[]; cargando: boolean; alEnviar: () => void;
}) {
  const api = useCorreosApi();
  const [b, setB] = useState<Borrador>(() => leer(CLAVE_BORRADOR, BORRADOR_VACIO));
  const [pruebaA, setPruebaA] = useState(() => { try { return localStorage.getItem(CLAVE_PRUEBA) || "soporte@holmanglobalgroup.com"; } catch { return "soporte@holmanglobalgroup.com"; } });
  const [movil, setMovil] = useState(false);
  const [probado, setProbado] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [programar, setProgramar] = useState("");
  const [busy, setBusy] = useState<"prueba" | "enviar" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  useEffect(() => { guardar(CLAVE_BORRADOR, b); }, [b]);
  // La lista por defecto: General, si existe.
  useEffect(() => {
    if (!b.segmento && segmentos.length) {
      const general = segmentos.find((s) => /general/i.test(s.name)) ?? segmentos[0];
      setB((x) => ({ ...x, segmento: general.id }));
    }
  }, [segmentos, b.segmento]);

  const html = useMemo(() => armarHtml(b), [b]);
  const falta = faltantes(b, html);
  const n = b.segmento ? alcance(contactos, b.segmento) : 0;
  const lista = segmentos.find((s) => s.id === b.segmento);
  // La prueba vale para esta versión exacta: si cambias algo, se vuelve a probar.
  const pruebaAlDia = probado === html + b.asunto;
  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => { setB((x) => ({ ...x, [k]: v })); setConfirmar(false); };

  async function prueba() {
    setBusy("prueba"); setMsg(null);
    try {
      const para = pruebaA.split(/[,\s]+/).filter(Boolean);
      await api("prueba", { para, asunto: b.asunto, html });
      guardar(CLAVE_PRUEBA, pruebaA);
      setProbado(html + b.asunto);
      setMsg({ ok: true, t: `Prueba enviada a ${para.join(", ")}. Ábrela y revisa que el botón se vea antes de enviar.` });
    } catch (e) {
      setMsg({ ok: false, t: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }

  async function enviar() {
    setBusy("enviar"); setMsg(null);
    try {
      const cuando = programar ? new Date(programar).toISOString() : undefined;
      await api("enviar", { segment_id: b.segmento, asunto: b.asunto, html, nombre: b.asunto, programar: cuando });
      setMsg({ ok: true, t: cuando ? `Programado para el ${fecha(cuando)}.` : `Enviado a ${n} personas de ${lista?.name ?? "la lista"}.` });
      setConfirmar(false); setProgramar(""); setProbado(null);
      setB((x) => ({ ...BORRADOR_VACIO, plantilla: x.plantilla, segmento: x.segmento }));
      alEnviar();
    } catch (e) {
      setMsg({ ok: false, t: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }

  const plantilla = PLANTILLAS.find((p) => p.id === b.plantilla)!;

  return (
    <div className="adm-mail-grid">
      <div className="adm-card adm-card-pad">
        <div className="adm-ecos-form">
          <div className="adm-form-row">
            <div className="adm-field">
              <label htmlFor="m-lista">Lista</label>
              <select id="m-lista" value={b.segmento} onChange={(e) => set("segmento", e.target.value)} disabled={cargando}>
                {cargando && <option value="">Cargando…</option>}
                {segmentos.map((s) => <option key={s.id} value={s.id}>{s.name} · {alcance(contactos, s.id)} personas</option>)}
              </select>
            </div>
            <div className="adm-field">
              <label htmlFor="m-plant">Plantilla</label>
              <select id="m-plant" value={b.plantilla} onChange={(e) => set("plantilla", e.target.value as Borrador["plantilla"])}>
                {PLANTILLAS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <p className="adm-ecos-note">{plantilla.nota}</p>

          <div className="adm-field"><label htmlFor="m-asunto">Asunto</label><input id="m-asunto" value={b.asunto} onChange={(e) => set("asunto", e.target.value)} placeholder="Un recordatorio sobre ECOS" /></div>
          <div className="adm-field"><label htmlFor="m-pre">Texto de vista previa <span className="adm-ecos-sub">(lo que se lee junto al asunto)</span></label><input id="m-pre" value={b.preheader} onChange={(e) => set("preheader", e.target.value)} /></div>

          {b.plantilla === "html" ? (
            <div className="adm-field"><label htmlFor="m-html">HTML</label><textarea id="m-html" rows={16} className="adm-mail-code" value={b.htmlPropio} onChange={(e) => set("htmlPropio", e.target.value)} placeholder="<!DOCTYPE html>…" /></div>
          ) : (
            <>
              {b.plantilla === "bitacora" && (
                <div className="adm-field"><label htmlFor="m-etq">Sección <span className="adm-ecos-sub">(arriba, en dorado)</span></label><input id="m-etq" value={b.etiqueta} onChange={(e) => set("etiqueta", e.target.value)} placeholder="La Bitácora del Elefante · Podcast" /></div>
              )}
              <div className="adm-field"><label htmlFor="m-tit">Título <span className="adm-ecos-sub">(opcional)</span></label><input id="m-tit" value={b.titulo} onChange={(e) => set("titulo", e.target.value)} /></div>
              <label className="adm-mail-check"><input type="checkbox" checked={b.saludo} onChange={(e) => set("saludo", e.target.checked)} /> Empezar con «Hola, nombre:»</label>
              <div className="adm-field">
                <label htmlFor="m-cuerpo">Texto</label>
                <textarea id="m-cuerpo" rows={10} value={b.cuerpo} onChange={(e) => set("cuerpo", e.target.value)} />
                <p className="adm-ecos-sub">Línea en blanco = párrafo nuevo · **así** = negrita · «&gt; » al inicio = frase destacada · los enlaces del sitio llevan UTM solos.</p>
              </div>
              <div className="adm-form-row">
                <div className="adm-field"><label htmlFor="m-btn">Botón <span className="adm-ecos-sub">(opcional)</span></label><input id="m-btn" value={b.boton} onChange={(e) => set("boton", e.target.value)} placeholder="Quiero entrar" /></div>
                <div className="adm-field"><label htmlFor="m-url">Enlace del botón</label><input id="m-url" type="url" value={b.enlace} onChange={(e) => set("enlace", e.target.value)} placeholder="https://holmanglobalgroup.com/ecos" /></div>
              </div>
              <div className="adm-field"><label htmlFor="m-desp">Despedida</label><textarea id="m-desp" rows={2} value={b.despedida} onChange={(e) => set("despedida", e.target.value)} /></div>
            </>
          )}

          <div className="adm-mail-acciones">
            <div className="adm-field adm-mail-prueba">
              <label htmlFor="m-prueba">Mandar prueba a</label>
              <input id="m-prueba" value={pruebaA} onChange={(e) => setPruebaA(e.target.value)} />
            </div>
            <button type="button" className="adm-tx-toolbar-btn" disabled={busy !== null || !b.asunto.trim() || !html.trim()} onClick={prueba}>
              {busy === "prueba" ? "Enviando…" : "Enviar prueba"}
            </button>
            <button type="button" className="adm-add-btn" disabled={busy !== null || falta.length > 0 || !pruebaAlDia} onClick={() => setConfirmar(true)}>
              Enviar a la lista…
            </button>
          </div>
          {falta.length > 0 ? (
            <p className="adm-ecos-sub">Falta: {falta.join(", ")}.</p>
          ) : !pruebaAlDia ? (
            <p className="adm-ecos-sub">Antes de enviar, manda la prueba de esta versión y revísala.</p>
          ) : null}

          {confirmar && (
            <div className="adm-mail-confirmar">
              <p>Vas a enviar <strong>«{b.asunto}»</strong> a <strong>{n} personas</strong> de la lista <strong>{lista?.name}</strong>. Los bloqueados y quienes se dieron de baja no lo reciben.</p>
              <div className="adm-field"><label htmlFor="m-prog">Programar <span className="adm-ecos-sub">(vacío = ahora)</span></label><input id="m-prog" type="datetime-local" value={programar} onChange={(e) => setProgramar(e.target.value)} /></div>
              <div className="adm-mail-acciones">
                <button type="button" className="adm-tx-toolbar-btn" onClick={() => setConfirmar(false)} disabled={busy !== null}>Volver</button>
                <button type="button" className="adm-add-btn" onClick={enviar} disabled={busy !== null}>
                  {busy === "enviar" ? "Enviando…" : programar ? "Sí, programar" : `Sí, enviar a ${n}`}
                </button>
              </div>
            </div>
          )}
          {msg && <p className={msg.ok ? "adm-mail-ok" : "adm-ecos-error"}>{msg.t}</p>}
        </div>
      </div>

      <div className="adm-card adm-mail-vista">
        <div className="adm-card-head">
          <div className="adm-card-titlerow"><h2 className="adm-card-title">Vista previa</h2></div>
          <div className="adm-ecos-filtros">
            <button type="button" className={movil ? "" : "on"} onClick={() => setMovil(false)}>Escritorio</button>
            <button type="button" className={movil ? "on" : ""} onClick={() => setMovil(true)}>Móvil</button>
          </div>
        </div>
        <div className="adm-mail-bandeja">
          <strong>{b.asunto || "Asunto"}</strong>
          <span>{b.preheader || "Texto de vista previa"}</span>
        </div>
        <div className={`adm-mail-marco${movil ? " movil" : ""}`}>
          <iframe title="Vista previa del correo" srcDoc={paraVistaPrevia(html)} sandbox="" />
        </div>
      </div>
    </div>
  );
}

// ── Contactos ───────────────────────────────────────────────────────────────

function Contactos({ segmentos, contactos, cargando, recargar }: {
  segmentos: Segmento[]; contactos: Contacto[]; cargando: boolean; recargar: () => Promise<void>;
}) {
  const api = useCorreosApi();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<string>("todos");
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [listas, setListas] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  useEffect(() => {
    if (!listas.length && segmentos.length) {
      const g = segmentos.find((s) => /general/i.test(s.name));
      if (g) setListas([g.id]);
    }
  }, [segmentos, listas.length]);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return contactos
      .filter((c) => filtro === "todos" || (filtro === "baja" ? c.unsubscribed || c.bloqueado : c.segmentos.includes(filtro)))
      .filter((c) => !t || c.email.includes(t) || (c.first_name ?? "").toLowerCase().includes(t))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [contactos, q, filtro]);

  async function hacer(clave: string, accion: string, datos: Record<string, unknown>, ok?: (r: Record<string, unknown>) => string) {
    setBusy(clave); setMsg(null);
    try {
      const r = await api<Record<string, unknown>>(accion, datos);
      if (ok) setMsg({ ok: true, t: ok(r) });
      await recargar();
      return true;
    } catch (e) {
      setMsg({ ok: false, t: e instanceof Error ? e.message : String(e) });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function agregar(e: FormEvent) {
    e.preventDefault();
    const ok = await hacer("agregar", "agregar", { email, nombre, segmentos: listas }, (r) => r.resultado === "existia" ? "Ya estaba; quedó en las listas elegidas." : "Contacto agregado.");
    if (ok) { setEmail(""); setNombre(""); }
  }

  const ecos = segmentos.find((s) => s.name.trim().toLowerCase() === "ecos");

  return (
    <div className="adm-mail-contactos">
      <div className="adm-card adm-card-pad">
        <div className="adm-card-head"><div className="adm-card-titlerow"><h2 className="adm-card-title">Agregar contacto</h2></div></div>
        <form className="adm-ecos-form" onSubmit={agregar}>
          <div className="adm-form-row">
            <div className="adm-field"><label htmlFor="k-email">Correo</label><input id="k-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="adm-field"><label htmlFor="k-nombre">Nombre</label><input id="k-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
          </div>
          <div className="adm-mail-listas">
            {segmentos.map((s) => (
              <label key={s.id} className="adm-mail-check">
                <input type="checkbox" checked={listas.includes(s.id)} onChange={(e) => setListas((l) => e.target.checked ? [...l, s.id] : l.filter((x) => x !== s.id))} /> {s.name}
              </label>
            ))}
          </div>
          <p className="adm-ecos-sub">Agrega solo a quien te dio permiso de escribirle.</p>
          <div className="adm-mail-acciones">
            <button type="submit" className="adm-add-btn" disabled={busy !== null || !listas.length}>{busy === "agregar" ? "Agregando…" : "Agregar"}</button>
          </div>
        </form>
        <hr className="adm-mail-hr" />
        <p className="adm-ecos-note">La lista <strong>ECOS</strong> se llena con los miembros del club que no han cancelado. Se crea sola la primera vez.</p>
        <button type="button" className="adm-tx-toolbar-btn" disabled={busy !== null} onClick={() => hacer("ecos", "sincronizar_ecos", {}, (r) => `Lista ECOS al día: ${r.agregados} nuevos, ${r.total} en total.`)}>
          {busy === "ecos" ? "Sincronizando…" : "Sincronizar miembros de ECOS"}
        </button>
        {msg && <p className={msg.ok ? "adm-mail-ok" : "adm-ecos-error"}>{msg.t}</p>}
      </div>

      <div className="adm-card">
        <div className="adm-card-head adm-mail-head">
          <div className="adm-card-titlerow"><h2 className="adm-card-title">Contactos</h2><span className="adm-ecos-sub">{visibles.length} de {contactos.length}</span></div>
          <div className="adm-mail-filtros">
            <div className="adm-search"><input placeholder="Buscar correo o nombre" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="adm-ecos-filtros">
              <button type="button" className={filtro === "todos" ? "on" : ""} onClick={() => setFiltro("todos")}>Todos</button>
              {segmentos.map((s) => <button key={s.id} type="button" className={filtro === s.id ? "on" : ""} onClick={() => setFiltro(s.id)}>{s.name}</button>)}
              <button type="button" className={filtro === "baja" ? "on" : ""} onClick={() => setFiltro("baja")}>De baja</button>
            </div>
          </div>
        </div>
        {cargando ? <p className="adm-tx-empty">Cargando…</p> : visibles.length === 0 ? <p className="adm-tx-empty">No hay contactos con ese filtro.</p> : (
          <div className="adm-mail-tabla">
            <table className="adm-vend-table">
              <thead><tr><th>Correo</th><th>Nombre</th><th>Listas</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {visibles.map((c) => (
                  <tr key={c.id}>
                    <td>{c.email}</td>
                    <td>{c.first_name ?? "—"}</td>
                    <td>
                      <div className="adm-mail-chips">
                        {segmentos.map((s) => {
                          const dentro = c.segmentos.includes(s.id);
                          return (
                            <button key={s.id} type="button" className={`adm-mail-chip${dentro ? " on" : ""}`} disabled={busy !== null || (c.bloqueado && !dentro)}
                              title={dentro ? `Quitar de ${s.name}` : `Agregar a ${s.name}`}
                              onClick={() => hacer(`seg-${c.id}`, "segmento", { email: c.email, segment_id: s.id, quitar: dentro })}>
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td>
                      {c.bloqueado ? <span className="adm-pill off">Bloqueado</span> : c.unsubscribed ? <span className="adm-pill off">De baja</span> : <span className="adm-pill ok">Suscrito</span>}
                    </td>
                    <td>
                      {!c.bloqueado && (
                        <button type="button" className="adm-ecos-del" disabled={busy !== null}
                          onClick={() => hacer(`sus-${c.id}`, "suscripcion", { email: c.email, baja: !c.unsubscribed })}>
                          {c.unsubscribed ? "Reactivar" : "Dar de baja"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!ecos && !cargando && <p className="adm-ecos-note adm-card-pad">Todavía no existe la lista ECOS: pulsa «Sincronizar miembros de ECOS».</p>}
      </div>
    </div>
  );
}

// ── Historial ───────────────────────────────────────────────────────────────

function Historial() {
  const api = useCorreosApi();
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<{ id: string; html: string; asunto: string } | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true); setError(null);
    try {
      const r = await api<{ envios: Envio[]; segmentos: Segmento[] }>("historial");
      setEnvios([...r.envios].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      setSegmentos(r.segmentos);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
    }
  }, [api]);
  useEffect(() => { void cargar(); }, [cargar]);

  async function ver(id: string) {
    try {
      const r = await api<{ envio: { html: string | null; subject: string } }>("envio", { id });
      setAbierto({ id, html: r.envio.html ?? "", asunto: r.envio.subject });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function cancelar(id: string) {
    if (!window.confirm("¿Cancelar este envío programado?")) return;
    try { await api("cancelar", { id }); await cargar(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  const nombreLista = (id: string) => segmentos.find((s) => s.id === id)?.name ?? "—";

  return (
    <div className="adm-mail-grid">
      <div className="adm-card">
        <div className="adm-card-head">
          <div className="adm-card-titlerow"><h2 className="adm-card-title">Envíos</h2></div>
          <button type="button" className="adm-tx-toolbar-btn" onClick={cargar}>Actualizar</button>
        </div>
        {error && <p className="adm-ecos-error">{error}</p>}
        {cargando ? <p className="adm-tx-empty">Cargando…</p> : envios.length === 0 ? <p className="adm-tx-empty">Todavía no hay envíos.</p> : (
          <div className="adm-mail-tabla">
            <table className="adm-vend-table">
              <thead><tr><th>Envío</th><th>Lista</th><th>Estado</th><th>Fecha</th><th /></tr></thead>
              <tbody>
                {envios.map((e) => (
                  <tr key={e.id} className={abierto?.id === e.id ? "adm-mail-sel" : ""}>
                    <td><button type="button" className="adm-mail-link" onClick={() => ver(e.id)}>{e.name || "(sin nombre)"}</button></td>
                    <td>{nombreLista(e.segment_id)}</td>
                    <td><span className={`adm-pill ${e.status === "sent" ? "ok" : "off"}`}>{ESTADO_ENVIO[e.status] ?? e.status}</span></td>
                    <td>{fecha(e.sent_at ?? e.scheduled_at ?? e.created_at)}</td>
                    <td>{e.status === "scheduled" && <button type="button" className="adm-ecos-del" onClick={() => cancelar(e.id)}>Cancelar</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="adm-ecos-note adm-card-pad">Aperturas, clics y rebotes de cada envío: en Resend → Broadcasts (entrar con soporte@).</p>
      </div>
      <div className="adm-card adm-mail-vista">
        <div className="adm-card-head"><div className="adm-card-titlerow"><h2 className="adm-card-title">{abierto ? abierto.asunto : "Vista previa"}</h2></div></div>
        {abierto ? (
          <div className="adm-mail-marco"><iframe title="Correo enviado" srcDoc={paraVistaPrevia(abierto.html)} sandbox="" /></div>
        ) : <p className="adm-tx-empty">Elige un envío para verlo.</p>}
      </div>
    </div>
  );
}

// ── Bloqueados ──────────────────────────────────────────────────────────────

function Bloqueados({ alCambiar }: { alCambiar: () => Promise<void> }) {
  const api = useCorreosApi();
  const [lista, setLista] = useState<Bloqueado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await api<{ bloqueados: Bloqueado[] }>("bloqueados");
      setLista(r.bloqueados);
    } catch (e) {
      setMsg({ ok: false, t: e instanceof Error ? e.message : String(e) });
    } finally {
      setCargando(false);
    }
  }, [api]);
  useEffect(() => { void cargar(); }, [cargar]);

  async function bloquear(e: FormEvent) {
    e.preventDefault();
    const emails = texto.split(/[\s,;]+/).filter((x) => x.includes("@"));
    if (!emails.length) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ n: number }>("bloquear", { emails, motivo });
      setMsg({ ok: true, t: `${r.n} correo(s) bloqueados y dados de baja en Resend.` });
      setTexto(""); setMotivo("");
      await cargar(); await alCambiar();
    } catch (err) {
      setMsg({ ok: false, t: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function quitar(email: string) {
    if (!window.confirm(`¿Quitar ${email} de bloqueados? Seguirá de baja hasta que lo reactives en Contactos.`)) return;
    try { await api("desbloquear", { email }); await cargar(); await alCambiar(); } catch (e) { setMsg({ ok: false, t: e instanceof Error ? e.message : String(e) }); }
  }

  return (
    <div className="adm-mail-contactos">
      <div className="adm-card adm-card-pad">
        <div className="adm-card-head"><div className="adm-card-titlerow"><h2 className="adm-card-title">Bloquear correos</h2></div></div>
        <p className="adm-ecos-note">Quien está aquí nunca recibe marketing: no se puede agregar como contacto y, antes de cada envío, queda de baja en Resend aunque alguien lo vuelva a importar.</p>
        <form className="adm-ecos-form" onSubmit={bloquear}>
          <div className="adm-field"><label htmlFor="b-mails">Correos <span className="adm-ecos-sub">(uno por línea o separados por coma)</span></label><textarea id="b-mails" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} /></div>
          <div className="adm-field"><label htmlFor="b-motivo">Motivo <span className="adm-ecos-sub">(opcional, solo para ti)</span></label><input id="b-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></div>
          <div className="adm-mail-acciones"><button type="submit" className="adm-add-btn" disabled={busy || !texto.trim()}>{busy ? "Bloqueando…" : "Bloquear"}</button></div>
        </form>
        {msg && <p className={msg.ok ? "adm-mail-ok" : "adm-ecos-error"}>{msg.t}</p>}
      </div>
      <div className="adm-card">
        <div className="adm-card-head"><div className="adm-card-titlerow"><h2 className="adm-card-title">Bloqueados</h2><span className="adm-ecos-sub">{lista.length}</span></div></div>
        {cargando ? <p className="adm-tx-empty">Cargando…</p> : lista.length === 0 ? <p className="adm-tx-empty">La lista está vacía.</p> : (
          <table className="adm-vend-table">
            <thead><tr><th>Correo</th><th>Motivo</th><th>Desde</th><th /></tr></thead>
            <tbody>
              {lista.map((x) => (
                <tr key={x.email}>
                  <td>{x.email}</td><td>{x.motivo ?? "—"}</td><td>{fecha(x.created_at)}</td>
                  <td><button type="button" className="adm-ecos-del" onClick={() => quitar(x.email)}>Quitar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
