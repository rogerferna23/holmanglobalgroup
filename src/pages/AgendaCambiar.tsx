import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import {
  claveDia, diaLargo, horaCorta, nombreZona, pedirCambio, reagendarConToken, zonaDelNavegador,
  type Cambio,
} from "@/lib/agenda";
import { WHATSAPP_URL } from "@/lib/config";
import { AGENDAR } from "@/lib/routes";

/**
 * `/agendar/cambiar?t=TOKEN` — el enlace «Cambia la hora aquí» de los correos
 * de la agenda (y el que llega cuando alguien intenta reservar otra vez con el
 * mismo correo). La persona elige la nueva hora y confirma: la reserva es la
 * misma, la hora anterior queda libre.
 */
export default function AgendaCambiar() {
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";
  const [zona] = useState(zonaDelNavegador);
  const [datos, setDatos] = useState<Cambio | null>(null);
  const [cargaError, setCargaError] = useState<string | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<{ inicio: string; zoom_url: string | null } | null>(null);

  useEffect(() => {
    document.title = "Holman Global Group · Cambiar la hora de tu sesión";
  }, []);

  const cargar = () => {
    if (!token) return;
    setCargaError(null);
    pedirCambio(token)
      .then(setDatos)
      .catch((e: Error) => setCargaError(e.message));
  };
  useEffect(cargar, [token]);

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

  async function confirmar() {
    if (!hora) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await reagendarConToken(token, hora);
      trackEvent("agenda_reagendada", { tipo: datos?.cita.tipo });
      setListo(r.cita);
      window.scrollTo({ top: 0 });
    } catch (err) {
      const e2 = err as Error & { ocupada?: boolean };
      setError(e2.message);
      if (e2.ocupada) { setHora(null); cargar(); }
    } finally {
      setEnviando(false);
    }
  }

  const cita = datos?.cita;

  return (
    <main className="sr ag agd">
      <div className="sr-glow" aria-hidden />
      <header className="sr-marca">
        <img src="/logo-h.png" alt="" width={36} height={36} />
        <span>Holman Global Group</span>
      </header>

      <section className="sr-hero ag-hero agd-hero">
        {listo ? (
          <>
            <div className="sr-check" aria-hidden>✓</div>
            <p className="sr-eyebrow">Hora cambiada</p>
            <h1>¡Listo, nos vemos en la nueva hora!</h1>
            <p className="sr-lede">
              Tu {cita?.nombre ?? "sesión"} quedó para el <strong>{diaLargo(listo.inicio, zona)}</strong> a las{" "}
              <strong>{horaCorta(listo.inicio, zona)}</strong> (hora de {nombreZona(zona)}). Te enviamos la
              confirmación al correo con la invitación actualizada para tu calendario.
            </p>
            {listo.zoom_url && (
              <div className="agd-caja agd-listo">
                <p>Tu enlace de Zoom:</p>
                <a className="agd-zoom" href={listo.zoom_url} target="_blank" rel="noopener">{listo.zoom_url}</a>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="sr-eyebrow">Tu reserva</p>
            <h1>Cambia la hora de tu sesión</h1>
            {cita?.vigente && (
              <p className="sr-lede">
                {cita.primer ? `${cita.primer}, tu` : "Tu"} {cita.nombre} está para el{" "}
                <strong>{diaLargo(cita.inicio, zona)}</strong> a las <strong>{horaCorta(cita.inicio, zona)}</strong>.
                Elige la nueva hora y la anterior queda libre sola.
              </p>
            )}

            <div className="agd-caja">
              {!token ? (
                <p className="agd-error">Este enlace está incompleto. Ábrelo de nuevo desde tu correo.</p>
              ) : cargaError ? (
                <div className="agd-vacio">
                  <p>{cargaError}</p>
                  <button type="button" className="ag-btn ag-btn-2" onClick={cargar}>Intentar de nuevo</button>
                </div>
              ) : !datos ? (
                <p className="agd-cargando">Buscando los horarios disponibles…</p>
              ) : !datos.cita.vigente ? (
                <div className="agd-vacio">
                  <p>
                    {datos.cita.estado === "cancelada"
                      ? "Esta reserva se canceló. Si quieres, agenda una nueva."
                      : "Esta sesión ya pasó. Si quieres otra, agéndala aquí."}
                  </p>
                  <a className="ag-btn" href={AGENDAR}>Agendar <span aria-hidden>→</span></a>
                </div>
              ) : !dias.length ? (
                <div className="agd-vacio">
                  <p>En este momento no hay otros horarios libres. Escríbenos y buscamos un espacio para ti.</p>
                  <a className="ag-btn" href={`${WHATSAPP_URL}?text=${encodeURIComponent("Hola, quiero cambiar la hora de mi sesión y no encontré horarios libres.")}`} target="_blank" rel="noopener">
                    Escribir por WhatsApp
                  </a>
                </div>
              ) : (
                <>
                  <p className="agd-zona">Horarios en tu hora local · {nombreZona(zona)}</p>
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

                  <h2 className="agd-paso-titulo"><span>2</span> Elige la nueva hora</h2>
                  <p className="agd-dia-largo">{dia && horasDelDia[0] ? diaLargo(horasDelDia[0], zona) : ""}</p>
                  <div className="agd-horas">
                    {horasDelDia.map((h) => (
                      <button
                        key={h}
                        type="button"
                        className={`agd-hora${h === hora ? " is-sel" : ""}`}
                        onClick={() => setHora(h)}
                      >
                        {horaCorta(h, zona)}
                      </button>
                    ))}
                  </div>

                  {hora && (
                    <div className="agd-form">
                      <p className="agd-resumen">
                        Nueva hora: {diaLargo(hora, zona)} · <strong>{horaCorta(hora, zona)}</strong> · {datos.cita.duracion} minutos
                      </p>
                      {error && <p className="agd-error" role="alert">{error}</p>}
                      <button type="button" className="ag-btn agd-reservar" onClick={confirmar} disabled={enviando}>
                        {enviando ? "Cambiando…" : "Cambiar a esta hora"}
                      </button>
                    </div>
                  )}
                  {!hora && error && <p className="agd-error" role="alert">{error}</p>}
                </>
              )}
            </div>

            {cita?.vigente && (
              <p className="agd-nota">
                ¿Prefieres cancelarla? <a href={`${AGENDAR}/cancelar?t=${encodeURIComponent(token)}`}>Cancélala aquí</a>.
              </p>
            )}
          </>
        )}
      </section>

      <footer className="sr-pie">
        <a href="/">holmanglobalgroup.com</a>
      </footer>
    </main>
  );
}
