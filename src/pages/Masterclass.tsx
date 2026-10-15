import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CookieBanner } from "@/components/cookie-banner";
import { trackEvent } from "@/lib/analytics";
import { diaLargo, horaCorta, nombreZona, zonaDelNavegador } from "@/lib/agenda";
import { APRENDES, proximaMasterclass, registrarMasterclass, type Masterclass as Clase } from "@/lib/masterclass";
import { guardarReferido } from "@/lib/referido";
import { CLUB } from "@/lib/routes";

/**
 * `/masterclass` — el lead magnet del sitio: la masterclass abierta de Holman a
 * cambio de nombre, correo y WhatsApp. Muestra la próxima masterclass abierta a
 * invitados (o la de `?s=`). Si llega con `?by=CODIGO` (un miembro la
 * compartió), el invitado queda a su nombre. `/ecos/invitado` usa esta misma
 * página. Al registrarse llega la confirmación al correo; los avisos y el Zoom,
 * después (ecos-clases).
 */
export default function Masterclass() {
  const [params] = useSearchParams();
  const sessionId = params.get("s") ?? "";
  const by = (params.get("by") ?? "").toUpperCase();
  const [zona] = useState(zonaDelNavegador);
  const [clase, setClase] = useState<Clase | null | undefined>(undefined);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [busy, setBusy] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    document.title = "Masterclass gratuita: Cómo generar ingresos con negocios digitales · Holman Global Group";
    // Solo en `pnpm dev`: ?demo muestra una masterclass de ejemplo (en local la función no responde por CORS).
    if (import.meta.env.DEV && params.has("demo")) {
      setClase({ id: "demo", title: "Cómo generar ingresos con negocios digitales", starts_at: "2026-11-03T01:00:00Z", teacher: "Holman", description: null });
      return;
    }
    proximaMasterclass(sessionId).then(setClase).catch(() => setClase(null));
  }, [sessionId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!clase) return;
    if (whatsapp.replace(/\D/g, "").length < 8) {
      setError("Escribe tu WhatsApp con el código de país, por ejemplo +57 300 000 0000.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await registrarMasterclass({ session_id: clase.id, nombre, email, whatsapp, by, zona });
      // Queda guardado quién lo invitó: si después crea su cuenta, es de esa persona.
      if (by) guardarReferido(by);
      trackEvent("masterclass_registro");
      setListo(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  const cuando = clase ? (
    <p className="mc-fecha">
      <span>{diaLargo(clase.starts_at, zona)}</span>
      <span className="mc-punto" aria-hidden>·</span>
      <span>{horaCorta(clase.starts_at, zona)} hora de {nombreZona(zona)}</span>
    </p>
  ) : null;

  return (
    <main className="sr mc">
      <div className="sr-glow" aria-hidden />

      <header className="sr-marca">
        <img src="/logo-h.png" alt="" width={36} height={36} />
        <span>Holman Global Group</span>
      </header>

      {clase === undefined ? (
        <section className="sr-hero"><p className="sr-lede">Cargando…</p></section>
      ) : clase === null ? (
        <section className="sr-hero mc-vacia">
          <p className="sr-eyebrow">Masterclass gratuita</p>
          <h1>La próxima masterclass viene pronto</h1>
          <p className="sr-lede">
            Esta ya pasó o todavía no abrimos la siguiente. Síguenos en el canal de WhatsApp y te avisamos apenas
            abramos los registros.
          </p>
          <div className="mc-acciones">
            <a className="ag-btn" href="https://whatsapp.com/channel/0029Vb9Ec155fM5VTslkfk2y" target="_blank" rel="noopener noreferrer">
              Seguir el canal de WhatsApp
            </a>
            <Link className="sr-wa" to={CLUB.landing}>Conocer ECOS Business Club</Link>
          </div>
        </section>
      ) : listo ? (
        <section className="sr-hero">
          <span className="sr-check" aria-hidden>
            <svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <p className="sr-eyebrow">Lugar reservado</p>
          <h1>¡Nos vemos en vivo!</h1>
          {cuando}
          <p className="sr-lede">
            Te acabo de escribir a <strong>{email}</strong> con los detalles y la invitación para tu calendario. El
            enlace para entrar te llega a ese correo a la hora de empezar. Si no lo ves, revisa promociones o spam.
          </p>
          <div className="mc-acciones">
            <a
              className="ag-btn"
              href={`https://wa.me/?text=${encodeURIComponent(`Me registré a esta masterclass gratuita de Holman Orjuela: «${clase.title}». Vente conmigo 👉 https://holmanglobalgroup.com/masterclass${by ? `?by=${by}` : ""}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("masterclass_compartir")}
            >
              Invitar a alguien por WhatsApp
            </a>
            <a className="sr-wa" href="https://www.youtube.com/watch?v=4z_CYlkgi9E" target="_blank" rel="noopener noreferrer">
              Mientras tanto: escucha el episodio
            </a>
          </div>
        </section>
      ) : (
        <>
          {/* Hero: la foto a un lado; al otro, solo título, fecha y formulario */}
          <section className="mc-hero">
            <div className="mc-retrato" aria-hidden>
              <img src="/masterclass/holman.webp" alt="" width={760} height={907} />
            </div>

            <div className="mc-copy">
              <p className="sr-eyebrow">Masterclass gratuita · En vivo</p>
              <h1>{clase.title}</h1>
              {cuando}
              <p className="mc-con">
                <img src="/masterclass/holman.webp" alt="" width={40} height={40} />
                con Holman Orjuela
              </p>

              <form ref={formRef} onSubmit={onSubmit} className="mc-form">
                <input aria-label="Tu nombre" placeholder="Tu nombre" type="text" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} required disabled={busy} />
                <input aria-label="Correo" placeholder="Tu correo" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} />
                <input aria-label="WhatsApp con código de país" placeholder="WhatsApp (con código de país, ej. +57)" type="tel" autoComplete="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required disabled={busy} />
                {error && <p className="mc-error">{error}</p>}
                <button type="submit" className="ag-btn mc-enviar" disabled={busy}>
                  {busy ? "Reservando…" : "Reservar mi lugar gratis"}
                </button>
                <p className="mc-legal">Te llega el enlace por correo. Sin spam: te puedes dar de baja cuando quieras.</p>
              </form>
            </div>
          </section>

          {/* Lo que te llevas: tres líneas, nada más */}
          <section className="mc-puntos" aria-label="Lo que te llevas">
            {APRENDES.map((a, i) => (
              <div key={a} className="mc-punto-item">
                <span>{String(i + 1).padStart(2, "0")}</span>
                <p>{a}</p>
              </div>
            ))}
          </section>
        </>
      )}

      <footer className="sr-pie">
        <a href="/">holmanglobalgroup.com</a>
      </footer>
      <CookieBanner />
    </main>
  );
}
