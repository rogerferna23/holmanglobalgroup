import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckoutModal } from "@/components/checkout-modal";
import { trackEvent } from "@/lib/analytics";
import type { CheckoutItem } from "@/lib/payments";
import { CLUB } from "@/lib/routes";
import { getSupabase } from "@/lib/supabase";
import { WHATSAPP_URL } from "@/lib/config";

/**
 * `/oferta` — lo que se vende en vivo al final de la masterclass del 2 de
 * noviembre de 2026. Sin enlace en el menú. Cupos y fecha límite los manda la
 * base (hgg_oferta_estado): al llenarse un cupo o vencer el plazo, el producto
 * se apaga y Stripe ya no lo cobra. El precio real lo decide la tabla products.
 */

type Estado = {
  cierra: string;
  negocio: { cupos: number; vendidos: number; abierta: boolean };
  sentido: { cupos: number; vendidos: number; abierta: boolean };
};

type Oferta = {
  id: "negocio" | "sentido";
  etiqueta: string;
  nombre: string;
  promesa: string;
  para: string;
  imagen: { src: string; alt: string };
  entregables: { t: string; d: string }[];
  /** Lo que recibe, con su valor de tienda. Sin precio = incluido. */
  valor: { t: string; usd?: number }[];
  precio: number;
  cuota: number;
  producto: string;
  productoCuota: string;
};

const OFERTAS: Oferta[] = [
  {
    id: "negocio",
    etiqueta: "La oferta de esta noche",
    nombre: "Negocio Digital en 90 días",
    promesa: "Tu marca, tu oferta y tu web listas para vender, con el plan para llegar a tu meta de ingresos.",
    para: "Para quien ya sabe lo que ofrece y quiere convertirlo en un negocio que factura.",
    imagen: { src: "/tienda/marca-hero.webp", alt: "Marca de ejemplo aplicada en manual, sitio web y redes" },
    entregables: [
      { t: "Tu marca", d: "Historia, mensaje, logo, paleta y manual." },
      { t: "Tu oferta", d: "Producto de entrada, principal y premium, cada uno con su precio." },
      { t: "Tu web para vender", d: "Sitio profesional con SEO y WhatsApp." },
      { t: "Tu plan financiero", d: "Tu meta mensual convertida en ventas por producto y canal." },
      { t: "Tu guion de venta", d: "Para cerrar a tus clientes con naturalidad." },
      { t: "60 días de seguimiento", d: "4 sesiones y tu meta a la vista en «Mi proceso»." },
    ],
    valor: [
      { t: "Marca con Huella Elite", usd: 2497 },
      { t: "3 meses de ECOS Business Club", usd: 141 },
      { t: "Test del patrón del dinero con tu informe" },
    ],
    precio: 1797,
    cuota: 937,
    producto: "mc-negocio-digital",
    productoCuota: "mc-negocio-digital-cuota",
  },
  {
    id: "sentido",
    etiqueta: "Si todavía buscas claridad",
    nombre: "Programa Sentido Elite",
    promesa: "Sabes qué ofrecer, a quién y cuánto cobrar, y tienes el plan para empezar a vivir de aquello que amas.",
    para: "Para quien sabe que tiene algo valioso, pero aún no tiene claro cómo vivir de eso.",
    imagen: { src: "/tienda/sentido-elite.webp", alt: "Rueda de la Vida de inicio frente a la de ahora en el panel «Mi proceso»" },
    entregables: [
      { t: "10 sesiones uno a uno", d: "Cada semana o cada 15 días." },
      { t: "La fórmula M2H2 completa", d: "Metas, Mentalidad, Habilidades y Hábitos." },
      { t: "«Mi proceso»", d: "Tu meta a 90 días, tus compromisos y el acta de cada sesión." },
    ],
    valor: [
      { t: "Programa Sentido Elite", usd: 997 },
      { t: "ECOS Business Club mientras dure tu programa" },
      { t: "Test de autodescubrimiento y del patrón del dinero" },
    ],
    precio: 997,
    cuota: 517,
    producto: "mc-sentido-elite",
    productoCuota: "mc-sentido-elite-cuota",
  },
];

/**
 * Lo que se vende esa noche (31 oct 2026: Holman deja una sola oferta, con 2
 * cupos, y el resto se invita al club). Sentido queda escrito por si vuelve.
 */
const EN_VENTA: Oferta["id"][] = ["negocio"];

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

function useCuentaRegresiva(hasta: string | null) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!hasta) return null;
  const falta = Math.max(0, Date.parse(hasta) - ahora);
  const d = Math.floor(falta / 86_400_000);
  const h = Math.floor((falta % 86_400_000) / 3_600_000);
  const m = Math.floor((falta % 3_600_000) / 60_000);
  const s = Math.floor((falta % 60_000) / 1000);
  return { falta, d, h, m, s };
}

export default function OfertaPage() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [error, setError] = useState(false);
  const [item, setItem] = useState<CheckoutItem | null>(null);
  const reloj = useCuentaRegresiva(estado?.cierra ?? null);

  useEffect(() => {
    document.title = "Oferta de la masterclass · Holman Global Group";
    // Solo en `pnpm dev`: ?demo muestra la oferta con cupos de ejemplo.
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("demo")) {
      setEstado({ cierra: "2026-11-04T23:59:00-05:00", negocio: { cupos: 2, vendidos: 1, abierta: true }, sentido: { cupos: 5, vendidos: 5, abierta: false } });
      return;
    }
    const cargar = () => getSupabase().rpc("hgg_oferta_estado").then(({ data, error: e }) => {
      if (e || !data) setError(true);
      else { setEstado(data as Estado); setError(false); }
    }, () => setError(true));
    cargar();
    // Los cupos se mueven en vivo durante la masterclass.
    const t = setInterval(cargar, 30_000);
    return () => clearInterval(t);
  }, []);

  const vencida = !!reloj && reloj.falta === 0;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <main className="sr ag of">
      <div className="sr-glow" aria-hidden />
      <header className="sr-marca">
        <img src="/logo-h.png" alt="" width={36} height={36} />
        <span>Holman Global Group</span>
      </header>

      <section className="sr-hero of-hero">
        <p className="sr-eyebrow">Solo para quienes vinieron a la masterclass</p>
        <h1>Empieza hoy tu negocio digital</h1>
        <p className="sr-lede">
          Los beneficios de esta noche valen hasta el miércoles 4 de noviembre a las 11:59 p. m. (hora de Bogotá)
          o hasta llenar los cupos.
        </p>
        {reloj && !vencida && (
          <p className="of-reloj" aria-label="Tiempo que queda">
            <span><strong>{reloj.d}</strong>días</span>
            <span><strong>{pad(reloj.h)}</strong>horas</span>
            <span><strong>{pad(reloj.m)}</strong>min</span>
            <span><strong>{pad(reloj.s)}</strong>seg</span>
          </p>
        )}
      </section>

      {error && !estado ? (
        <section className="of-aviso">
          <p>No pudimos cargar los cupos. Escríbele a Holman por WhatsApp y te reserva el tuyo.</p>
          <a className="ag-btn" href={WHATSAPP_URL} target="_blank" rel="noopener">Escribir por WhatsApp</a>
        </section>
      ) : !estado ? (
        <p className="of-cargando">Cargando la oferta…</p>
      ) : (
        <>
          {OFERTAS.filter((o) => EN_VENTA.includes(o.id)).map((o, i) => {
            const e = estado[o.id];
            const quedan = Math.max(0, e.cupos - e.vendidos);
            const abierta = e.abierta && quedan > 0 && !vencida;
            return (
              <section key={o.id} className={`of-oferta ${i === 0 ? "is-estrella" : "is-segunda"}${abierta ? "" : " is-cerrada"}`}>
                <div className="of-oferta-info">
                  <p className="of-etiqueta">{o.etiqueta}</p>
                  <h2>{o.nombre}</h2>
                  <p className="of-promesa">{o.promesa}</p>
                  <p className="of-para">{o.para}</p>
                  <img className="of-imagen" src={o.imagen.src} alt={o.imagen.alt} loading={i === 0 ? "eager" : "lazy"} />
                  <ol className="of-entregables">
                    {o.entregables.map((x, n) => (
                      <li key={x.t}>
                        <span className="of-num">{String(n + 1).padStart(2, "0")}</span>
                        <div><strong>{x.t}</strong><span>{x.d}</span></div>
                      </li>
                    ))}
                  </ol>
                </div>
                <Caja
                  oferta={o} cupos={e.cupos} quedan={quedan} abierta={abierta}
                  pagar={(completo) => {
                    trackEvent("oferta_pagar", { oferta: o.id, forma: completo ? "completo" : "cuotas" });
                    setItem(completo
                      ? { productId: o.producto, title: o.nombre, amount: o.precio, currency: "USD" }
                      : { productId: o.productoCuota, title: `${o.nombre} — 1 de 2 pagos`, amount: o.cuota, currency: "USD" });
                  }}
                />
              </section>
            );
          })}
        </>
      )}

      <section className="of-ecos">
        <div>
          <p className="of-etiqueta">¿Prefieres un paso más pequeño?</p>
          <h2>ECOS Business Club</h2>
          <p>Clases en vivo de ventas, marketing y oratoria cada semana. 14 días de regalo, sin tarjeta, y $47 al mes mientras sigas activo.</p>
        </div>
        <Link className="ag-btn ag-btn-2" to={CLUB.landing}>Conocer el club</Link>
      </section>

      <p className="of-dudas">¿Una duda antes de decidir? <a href={WHATSAPP_URL} target="_blank" rel="noopener">Escríbele a Holman</a> y te responde esta misma noche.</p>

      <footer className="sr-pie"><a href="/">holmanglobalgroup.com</a></footer>
      <CheckoutModal item={item} onClose={() => setItem(null)} />
    </main>
  );
}

/** La caja de precio: lo que recibe con su valor, el precio de esta noche, los cupos y el pago. */
function Caja({ oferta: o, cupos, quedan, abierta, pagar }: {
  oferta: Oferta; cupos: number; quedan: number; abierta: boolean; pagar: (completo: boolean) => void;
}) {
  const total = o.valor.reduce((t, x) => t + (x.usd ?? 0), 0);
  const ahorro = total - o.precio;
  return (
    <aside className="of-caja" aria-label={`Precio de ${o.nombre}`}>
      <p className="of-caja-titulo">Lo que recibes</p>
      <ul className="of-valor">
        {o.valor.map((x) => (
          <li key={x.t}><span>{x.t}</span><span>{x.usd ? usd(x.usd) : "Incluido"}</span></li>
        ))}
      </ul>
      {ahorro > 0 && <p className="of-total"><span>Valor total</span><s>{usd(total)}</s></p>}
      <div className="of-hoy">
        <span>Esta noche</span>
        <strong>{usd(o.precio)}</strong>
        <small>USD · o 2 pagos de {usd(o.cuota)}</small>
      </div>
      <div className="of-barra" role="img" aria-label={`Quedan ${quedan} de ${cupos} cupos`}>
        <div className="of-barra-fila">
          <span>{abierta ? `Quedan ${quedan} de ${cupos} cupos` : quedan === 0 ? "Cupos llenos" : "Oferta cerrada"}</span>
          {ahorro > 0 && abierta && <span className="of-ahorro">Ahorras {usd(ahorro)}</span>}
        </div>
        <div className="of-barra-pista"><div style={{ width: `${(quedan / Math.max(1, cupos)) * 100}%` }} /></div>
      </div>
      {abierta ? (
        <>
          <button type="button" className="ag-btn of-pagar" onClick={() => pagar(true)}>Tomar mi cupo</button>
          <button type="button" className="of-cuotas" onClick={() => pagar(false)}>Prefiero 2 pagos de {usd(o.cuota)}</button>
          <p className="of-letra">El cupo se toma con el primer pago; el segundo es a los 30 días. Pago seguro con Stripe.</p>
        </>
      ) : (
        <p className="of-letra">Esta oferta ya cerró. Escríbele a Holman y te cuenta la próxima.</p>
      )}
    </aside>
  );
}
