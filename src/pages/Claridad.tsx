import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Seo } from "@/components/seo";
import { WHATSAPP_URL } from "@/lib/config";
import { trackEvent } from "@/lib/analytics";

// Enlace fijo a la Sesión de Claridad para piezas impresas o en PDF (workbooks,
// ebooks, QR). Lleva a WhatsApp con el número de `config.ts`: si el número
// cambia, los PDF ya repartidos siguen funcionando. `?desde=` elige el mensaje.
const MENSAJES: Record<string, string> = {
  emociones:
    "Hola, terminé el curso Gestión de las emociones y quiero agendar mi Sesión de Claridad.",
};
const MENSAJE_BASE = "Hola, quiero agendar mi Sesión de Claridad.";

export default function Claridad() {
  const [params] = useSearchParams();
  const desde = params.get("desde") ?? "";
  const url = `${WHATSAPP_URL}?text=${encodeURIComponent(MENSAJES[desde] ?? MENSAJE_BASE)}`;

  useEffect(() => {
    trackEvent("claridad_enlace", { desde: desde || "directo" });
    window.location.replace(url);
  }, [desde, url]);

  return (
    <>
      <Seo
        title="Sesión de Claridad — Holman Global Group"
        description="Agenda tu Sesión de Claridad con Holman o alguien de su equipo."
        noindex
      />
      <section className="no-encontrada">
        <div className="shell">
          <h1 className="display no-encontrada-title">
            Te llevamos a <em>WhatsApp.</em>
          </h1>
          <p className="no-encontrada-lede">
            Ahí agendas tu Sesión de Claridad con Holman o alguien de su equipo.
          </p>
          <div className="no-encontrada-acciones">
            <a href={url} className="btn btn-primary">
              Abrir WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
