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
  nombre: string;
  promesa: string;
  para: string;
  incluye: string[];
  bonos: string[];
  antes?: string;
  precio: number;
  cuota: number;
  producto: string;
  productoCuota: string;
};

const OFERTAS: Oferta[] = [
  {
    id: "negocio",
    nombre: "Negocio Digital en 90 días",
    promesa: "Tu marca, tu oferta y tu web listas para vender, con el plan para llegar a tu meta.",
    para: "Para quien ya sabe lo que ofrece y quiere convertirlo en un negocio que factura.",
    incluye: [
      "Marca con Huella Elite completa: historia, mensaje, logo, paleta y manual",
      "Tu escalera de productos: entrada, principal y premium, con precio",
      "Sitio web profesional para vender, con SEO y WhatsApp",
      "Plan financiero: tu meta mensual convertida en ventas por producto y canal",
      "Guion de venta para cerrar a tus clientes",
      "60 días de seguimiento a tu meta en «Mi proceso» (4 sesiones)",
    ],
    bonos: ["3 meses de ECOS Business Club", "Test del patrón del dinero con tu informe personal"],
    antes: "$2,497",
    precio: 1797,
    cuota: 937,
    producto: "mc-negocio-digital",
    productoCuota: "mc-negocio-digital-cuota",
  },
  {
    id: "sentido",
    nombre: "Programa Sentido Elite",
    promesa: "Claridad: sabes qué ofrecer, a quién y cuánto cobrar, y tienes el plan para empezar.",
    para: "Para quien sabe que tiene algo valioso, pero aún no tiene claro cómo vivir de eso.",
    incluye: [
      "10 sesiones uno a uno, cada semana o cada 15 días",
      "El camino completo: Claridad, Identidad y Acción",
      "«Mi proceso»: tu meta a 90 días, tus compromisos y el acta de cada sesión",
    ],
    bonos: ["ECOS Business Club incluido mientras dure tu programa", "Test de autodescubrimiento y test del patrón del dinero"],
    precio: 997,
    cuota: 517,
    producto: "mc-sentido-elite",
    productoCuota: "mc-sentido-elite-cuota",
  },
];

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
      setEstado({ cierra: "2026-11-04T23:59:00-05:00", negocio: { cupos: 5, vendidos: 2, abierta: true }, sentido: { cupos: 5, vendidos: 5, abierta: false } });
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
        <section className="of-ofertas">
          {OFERTAS.map((o) => {
            const e = estado[o.id];
            const quedan = Math.max(0, e.cupos - e.vendidos);
            const abierta = e.abierta && quedan > 0 && !vencida;
            return (
              <article key={o.id} className={`of-card${abierta ? "" : " is-cerrada"}`}>
                <div className="of-card-head">
                  <h2>{o.nombre}</h2>
                  <span className="of-cupos">{abierta ? `${quedan} de ${e.cupos} cupos` : quedan === 0 ? "Cupos llenos" : "Cerrada"}</span>
                </div>
                <p className="of-promesa">{o.promesa}</p>
                <p className="of-para">{o.para}</p>
                <ul className="of-lista">{o.incluye.map((x) => <li key={x}>{x}</li>)}</ul>
                <p className="of-bonos-titulo">Beneficios de esta noche</p>
                <ul className="of-lista of-bonos">{o.bonos.map((x) => <li key={x}>{x}</li>)}</ul>
                <p className="of-precio">
                  {o.antes && <s>{o.antes}</s>}
                  <strong>{usd(o.precio)}</strong>
                  <span>USD · o 2 pagos de {usd(o.cuota)}</span>
                </p>
                {abierta ? (
                  <div className="of-botones">
                    <button type="button" className="ag-btn" onClick={() => {
                      trackEvent("oferta_pagar", { oferta: o.id, forma: "completo" });
                      setItem({ productId: o.producto, title: o.nombre, amount: o.precio, currency: "USD" });
                    }}>Tomar mi cupo · {usd(o.precio)}</button>
                    <button type="button" className="ag-btn ag-btn-2" onClick={() => {
                      trackEvent("oferta_pagar", { oferta: o.id, forma: "cuotas" });
                      setItem({ productId: o.productoCuota, title: `${o.nombre} — 1 de 2 pagos`, amount: o.cuota, currency: "USD" });
                    }}>Primer pago de {usd(o.cuota)}</button>
                    <small>El segundo pago es a los 30 días. El cupo se toma con el primero.</small>
                  </div>
                ) : (
                  <p className="of-cerrada">Esta oferta ya cerró. Escríbele a Holman y te cuenta la próxima.</p>
                )}
              </article>
            );
          })}
        </section>
      )}

      <section className="of-ecos">
        <h2>¿Prefieres empezar con un paso más pequeño?</h2>
        <p>ECOS Business Club: clases en vivo de ventas, marketing y oratoria cada semana. 14 días de regalo, sin tarjeta, y $47 al mes mientras sigas activo.</p>
        <Link className="ag-btn ag-btn-2" to={CLUB.landing}>Conocer el club</Link>
      </section>

      <p className="of-dudas">¿Una duda antes de decidir? <a href={WHATSAPP_URL} target="_blank" rel="noopener">Escríbele a Holman</a> y te responde esta misma noche.</p>

      <footer className="sr-pie"><a href="/">holmanglobalgroup.com</a></footer>
      <CheckoutModal item={item} onClose={() => setItem(null)} />
    </main>
  );
}
