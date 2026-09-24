import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CLUB } from "@/lib/routes";
import { useClub } from "@/contexts/ClubContext";
import { enPrueba, tieneBeneficios, ECOS, usd } from "@/lib/ecos";
import { getSupabase } from "@/lib/supabase";

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
  const [datos, setDatos] = useState<Comisiones>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState(false);

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
  const link = code ? `${window.location.origin}/?ref=${code}` : "";
  // En el club se es embajador por estarlo, aunque la función aún no responda.
  const kind: Kind = datos.kind ?? (tieneBeneficios(member) ? "embajador" : null);

  async function copiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* si el navegador no deja copiar, el enlace está a la vista para tomarlo a mano */
    }
  }

  return (
    <div className="club-page">
      <header className="club-page-head">
        <p className="club-eyebrow">Por recomendar</p>
        <h1>Tus comisiones</h1>
        <p className="club-page-sub">
          Una persona entra por tu enlace y compra: tú ganas el{" "}
          <strong>{ECOS.descuentoMiembroPct}%</strong> de esa compra. Aquí ves tu enlace, lo que
          llevas ganado y de dónde salió cada movimiento.
        </p>
      </header>

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
        <label htmlFor="reflink">Tu enlace para compartir</label>
        {link ? (
          <>
            <div className="club-reflink-row">
              <input id="reflink" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className="club-btn small" onClick={copiar}>
                {copiado ? "Copiado" : "Copiar"}
              </button>
            </div>
            <p className="club-muted">
              Sirve para todo: quien entre por él queda asociado a ti, compre la membresía del club
              o cualquier producto de HGG. Tu código es <strong>{code}</strong>. Además, cada
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

      <section className="cms-cifras">
        <div className="cms-cifra">
          <span className="cms-cifra-num gold">{usd(datos.pendiente)}</span>
          <span className="cms-cifra-label">Por pagar</span>
        </div>
        <div className="cms-cifra">
          <span className="cms-cifra-num">{usd(datos.pagado)}</span>
          <span className="cms-cifra-label">Ya pagado</span>
        </div>
        <div className="cms-cifra">
          <span className="cms-cifra-num">{datos.personas}</span>
          <span className="cms-cifra-label">
            {datos.personas === 1 ? "Persona que te ha generado comisión" : "Personas que te han generado comisión"}
          </span>
        </div>
      </section>

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
