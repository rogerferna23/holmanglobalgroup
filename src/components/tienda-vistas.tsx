/**
 * Tienda minimalista (dic 2026, Holman): como una tienda de lujo, primero la
 * colección y después la pieza.
 *
 * - `TiendaPortada` (/tienda): la escalera de valor en galerías que se
 *   deslizan de lado, con atajos arriba. Sin listas ni párrafos largos.
 * - `TiendaPrograma` (/tienda/:programa): un programa por página, con su
 *   video, los planes (nivel, frase, precio y botón) y lo que incluye cada
 *   uno en columnas, abajo.
 *
 * Los datos (productos, grupos, anual, plan de Marca) siguen en `tienda.tsx`.
 */
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { CLARIDAD_WA_URL } from "@/lib/config";
import { trackEvent } from "@/lib/analytics";
import { EUR_TO_USD, useCurrency } from "@/contexts/CurrencyContext";
import { ECOS } from "@/lib/ecos";
import { CLUB } from "@/lib/routes";
import { FASES_MARCA, NIVEL_DE, VALOR_MARCA, useCuposMarca } from "@/lib/marca-fases";
import type { CheckoutItem } from "@/lib/payments";
import {
  CheckoutModal,
  CompraConfirmada,
  borrarCompraPendiente,
  leerCompraPendiente,
  type CompraPendiente,
} from "./checkout-modal";
import { ArrowRightIcon } from "./icons";
import { IconoPrograma } from "./tienda-iconos";
import {
  ANUAL,
  CAT_PARAM,
  COMPLEMENTOS,
  GROUPS,
  PLAN_MARCA,
  PRODUCTS,
  VitrinaEtapa,
  filterFor,
  waLink,
  type Filter,
  type Group,
  type Product,
} from "./tienda";

// ---------------------------------------------------------------------------
// Programas: cada uno tiene su página en /tienda/<slug>.
// ---------------------------------------------------------------------------

export type Programa = {
  slug: string;
  grupo?: Exclude<Filter, "all">;
  nombre: string;
  /** Nombre corto para los atajos de arriba. */
  corto: string;
  /** Una frase: lo que se lleva la persona. */
  promesa: string;
  img: string;
  alt: string;
};

export const PROGRAMAS: Programa[] = [
  {
    slug: "sentido",
    grupo: "proposito",
    nombre: "Programa Sentido",
    corto: "Sentido",
    promesa: "Descubre quién eres y hacia dónde vas.",
    img: "/tienda/sentido-hero.webp",
    alt: "Sesión por Zoom con Holman y el panel Mi proceso",
  },
  {
    slug: "marca",
    grupo: "marca",
    nombre: "Marca con Huella",
    corto: "Marca",
    promesa: "Tu marca vendiendo en 90 días.",
    img: "/tienda/marca-hero.webp",
    alt: "Manual de marca, sitio web e Instagram de una marca de ejemplo",
  },
  {
    slug: "growth",
    grupo: "growth",
    nombre: "Growth System",
    corto: "Growth",
    promesa: "Tu equipo de crecimiento. Ganamos cuando tú ganas.",
    img: "/tienda/marca-elite.webp",
    alt: "Embudo, plan de contenido, Instagram y seguimiento por WhatsApp",
  },
  {
    slug: "anual",
    nombre: "Acompañamiento anual",
    corto: "Anual",
    promesa: "Todo nuestro equipo, contigo 12 meses.",
    img: "/tienda/entrada-anual.webp",
    alt: "Holman Orjuela con la tarjeta del Acompañamiento anual",
  },
  {
    slug: "delegawork",
    grupo: "sistema",
    nombre: "DelegaWork",
    corto: "DelegaWork",
    promesa: "Tu negocio atiende, agenda y vende a toda hora.",
    img: "/tienda/delegawork-hero.webp",
    alt: "El panel de DelegaWork y Sofía agendando por WhatsApp",
  },
  {
    slug: "servicios",
    grupo: "complementarias",
    nombre: "Servicios",
    corto: "Servicios",
    promesa: "La pieza que te falta: empresa en EE. UU., web, campañas o IA.",
    img: "/tienda/entrada-diagnostico.webp",
    alt: "Diagnóstico de empresa por áreas",
  },
];

const CAMINO = ["sentido", "marca", "growth", "anual"];
const EMPRESA = ["delegawork", "servicios"];

/** Filtro viejo (`/tienda?cat=…`) → página del programa. */
const SLUG_DE: Partial<Record<Filter, string>> = {
  proposito: "sentido",
  marca: "marca",
  growth: "growth",
  sistema: "delegawork",
  complementarias: "servicios",
};

const programa = (slug: string) => PROGRAMAS.find((p) => p.slug === slug);
const grupoDe = (prog: Programa): Group | undefined => GROUPS.find((g) => g.id === prog.grupo);

// ---------------------------------------------------------------------------
// Precios
// ---------------------------------------------------------------------------

function usePrecios() {
  const { code, formatMoney } = useCurrency();
  // Marca con Huella por fases de 10 marcas: el precio sube al llenarse cada
  // una. Mientras carga se muestra la fase 1, que es lo que cobra `products`.
  const cupos = useCuposMarca();
  const fase = cupos?.fase ?? 1;
  const conFase = (p: Product): Product => {
    const nivel = NIVEL_DE[p.id];
    if (!nivel || fase === 1) return p;
    const pr = FASES_MARCA[fase - 1][nivel];
    return {
      ...p,
      amountValue: pr.contado,
      amount: "$" + pr.contado.toLocaleString("en-US"),
      cuotas: p.cuotas ? { ...p.cuotas, monto: pr.cuota } : p.cuotas,
    };
  };
  /** Planes de DelegaWork (precio en euros) en dólares, redondeado a un precio limpio. */
  const usd = (p: Product): number | undefined =>
    p.precioEur
      ? code === "USD"
        ? Math.ceil((p.precioEur * EUR_TO_USD) / 10) * 10 - 1
        : p.precioEur * EUR_TO_USD
      : p.amountValue;
  /** «Desde $67» o «Desde $297 al mes» para la tarjeta de un programa. */
  const desde = (prog: Programa): string | null => {
    if (prog.slug === "anual") return `${formatMoney(ANUAL.precio)} al mes`;
    const items = productosDe(prog).map(conFase);
    const conPrecio = items
      .map((p) => ({ v: usd(p), mes: /mes/.test(p.unit) }))
      .filter((x): x is { v: number; mes: boolean } => typeof x.v === "number");
    if (!conPrecio.length) return null;
    const min = conPrecio.reduce((a, b) => (b.v < a.v ? b : a));
    return `Desde ${formatMoney(min.v)}${min.mes ? " al mes" : ""}`;
  };
  return { code, formatMoney, conFase, usd, desde, cupos };
}

function productosDe(prog: Programa, conPrueba = false): Product[] {
  return PRODUCTS.filter(
    (p) =>
      filterFor(p) === prog.grupo &&
      !p.oculto &&
      (conPrueba || p.id !== "test-1usd")
  );
}

// ---------------------------------------------------------------------------
// Piezas comunes
// ---------------------------------------------------------------------------

function Moneda() {
  const { code, setCurrency } = useCurrency();
  return (
    <div className="tn-moneda" role="group" aria-label="Moneda">
      {(["USD", "EUR"] as const).map((c) => (
        <button key={c} type="button" aria-pressed={code === c} className={code === c ? "is-on" : ""} onClick={() => setCurrency(c)}>
          {c}
        </button>
      ))}
    </div>
  );
}

/** Enlace interno o externo con la misma apariencia. */
function Enlace({ to, className, children, onClick, label }: { to: string; className?: string; children: ReactNode; onClick?: () => void; label?: string }) {
  return to.startsWith("http") ? (
    <a href={to} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick} aria-label={label}>
      {children}
    </a>
  ) : (
    <Link to={to} className={className} onClick={onClick} aria-label={label}>
      {children}
    </Link>
  );
}

/** Vuelta de una compra que el banco verificó fuera de la ventana de pago. */
function useCompraVuelta() {
  const { search } = useLocation();
  const [compra, setCompra] = useState<CompraPendiente | null>(null);
  useEffect(() => {
    if (new URLSearchParams(search).get("redirect_status") !== "succeeded") return;
    const pendiente = leerCompraPendiente();
    if (pendiente) {
      borrarCompraPendiente();
      setCompra(pendiente);
    }
  }, [search]);
  const modal = compra && (
    <div className="checkout-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setCompra(null); }}>
      <div className="checkout-modal">
        <button type="button" className="checkout-close" aria-label="Cerrar" onClick={() => setCompra(null)}>×</button>
        <CompraConfirmada
          titulo="¡Pago confirmado!"
          productId={compra.productId}
          producto={compra.title}
          reference={compra.reference}
          email={compra.email}
          onClose={() => setCompra(null)}
        />
      </div>
    </div>
  );
  return modal;
}

// ---------------------------------------------------------------------------
// Portada
// ---------------------------------------------------------------------------

/** Dic 2026 (Holman): sin mockups ni frases; solo ícono, nombre y precio. */
type Tarjeta = {
  key: string;
  to: string;
  kicker: string;
  nombre: string;
  precio?: string | null;
  icono: string;
};

/** Fila con título y galería que se desliza de lado (flechas en escritorio). */
function Fila({ id, titulo, sub, tarjetas, chica }: { id?: string; titulo: string; sub: string; tarjetas: Tarjeta[]; chica?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [borde, setBorde] = useState({ ini: true, fin: false });
  const medir = () => {
    const el = ref.current;
    if (!el) return;
    setBorde({ ini: el.scrollLeft < 8, fin: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };
  useEffect(() => {
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);
  const mover = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <section className="tn-fila" id={id}>
      <div className="tn-fila-head">
        <h2 className="display">
          {titulo} <span>{sub}</span>
        </h2>
        {!(borde.ini && borde.fin) && (
          <div className="tn-flechas">
            <button type="button" aria-label="Anterior" disabled={borde.ini} onClick={() => mover(-1)}>
              <ArrowRightIcon />
            </button>
            <button type="button" aria-label="Siguiente" disabled={borde.fin} onClick={() => mover(1)}>
              <ArrowRightIcon />
            </button>
          </div>
        )}
      </div>
      <div className="tn-scroller" ref={ref} onScroll={medir}>
        {tarjetas.map((t) => (
          <Enlace
            key={t.key}
            to={t.to}
            className={`tn-card${chica ? " is-chica" : ""}`}
            onClick={() => trackEvent("tienda_programa", { programa: t.key })}
          >
            <span className="tn-card-num">{t.kicker}</span>
            <IconoPrograma id={t.icono} className="tn-card-icono" />
            <div className="tn-card-txt">
              <h3 className="display">{t.nombre}</h3>
              {t.precio && <p>{t.precio}</p>}
            </div>
          </Enlace>
        ))}
      </div>
    </section>
  );
}

export function TiendaPortada() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { desde, formatMoney } = usePrecios();
  const compraVuelta = useCompraVuelta();

  // Enlaces viejos: /tienda?cat=marca → /tienda/marca; ?para=empresa baja a
  // la fila de empresas; ?para=cursos → /cursos.
  useEffect(() => {
    const p = new URLSearchParams(search);
    const para = p.get("para") ?? (p.get("cat") === "empresa" ? "empresa" : null);
    if (para === "cursos") {
      navigate("/cursos", { replace: true });
      return;
    }
    const cat = p.get("cat");
    const slug = cat ? SLUG_DE[CAT_PARAM[cat.trim().toLowerCase()]] : undefined;
    if (slug) {
      p.delete("cat");
      const resto = p.toString();
      navigate(`/tienda/${slug}${resto ? `?${resto}` : ""}`, { replace: true });
      return;
    }
    if (para === "empresa") {
      const t = window.setTimeout(() => document.getElementById("empresa")?.scrollIntoView({ block: "start" }), 300);
      return () => window.clearTimeout(t);
    }
  }, [search, navigate]);

  const tarjeta = (slug: string, kicker: string): Tarjeta => {
    const prog = programa(slug)!;
    return { key: slug, to: `/tienda/${slug}`, kicker, nombre: prog.nombre, precio: desde(prog), icono: slug };
  };

  const atajos: { key: string; to: string; label: string }[] = [
    { key: "claridad", to: CLARIDAD_WA_URL, label: "Claridad" },
    { key: "ecos", to: CLUB.landing, label: "ECOS" },
    ...PROGRAMAS.map((p) => ({ key: p.slug, to: `/tienda/${p.slug}`, label: p.corto })),
    { key: "cursos", to: "/cursos", label: "Cursos" },
  ];

  return (
    <section className="tn">
      <div className="shell">
        <header className="tn-hero">
          <h1 className="display tn-titulo">
            Tienda. <span>Tu camino para crecer, paso a paso.</span>
          </h1>
          <div className="tn-hero-aside">
            <a href={CLARIDAD_WA_URL} target="_blank" rel="noopener noreferrer" className="tn-link">
              Agenda tu Sesión de Claridad <ArrowRightIcon />
            </a>
            <Moneda />
          </div>
        </header>

        <nav className="tn-atajos" aria-label="Programas">
          {atajos.map((a) => (
            <Enlace key={a.key} to={a.to} className="tn-atajo" onClick={() => trackEvent("tienda_atajo", { destino: a.key })}>
              <span className="tn-atajo-icono"><IconoPrograma id={a.key} /></span>
              <span>{a.label}</span>
            </Enlace>
          ))}
        </nav>

        <Fila
          titulo="Tu camino."
          sub="Un paso a la vez."
          tarjetas={CAMINO.map((s, i) => tarjeta(s, String(i + 1).padStart(2, "0")))}
        />

        <Fila
          titulo="Empieza hoy."
          sub="Sin costo."
          chica
          tarjetas={[
            { key: "claridad", to: CLARIDAD_WA_URL, kicker: "", nombre: "Sesión de Claridad", precio: "Gratis", icono: "claridad" },
            { key: "ecos", to: CLUB.landing, kicker: "", nombre: "ECOS Business Club", precio: `${ECOS.pruebaDias} días gratis, luego ${formatMoney(ECOS.priceUsd)} al mes`, icono: "ecos" },
          ]}
        />

        <Fila
          id="empresa"
          titulo="Para tu empresa."
          sub="Que funcione sola."
          tarjetas={[
            { key: "diagnostico", to: waLink("Hola Holman, tengo una empresa y quiero un diagnóstico."), kicker: "", nombre: "Diagnóstico", precio: "Gratis", icono: "diagnostico" },
            ...EMPRESA.map((s) => tarjeta(s, "")),
          ]}
        />

        <Link to="/cursos" className="tn-cursos" onClick={() => trackEvent("tienda_cursos")}>
          ¿Prefieres aprender a tu ritmo? <span>Mira los cursos <ArrowRightIcon /></span>
        </Link>
      </div>
      {compraVuelta}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Página de un programa
// ---------------------------------------------------------------------------

export function TiendaPrograma({ slug }: { slug: string }) {
  const prog = programa(slug);
  const compraVuelta = useCompraVuelta();
  const [selected, setSelected] = useState<CheckoutItem | null>(null);
  if (!prog) return <Navigate to="/tienda" replace />;
  const grupo = grupoDe(prog);

  const encabezado =
    prog.slug === "anual"
      ? { name: ANUAL.head.name, headline: ANUAL.head.headline, paraTi: undefined }
      : { name: grupo?.name ?? prog.nombre, headline: grupo?.headline ?? prog.promesa, paraTi: grupo?.paraTi };

  return (
    <section className="tn tn-prog">
      <div className="shell">
        <div className="tn-prog-top">
          <Link to="/tienda" className="tn-volver">
            <ArrowRightIcon /> Tienda
          </Link>
          <Moneda />
        </div>
        <header className="tn-prog-head">
          <IconoPrograma id={prog.slug} className="tn-prog-icono" />
          <span className="tn-kicker">{encabezado.name}</span>
          <h1 className="display">{encabezado.headline}</h1>
          {encabezado.paraTi && <p>{encabezado.paraTi}</p>}
          {grupo?.points && (
            <p className="tn-puntos">
              {grupo.pointsLabel && <strong>{grupo.pointsLabel}</strong>}
              {grupo.points.join(" · ")}
            </p>
          )}
        </header>

        {prog.slug === "anual" ? (
          <Anual />
        ) : prog.slug === "servicios" ? (
          <Servicios onComprar={setSelected} />
        ) : (
          <Planes prog={prog} grupo={grupo} onComprar={setSelected} />
        )}

        <div className="tn-ayuda">
          {prog.slug === "delegawork" ? (
            <>
              <p>¿Quieres un plan a tu medida?</p>
              <a href={waLink("Hola Holman, quiero un plan personalizado de DelegaWork 360.")} target="_blank" rel="noopener noreferrer" className="tn-link">
                Conversemos <ArrowRightIcon />
              </a>
            </>
          ) : (
            <>
              <p>¿No sabes cuál elegir? Lo vemos juntos en una Sesión de Claridad de regalo.</p>
              <div className="tn-ayuda-links">
                <a href={CLARIDAD_WA_URL} target="_blank" rel="noopener noreferrer" className="tn-link">
                  Agenda tu Sesión de Claridad <ArrowRightIcon />
                </a>
                {grupo?.experiencias && (
                  <Link to={`/experiencias#${grupo.experiencias}`} className="tn-link is-sec">
                    Ver experiencias reales <ArrowRightIcon />
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <CheckoutModal item={selected} onClose={() => setSelected(null)} />
      {compraVuelta}
    </section>
  );
}

/** Botón de un plan: pago directo (con o sin cuotas) o WhatsApp. */
function BotonPlan({ p, forma, onComprar, destacado }: { p: Product; forma: "cuotas" | "contado"; onComprar: (i: CheckoutItem) => void; destacado?: boolean }) {
  const { code, convert } = useCurrency();
  const clase = `tn-btn${destacado ? " is-lleno" : ""}`;
  const checkout = !p.customQuote && typeof p.amountValue === "number";
  if (!checkout) {
    return (
      <a href={waLink(p.whatsappText)} target="_blank" rel="noopener noreferrer" className={clase}>
        {p.cta}
      </a>
    );
  }
  const enCuotas = p.cuotas && forma === "cuotas";
  const item: CheckoutItem = enCuotas
    ? { productId: p.cuotas!.productId, title: `${p.title.replace(/\.$/, "")} — 1 de ${p.cuotas!.n} pagos`, amount: p.cuotas!.monto, currency: code }
    : { productId: p.id, title: p.title.replace(/\.$/, ""), amount: p.amountValue!, currency: code };
  return (
    <button
      type="button"
      className={clase}
      onClick={() => {
        trackEvent("begin_checkout", { item_id: item.productId, item_name: item.title, value: convert(item.amount), currency: code });
        onComprar(item);
      }}
    >
      {p.cta}
    </button>
  );
}

function Planes({ prog, grupo, onComprar }: { prog: Programa; grupo?: Group; onComprar: (i: CheckoutItem) => void }) {
  const { search } = useLocation();
  const conPrueba = new URLSearchParams(search).get("test") === "1";
  const { code, formatMoney, conFase, usd, cupos } = usePrecios();
  const items = useMemo(() => productosDe(prog, conPrueba).map(conFase), [prog, conPrueba, conFase]);
  const hayCuotas = items.some((p) => p.cuotas);
  const [forma, setForma] = useState<"cuotas" | "contado">("cuotas");
  const conLista = items.filter((p) => p.features.length > 0);

  const precio = (p: Product) => {
    if (p.cuotas && typeof p.amountValue === "number") {
      if (forma === "cuotas") {
        return { grande: `${p.cuotas.n} × ${formatMoney(p.cuotas.monto)}`, chico: `al mes · o ${formatMoney(p.amountValue)} de contado` };
      }
      const ahorro = p.cuotas.n * p.cuotas.monto - p.amountValue;
      return { grande: formatMoney(p.amountValue), chico: ahorro > 0 ? `Ahorras ${formatMoney(ahorro)}` : "Un solo pago" };
    }
    const v = usd(p);
    return { grande: typeof v === "number" ? formatMoney(v) : p.amount, chico: p.unit.replace(/USD/g, code) };
  };

  return (
    <>
      {grupo?.vitrina && <VitrinaEtapa v={grupo.vitrina} etapa={grupo.id} soloMedia />}

      {prog.slug === "marca" && cupos && cupos.fase < 3 && (
        <p className="tn-cupos">
          <strong>{cupos.fase === 1 ? "Precio de lanzamiento" : "Segunda fase"}</strong> · Quedan {cupos.quedan} de {cupos.cupos} marcas a este precio
        </p>
      )}

      {hayCuotas && (
        <div className="tn-forma" role="radiogroup" aria-label="Forma de pago">
          {(["cuotas", "contado"] as const).map((f) => (
            <button key={f} type="button" role="radio" aria-checked={forma === f} className={forma === f ? "is-on" : ""} onClick={() => setForma(f)}>
              {f === "cuotas" ? "En cuotas" : "De contado"}
            </button>
          ))}
        </div>
      )}

      <div className={`tn-planes${items.length === 4 ? " is-4" : ""}`}>
        {items.map((p) => {
          const pr = precio(p);
          const nivel = NIVEL_DE[p.id];
          return (
            <article key={p.id} className={`tn-plan${p.highlight ? " is-top" : ""}`}>
              <span className="tn-plan-badge">{p.highlight ? "Más elegido" : " "}</span>
              <h2 className="display">{p.tag}</h2>
              {p.subtitle && <p className="tn-plan-frase">{p.subtitle}</p>}
              <div className="tn-plan-precio">
                <span className="display">{pr.grande}</span>
                <small>{pr.chico}</small>
                {p.note && <small className="tn-plan-nota">{p.note}</small>}
                {nivel && <small>Por separado vale más de {formatMoney(VALOR_MARCA[nivel])}</small>}
              </div>
              <BotonPlan p={p} forma={forma} onComprar={onComprar} destacado={p.highlight} />
            </article>
          );
        })}
      </div>

      {grupo?.comun && <p className="tn-comun">{grupo.comun}</p>}

      {conLista.length > 0 && (
        <section className="tn-compara">
          <h2 className="display">Qué incluye cada plan.</h2>
          <div className={`tn-compara-cols${conLista.length === 4 ? " is-4" : ""}`}>
            {conLista.map((p) => (
              <div key={p.id}>
                <h3 className="display">{p.tag}</h3>
                <ul>
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {prog.slug === "marca" && (
        <section className="tn-compara">
          <h2 className="display">90 días, un mes por etapa.</h2>
          <div className="tn-compara-cols">
            {PLAN_MARCA.map((e, i) => (
              <div key={e.mes}>
                <span className="tn-kicker">Mes {i + 1}</span>
                <h3 className="display">{e.mes}</h3>
                <ul>
                  {e.puntos.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="tn-comun">
            <strong>Garantía de lanzamiento:</strong> si cumples tus tareas y al día 30 tu oferta o tu landing no están listas, seguimos un mes más sin costo. Solo 7 marcas nuevas por mes.
          </p>
        </section>
      )}
    </>
  );
}

function Anual() {
  const { code, formatMoney } = useCurrency();
  const [forma, setForma] = useState<"cuotas" | "contado">("cuotas");
  return (
    <div className="tn-anual">
      <img src="/tienda/entrada-anual.webp" alt="Holman Orjuela con la tarjeta del Acompañamiento anual, ECOS Business Club y el equipo de HGG" width={900} height={545} loading="lazy" />
      <div className="tn-anual-txt">
        <p className="tn-puntos">{ANUAL.tramos.join(" · ")}</p>
        <ul className="tn-lista">
          {ANUAL.incluye.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <div className="tn-forma is-izq" role="radiogroup" aria-label="Forma de pago">
          {(["cuotas", "contado"] as const).map((f) => (
            <button key={f} type="button" role="radio" aria-checked={forma === f} className={forma === f ? "is-on" : ""} onClick={() => setForma(f)}>
              {f === "cuotas" ? `En ${ANUAL.meses} pagos` : "De contado"}
            </button>
          ))}
        </div>
        <div className="tn-plan-precio is-izq">
          <span className="display">{forma === "cuotas" ? `${ANUAL.meses} × ${formatMoney(ANUAL.precio)}` : formatMoney(ANUAL.contado)}</span>
          <small>
            {forma === "cuotas" ? `${code} al mes` : `Ahorras ${formatMoney(ANUAL.meses * ANUAL.precio - ANUAL.contado)}`} · Solo {ANUAL.cupos} cupos, por aplicación
          </small>
        </div>
        <a
          href={waLink(`${ANUAL.whatsappText} Me interesa ${forma === "contado" ? "el pago de contado" : `en ${ANUAL.meses} pagos`}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="tn-btn is-lleno"
        >
          Aplica a tu lugar
        </a>
      </div>
    </div>
  );
}

function Servicios({ onComprar }: { onComprar: (i: CheckoutItem) => void }) {
  const { formatMoney } = useCurrency();
  const items = PRODUCTS.filter((p) => filterFor(p) === "complementarias");
  return (
    <div className="tn-servicios">
      {COMPLEMENTOS.map((g) => {
        const filas = items.filter((p) => g.categorias.includes(p.category) && !p.oculto);
        if (!filas.length) return null;
        return (
          <section key={g.nombre} className="tn-serv-grupo">
            <h2 className="display">{g.nombre}</h2>
            {filas.map((p) => (
              <article key={p.id} className="tn-serv">
                <div className="tn-serv-info">
                  <h3 className="display">{p.title.replace(/\.$/, "")}</h3>
                  {p.subtitle && <p>{p.subtitle}</p>}
                  {p.features.length > 0 && (
                    <details>
                      <summary>Qué incluye</summary>
                      <ul className="tn-lista">
                        {p.features.map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
                <div className="tn-serv-accion">
                  <span className="display tn-serv-precio">{typeof p.amountValue === "number" ? formatMoney(p.amountValue) : p.amount}</span>
                  <BotonPlan p={p} forma="contado" onComprar={onComprar} />
                  {p.alterno?.map((id) => {
                    const alt = PRODUCTS.find((x) => x.id === id);
                    if (!alt) return null;
                    const cifra = typeof alt.amountValue === "number" ? ` · ${formatMoney(alt.amountValue)}/año` : "";
                    return (
                      <Fragment key={id}>
                        <BotonPlan p={{ ...alt, cta: `${alt.cta}${cifra}` }} forma="contado" onComprar={onComprar} />
                      </Fragment>
                    );
                  })}
                </div>
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}
