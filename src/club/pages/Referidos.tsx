import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CLUB } from "@/lib/routes";
import { NegocioTabs } from "@/club/NegocioTabs";
import { useClub } from "@/contexts/ClubContext";
import { enPrueba, tieneBeneficios, ECOS, usd } from "@/lib/ecos";
import { getSupabase } from "@/lib/supabase";
import { useAperturasAgenda, useDatosPago, useMisPersonas, type AperturasAgenda, type DatosPago, type MiPersona, type MiReferido } from "@/lib/club-store";
import { marcarReferidosVistos } from "@/club/AvisoReferidos";
import { TusEnlaces } from "@/club/TusEnlaces";
import { InvitaMasterclass } from "@/club/InvitaMasterclass";

/**
 * Comisiones del miembro. Todo vive aquí: su enlace, qué figura es, cuánto
 * lleva ganado y de dónde salió cada peso.
 *
 * Dos figuras, y la diferencia es el club:
 *  - EMBAJADOR: miembro activo. Gana 10% de TODO lo que compren las personas
 *    que trajo —el club y cualquier producto de HGG—, mientras siga activo.
 *  - AFILIADO: no es del club. Gana 10% solo de la primera compra de cada
 *    persona que trae.
 * La figura no se administra a mano: entra al club y sube a embajador; sale
 * del club y vuelve a afiliado.
 *
 * Los datos vienen de la función `hgg_my_commissions`. Si no responde —o si
 * todavía no hay nada que mostrar— la página se queda en su estado vacío.
 */

type Kind = "embajador" | "afiliado" | null;
type Fuente = "club" | "producto" | "closer" | "delegawork";

const FUENTE: Record<Fuente, string> = { club: "Club", producto: "Producto", closer: "Cierre", delegawork: "DelegaWork" };
const CONCEPTO: Record<Fuente, string> = {
  club: "Membresía de ECOS", producto: "Compra en HGG", closer: "Venta que cerraste", delegawork: "Cliente de DelegaWork (cada mes)",
};
type Estado = "pendiente" | "pagada" | "anulada";

type Movimiento = {
  id: number | string;
  source: Fuente;
  concept: string | null;
  buyer_name: string | null;
  base_amount: number;
  pct: number;
  amount: number;
  status: Estado;
  created_at: string;
};

type Comisiones = {
  kind: Kind;
  code: string | null;
  pendiente: number;
  pagado: number;
  total: number;
  personas: number;
  movimientos: Movimiento[];
};

const VACIO: Comisiones = {
  kind: null,
  code: null,
  pendiente: 0,
  pagado: 0,
  total: 0,
  personas: 0,
  movimientos: [],
};

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
}

/** La respuesta llega como JSON suelto: se normaliza antes de pintarla. */
function normalizar(raw: unknown): Comisiones {
  if (!raw || typeof raw !== "object") return VACIO;
  const d = raw as Record<string, unknown>;
  const kind = d.kind === "embajador" || d.kind === "afiliado" ? d.kind : null;
  const lista = Array.isArray(d.movimientos) ? (d.movimientos as Record<string, unknown>[]) : [];
  return {
    kind,
    code: typeof d.code === "string" && d.code.trim() !== "" ? d.code : null,
    pendiente: num(d.pendiente),
    pagado: num(d.pagado),
    total: num(d.total),
    personas: num(d.personas),
    movimientos: lista.map((m, i) => ({
      id: (m.id as number | string) ?? i,
      source: (["producto", "closer", "delegawork"] as const).find((f) => f === m.source) ?? "club",
      concept: typeof m.concept === "string" ? m.concept : null,
      buyer_name: typeof m.buyer_name === "string" ? m.buyer_name : null,
      base_amount: num(m.base_amount),
      pct: num(m.pct),
      amount: num(m.amount),
      status: m.status === "pagada" ? "pagada" : m.status === "anulada" ? "anulada" : "pendiente",
      created_at: typeof m.created_at === "string" ? m.created_at : "",
    })),
  };
}

function fecha(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

const ESTADO: Record<Estado, string> = {
  pendiente: "Por pagar",
  pagada: "Pagada",
  anulada: "Anulada",
};

export default function Referidos() {
  const { member } = useClub();
  const { personas, loading: cargandoPersonas } = useMisPersonas();
  const aperturas = useAperturasAgenda();
  // Ver la lista cuenta como «ya lo vi»: el aviso de Inicio no se repite.
  useEffect(() => {
    if (!cargandoPersonas) marcarReferidosVistos(member?.id);
  }, [cargandoPersonas, member?.id]);
  const [datos, setDatos] = useState<Comisiones>(VACIO);
  const [cargando, setCargando] = useState(true);
  // % especial sobre productos (Fundadores Elite: 15%). Sin fila, el de siempre.
  const [pctProductos, setPctProductos] = useState<number | null>(null);

  useEffect(() => {
    if (!member?.id) return;
    let vivo = true;
    getSupabase().from("hgg_comision_especial").select("pct, hasta").eq("user_id", member.id).maybeSingle()
      .then(({ data }) => {
        const vigente = data && (!data.hasta || Date.parse(data.hasta) > Date.now());
        if (vivo && vigente) setPctProductos(Number(data.pct));
      }, () => { /* sin la tabla, el % general */ });
    return () => { vivo = false; };
  }, [member?.id]);
  const pctProd = pctProductos ?? ECOS.comisionReferidoPct;

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data } = await getSupabase().rpc("hgg_my_commissions");
        if (vivo && data) setDatos(normalizar(data));
      } catch {
        // Sin conexión con el servidor la página se queda en su estado vacío:
        // es preferible a una pantalla rota.
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  // Si la función no alcanzó a responder, el código de miembro sirve igual:
  // es el mismo que quedó registrado para referir.
  const code = datos.code ?? member?.referral_code ?? "";
  // En el club se es embajador por estarlo, aunque la función aún no responda.
  const kind: Kind = datos.kind ?? (tieneBeneficios(member) ? "embajador" : null);
  // Lo más reciente primero; se ven los primeros y el resto con «Ver todos».
  const movs = [...datos.movimientos].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const [todosMovs, setTodosMovs] = useState(false);

  return (
    <div className="club-page">
      <header className="club-page-head">
        <p className="club-eyebrow">Negocio</p>
        <h1>Mi negocio</h1>
        <p className="club-page-sub">
          <span className={`cms-figura-tag ${kind ?? "sin"}`}>
            {kind === "embajador" ? "Embajador" : kind === "afiliado" ? "Afiliado" : "Aún sin figura"}
          </span>{" "}
          {kind === "embajador" && pctProductos
            ? `Como Fundador Elite ganas el ${pctProd}% de los programas y servicios que compren las personas que traes (Sentido, Marca con Huella, DelegaWork…) y el ${ECOS.comisionReferidoPct}% de su membresía de ECOS.`
            : kind === "embajador"
            ? `Ganas el ${ECOS.comisionReferidoPct}% de todo lo que compren las personas que traes, mientras tu membresía siga activa.`
            : kind === "afiliado"
              ? `Ganas el ${ECOS.comisionReferidoPct}% de la primera compra de cada persona. En el club ganas en todas.`
              : "Tus comisiones se abren al activar tu membresía."}
          {kind === null && enPrueba(member) && <> <Link to={CLUB.activar}>Activar mi membresía</Link></>}
        </p>
        <NegocioTabs />
      </header>

      {/* Lo que más se usa va arriba: invitar y los enlaces. Los números, después. */}
      <InvitaMasterclass code={code} />

      <TusEnlaces code={code} cargando={cargando} />

      <TusPersonas personas={personas} cargando={cargandoPersonas} aperturas={aperturas} />

      <PanelComisiones datos={datos} memberId={member?.id} />

      <section className="cms-detalle">
        <div className="club-list-head">
          <h3>Movimientos</h3>
          {datos.movimientos.length > 0 && (
            <span className="club-muted">Total acumulado: {usd(datos.total)}</span>
          )}
        </div>

        {datos.movimientos.length > 0 ? (
          <>
          <ul className="cms-movs">
            {(todosMovs ? movs : movs.slice(0, VISIBLES)).map((m) => (
              <li key={m.id} className={`cms-mov ${m.source}`}>
                <span className={`cms-fuente ${m.source}`}>
                  {FUENTE[m.source]}
                </span>
                <div className="cms-mov-body">
                  <p className="cms-mov-title">{m.concept || CONCEPTO[m.source]}</p>
                  <p className="cms-mov-meta">
                    {m.buyer_name || "Una persona que trajiste"}
                    {fecha(m.created_at) ? ` · ${fecha(m.created_at)}` : ""} · {usd(m.base_amount)} al{" "}
                    {num(m.pct)}%
                  </p>
                </div>
                <div className="cms-mov-monto">
                  <span className="cms-mov-amount">{usd(m.amount)}</span>
                  <span className={`cms-estado ${m.status}`}>{ESTADO[m.status]}</span>
                </div>
              </li>
            ))}
          </ul>
          <VerTodas total={movs.length} abierto={todosMovs} onClick={() => setTodosMovs((v) => !v)} />
          </>
        ) : (
          <div className="cms-vacio">
            <p className="cms-vacio-title">
              {cargando ? "Revisando tus movimientos." : "Todavía no hay movimientos."}
            </p>
            <p className="club-muted">
              Aquí va a aparecer cada compra que hagan las personas que traes: qué compraron, cuánto
              fue y cuánto te queda a ti. Comparte tu enlace con alguien a quien de verdad le sirva
              lo que hacemos y el primero llega solo.
            </p>
          </div>
        )}
      </section>

    </div>
  );
}

/** Cuántas filas se ven antes de «Ver todos». */
const VISIBLES = 5;

function VerTodas({ total, abierto, onClick }: { total: number; abierto: boolean; onClick: () => void }) {
  if (total <= VISIBLES) return null;
  return (
    <button type="button" className="cms-ver-todas" onClick={onClick} aria-expanded={abierto}>
      {abierto ? "Ver menos" : `Ver todos (${total})`}
    </button>
  );
}

/* --- Tus personas: todas las que llegaron por su enlace ------------------ */

const ESTADO_CLUB: Record<MiReferido["estado"], { label: string; nota: string }> = {
  prueba: { label: "En prueba", nota: "Está conociendo el club. Un mensaje tuyo ahora ayuda a que se quede." },
  activo: { label: "En el club", nota: "Paga su membresía: cada pago te suma comisión." },
  pausado: { label: "En pausa", nota: "Su pago quedó pendiente." },
  cancelado: { label: "Salió del club", nota: "Dejó el club." },
  sin_activar: { label: "Sin activar", nota: "Creó su cuenta y aún no activa la membresía." },
};

/** La etapa más avanzada de la persona y qué hacer con ella. */
function etapa(p: MiPersona): { clase: string; label: string; nota: string } {
  if (p.compra) return { clase: "compro", label: "Compró", nota: `Compró ${usd(p.compra.total)}. Ya cuenta en tus comisiones.` };
  if (p.club) return { clase: p.club.estado === "activo" ? "club" : p.club.estado === "prueba" ? "prueba" : "fuera", ...ESTADO_CLUB[p.club.estado] };
  if (p.claridad) {
    if (p.claridad.estado === "asistio") return { clase: "claridad", label: "Tuvo su Claridad", nota: "HGG ya habló con ella. Pregúntale cómo le fue." };
    if (p.claridad.estado === "no_asistio") return { clase: "fuera", label: "No llegó", nota: "No llegó a su Sesión de Claridad. Ayúdala a escoger otro horario." };
    return { clase: "claridad", label: "Agendó Claridad", nota: `Su sesión es el ${fecha(p.claridad.fecha)}. Escríbele el día antes para que no falte.` };
  }
  if (p.masterclass) {
    return p.masterclass.asistio
      ? { clase: "masterclass", label: "Fue a la masterclass", nota: "Invítala a su Sesión de Claridad gratis." }
      : { clase: "masterclass", label: "Masterclass", nota: `Se registró el ${fecha(p.masterclass.fecha)}. Recuérdale el día y la hora.` };
  }
  return { clase: "fuera", label: "—", nota: "" };
}

const PASOS: { id: keyof Pick<MiPersona, "masterclass" | "claridad" | "club" | "compra">; label: string }[] = [
  { id: "masterclass", label: "Masterclass" },
  { id: "claridad", label: "Claridad" },
  { id: "club", label: "Club" },
  { id: "compra", label: "Compra" },
];

function TusPersonas({ personas, cargando, aperturas }: {
  personas: MiPersona[];
  cargando: boolean;
  aperturas: AperturasAgenda;
}) {
  const [todos, setTodos] = useState(false);
  const compraron = personas.filter((p) => p.compra).length;
  const enClub = personas.filter((p) => p.club && (p.club.estado === "activo" || p.club.estado === "prueba")).length;
  return (
    <section className="cms-detalle">
      <div className="club-list-head">
        <h3>Tus personas</h3>
        {personas.length > 0 && (
          <span className="club-muted">
            {personas.length} en total · {enClub} en el club · {compraron} {compraron === 1 ? "compró" : "compraron"}
          </span>
        )}
      </div>

      {personas.length > 0 ? (
        <>
        <ul className="cms-movs">
          {(todos ? personas : personas.slice(0, VISIBLES)).map((p, i) => {
            const e = etapa(p);
            const wa = (p.whatsapp ?? "").replace(/\D/g, "");
            return (
              <li key={`${p.nombre}-${p.ultima}-${i}`} className={`cms-mov cms-per ${e.clase}`}>
                <span className={`cms-ref-estado ${e.clase}`}>{e.label}</span>
                <div className="cms-mov-body">
                  <p className="cms-mov-title">{p.nombre}</p>
                  <p className="cms-mov-meta">{e.nota}</p>
                  <ol className="cms-per-pasos" aria-label="Por dónde ha pasado">
                    {PASOS.map((s) => <li key={s.id} className={p[s.id] ? "hecho" : ""}>{s.label}</li>)}
                  </ol>
                </div>
                {wa ? (
                  <a className="club-btn small ghost" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                ) : <span />}
              </li>
            );
          })}
        </ul>
        <VerTodas total={personas.length} abierto={todos} onClick={() => setTodos((v) => !v)} />
        </>
      ) : (
        <div className="cms-vacio">
          <p className="cms-vacio-title">
            {cargando ? "Buscando a las personas que trajiste." : "Aquí vas a ver a cada persona que llegue por tus enlaces."}
          </p>
          <p className="club-muted">
            Aparece desde que se registra a la masterclass, agenda su Sesión de Claridad o crea su cuenta
            en el club, y ves hasta dónde va. Así sabes a quién escribirle y cuándo.
          </p>
        </div>
      )}

      {aperturas.total > 0 && (
        <p className="club-muted cms-aperturas">
          Tu enlace de la Sesión de Claridad se abrió <strong>{aperturas.mes}</strong> {aperturas.mes === 1 ? "vez" : "veces"} este mes
          ({aperturas.total} en total). Quien agenda aparece en esta lista sola, a tu nombre.
        </p>
      )}
    </section>
  );
}

/* --- Dónde recibe el pago ------------------------------------------------ */

const METODOS: { id: DatosPago["metodo"]; label: string; ayuda: string }[] = [
  { id: "zelle", label: "Zelle", ayuda: "El correo o el teléfono de tu Zelle, y el nombre del titular." },
  { id: "paypal", label: "PayPal", ayuda: "El correo de tu cuenta de PayPal." },
  { id: "banco", label: "Cuenta bancaria", ayuda: "Banco, país, tipo y número de cuenta, nombre y documento del titular." },
  { id: "otro", label: "Otro", ayuda: "Cuéntanos cómo prefieres recibirlo." },
];

function DondeTePagamos({ memberId }: { memberId: string | null | undefined }) {
  const { datos, loading, guardar } = useDatosPago(memberId);
  const [editando, setEditando] = useState(false);
  const [metodo, setMetodo] = useState<DatosPago["metodo"]>("zelle");
  const [detalle, setDetalle] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function abrir() {
    setMetodo(datos?.metodo ?? "zelle");
    setDetalle(datos?.detalle ?? "");
    setMsg(null);
    setEditando(true);
  }

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    if (detalle.trim().length < 3) { setMsg("Escribe los datos para poder pagarte."); return; }
    setBusy(true);
    const e = await guardar({ metodo, detalle: detalle.trim() });
    setBusy(false);
    if (e) setMsg(e); else setEditando(false);
  }

  const m = METODOS.find((x) => x.id === (editando ? metodo : datos?.metodo));
  return (
    <div className="cms-panel-pago">
      <p className="cms-grafica-title">Dónde te pagamos</p>
      {editando ? (
        <form className="cms-pago-form" onSubmit={enviar}>
          <div className="cms-pago-metodos" role="radiogroup" aria-label="Cómo quieres recibirlo">
            {METODOS.map((x) => (
              <button key={x.id} type="button" role="radio" aria-checked={metodo === x.id}
                className={`neg-tab${metodo === x.id ? " active" : ""}`} onClick={() => setMetodo(x.id)}>{x.label}</button>
            ))}
          </div>
          <textarea rows={3} value={detalle} maxLength={500} onChange={(e) => setDetalle(e.target.value)} placeholder={m?.ayuda} aria-label="Tus datos de pago" />
          {msg && <p className="club-muted">{msg}</p>}
          <div className="inv-mc-botones">
            <button type="submit" className="club-btn small" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
            <button type="button" className="club-btn small ghost" onClick={() => setEditando(false)}>Cancelar</button>
          </div>
          <p className="club-muted cms-pago-nota">Solo lo ve Holman, para pagarte tus comisiones.</p>
        </form>
      ) : datos ? (
        <>
          <p className="cms-meta-title">{m?.label}</p>
          <p className="club-muted cms-pago-detalle">{datos.detalle}</p>
          <button type="button" className="club-link" onClick={abrir}>Cambiar</button>
        </>
      ) : (
        <>
          <p className="club-muted">
            {loading ? "Cargando…" : "Cuéntanos a dónde te enviamos tus comisiones: Zelle, PayPal o una cuenta bancaria. Se pagan cuando entra el dinero de la venta."}
          </p>
          {!loading && <button type="button" className="club-btn small" onClick={abrir}>Poner mis datos de pago</button>}
        </>
      )}
    </div>
  );
}

/* --- Panel principal: cifras, dónde te pagamos y ganancias por mes -------- */

function mesesRecientes(movs: Movimiento[], n = 6) {
  const hoy = new Date();
  const meses = Array.from({ length: n }, (_, k) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (n - 1 - k), 1);
    return { clave: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("es", { month: "short" }).replace(".", ""), total: 0 };
  });
  for (const m of movs) {
    if (m.status === "anulada" || !m.created_at) continue;
    const d = new Date(m.created_at);
    const mes = meses.find((x) => x.clave === `${d.getFullYear()}-${d.getMonth()}`);
    if (mes) mes.total += m.amount;
  }
  return meses;
}

function PanelComisiones({ datos, memberId }: { datos: Comisiones; memberId: string | null | undefined }) {
  const meses = mesesRecientes(datos.movimientos);
  const max = Math.max(...meses.map((m) => m.total));
  const [hover, setHover] = useState<number | null>(null);

  return (
    <section className="cms-panel">
      <div className="cms-panel-cifras">
        <div className="cms-cifra principal">
          <span className="cms-cifra-label">Por pagar</span>
          <span className="cms-cifra-num">{usd(datos.pendiente)}</span>
        </div>
        <div className="cms-cifra">
          <span className="cms-cifra-label">Ya pagado</span>
          <span className="cms-cifra-num">{usd(datos.pagado)}</span>
        </div>
        <div className="cms-cifra">
          <span className="cms-cifra-label">Personas que ya compraron</span>
          <span className="cms-cifra-num">{datos.personas}</span>
        </div>
      </div>

      <DondeTePagamos memberId={memberId} />

      <div className="cms-panel-grafica">
        <p className="cms-grafica-title">Lo que has ganado · últimos 6 meses</p>
        <div className="cms-barras" onMouseLeave={() => setHover(null)}>
          {meses.map((m, i) => {
            const alto = max > 0 ? Math.max(m.total > 0 ? 6 : 0, (m.total / max) * 100) : 0;
            const ultimo = i === meses.length - 1;
            return (
              <div
                key={m.clave}
                className={`cms-barra-col${hover === i ? " hover" : ""}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${m.label}: ${usd(m.total)}`}
              >
                <span className="cms-barra-valor">{hover === i || (hover === null && ultimo && m.total > 0) ? usd(m.total) : ""}</span>
                <span className="cms-barra-pista">
                  <span className="cms-barra" style={{ height: `${alto}%` }} />
                </span>
                <span className="cms-barra-mes">{m.label}</span>
              </div>
            );
          })}
        </div>
        {max === 0 && <p className="club-muted cms-grafica-vacia">Tu primera comisión va a aparecer aquí.</p>}
      </div>
    </section>
  );
}

