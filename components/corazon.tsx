import Image from "next/image";
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
          <Image
            src="/logo-elefante.png"
            alt="Holman Global Group — Corazón de Elefante"
            width={1200}
            height={1200}
            priority
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
            Creemos que las marcas más poderosas nacen cuando una persona descubre
            quién es, conecta con aquello que realmente la mueve y decide construir
            desde la autenticidad, no desde la comparación o la competencia.
          </Reveal>
          <Reveal as="p">
            A través de esta metodología ayudamos a las personas a encontrar
            claridad, fortalecer su visión y transformar sus ideas en proyectos
            reales con identidad y dirección.
          </Reveal>
          <Reveal as="p">
            El elefante representa fuerza, consciencia, sensibilidad y propósito.
            Por eso no buscamos crear marcas vacías, sino proyectos con impacto,
            coherencia y alma.
          </Reveal>
          <Reveal className="corazon-tags">
            <span className="gold">Fuerza</span>
            <span>Consciencia</span>
            <span>Sensibilidad</span>
            <span className="gold">Propósito</span>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
