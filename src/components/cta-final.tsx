import { CLARIDAD_WA_URL, SITE } from "@/lib/config";
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
          Todo gran camino comienza
          <br />
          con una <span className="gold">conversación</span>.
        </h2>
        <p>
          Descubre en qué punto estás y cuál es el siguiente paso para construir
          una vida, una marca y un sistema alineados con aquello que amas.
        </p>
        <a
          href={CLARIDAD_WA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-xl"
        >
          <WhatsAppIcon width={18} height={18} />
          Agenda tu Sesión de Claridad
          <ArrowRightIcon className="arrow" />
        </a>
        <div className="cta-trust">
          <span>Sesión gratuita de 30 minutos</span>
          <span className="dot" aria-hidden="true" />
          <span>Primera consulta sin compromiso</span>
          <span className="dot" aria-hidden="true" />
          <span>{SITE.phone.display}</span>
        </div>
      </Reveal>
    </section>
  );
}
