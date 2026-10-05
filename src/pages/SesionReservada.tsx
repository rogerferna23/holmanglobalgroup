import { useEffect, useState } from "react";
import { CookieBanner } from "@/components/cookie-banner";
import { WhatsAppIcon } from "@/components/icons";
import { PersonAvatar, Stars } from "@/components/testimonial-card";
import { trackEvent } from "@/lib/analytics";
import { CLARIDAD_VIDEO } from "@/lib/catalogo";
import { WHATSAPP_URL } from "@/lib/config";
import { useTestimonials } from "@/lib/reviews";

/**
 * `/sesion-reservada` — lo que ve la persona DESPUÉS de reservar su Sesión de
 * Claridad (llegue por Sofía, por Holman o por un embajador).
 *
 * Ya no hay nada que vender ni decidir: confirma la reserva y pone primero el
 * video de Holman. Debajo, solo un resumen corto para prepararse (el detalle
 * lo da el video; Holman no quiere la página repitiéndolo tal cual).
 * Sin enlace en el sitio y con noindex.
 */

const ANTES = [
  { t: "Un lugar tranquilo y 30 minutos solo para ti", d: "Sin pendientes ni interrupciones." },
  { t: "Ten presente dónde estás y hacia dónde quieres ir", d: "No necesitas tener todas las respuestas." },
  { t: "Tu mejor actitud", d: "Ven con ganas de ver tu negocio con otros ojos." },
];

/** Las reseñas que eligió Holman para esta página, en este orden (nombre exacto en el panel). */
const RESENAS = ["Daniel Domínguez", "Evelyn Rivas", "Alberto Deleyto"];

const PILARES = [
  { t: "Expansivo", d: "Abre la mirada para que aparezcan opciones que hoy no ves." },
  { t: "Musical", d: "Usa la música para llegar a lo que las palabras no alcanzan." },
  { t: "Estratégico", d: "Aterriza todo en decisiones concretas y un plan que puedes ejecutar." },
];

const MOVER_URL = `${WHATSAPP_URL}?text=${encodeURIComponent(
  "Hola, necesito mover mi Sesión de Claridad."
)}`;

function Video() {
  const [play, setPlay] = useState(false);
  const { biblioteca, video } = CLARIDAD_VIDEO;
  const listo = Boolean(biblioteca && video);

  // El reproductor de Bunny se carga solo al darle play: la página abre rápido
  // y el video arranca en el mismo clic.
  if (play && listo) {
    return (
      <div className="sr-video">
        <iframe
          src={`https://iframe.mediadelivery.net/embed/${biblioteca}/${video}?autoplay=true&preload=true&responsive=true`}
          title="Bienvenida de Holman a tu Sesión de Claridad"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="sr-video sr-video-portada"
      onClick={() => {
        if (!listo) return;
        setPlay(true);
        trackEvent("sesion_reservada_video");
      }}
      aria-label="Ver el video de bienvenida"
      disabled={!listo}
    >
      <img src="/sesion-reservada/portada.webp" alt="" width={1280} height={720} />
      <span className="sr-play" aria-hidden>
        <svg viewBox="0 0 24 24" width="28" height="28"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
      </span>
      <span className="sr-video-dur">2 min</span>
    </button>
  );
}

export default function SesionReservada() {
  const { items } = useTestimonials();
  const resenas = RESENAS.flatMap((n) => items.filter((t) => t.name === n).slice(0, 1));

  useEffect(() => {
    document.title = "Tu Sesión de Claridad está reservada · Holman Global Group";
  }, []);

  return (
    <main className="sr">
      <div className="sr-glow" aria-hidden />

      <header className="sr-marca">
        <img src="/logo-h.png" alt="" width={36} height={36} />
        <span>Holman Global Group</span>
      </header>

      {/* Confirmación + video */}
      <section className="sr-hero">
        <span className="sr-check" aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <p className="sr-eyebrow">Reserva confirmada · 30 minutos por Zoom</p>
        <h1>Tu Sesión de Claridad está reservada</h1>
        <p className="sr-lede">
          Antes de conectarnos, mira este video de 2 minutos. Te cuento qué vamos a ver y cómo aprovechar al máximo
          nuestra media hora.
        </p>
        <Video />
      </section>

      {/* Prepararse: resumen corto */}
      <section className="sr-sec">
        <p className="sr-kicker">Antes de conectarte</p>
        <h2>Para que la media hora rinda el doble</h2>
        <ul className="sr-checks sr-checks-fila">
          {ANTES.map((a) => (
            <li key={a.t}>
              <strong>{a.t}</strong>
              <span>{a.d}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Reseñas */}
      {resenas.length > 0 && (
        <section className="sr-sec">
          <p className="sr-kicker">Experiencias</p>
          <h2>Personas que ya dieron este paso</h2>
          <div className="sr-resenas">
            {resenas.map((t) => (
              <article key={t.name} className="sr-resena">
                <Stars rating={t.rating} />
                <blockquote>{t.quote}</blockquote>
                <div className="sr-resena-quien">
                  <PersonAvatar t={t} className="experiencia-avatar" />
                  <div>
                    <strong>{t.name}</strong>
                    {t.role && <span>{t.role}</span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Quién te acompaña */}
      <section className="sr-sec">
        <div className="sr-holman">
          <img src="/links/holman-retrato.webp" alt="Holman Orjuela" width={168} height={224} />
          <div>
            <p className="sr-kicker">Quién te acompaña</p>
            <h2>Holman Orjuela</h2>
            <p>
              Llevo más de una década acompañando a personas a descubrir su propósito, crear su marca y construir los
              sistemas de su negocio. Si en tu agenda aparece alguien de mi equipo, trabaja con el mismo método y con
              el mismo cuidado.
            </p>
            <p className="sr-frase">Nadie está donde está por falta de capacidad, sino por falta de claridad.</p>
          </div>
        </div>
      </section>

      {/* Método */}
      <section className="sr-sec">
        <p className="sr-kicker">Nuestro método</p>
        <h2>Corazón de Elefante</h2>
        <p className="sr-sub">Tres formas de acompañar que se juntan en una sola conversación.</p>
        <div className="sr-pilares">
          {PILARES.map((p) => (
            <div key={p.t} className="sr-pilar">
              <span>Coaching</span>
              <h3>{p.t}</h3>
              <p>{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cierre */}
      <section className="sr-final">
        <h2>Nos vemos en la sesión</h2>
        <p>Te llegan el enlace de Zoom y los datos de tu reserva al correo. Revisa también la carpeta de spam.</p>
        <a
          className="sr-wa"
          href={MOVER_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("sesion_reservada_whatsapp")}
        >
          <WhatsAppIcon width={18} height={18} />
          ¿Necesitas mover tu sesión? Escríbenos
        </a>
      </section>

      <footer className="sr-pie">
        <a href="/">holmanglobalgroup.com</a>
      </footer>
      <CookieBanner />
    </main>
  );
}
