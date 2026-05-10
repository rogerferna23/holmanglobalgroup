import { Reveal } from "./reveal";

export function Historia() {
  return (
    <section id="historia" className="historia">
      <div className="shell">
        <div className="historia-head">
          <div className="eyebrow-row">
            <span className="num">·</span>
            <span className="bar" />
            <span className="eyebrow eyebrow-w">Nuestra historia</span>
          </div>
          <h2 className="display historia-title">
            El camino
            <br />
            que nos trajo aquí.
          </h2>
        </div>

        <Reveal className="historia-body" as="div">
          <p className="historia-lead">
            Desde muy joven, la música se convirtió en una parte importante de mi
            vida. Cuando tenía 10 años conocí a quien hoy es mi cuñado, baterista,
            teclista y arreglista, y gracias a él tuve mi primer gran acercamiento
            al mundo musical. Desde entonces empecé a enamorarme de los
            instrumentos, especialmente de la batería, y descubrí una conexión muy
            profunda con la creatividad y la expresión emocional.
          </p>

          <p>
            Con el tiempo entendí que no me veía viviendo una vida tradicional o
            trabajando en algo que no conectara conmigo. Desde el colegio sabía que
            quería construir un camino diferente, uno donde pudiera tener libertad,
            propósito y la posibilidad de gestionar mi propio tiempo y visión.
            Mientras buscaba ese camino descubrí el mundo digital y entendí que las
            marcas, internet y la tecnología podían convertirse en herramientas
            reales para transformar vidas.
          </p>

          <p>
            Inicialmente quería estudiar tecnología en audio, pero esa carrera fue
            cancelada. Finalmente estudié Gestión Comercial y de Negocios con
            énfasis en Marketing Digital, y fue ahí donde empecé a desarrollar
            conocimientos en branding, estrategia y marketing mientras participaba
            en distintos proyectos que me ayudaron a crecer profesional y
            personalmente.
          </p>

          <p>
            Sin embargo, el momento que más transformó mi visión ocurrió hace
            algunos años durante una sesión de neurocoaching. Esa experiencia me
            permitió entender que antes de construir una marca sólida, primero debía
            existir un trabajo interno. Comprendí que las marcas más poderosas no
            nacen desde la competencia, sino desde la autenticidad, el propósito y
            el ser.
          </p>

          <p>
            A partir de esa transformación decidí crear mi propia marca y también
            certificarme como coach expansivo y coach musical, integrando estas
            herramientas en los procesos de descubrimiento de propósito, identidad
            y creación de marcas. Así nació Holman Global Group: una marca creada
            para unir coaching, propósito, estrategia digital y construcción de
            identidad en un mismo lugar.
          </p>

          <blockquote className="historia-quote">
            <p>
              Con el tiempo también nació el concepto{" "}
              <span className="accent">&ldquo;Corazón de Elefante&rdquo;</span>.
              Después de una de aquellas sesiones de neurocoaching escuché una
              canción llamada <em>&ldquo;Le Coeur Elephant&rdquo;</em>, que en
              francés significa &ldquo;Corazón de Elefante&rdquo;. La canción
              hablaba de una transformación profunda y conectó completamente
              conmigo. Desde entonces, el elefante se convirtió en un símbolo de
              fuerza, sensibilidad, consciencia y propósito, representando la
              esencia que buscamos transmitir en cada proyecto y en cada marca que
              ayudamos a construir.
            </p>
          </blockquote>
        </Reveal>
      </div>
    </section>
  );
}
