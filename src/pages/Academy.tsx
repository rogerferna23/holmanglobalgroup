import { useEffect, useState, type FormEvent } from "react";
import { CookieBanner } from "@/components/cookie-banner";
import { SelloAcademy } from "@/components/sello-academy";
import { trackEvent } from "@/lib/analytics";
import {
  FORMATO,
  PASOS_M2H2,
  PERFILES,
  PILOTO,
  PREGUNTAS,
  RECIBES,
  REQUISITOS,
  TEMARIO,
  unirseListaAcademy,
  type Perfil,
} from "@/lib/academy";

/**
 * `/academy` — ECOS Academy, por ahora solo la Certificación Coach M2H2 y su
 * lista de espera para el grupo fundador.
 *
 * OCULTA mientras se construye: sin enlace en el sitio, fuera del sitemap y
 * con noindex (scripts/seo-routes.mjs). Se comparte a mano. Cuando abra la
 * venta, el formulario se cambia por el checkout de Stripe.
 */

function Lista({ id }: { id: string }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [busy, setBusy] = useState(false);
  const [listo, setListo] = useState<null | "nuevo" | "ya">(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (whatsapp.replace(/\D/g, "").length < 8) {
      setError("Escribe tu WhatsApp con el código de país, por ejemplo +57 300 000 0000.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ya = await unirseListaAcademy({ nombre, email, whatsapp, perfil });
      trackEvent("academy_lista");
      setListo(ya ? "ya" : "nuevo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos anotarte. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  if (listo) {
    return (
      <div className="ac-listo" role="status">
        <span className="sr-check" aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <h3>{listo === "ya" ? "Ya estabas en la lista" : "¡Estás en la lista!"}</h3>
        <p>
          Antes de abrir las inscripciones te escribimos a <strong>{email}</strong> y por WhatsApp con el precio del
          grupo fundador y los horarios. Tú eliges con calma.
        </p>
      </div>
    );
  }

  return (
    <form id={id} className="mc-form ac-form" onSubmit={onSubmit}>
      <fieldset className="ac-perfil">
        <legend>¿Qué te trae?</legend>
        {PERFILES.map((p) => (
          <label key={p.id} className={perfil === p.id ? "is-on" : undefined}>
            <input type="radio" name={`perfil-${id}`} value={p.id} checked={perfil === p.id} onChange={() => setPerfil(p.id)} disabled={busy} />
            <strong>{p.t}</strong>
            <span>{p.d}</span>
          </label>
        ))}
      </fieldset>
      <input aria-label="Tu nombre" placeholder="Tu nombre" type="text" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} required minLength={2} disabled={busy} />
      <input aria-label="Correo" placeholder="Tu correo" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} />
      <input aria-label="WhatsApp con código de país" placeholder="WhatsApp (con código de país, ej. +57)" type="tel" autoComplete="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required disabled={busy} />
      {error && <p className="mc-error">{error}</p>}
      <button type="submit" className="ag-btn mc-enviar" disabled={busy}>
        {busy ? "Anotando…" : "Quiero mi cupo en el grupo fundador"}
      </button>
      <p className="mc-legal">Anotarte no te compromete a nada. Cupos para {PILOTO.maximo} personas.</p>
    </form>
  );
}

export default function Academy() {
  const [abierta, setAbierta] = useState<number | null>(0);

  useEffect(() => {
    document.title = "Certificación Coach M2H2 · ECOS Academy";
  }, []);

  return (
    <main className="sr ac">
      <div className="sr-glow" aria-hidden />

      <header className="sr-marca">
        <img src="/marca/logo-h-claro.png" alt="" width={36} height={36} />
        <span>Holman Global Group</span>
      </header>

      {/* Hero: el sello, la promesa y la lista */}
      <section className="ac-hero">
        <div className="ac-hero-copy">
          <SelloAcademy size={132} className="ac-sello" />
          <p className="sr-eyebrow">ECOS Academy · Grupo fundador</p>
          <h1>Certificación Coach M2H2</h1>
          <p className="sr-lede">
            En 12 semanas aprendes a acompañar a una persona a cumplir una meta a 90 días, con el mismo método y las
            mismas herramientas que uso con mis clientes. Sales certificado y con tus primeros clientes acompañados.
          </p>
          <ul className="ac-datos">
            <li><strong>12</strong> semanas</li>
            <li><strong>60</strong> horas</li>
            <li><strong>En vivo</strong> por Zoom</li>
            <li><strong>Desde el</strong> {PILOTO.inicio.replace(" de 2027", "")}</li>
          </ul>
        </div>
        <div className="ac-hero-form">
          <p className="ac-form-titulo">Lista de espera</p>
          <Lista id="lista-arriba" />
        </div>
      </section>

      {/* El método */}
      <section className="sr-sec">
        <p className="sr-kicker">El método</p>
        <h2>Cuatro pasos que un cliente puede ver</h2>
        <p className="sr-sub">
          No aprendes coaching en abstracto: aprendes un camino completo, de la primera sesión al cierre.
        </p>
        <div className="ac-pasos">
          {PASOS_M2H2.map((p) => (
            <div key={p.t} className="ac-paso">
              <span>{p.letra}</span>
              <h3>{p.t}</h3>
              <p>{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Formato */}
      <section className="sr-sec">
        <p className="sr-kicker">Cómo es</p>
        <h2>60 horas, la mitad en vivo</h2>
        <div className="ac-formato">
          {FORMATO.map((f) => (
            <div key={f.t} className="ac-formato-item">
              <strong>{f.horas} h</strong>
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Temario */}
      <section className="sr-sec">
        <p className="sr-kicker">Temario</p>
        <h2>Semana a semana</h2>
        <p className="sr-sub">Cada semana practicas una herramienta en tu trío.</p>
        <ol className="ac-temario">
          {TEMARIO.map((s) => (
            <li key={s.semana}>
              <span className="ac-semana">{String(s.semana).padStart(2, "0")}</span>
              <div>
                <h3>{s.modulo}</h3>
                <p>{s.aprende}</p>
              </div>
              <span className="ac-herramienta">{s.herramienta}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Certificación */}
      <section className="sr-sec">
        <p className="sr-kicker">Tu certificado</p>
        <h2>Demuestras que sabes acompañar</h2>
        <p className="sr-sub">No basta con asistir. Te certificas cuando cumples estos cinco pasos:</p>
        <div className="ac-cert">
          <ol className="ac-requisitos">
            {REQUISITOS.map((r, i) => (
              <li key={r.t}>
                <span>{i + 1}</span>
                <div>
                  <strong>{r.t}</strong>
                  <p>{r.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <figure className="ac-diploma">
            <img src="/academy/diploma.webp" alt="Diploma de la Certificación Coach M2H2 con un nombre de ejemplo" width={1400} height={990} loading="lazy" />
            <figcaption>Así se ve tu diploma (con un nombre de ejemplo).</figcaption>
          </figure>
        </div>
        <ul className="ac-recibes">
          {RECIBES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      {/* Quién enseña */}
      <section className="sr-sec">
        <div className="sr-holman">
          <img src="/links/holman-retrato.webp" alt="Holman Orjuela" width={168} height={224} />
          <div>
            <p className="sr-kicker">Director académico</p>
            <h2>Holman Orjuela</h2>
            <p>
              Llevo más de una década acompañando a personas a descubrir su propósito, crear su marca y construir los
              sistemas de su negocio. En esta certificación te enseño el proceso completo que uso con mis clientes, y
              yo mismo doy las clases, la mentoría y la evaluación final.
            </p>
            <p className="sr-frase">Nadie está donde está por falta de capacidad, sino por falta de claridad.</p>
          </div>
        </div>
      </section>

      {/* Fechas */}
      <section className="sr-sec">
        <p className="sr-kicker">Grupo fundador</p>
        <h2>Las fechas</h2>
        <ol className="ac-fechas">
          <li><strong>{PILOTO.preventa}</strong><span>Abre la preventa para la lista de espera</span></li>
          <li><strong>{PILOTO.cierre}</strong><span>Cierran las inscripciones</span></li>
          <li><strong>{PILOTO.inicio}</strong><span>Primera clase en vivo</span></li>
          <li><strong>{PILOTO.graduacion}</strong><span>Graduación</span></li>
        </ol>
        <p className="sr-sub">
          Entre {PILOTO.minimo} y {PILOTO.maximo} personas: un grupo pequeño para que cada sesión tuya reciba revisión.
        </p>
      </section>

      {/* Preguntas */}
      <section className="sr-sec">
        <p className="sr-kicker">Preguntas</p>
        <h2>Lo que más nos preguntan</h2>
        <div className="ac-faq">
          {PREGUNTAS.map((q, i) => (
            <div key={q.p} className={`ac-faq-item${abierta === i ? " is-on" : ""}`}>
              <button type="button" aria-expanded={abierta === i} onClick={() => setAbierta(abierta === i ? null : i)}>
                {q.p}
                <span aria-hidden>{abierta === i ? "−" : "+"}</span>
              </button>
              {abierta === i && <p>{q.r}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Próximas certificaciones */}
      <section className="sr-sec ac-proximas">
        <p className="sr-kicker">Después vienen</p>
        <div className="ac-proximas-fila">
          <span>Marketing digital</span>
          <span>Oratoria</span>
        </div>
      </section>

      {/* Cierre */}
      <section className="sr-final ac-final">
        <SelloAcademy size={96} />
        <h2>Aparta tu cupo en el grupo fundador</h2>
        <Lista id="lista-abajo" />
      </section>

      <footer className="sr-pie">
        <a href="/">holmanglobalgroup.com</a>
      </footer>
      <CookieBanner />
    </main>
  );
}
