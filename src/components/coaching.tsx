import { Reveal } from "./reveal";

// Bloque "Qué es el coaching musical y expansivo": dos disciplinas que son la
// base del método Corazón de Elefante. Va entre Corazón de Elefante y Servicios.
export function Coaching() {
  return (
    <section id="coaching" className="coaching">
      <div className="shell">
        <div className="section-head">
          <div className="meta">
            <div className="eyebrow-row">
              <span className="num">·</span>
              <span className="bar" />
              <span className="eyebrow eyebrow-w">Disciplina</span>
            </div>
            <h2 className="display">
              Qué es el coaching
              <br />
              musical y expansivo.
            </h2>
          </div>
          <p className="lede">
            Dos disciplinas complementarias, científicas y basadas en evidencia,
            que son la base del método Corazón de Elefante.
          </p>
        </div>

        <Reveal stagger className="coaching-grid">
          <article className="coaching-card" data-brand="musical">
            <span className="coaching-kind">01 · Coaching Musical</span>
            <p>
              El coaching musical es una disciplina basada en la neurociencia y la
              psicología aplicada de la música. Utiliza herramientas como ondas
              binaurales, anclajes musicales y estados de activación cognitiva para
              facilitar procesos de introspección, claridad y toma de decisiones.
              La música actúa sobre el sistema nervioso de forma directa y medible,
              generando estados mentales específicos que potencian el
              autoconocimiento y la dirección personal.
            </p>
          </article>

          <article className="coaching-card" data-brand="expansivo">
            <span className="coaching-kind">02 · Coaching Expansivo</span>
            <p>
              El coaching expansivo es un enfoque basado en la psicología positiva
              y el desarrollo humano que trabaja desde las fortalezas, los valores y
              el propósito de cada persona. No parte del problema — parte del
              potencial. A través de preguntas poderosas, herramientas de
              autoconocimiento y un acompañamiento estructurado, ayuda a las personas
              a construir claridad, tomar decisiones con dirección y desarrollar una
              identidad auténtica desde la que construir su marca y su negocio.
            </p>
          </article>
        </Reveal>
      </div>
    </section>
  );
}
