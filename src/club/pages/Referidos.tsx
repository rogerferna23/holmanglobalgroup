import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CLUB } from "@/lib/routes";
import { NegocioTabs } from "@/club/NegocioTabs";
import { useClub } from "@/contexts/ClubContext";
import { enPrueba, tieneBeneficios, ECOS, usd } from "@/lib/ecos";
import { getSupabase } from "@/lib/supabase";
import { useAperturasAgenda, useMisReferidos, type AperturasAgenda, type MiReferido } from "@/lib/club-store";
import { marcarReferidosVistos } from "@/club/AvisoReferidos";
import { compartirClub, enlaceClub } from "@/lib/promocion";
import { SITE } from "@/lib/config";

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
type Fuente = "club" | "producto";
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
      source: m.source === "producto" ? "producto" : "club",
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
  const { member, progress } = useClub();
  const { referidos, loading: cargandoReferidos } = useMisReferidos();
  const aperturas = useAperturasAgenda();
  // Ver la lista cuenta como «ya lo vi»: el aviso de Inicio no se repite.
  useEffect(() => {
    if (!cargandoReferidos) marcarReferidosVistos(member?.id);
  }, [cargandoReferidos, member?.id]);
  const [datos, setDatos] = useState<Comisiones>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState<"club" | "tienda" | null>(null);

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
  // El enlace principal abre la página del club, lista para suscribirse; el de
  // la tienda es para quien va por un producto. Los dos guardan el mismo código.
  const link = code ? enlaceClub(code) : "";
  const linkTienda = code ? `${SITE.url}/tienda?ref=${encodeURIComponent(code)}` : "";
  // En el club se es embajador por estarlo, aunque la función aún no responda.
  const kind: Kind = datos.kind ?? (tieneBeneficios(member) ? "embajador" : null);

  async function copiar(texto: string, cual: "club" | "tienda") {
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(cual);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      /* si el navegador no deja copiar, el enlace está a la vista para tomarlo a mano */
    }
  }

  return (
    <div className="club-page">
      <header className="club-page-head">
        <p className="club-eyebrow">Negocio</p>
        <h1>Tus comisiones</h1>
        <p className="club-page-sub">
          Una persona entra por tu enlace y compra: tú ganas el{" "}
          <strong>{ECOS.descuentoMiembroPct}%</strong> de esa compra. Aquí ves tu enlace, lo que
          llevas ganado y de dónde salió cada movimiento. Qué decir y a dónde llevar a cada persona
          está en <Link to="recomendar">Cómo recomendar</Link>.
        </p>
        <NegocioTabs />
      </header>

      <PanelComisiones datos={datos} />

      <section className="cms-figura">
        <span className={`cms-figura-tag ${kind ?? "sin"}`}>
          {kind === "embajador" ? "Embajador" : kind === "afiliado" ? "Afiliado" : "Aún sin figura"}
        </span>
        {kind === "embajador" && (
          <p>
            Eres embajador <strong>porque tu membresía del club está activa</strong>. Ganas el 10%
            de todo lo que compren las personas que traes —la membresía de ECOS y cualquier
            producto de Holman Global Group—, cada vez que compren, mientras sigas en el club.
          </p>
        )}
        {kind === "afiliado" && (
          <p>
            Como afiliado ganas el 10% de la <strong>primera compra</strong> de cada persona que
            traes. Si entras al club pasas a embajador y la comisión se vuelve del 10% de todas sus
            compras, no solo de la primera.
          </p>
        )}
        {kind === null && (
          <p>
            Tu enlace empieza a contar cuando actives tu membresía: ahí pasas a embajador y cada
            compra de las personas que traigas suma aquí.{" "}
            {enPrueba(member) && <Link to={CLUB.activar}>Activar mi membresía</Link>}
            {cargando ? " Estamos revisando tu estado." : ""}
          </p>
        )}
      </section>

      <section className="club-reflink">
        <label htmlFor="reflink">Tu enlace del club</label>
        {link ? (
          <>
            <div className="club-reflink-row">
              <input id="reflink" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className="club-btn small" onClick={() => copiar(link, "club")}>
                {copiado === "club" ? "Copiado" : "Copiar"}
              </button>
            </div>
            <div className="rec-acciones">
              <a className="club-btn small ghost" href={compartirClub(code)} target="_blank" rel="noopener noreferrer">
                Enviar por WhatsApp
              </a>
            </div>
            <p className="club-muted">
              Abre directo la página de <strong>ECOS</strong>, con el botón para crear la cuenta y
              empezar. Quien entre por él queda asociado a ti desde que se registra, y te cuenta en
              cada pago de su membresía y en cualquier producto de HGG que compre después.
            </p>
            <label htmlFor="reflink-tienda">Tu enlace de la tienda</label>
            <div className="club-reflink-row">
              <input id="reflink-tienda" readOnly value={linkTienda} onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className="club-btn small ghost" onClick={() => copiar(linkTienda, "tienda")}>
                {copiado === "tienda" ? "Copiado" : "Copiar"}
              </button>
            </div>
            <p className="club-muted">
              Para quien va por un producto (coaching, marca, web). Para invitar a una Sesión de
              Claridad está el enlace de agenda, en «Cómo recomendar». Tu código es <strong>{code}</strong>. Además, cada
              persona que entra al club por tu enlace y se queda te da +{ECOS.xp.referido} XP en las
              tres habilidades; has traído a {progress.referrals_total} y {progress.referrals_active}{" "}
              siguen activas.
            </p>
          </>
        ) : (
          <p className="club-muted">
            {cargando
              ? "Estamos buscando tu enlace."
              : "Tu código todavía no está listo. Lo generamos y aparece aquí en cuanto tu membresía quede activa; si quieres apurarlo, escríbenos y lo vemos."}
          </p>
        )}
      </section>

      <MisReferidos referidos={referidos} cargando={cargandoReferidos} aperturas={aperturas} />

      <section className="cms-detalle">
        <div className="club-list-head">
          <h3>Movimientos</h3>
          {datos.movimientos.length > 0 && (
            <span className="club-muted">Total acumulado: {usd(datos.total)}</span>
          )}
        </div>

        {datos.movimientos.length > 0 ? (
          <ul className="cms-movs">
            {datos.movimientos.map((m) => (
              <li key={m.id} className={`cms-mov ${m.source}`}>
                <span className={`cms-fuente ${m.source}`}>
                  {m.source === "club" ? "Club" : "Producto"}
                </span>
                <div className="cms-mov-body">
                  <p className="cms-mov-title">{m.concept || (m.source === "club" ? "Membresía de ECOS" : "Compra en HGG")}</p>
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

      <section className="club-rules">
        <div className="club-rule">
          <span className="club-rule-num">{ECOS.descuentoMiembroPct}%</span>
          <h3>de descuento en todo HGG</h3>
          <p>
            Programa Sentido, Marca con Huella, web, DelegaWork 360 y los cursos. Mientras tu
            membresía esté activa. Tu código de miembro es tu descuento:{" "}
            <strong>{code || "—"}</strong>.
          </p>
        </div>
      </section>
    </div>
  );
}

/* --- Las personas que trajo ---------------------------------------------- */

const ESTADO_REFERIDO: Record<MiReferido["estado"], { label: string; nota: string }> = {
  prueba: { label: "En prueba", nota: "Está conociendo el club. Un mensaje tuyo ahora ayuda a que se quede." },
  activo: { label: "Activa", nota: "Paga su membresía: cada pago te suma comisión." },
  pausado: { label: "En pausa", nota: "Su pago quedó pendiente." },
  cancelado: { label: "Salió", nota: "Dejó el club." },
  sin_activar: { label: "Sin activar", nota: "Creó su cuenta y aún no activa la membresía." },
};

function MisReferidos({ referidos, cargando, aperturas }: {
  referidos: MiReferido[];
  cargando: boolean;
  aperturas: AperturasAgenda;
}) {
  const enPruebaN = referidos.filter((r) => r.estado === "prueba").length;
  return (
    <section className="cms-detalle">
      <div className="club-list-head">
        <h3>Personas que trajiste</h3>
        {referidos.length > 0 && (
          <span className="club-muted">
            {referidos.length} en total
            {enPruebaN > 0 ? ` · ${enPruebaN} en su prueba gratis` : ""}
          </span>
        )}
      </div>

      {aperturas.total > 0 && (
        <p className="club-muted">
          Tu enlace de agenda se abrió <strong>{aperturas.mes}</strong> {aperturas.mes === 1 ? "vez" : "veces"} este mes
          ({aperturas.total} en total). Cuando alguien agende, avísale a HGG con el botón «Avisar a HGG» y su nombre.
        </p>
      )}

      {referidos.length > 0 ? (
        <ul className="cms-movs">
          {referidos.map((r, i) => (
            <li key={`${r.nombre}-${r.desde}-${i}`} className={`cms-mov cms-ref ${r.estado}`}>
              <span className={`cms-ref-estado ${r.estado}`}>{ESTADO_REFERIDO[r.estado].label}</span>
              <div className="cms-mov-body">
                <p className="cms-mov-title">{r.nombre}</p>
                <p className="cms-mov-meta">
                  {fecha(r.desde) ? `Entró el ${fecha(r.desde)} · ` : ""}
                  {ESTADO_REFERIDO[r.estado].nota}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="cms-vacio">
          <p className="cms-vacio-title">
            {cargando ? "Buscando a las personas que trajiste." : "Aquí vas a ver a cada persona que entre por tu enlace."}
          </p>
          <p className="club-muted">
            Aparece desde el momento en que crea su cuenta, con su estado: en su prueba gratis,
            activa o fuera del club. Así sabes a quién acompañar para que se quede.
          </p>
        </div>
      )}
    </section>
  );
}

/* --- Panel principal: cifras, meta y ganancias de los últimos meses ------- */

/** Escalones de la meta: la siguiente es la primera que aún no alcanza. */
const METAS = [1, 3, 5, 10, 25, 50, 100];

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

function PanelComisiones({ datos }: { datos: Comisiones }) {
  const meta = METAS.find((m) => m > datos.personas) ?? METAS[METAS.length - 1];
  const avance = Math.min(1, datos.personas / meta);
  const meses = mesesRecientes(datos.movimientos);
  const max = Math.max(...meses.map((m) => m.total));
  const [hover, setHover] = useState<number | null>(null);
  const R = 42;
  const C = 2 * Math.PI * R;

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

      <div className="cms-panel-meta">
        <svg viewBox="0 0 100 100" className="cms-anillo" role="img" aria-label={`Meta: ${datos.personas} de ${meta} personas`}>
          <circle cx="50" cy="50" r={R} className="cms-anillo-fondo" />
          {avance > 0 && <circle
            cx="50"
            cy="50"
            r={R}
            className="cms-anillo-avance"
            strokeDasharray={`${C * avance} ${C}`}
            transform="rotate(-90 50 50)"
          />}
          <text x="50" y="47" textAnchor="middle" className="cms-anillo-num">{datos.personas}/{meta}</text>
          <text x="50" y="62" textAnchor="middle" className="cms-anillo-txt">personas</text>
        </svg>
        <div>
          <p className="cms-meta-title">
            {datos.personas === 1 ? "1 persona llegó" : `${datos.personas} personas llegaron`} a HGG por tu recomendación
          </p>
          <p className="club-muted">Cada persona que compra por tu enlace suma aquí.</p>
        </div>
      </div>

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

