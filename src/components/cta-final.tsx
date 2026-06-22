import { SITE, WHATSAPP_URL } from "@/lib/config";
import { ArrowRightIcon, WhatsAppIcon } from "./icons";
import { Reveal } from "./reveal";

export function CtaFinal() {
  return (
    <section className="cta-final">
      <div className="cta-final-glow" aria-hidden="true" />
      <Reveal className="shell cta-final-content">
        <div
          className="eyebrow-row"
          style={{
            justifyContent: "center",
            display: "inline-flex",
            margin: "0 auto 28px",
          }}
        >
          <span className="bar" />
          <span className="eyebrow">Empieza hoy</span>
          <span className="bar" />
        </div>
        <h2 className="display">
          Tu propósito puede convertirse
          <br />
          en una <span className="gold">marca real</span>.
        </h2>
        <p>
          Una conversación de 30 minutos puede cambiar la dirección de los próximos 10 años.
          Hablemos. No necesitas tenerlo todo claro — solo dar el primer paso.
        </p>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-xl"
        >
          <WhatsAppIcon width={18} height={18} />
          Hablar con un asesor
          <ArrowRightIcon className="arrow" />
        </a>
        <div className="cta-trust">
          <span>Respuesta rápida</span>
          <span className="dot" aria-hidden="true" />
          <span>Primera consulta sin compromiso</span>
          <span className="dot" aria-hidden="true" />
          <span>{SITE.phone.display}</span>
        </div>
      </Reveal>
    </section>
  );
}
