import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { cancelarConToken } from "@/lib/agenda";
import { AGENDAR } from "@/lib/routes";

/**
 * `/agendar/cancelar?t=TOKEN` — el enlace «Cancela aquí» de los correos de la
 * agenda. No cancela al abrirse (los antivirus del correo abren los enlaces
 * solos): la persona confirma con un botón.
 */
export default function AgendaCancelar() {
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";
  const [estado, setEstado] = useState<"pregunta" | "cancelando" | "lista" | "error">("pregunta");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [otraVez, setOtraVez] = useState(AGENDAR);

  useEffect(() => {
    document.title = "Holman Global Group · Cancelar sesión";
  }, []);

  async function cancelar() {
    setEstado("cancelando");
    try {
      const r = await cancelarConToken(token);
      if (r.otraVez) setOtraVez(new URL(r.otraVez).pathname);
      setEstado("lista");
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : String(e));
      setEstado("error");
    }
  }

  return (
    <main className="sr ag agd">
      <div className="sr-glow" aria-hidden />
      <header className="sr-marca">
        <img src="/logo-h.png" alt="" width={36} height={36} />
        <span>Holman Global Group</span>
      </header>
      <section className="sr-hero ag-hero agd-hero">
        {estado === "lista" ? (
          <>
            <p className="sr-eyebrow">Sesión cancelada</p>
            <h1>Listo, la liberamos</h1>
            <p className="sr-lede">Cuando quieras, elige un nuevo horario y retomamos.</p>
            <a className="ag-btn" href={otraVez}>Elegir otro horario <span aria-hidden>→</span></a>
          </>
        ) : (
          <>
            <p className="sr-eyebrow">Tu reserva</p>
            <h1>¿Cancelar tu sesión?</h1>
            <p className="sr-lede">
              Si te surgió algo, no pasa nada: la cancelas aquí y eliges otro horario cuando te quede mejor.
            </p>
            {!token ? (
              <p className="agd-error">Este enlace está incompleto. Ábrelo de nuevo desde tu correo.</p>
            ) : (
              <button type="button" className="ag-btn" onClick={cancelar} disabled={estado === "cancelando"}>
                {estado === "cancelando" ? "Cancelando…" : "Sí, cancelar mi sesión"}
              </button>
            )}
            {mensaje && <p className="agd-error" role="alert">{mensaje}</p>}
          </>
        )}
      </section>
      <footer className="sr-pie">
        <a href="/">holmanglobalgroup.com</a>
      </footer>
    </main>
  );
}
