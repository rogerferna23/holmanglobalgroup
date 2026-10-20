import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { CookieBanner } from "@/components/cookie-banner";
import { trackEvent } from "@/lib/analytics";

/**
 * `/emociones` — página de venta del curso «Gestión de las emociones». El pago
 * pasa por Hotmart (producto 4215637); aquí solo se cuenta y se enlaza. Es el
 * paso siguiente del ebook «Te conviertes en lo que piensas» (su QR trae
 * `?desde=ebook`, que viaja a Hotmart como `src` para saber de dónde vino la venta).
 * Va en la marca en versión clara, como el ebook y el workbook: es la misma familia.
 */
const CHECKOUT = "https://pay.hotmart.com/A93692660Q";
const PRECIO = "USD 57";

const TE_PASA = [
  "Una emoción se apodera de tu día y después no entiendes bien qué pasó.",
  "Le das vueltas al pasado o te inquieta lo que viene.",
  "Quieres responder con calma y terminas reaccionando.",
];

const TEMARIO = [
  { t: "Cómo funciona tu mente", d: "Todo lo que ves es una interpretación, y esa interpretación se puede transformar a tu favor.", c: "Clases 1–3" },
  { t: "Interpretación", d: "Cuestiona tus creencias y empieza a mirar cada experiencia de forma potenciadora.", c: "Clase 4" },
  { t: "Aprende a identificar", d: "La diferencia entre emoción, sentimiento, estado de ánimo y temperamento.", c: "Clases 5–9" },
  { t: "Tu pasado", d: "La gratitud como herramienta para hacer las paces con lo vivido.", c: "Clase 10" },
  { t: "Tu presente", d: "El savoring, para salir del sobrepensar y disfrutar el momento.", c: "Clase 11" },
  { t: "Tu futuro", d: "Un optimismo realista que te devuelve a la acción.", c: "Clases 12–13" },
];

const INCLUYE = [
  { t: "13 clases en video", d: "Más de una hora de contenido directo al punto." },
  { t: "Workbook descargable", d: "Ejercicios para cada clase, para imprimir o llenar en pantalla." },
  { t: "A tu ritmo", d: "Desde el celular o el computador, cuando quieras." },
  { t: "Garantía de 7 días", d: "Si lo necesitas, pides el reembolso desde tu cuenta de Hotmart." },
];

const PREGUNTAS = [
  { p: "¿Cómo recibo el curso?", r: "Al pagar, Hotmart te envía al correo el acceso a la plataforma. Ahí ves las clases y descargas el workbook." },
  { p: "¿Necesito experiencia previa?", r: "Ninguna. El curso está pensado para que empieces desde cero y avances clase a clase." },
  { p: "¿Cómo funciona la garantía?", r: "Tienes 7 días desde la compra para pedir el reembolso en Hotmart, sin preguntas." },
  { p: "¿Y si quiero acompañamiento personal?", r: "Agenda una Sesión de Claridad con Holman o alguien de su equipo: una conversación 1 a 1 para mirar dónde estás y cuál es tu siguiente paso." },
];

export default function Emociones() {
  const [params] = useSearchParams();
  const desde = params.get("desde") ?? "web";
  const checkout = `${CHECKOUT}?src=${encodeURIComponent(desde)}`;
  const comprar = (lugar: string) => () => trackEvent("emociones_comprar", { desde, lugar });

  useEffect(() => {
    document.title = "Curso Gestión de las emociones · Holman Global Group";
  }, []);

  return (
    <main className="em">
      <header className="em-marca">
        <img src="/marca/logo-h-claro.png" alt="" width={34} height={34} />
        <span>Holman Global Group</span>
      </header>

      {/* Hero: promesa, precio y botón; la foto enmarcada como en el ebook */}
      <section className="em-hero">
        <div className="em-copy">
          <p className="em-kicker">Curso en video · A tu ritmo</p>
          <h1>Gestión de las emociones</h1>
          <span className="em-filete" aria-hidden />
          <p className="em-lede">
            Entiende cómo funciona tu mente, ponle nombre a lo que sientes y usa tu pasado, tu presente y tu futuro a
            tu favor.
          </p>
          <div className="em-precio">
            <strong>{PRECIO}</strong>
            <span>Pago único · Garantía de 7 días</span>
          </div>
          <a className="em-btn" href={checkout} onClick={comprar("hero")}>Quiero el curso</a>
          <p className="em-legal">Pago seguro con Hotmart. El acceso te llega al correo.</p>
        </div>
        <figure className="em-foto">
          <img src="/emociones/holman-claro.webp" alt="Holman Orjuela" width={900} height={1200} />
        </figure>
      </section>

      <section className="em-sec em-espejo">
        <p className="em-kicker">Antes de empezar</p>
        <h2>¿Te pasa esto?</h2>
        <ul>
          {TE_PASA.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="em-nota">Las emociones se pueden entender y gestionar. Este curso te muestra cómo, paso a paso.</p>
      </section>

      {/* Temario como índice de libro */}
      <section className="em-sec">
        <p className="em-kicker">El temario</p>
        <h2>Lo que vas a aprender</h2>
        <ol className="em-indice">
          {TEMARIO.map((b, i) => (
            <li key={b.t}>
              <span className="em-n">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{b.t}</h3>
                <p>{b.d}</p>
              </div>
              <span className="em-clases">{b.c}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Qué incluye: banda con el workbook grande */}
      <section className="em-banda">
        <div className="em-banda-in">
          <div className="em-wb">
            <img src="/emociones/workbook.webp" alt="El workbook del curso Gestión de las emociones" width={806} height={900} loading="lazy" />
          </div>
          <div>
            <p className="em-kicker">Qué incluye</p>
            <h2>Todo para que lo lleves a tu vida</h2>
            <ul className="em-incluye">
              {INCLUYE.map((x) => (
                <li key={x.t}>
                  <strong>{x.t}</strong>
                  <span>{x.d}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="em-sec em-autor">
        <img src="/emociones/holman-claro.webp" alt="" width={88} height={88} loading="lazy" />
        <blockquote>
          «Soy coach expansivo y coach musical, y llevo años estudiando la conducta humana. Acompaño a personas a
          construir su marca y su negocio desde el comportamiento humano, y en ese camino veo lo mismo una y otra vez:
          cuando aprendes a gestionar tus emociones, todo lo demás avanza más rápido».
        </blockquote>
        <p className="em-firma">Holman Orjuela · Fundador de Holman Global Group</p>
      </section>

      <section className="em-sec">
        <p className="em-kicker">Dudas</p>
        <h2>Preguntas frecuentes</h2>
        <div className="em-faq">
          {PREGUNTAS.map((q) => (
            <details key={q.p}>
              <summary>{q.p}</summary>
              <p>{q.r}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Cierre claro con marco dorado, como la portada del ebook */}
      <section className="em-cierre">
        <img src="/marca/logo-elefante-claro.png" alt="" width={64} height={64} loading="lazy" />
        <h2>Empieza hoy</h2>
        <p>{PRECIO}, pago único. Trece clases y un workbook para entender lo que sientes y elegir cómo responder.</p>
        <div className="em-acciones">
          <a className="em-btn" href={checkout} onClick={comprar("final")}>Quiero el curso</a>
          <a className="em-btn-2" href="/claridad?desde=curso">Prefiero una Sesión de Claridad</a>
        </div>
      </section>

      <footer className="em-pie">
        <a href="/">holmanglobalgroup.com</a>
      </footer>
      <CookieBanner />
    </main>
  );
}
