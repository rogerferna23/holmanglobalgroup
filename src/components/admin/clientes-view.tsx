import { useMemo, useState, type FormEvent } from "react";
import { CLUB } from "@/lib/routes";
import { ContactosView } from "@/components/admin/contactos-view";
import {
  AREAS, ESTADO_LABEL, PRODUCTOS_PROGRAMA, fechaCorta, newId, promedioRueda, useProcesosAdmin,
  type Compromiso, type Creencia, type EstadoPrograma, type Habilidad, type Medicion, type MetaPequena,
  type Programa, type SesionPrograma,
} from "@/lib/proceso";
import type { AreaId } from "@/lib/test-heridas";
import { RedesPanel } from "@/components/redes-panel";
import { ResumenVisual } from "@/components/admin/cliente-ficha";
import { useRedes, type MiembroEquipo } from "@/lib/redes-cliente";

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
  // Nov 2026: dos mundos separados. «Mis clientes» (los que ya compraron) va
  // primero; «Prospección» es la agenda de WhatsApp para conseguir los próximos.
  const [tab, setTab] = useState<"clientes" | "prospeccion">("clientes");
  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <h1>Clientes</h1>
        <p>{tab === "prospeccion"
          ? "Tu agenda de WhatsApp para conseguir clientes: impórtala, ponle etiquetas y lleva en qué va cada persona. Escríbele y marca «Le escribí»: el seguimiento queda a los 2 días."
          : "Los que ya están contigo, por bloques. Toca uno para ver su avance en gráficas; ellos lo ven en «Mi proceso», dentro del club."}</p>
      </header>
      <nav className="adm-tabs" aria-label="Clientes">
        <button type="button" className={`adm-tab${tab === "clientes" ? " active" : ""}`} onClick={() => setTab("clientes")}>Mis clientes</button>
        <button type="button" className={`adm-tab${tab === "prospeccion" ? " active" : ""}`} onClick={() => setTab("prospeccion")}>Prospección</button>
      </nav>
      {tab === "prospeccion" ? <ContactosView /> : <Programas />}
    </div>
  );
}

function Programas() {
  const admin = useProcesosAdmin();
  const [sel, setSel] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const programa = admin.programas.find((p) => p.id === sel) ?? null;
  const volver = () => { setSel(null); setCreando(false); window.scrollTo({ top: 0 }); };
  const abrir = (id: string) => { setSel(id); setCreando(false); window.scrollTo({ top: 0 }); };

  return (
    <>
      {admin.error && <p className="adm-ecos-error">{admin.error}</p>}

      {creando ? (
        <>
          <button type="button" className="cf-volver" onClick={volver}>← Todos tus clientes</button>
          <NuevoPrograma alCrear={abrir} escribir={admin.escribir} />
        </>
      ) : programa ? (
        <Detalle
          key={programa.id}
          programa={programa}
          sesiones={admin.sesiones.filter((s) => s.programa_id === programa.id)}
          compromisos={admin.compromisos.filter((c) => c.programa_id === programa.id)}
          mediciones={admin.mediciones.filter((m) => m.programa_id === programa.id)}
          escribir={admin.escribir}
          subirActa={admin.subirActa}
          preview={admin.preview}
          volver={volver}
        />
      ) : (
        <Resumen
          programas={admin.programas}
          sesiones={admin.sesiones}
          compromisos={admin.compromisos}
          cargando={admin.loading}
          abrir={abrir}
          nuevo={() => { setCreando(true); setSel(null); }}
        />
      )}
    </>
  );
}

type Escribir = ReturnType<typeof useProcesosAdmin>["escribir"];

function NuevoPrograma({ alCrear, escribir }: { alCrear: (id: string) => void; escribir: Escribir }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [producto, setProducto] = useState("sentido-elite");
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

type TabFicha = "resumen" | "sesiones" | "m2h2" | "rueda" | "redes" | "ajustes";
const TABS_FICHA: { id: TabFicha; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "sesiones", label: "Sesiones y compromisos" },
  { id: "m2h2", label: "Fórmula M2H2" },
  { id: "rueda", label: "Rueda de la Vida" },
  { id: "redes", label: "Redes y equipo" },
  { id: "ajustes", label: "Ajustes" },
];

function Detalle({ programa: p, sesiones, compromisos, mediciones, escribir, subirActa, preview, volver }: {
  programa: Programa; sesiones: SesionPrograma[]; compromisos: Compromiso[]; mediciones: Medicion[];
  escribir: Escribir; subirActa: ReturnType<typeof useProcesosAdmin>["subirActa"]; preview: boolean; volver: () => void;
}) {
  const [tab, setTab] = useState<TabFicha>("resumen");
  return (
    <div className="cf-ficha">
      <button type="button" className="cf-volver" onClick={volver}>← Todos tus clientes</button>
      <header className="cf-top">
        <div className="cf-avatar" aria-hidden="true">{p.nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</div>
        <div className="cf-top-info">
          <h2>{p.nombre}</h2>
          <p>{p.titulo} · {p.email} · {p.user_id ? "con cuenta en el club" : "sin cuenta todavía"}</p>
        </div>
        <span className={`adm-pill ${p.estado === "activo" ? "ok" : "off"}`}>{ESTADO_LABEL[p.estado]}</span>
      </header>
      <nav className="cf-tabs" aria-label={`Ficha de ${p.nombre}`}>
        {TABS_FICHA.map((t) => (
          <button key={t.id} type="button" className={`rp-chip${tab === t.id ? " is-on" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </nav>

      <div className="adm-cli-bloques">
        {tab === "resumen" && (
          <ResumenVisual programa={p} sesiones={sesiones} compromisos={compromisos} mediciones={mediciones} preview={preview} irA={setTab} />
        )}
        {tab === "sesiones" && (
          <>
            <NuevaSesion programa={p} numero={sesiones.length + 1} escribir={escribir} subirActa={subirActa} />
            <ListaCompromisos compromisos={compromisos} escribir={escribir} />
            <ListaSesiones sesiones={sesiones} escribir={escribir} />
          </>
        )}
        {tab === "m2h2" && <CuatroPasos programa={p} escribir={escribir} />}
        {tab === "rueda" && <NuevaMedicion programa={p} mediciones={mediciones} escribir={escribir} />}
        {tab === "redes" && <EquipoYRedes programa={p} />}
        {tab === "ajustes" && <Ficha programa={p} escribir={escribir} />}
      </div>
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

/**
 * Fórmula M2H2: Metas · Mentalidad · Habilidades · Hábitos. La meta a 90 días
 * está en la ficha y los hábitos son los compromisos de cada sesión; aquí va el resto.
 */
function CuatroPasos({ programa: p, escribir }: { programa: Programa; escribir: Escribir }) {
  const [sentido, setSentido] = useState(p.sentido ?? "");
  const [metas, setMetas] = useState<MetaPequena[]>(p.metas ?? []);
  const [tarjeta, setTarjeta] = useState(p.tarjeta ?? "");
  const [creencias, setCreencias] = useState<Creencia[]>(p.creencias ?? []);
  const [habilidades, setHabilidades] = useState<Habilidad[]>(p.habilidades ?? []);
  const [msg, setMsg] = useState<string | null>(null);

  const cambiar = <T,>(set: (f: (xs: T[]) => T[]) => void, i: number, c: Partial<T>) => set((xs) => xs.map((x, j) => (j === i ? { ...x, ...c } : x)));
  const quitar = <T,>(set: (f: (xs: T[]) => T[]) => void, i: number) => set((xs) => xs.filter((_, j) => j !== i));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const err = await escribir("programas", "hgg_programas", {
      actualizar: {
        id: p.id,
        cambios: {
          sentido: sentido.trim() || null,
          metas: metas.filter((m) => m.texto.trim()).map((m) => ({ ...m, texto: m.texto.trim(), fecha: m.fecha || null })),
          tarjeta: tarjeta.trim() || null,
          creencias: creencias.filter((c) => c.antes.trim() || c.ahora.trim()).map((c) => ({ antes: c.antes.trim(), ahora: c.ahora.trim() })),
          habilidades: habilidades.filter((h) => h.nombre.trim()).map((h) => ({ nombre: h.nombre.trim(), nivel: h.nivel })),
        },
      },
    });
    setMsg(err ? (err.includes("column") ? `${err} — falta correr la migración 20261028_hgg_proceso_4_pasos.sql` : err) : "Guardado. Ya lo ve en «Mi proceso».");
  }

  return (
    <div className="adm-card adm-card-pad">
      <div className="adm-card-head">
        <div className="adm-card-titlerow"><h2 className="adm-card-title">Fórmula M2H2</h2></div>
        <span className="adm-card-sub">metas · mentalidad · habilidades · hábitos</span>
      </div>
      <form className="adm-ecos-form" onSubmit={guardar}>
        <h3 className="adm-cli-paso">1 · Metas</h3>
        <div className="adm-field"><label htmlFor="p-sentido">Su sentido (el para qué, en una frase)</label><input id="p-sentido" value={sentido} onChange={(e) => setSentido(e.target.value)} placeholder="Ej.: acompañar a mamás emprendedoras a vivir de lo que saben" /></div>
        <label className="adm-field-label">Metas pequeñas (camino a la de 90 días)</label>
        {metas.map((m, i) => (
          <div key={i} className="adm-field adm-cli-fila">
            <input type="checkbox" aria-label="Lograda" checked={m.hecha} onChange={(e) => cambiar(setMetas, i, { hecha: e.target.checked })} />
            <input aria-label="Meta" value={m.texto} onChange={(e) => cambiar(setMetas, i, { texto: e.target.value })} placeholder="Ej.: vender 2.000 USD antes del 31 de octubre" />
            <input aria-label="Fecha" type="date" value={m.fecha ?? ""} onChange={(e) => cambiar(setMetas, i, { fecha: e.target.value || null })} />
            <button type="button" className="adm-ecos-del" onClick={() => quitar(setMetas, i)}>Quitar</button>
          </div>
        ))}
        <button type="button" className="club-link adm-cli-mas" onClick={() => setMetas((xs) => [...xs, { texto: "", fecha: null, hecha: false }])}>+ Meta pequeña</button>

        <h3 className="adm-cli-paso">2 · Mentalidad</h3>
        <div className="adm-field"><label htmlFor="p-tarjeta">Su tarjeta (la meta en presente, para leer mañana y noche)</label><textarea id="p-tarjeta" rows={3} value={tarjeta} onChange={(e) => setTarjeta(e.target.value)} placeholder="Ej.: Es 14 de diciembre y acompaño a mis primeras 3 clientas…" /></div>
        <label className="adm-field-label">Creencias que está cambiando</label>
        {creencias.map((c, i) => (
          <div key={i} className="adm-field adm-cli-fila">
            <input aria-label="Antes pensaba" value={c.antes} onChange={(e) => cambiar(setCreencias, i, { antes: e.target.value })} placeholder="Antes: vender es molestar" />
            <input aria-label="Ahora elijo" value={c.ahora} onChange={(e) => cambiar(setCreencias, i, { ahora: e.target.value })} placeholder="Ahora: vender es ayudar" />
            <button type="button" className="adm-ecos-del" onClick={() => quitar(setCreencias, i)}>Quitar</button>
          </div>
        ))}
        <button type="button" className="club-link adm-cli-mas" onClick={() => setCreencias((xs) => [...xs, { antes: "", ahora: "" }])}>+ Creencia</button>

        <h3 className="adm-cli-paso">3 · Habilidades</h3>
        {habilidades.map((h, i) => (
          <div key={i} className="adm-field adm-cli-fila">
            <input aria-label="Habilidad" value={h.nombre} onChange={(e) => cambiar(setHabilidades, i, { nombre: e.target.value })} placeholder="Ej.: Ventas" />
            <input aria-label="Nivel del 1 al 10" type="number" min={1} max={10} value={h.nivel} onChange={(e) => cambiar(setHabilidades, i, { nivel: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })} />
            <button type="button" className="adm-ecos-del" onClick={() => quitar(setHabilidades, i)}>Quitar</button>
          </div>
        ))}
        <button type="button" className="club-link adm-cli-mas" onClick={() => setHabilidades((xs) => [...xs, { nombre: "", nivel: 3 }])}>+ Habilidad</button>

        <h3 className="adm-cli-paso">4 · Hábitos</h3>
        <p className="adm-ecos-note">Son los compromisos: se cargan al registrar cada sesión, y el cliente los marca en su panel.</p>
        {msg && <p className="adm-ecos-note">{msg}</p>}
        <button type="submit" className="adm-add-btn">Guardar la fórmula</button>
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

// ---------------------------------------------------------------------------
// Resumen: el progreso de todos los clientes, por línea (nov 2026)
// ---------------------------------------------------------------------------

/** Fundadores, Sentido, Marca con Huella u otros: un bloque por línea. */
const LINEAS = ["Fundadores", "Sentido", "Marca con Huella", "Otros"] as const;
type Linea = (typeof LINEAS)[number];
function linea(producto: string): Linea {
  if (producto === "fundador") return "Fundadores";
  if (producto.startsWith("marca")) return "Marca con Huella";
  if (producto.startsWith("sentido")) return "Sentido";
  return "Otros";
}

const diasDesde = (iso: string) => Math.floor((Date.now() - new Date(`${iso.slice(0, 10)}T12:00:00`).getTime()) / 86400000);

function Resumen({ programas, sesiones, compromisos, cargando, abrir, nuevo }: {
  programas: Programa[]; sesiones: SesionPrograma[]; compromisos: Compromiso[]; cargando: boolean; abrir: (id: string) => void; nuevo: () => void;
}) {
  const [filtro, setFiltro] = useState<Linea | "todas">("todas");
  const [verTerminados, setVerTerminados] = useState(false);
  const [buscar, setBuscar] = useState("");
  const ids = useMemo(() => programas.map((p) => p.id), [programas]);
  const redes = useRedes(ids);

  if (cargando) return <div className="adm-card adm-card-pad"><p className="adm-tx-empty">Cargando…</p></div>;
  const q = buscar.trim().toLowerCase();
  const visibles = programas.filter((p) =>
    (verTerminados || p.estado !== "terminado")
    && (filtro === "todas" || linea(p.producto) === filtro)
    && (!q || p.nombre.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)));
  const vigentes = programas.filter((p) => p.estado !== "terminado");
  const cuenta = (l: Linea) => vigentes.filter((p) => linea(p.producto) === l).length;
  const terminados = programas.filter((p) => p.estado === "terminado").length;
  const activos = programas.filter((p) => p.estado === "activo");
  const quietos = activos.filter((p) => {
    const ult = sesiones.filter((s) => s.programa_id === p.id).reduce<string | null>((m, s) => (!m || s.fecha > m ? s.fecha : m), null);
    return (ult ? diasDesde(ult) : diasDesde(p.inicio)) > 21;
  }).length;
  const sesMes = sesiones.filter((s) => diasDesde(s.fecha) <= 30 && programas.some((p) => p.id === s.programa_id)).length;

  return (
    <div className="adm-cli-resumen">
      <div className="cf-kpis">
        <div className="cf-kpi"><span className="cf-kpi-titulo">Clientes activos</span><strong>{activos.length}</strong><small>{vigentes.length - activos.length} en pausa</small></div>
        <div className="cf-kpi"><span className="cf-kpi-titulo">Sesiones en 30 días</span><strong>{sesMes}</strong><small>entre todos</small></div>
        <div className={`cf-kpi${quietos ? " is-alerta" : ""}`}><span className="cf-kpi-titulo">Sin sesión hace 3 semanas</span><strong>{quietos}</strong><small>{quietos ? "en rojo abajo" : "todos al día"}</small></div>
        <button type="button" className="cf-kpi cf-kpi-nuevo" onClick={nuevo}><strong>+</strong><small>Nuevo cliente</small></button>
      </div>

      {!programas.length ? (
        <div className="adm-card adm-card-pad"><p className="adm-tx-empty">Todavía no tienes clientes con programa. Abre el primero con «+ Nuevo cliente».</p></div>
      ) : (
      <div className="adm-card adm-card-pad">
      <div className="adm-cli-barra">
        <input className="adm-cli-buscar" type="search" placeholder="Buscar por nombre o correo" value={buscar} onChange={(e) => setBuscar(e.target.value)} aria-label="Buscar cliente" />
      </div>
      <div className="rp-chips adm-cli-filtros">
        <button type="button" className={`rp-chip${filtro === "todas" ? " is-on" : ""}`} onClick={() => setFiltro("todas")}>Todos</button>
        {LINEAS.map((l) => cuenta(l) > 0 && (
          <button key={l} type="button" className={`rp-chip${filtro === l ? " is-on" : ""}`} onClick={() => setFiltro(l)}>{l} ({cuenta(l)})</button>
        ))}
        {terminados > 0 && (
          <button type="button" className={`rp-chip${verTerminados ? " is-on" : ""}`} onClick={() => setVerTerminados((v) => !v)}>Terminados ({terminados})</button>
        )}
      </div>

      {LINEAS.map((l) => {
        const deLinea = visibles.filter((p) => linea(p.producto) === l);
        if (!deLinea.length) return null;
        return (
          <section key={l} className="adm-cli-linea">
            <h3 className="adm-cli-paso">{l}</h3>
            <div className="adm-cli-tablero">
              {deLinea.map((p) => (
                <TarjetaProgreso
                  key={p.id}
                  programa={p}
                  sesiones={sesiones.filter((s) => s.programa_id === p.id)}
                  compromisos={compromisos.filter((c) => c.programa_id === p.id)}
                  equipo={redes.equipo.filter((e) => e.programa_id === p.id)}
                  publicadas={redes.publicaciones.filter((x) => x.programa_id === p.id && x.estado === "publicada").length}
                  porAprobar={redes.publicaciones.filter((x) => x.programa_id === p.id && x.estado === "aprobar").length}
                  abrir={() => abrir(p.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
      {visibles.length === 0 && <p className="adm-tx-empty">Nadie coincide con la búsqueda.</p>}
      </div>
      )}
    </div>
  );
}

function TarjetaProgreso({ programa: p, sesiones, compromisos, equipo, publicadas, porAprobar, abrir }: {
  programa: Programa; sesiones: SesionPrograma[]; compromisos: Compromiso[]; equipo: MiembroEquipo[];
  publicadas: number; porAprobar: number; abrir: () => void;
}) {
  const hechos = compromisos.filter((c) => c.hecho).length;
  const ultima = sesiones.reduce<string | null>((m, s) => (!m || s.fecha > m ? s.fecha : m), null);
  const dias = ultima ? diasDesde(ultima) : null;
  // Activo y sin sesión hace 3 semanas: pide atención.
  const quieto = p.estado === "activo" && (dias == null ? diasDesde(p.inicio) > 21 : dias > 21);
  const pctSes = p.sesiones_total ? Math.min(100, Math.round((sesiones.length / p.sesiones_total) * 100)) : null;

  return (
    <button type="button" className={`adm-cli-prog${quieto ? " is-quieto" : ""}`} onClick={abrir}>
      <div className="adm-cli-prog-top">
        <strong>{p.nombre}</strong>
        <span className={`adm-pill ${p.estado === "activo" ? "ok" : "off"}`}>{ESTADO_LABEL[p.estado]}</span>
      </div>
      <small>{p.titulo}</small>

      <div className="adm-cli-prog-fila">
        <span>Etapa: {p.etapas[p.etapa_actual] ?? "—"}</span>
        <span>{p.etapa_actual + 1} de {p.etapas.length}</span>
      </div>
      <div className="pg-etapas" aria-hidden="true">
        {p.etapas.map((e, i) => <span key={e} className={i < p.etapa_actual ? "is-hecha" : i === p.etapa_actual ? "is-actual" : ""} />)}
      </div>

      <div className="adm-cli-prog-fila">
        <span>Sesiones</span>
        <span>{sesiones.length}{p.sesiones_total ? ` de ${p.sesiones_total}` : ""}</span>
      </div>
      {pctSes != null && <div className="pg-barra" aria-hidden="true"><span style={{ width: `${pctSes}%` }} /></div>}

      <ul className="adm-cli-prog-datos">
        <li>Compromisos: {compromisos.length ? `${hechos} de ${compromisos.length} cumplidos` : "ninguno todavía"}</li>
        <li className={quieto ? "is-alerta" : ""}>
          Última sesión: {ultima ? `${fechaCorta(ultima)}${dias != null && dias > 0 ? ` (hace ${dias} ${dias === 1 ? "día" : "días"})` : " (hoy)"}` : "ninguna todavía"}
        </li>
        {equipo.length > 0 && (
          <li>Redes: {equipo.map((e) => e.nombre).join(", ")} · {publicadas} publicadas{porAprobar ? ` · ${porAprobar} por aprobar` : ""}</li>
        )}
      </ul>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Equipo y redes de un programa (Sol)
// ---------------------------------------------------------------------------

function EquipoYRedes({ programa: p }: { programa: Programa }) {
  const ids = useMemo(() => [p.id], [p.id]);
  const redes = useRedes(ids);
  const [nombre, setNombre] = useState("Sol");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const verForm = formAbierto || (!redes.loading && redes.equipo.length === 0);

  async function asignar(e: FormEvent) {
    e.preventDefault();
    const err = await redes.escribir("equipo", { insertar: { programa_id: p.id, email: email.trim().toLowerCase(), nombre: nombre.trim(), rol: "redes" } });
    setMsg(err ? (err.includes("duplicate") ? "Esa persona ya está asignada." : err) : `Listo: ${nombre.trim()} ya ve a ${p.nombre} en «Mis clientes» de su panel.`);
    if (!err) { setEmail(""); setFormAbierto(false); }
  }

  return (
    <div className="adm-card adm-card-pad">
      <div className="adm-card-head">
        <div className="adm-card-titlerow"><h2 className="adm-card-title">Equipo y redes</h2></div>
        <span className="adm-card-sub">lo ve en «Mi proceso»</span>
      </div>

      {redes.error && <p className="adm-ecos-error">{redes.error.includes("does not exist") || redes.error.includes("schema cache") ? "Falta correr la migración 20261123_hgg_redes_equipo.sql." : redes.error}</p>}

      {redes.equipo.length > 0 ? (
        <ul className="adm-cli-equipo">
          {redes.equipo.map((m) => (
            <li key={m.id}>
              <span><strong>{m.nombre}</strong> · {m.email} · lleva las redes</span>
              <button type="button" className="rp-link" onClick={async () => setMsg(await redes.escribir("equipo", { borrar: m.id }) ?? `${m.nombre} ya no ve a ${p.nombre}.`)}>Quitar</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="adm-ecos-sub">Nadie del equipo tiene asignado a {p.nombre}.</p>
      )}

      {!verForm && <button type="button" className="rp-link" onClick={() => setFormAbierto(true)}>+ Asignar a otra persona</button>}
      {verForm && <form className="adm-ecos-form" onSubmit={asignar}>
        <div className="adm-form-row">
          <div className="adm-field"><label htmlFor="eq-nombre">Nombre</label><input id="eq-nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
          <div className="adm-field"><label htmlFor="eq-email">Correo con el que entra al club</label><input id="eq-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        </div>
        {msg && <p className="adm-ecos-note">{msg}</p>}
        <button type="submit" className="adm-add-btn">Asignar sus redes</button>
        <p className="adm-ecos-note">Esa persona ve a este cliente en «Mis clientes» de su panel del club y anota ahí avances, piezas y números.</p>
      </form>}
      {!verForm && msg && <p className="adm-ecos-note">{msg}</p>}

      <div className="adm-cli-redes">
        <RedesPanel programaId={p.id} modo="admin" autor="Holman" />
      </div>
    </div>
  );
}
