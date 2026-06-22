import { WHATSAPP_URL } from "@/lib/config";
import { ArrowRightIcon, WhatsAppIcon } from "./icons";
import { Reveal } from "./reveal";

// Bloque "Conoce a Sofía": presenta a la asistente de IA creada por Delegaweb
// (marca aliada). Sustituye la promesa de "respuesta en menos de 24h" por la
// nueva propuesta: respuesta en segundos, siempre disponible.
export function Sofia() {
  return (
    <section id="sofia" className="sofia">
      <div className="shell sofia-grid">
        <Reveal className="sofia-copy" as="div">
          <div className="eyebrow-row">
            <span className="num">·</span>
            <span className="bar" />
            <span className="eyebrow eyebrow-w">Delegaweb · Asistente IA</span>
          </div>
          <h2 className="display sofia-title">
            Conoce a <span className="accent-blue">Sofía</span>.
          </h2>
          <p className="sofia-body">
            Sofía fue creada por Delegaweb, nuestra marca aliada de sistemas
            digitales, para ofrecer una experiencia rápida, clara y siempre
            disponible. Desde el primer mensaje entiende lo que necesitas, responde
            en segundos y te ayuda a encontrar el camino correcto, sin importar
            cuándo decidas contactarnos.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary sofia-cta"
          >
            <WhatsAppIcon width={18} height={18} />
            Hablar con Sofía
            <ArrowRightIcon className="arrow" />
          </a>
        </Reveal>

        <Reveal className="sofia-card" as="div">
          <div className="sofia-card-head">
            <span className="sofia-avatar" aria-hidden="true">
              S
            </span>
            <div className="sofia-card-id">
              <strong>Sofía</strong>
              <span className="sofia-status">
                <i className="sofia-dot" aria-hidden="true" />
                En línea · responde en segundos
              </span>
            </div>
          </div>

          <div className="sofia-bubbles" aria-hidden="true">
            <p className="sofia-bubble sofia-bubble-in">
              Hola 👋 ¿en qué puedo ayudarte hoy?
            </p>
            <p className="sofia-bubble sofia-bubble-out">
              Quiero claridad sobre mi marca y mi sistema.
            </p>
            <p className="sofia-bubble sofia-bubble-in">
              ¡Perfecto! Te muestro el camino correcto…
            </p>
          </div>

          <div className="sofia-stat">
            <span className="sofia-stat-label">
              Tiempo promedio de respuesta
            </span>
            <strong className="sofia-stat-value">
              A solo segundos de cambiar tu historia.
            </strong>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
