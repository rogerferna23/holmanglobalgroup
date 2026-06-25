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
          <img             src="/corazon-elefante.jpg"
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
            <span className="eyebrow eyebrow-w">Esencia</span>
          </Reveal>
          <Reveal as="h2" className="display display-quote">
            Corazón de <em>Elefante</em> es la esencia de Holman Global Group.
          </Reveal>
          <Reveal as="p">
            Corazón de Elefante es una metodología creada por Holman Global Group
            que utiliza el coaching expansivo y musical como herramienta base para
            ayudar a las personas a descubrir propósito, construir marcas auténticas
            y desarrollar sistemas capaces de alcanzar objetivos grandes.
          </Reveal>
          <Reveal as="p">
            La metodología se basa en la idea de que las marcas más poderosas nacen
            cuando una persona conecta profundamente con quién es, con aquello que
            realmente la mueve y decide construir desde la autenticidad, no desde
            la comparación o la competencia.
          </Reveal>
          <Reveal as="p">
            El elefante representa fuerza, consciencia, sensibilidad y propósito.
            Por eso no buscamos crear marcas vacías, sino proyectos con impacto,
            coherencia y alma.
          </Reveal>
          <Reveal as="p">
            Nuestro enfoque es científico y basado en evidencia. Trabajamos con
            ondas binaurales, anclajes musicales, psicología aplicada de la música
            y neurociencia aplicada: la música actúa sobre el sistema nervioso de
            forma directa y medible, generando estados mentales específicos que
            potencian el autoconocimiento y la dirección personal.
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
    </section>
  );
}
