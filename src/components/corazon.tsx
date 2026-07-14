import { Reveal } from "./reveal";

export function Corazon() {
  return (
    <section id="corazon" className="corazon">
      <div className="corazon-glow" aria-hidden="true" />
      <div className="shell corazon-content">
        <Reveal className="corazon-elephant">
          <div className="ring-bg" aria-hidden="true" />
          <div className="ring-bg r2" aria-hidden="true" />
          <div className="ring-bg r3" aria-hidden="true" />
          <img
            src="/corazon-elefante.jpg"
            alt="Holman Global Group — Corazón de Elefante"
            width={1024}
            height={1024}
            loading="lazy"
            className="corazon-logo"
          />
        </Reveal>

        <div className="corazon-text">
          <Reveal className="eyebrow-row">
            <span className="num">03</span>
            <span className="bar" />
            <span className="eyebrow eyebrow-w">Fundamento</span>
          </Reveal>
          <Reveal as="h2" className="display display-quote">
            Corazón de <em>Elefante</em> es el fundamento que da vida a Holman
            Global Group.
          </Reveal>
          <Reveal as="p">
            Reúne nuestras creencias, principios y formas de acompañar a las
            personas para recorrer el camino que transforma un propósito en una
            marca y una marca en un sistema capaz de generar impacto.
          </Reveal>
          <Reveal className="corazon-tags">
            <span className="gold">Humanidad</span>
            <span className="gold">Propósito</span>
            <span className="gold">Transformación</span>
            <span className="gold">Autenticidad</span>
            <span className="gold">Valor expansivo</span>
          </Reveal>
        </div>
      </div>

      {/* Coaching musical y expansivo: nacen visualmente de Corazón de Elefante,
          no como una sección independiente. */}
      <div className="shell corazon-coaching" id="coaching">
        <div className="corazon-coaching-link" aria-hidden="true" />
        <Reveal as="p" className="corazon-coaching-intro">
          Corazón de Elefante se vive a través de{" "}
          <span className="gold">dos disciplinas</span>.
        </Reveal>
        <Reveal stagger className="coaching-grid">
          <article className="coaching-card" data-brand="musical">
            <span className="coaching-kind">Coaching Musical</span>
            <p className="coaching-lead">
              La música como herramienta de transformación.
            </p>
            <p>
              Integramos principios de la neurociencia y la psicología aplicada
              de la música para facilitar procesos de autoconocimiento, claridad
              y toma de decisiones.
            </p>
          </article>

          <article className="coaching-card" data-brand="expansivo">
            <span className="coaching-kind">Coaching Expansivo</span>
            <p>
              A través de herramientas de desarrollo humano y preguntas
              estratégicas, acompañamos a las personas a convertir el
              autoconocimiento en decisiones, hábitos y acciones alineadas con su
              propósito.
            </p>
          </article>
        </Reveal>
      </div>
    </section>
  );
}
