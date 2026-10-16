import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import {
  claveDia, diaLargo, horaCorta, nombreZona, pedirHorarios, reservarCita, zonaDelNavegador,
  type Horarios, type Reserva, type TipoId,
} from "@/lib/agenda";
import { WHATSAPP_URL } from "@/lib/config";
import { guardarReferido, leerReferido, registrarAperturaAgenda } from "@/lib/referido";
import { SESION_RESERVADA } from "@/lib/routes";
import { leerCampana } from "@/lib/campana";

const TEXTOS: Record<TipoId, { titulo: string; eyebrow: (min: number) => string; lede: string; doc: string }> = {
  claridad: {
    titulo: "Tu Sesión de Claridad",
    eyebrow: (min) => `De regalo · ${min} minutos por Zoom`,
    lede: "Conoceremos tu historia, entenderemos tus objetivos e identificaremos el mejor camino para ayudarte a avanzar. Elige el día y la hora que mejor te queden.",
    doc: "Holman Global Group · Sesión de Claridad",
  },
  sesion: {
    titulo: "Tu sesión de coaching",
    eyebrow: (min) => `${min} minutos por Zoom`,
    lede: "Tu espacio para avanzar con claridad. Elige el día y la hora de tu próxima sesión.",
    doc: "Holman Global Group · Sesión de coaching",
  },
};

/**
 * `/agendar` (Sesión de Claridad, con `?ref=` de embajador) y `/sesion`
 * (sesiones ya compradas). La agenda es propia: la persona ve las horas libres
 * de Holman en la zona de su navegador, reserva y recibe el Zoom al instante.
 */
export default function Agendar({ tipo = "claridad" }: { tipo?: TipoId }) {
  const [params] = useSearchParams();
  const ref = params.get("ref");
  const textos = TEXTOS[tipo];

  // La hora de la persona sale sola de su dispositivo: no tiene que elegir nada.
  const [zona] = useState(zonaDelNavegador);
  const [datos, setDatos] = useState<Horarios | null>(null);
  const [cargaError, setCargaError] = useState<string | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [reserva, setReserva] = useState<Reserva | null>(null);

  useEffect(() => {
    document.title = textos.doc;
  }, [textos.doc]);

  // Quién trajo a la persona: se guarda y se cuenta la visita para el embajador.
  useEffect(() => {
    if (!ref) return;
    guardarReferido(ref);
    registrarAperturaAgenda(leerReferido());
  }, [ref]);

  const cargar = () => {
    setCargaError(null);
    pedirHorarios(tipo)
      .then((d) => setDatos(d))
      .catch((e: Error) => setCargaError(e.message));
  };
  useEffect(cargar, [tipo]);

  // Las horas libres agrupadas por día, en la zona de la persona.
  const dias = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const h of datos?.horas ?? []) {
      const k = claveDia(h, zona);
      m.set(k, [...(m.get(k) ?? []), h]);
    }
    return [...m.entries()];
  }, [datos, zona]);

  useEffect(() => {
    if (!dias.length) return;
    if (!dia || !dias.some(([k]) => k === dia)) setDia(dias[0][0]);
  }, [dias, dia]);

  const horasDelDia = dias.find(([k]) => k === dia)?.[1] ?? [];
  const minutos = datos?.tipo.duracion ?? (tipo === "claridad" ? 30 : 60);

  if (reserva) {
    return <Confirmacion reserva={reserva} zona={zona} tipo={tipo} />;
  }

  return (
    <main className="sr ag agd">
      <div className="sr-glow" aria-hidden />

      <header className="sr-marca">
        <img src="/logo-h.png" alt="" width={36} height={36} />
        <span>Holman Global Group</span>
      </header>

      <section className="sr-hero ag-hero agd-hero">
        <p className="sr-eyebrow">{textos.eyebrow(minutos)}</p>
        <h1>{textos.titulo}</h1>
        <p className="sr-lede">{textos.lede}</p>

        <div className="agd-caja">
          <p className="agd-zona">Horarios en tu hora local · {nombreZona(zona)}</p>

          {cargaError ? (
            <div className="agd-vacio">
              <p>{cargaError}</p>
              <button type="button" className="ag-btn ag-btn-2" onClick={cargar}>Intentar de nuevo</button>
            </div>
          ) : !datos ? (
            <p className="agd-cargando">Buscando los horarios disponibles…</p>
          ) : !dias.length ? (
            <div className="agd-vacio">
              <p>En este momento no hay horarios libres. Escríbeme y buscamos un espacio para ti.</p>
              <a className="ag-btn" href={`${WHATSAPP_URL}?text=${encodeURIComponent(`Hola Holman, quiero agendar mi ${tipo === "claridad" ? "Sesión de Claridad" : "sesión de coaching"} y no encontré horarios libres.`)}`} target="_blank" rel="noopener">
                Escribir por WhatsApp
              </a>
            </div>
          ) : (
            <>
              <h2 className="agd-paso-titulo"><span>1</span> Elige el día</h2>
              <div className="agd-dias" role="list">
                {dias.map(([k, horas]) => {
                  const d = new Date(horas[0]);
                  return (
                    <button
                      key={k}
                      type="button"
                      role="listitem"
                      className={`agd-dia${k === dia ? " is-sel" : ""}`}
                      onClick={() => { setDia(k); setHora(null); }}
                    >
                      <small>{d.toLocaleDateString("es", { weekday: "short", timeZone: zona })}</small>
                      <strong>{d.toLocaleDateString("es", { day: "numeric", timeZone: zona })}</strong>
                      <small>{d.toLocaleDateString("es", { month: "short", timeZone: zona })}</small>
                    </button>
                  );
                })}
              </div>

              <h2 className="agd-paso-titulo"><span>2</span> Elige la hora</h2>
              <p className="agd-dia-largo">{dia && horasDelDia[0] ? diaLargo(horasDelDia[0], zona) : ""}</p>
              <div className="agd-horas">
                {horasDelDia.map((h) => (
                  <button
                    key={h}
                    type="button"
                    className={`agd-hora${h === hora ? " is-sel" : ""}`}
                    onClick={() => { setHora(h); trackEvent("agenda_elige_hora", { tipo }); }}
                  >
                    {horaCorta(h, zona)}
                  </button>
                ))}
              </div>

              {hora && (
                <Formulario
                  tipo={tipo}
                  hora={hora}
                  zona={zona}
                  minutos={minutos}
                  alReservar={setReserva}
                  alOcuparse={() => { setHora(null); cargar(); }}
                />
              )}
            </>
          )}
        </div>
      </section>

      <footer className="sr-pie">
        <a href="/">holmanglobalgroup.com</a>
      </footer>
    </main>
  );
}

function Formulario({
  tipo, hora, zona, minutos, alReservar, alOcuparse,
}: {
  tipo: TipoId; hora: string; zona: string; minutos: number;
  alReservar: (r: Reserva) => void; alOcuparse: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const { cita } = await reservarCita({
        tipo, inicio: hora, nombre, email, whatsapp, motivo, zona, ref: leerReferido(), campana: leerCampana(),
      });
      trackEvent("agenda_reservada", { tipo });
      alReservar(cita);
    } catch (err) {
      const e2 = err as Error & { ocupada?: boolean };
      setError(e2.message);
      if (e2.ocupada) alOcuparse();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="agd-form" onSubmit={enviar}>
      <h2 className="agd-paso-titulo"><span>3</span> Tus datos</h2>
      <p className="agd-resumen">
        {diaLargo(hora, zona)} · <strong>{horaCorta(hora, zona)}</strong> · {minutos} minutos
      </p>
      <div className="agd-campos">
        <label>
          <span>Nombre y apellido</span>
          <input required autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label>
          <span>Correo</span>
          <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          <span>WhatsApp <em>(con indicativo del país)</em></span>
          <input type="tel" autoComplete="tel" placeholder="+57 300 000 0000" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </label>
        <label className="agd-ancho">
          <span>{tipo === "claridad" ? "¿Qué te gustaría lograr? " : "¿Qué quieres trabajar en esta sesión? "}<em>(opcional)</em></span>
          <textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </label>
      </div>
      {error && <p className="agd-error" role="alert">{error}</p>}
      <button type="submit" className="ag-btn agd-reservar" disabled={enviando}>
        {enviando ? "Reservando…" : "Reservar mi sesión"}
      </button>
      <p className="agd-nota">Te llega la confirmación al correo con el enlace de Zoom y la invitación para tu calendario.</p>
    </form>
  );
}

function Confirmacion({ reserva, zona, tipo }: { reserva: Reserva; zona: string; tipo: TipoId }) {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);
  return (
    <main className="sr ag agd">
      <div className="sr-glow" aria-hidden />
      <header className="sr-marca">
        <img src="/logo-h.png" alt="" width={36} height={36} />
        <span>Holman Global Group</span>
      </header>
      <section className="sr-hero ag-hero agd-hero">
        <div className="sr-check" aria-hidden>✓</div>
        <p className="sr-eyebrow">Reserva confirmada</p>
        <h1>¡Nos vemos pronto!</h1>
        <p className="sr-lede">
          Tu {reserva.nombre} quedó para el <strong>{diaLargo(reserva.inicio, zona)}</strong> a las{" "}
          <strong>{horaCorta(reserva.inicio, zona)}</strong> (hora de {nombreZona(zona)}). Te enviamos todo a tu correo,
          con la invitación para tu calendario.
        </p>

        <div className="agd-caja agd-listo">
          {reserva.zoom_url ? (
            <>
              <p>Este es tu enlace de Zoom. Guárdalo o búscalo en tu correo el día de la sesión:</p>
              <a className="agd-zoom" href={reserva.zoom_url} target="_blank" rel="noopener">{reserva.zoom_url}</a>
            </>
          ) : (
            <p>El enlace de Zoom te llega por correo antes de la sesión.</p>
          )}
          {tipo === "claridad" && (
            <>
              <p className="agd-siguiente">Tu siguiente paso: mira el video de bienvenida y llega preparado para aprovecharla al máximo.</p>
              <Link className="ag-btn" to={SESION_RESERVADA} onClick={() => trackEvent("agendar_siguiente_paso")}>
                Ver cómo prepararme <span aria-hidden>→</span>
              </Link>
            </>
          )}
        </div>
      </section>
      <footer className="sr-pie">
        <a href="/">holmanglobalgroup.com</a>
      </footer>
    </main>
  );
}
