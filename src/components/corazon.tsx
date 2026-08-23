import { Reveal } from "./reveal";

// Corazón de Elefante — el método (brief "El método bien explicado", ago 2026).
//
// Antes esta sección decía que Corazón de Elefante era "el fundamento" y poco
// más: aparecía, pero no explicaba. El problema era que el mismo nombre estaba
// haciendo tres trabajos a la vez —el fundamento, el camino de tres etapas y
// las disciplinas— sin distinguirlos, y así el lector no se quedaba con
// ninguno.
//
// Ahora responde en orden: qué es · por qué un elefante · con qué se trabaja ·
// y hacia dónde lleva. Lo último se remata en una frase porque el camino ya se
// contó justo arriba, en la sección Camino (components/process.tsx): esta
// sección viene después y lo que hace es explicar por qué ese camino funciona.
//
// Nomenclatura: se dice "la estrategia", nunca "coaching estratégico" — sonaría
// a una tercera modalidad de coaching y se pisaría con Marca y Sistema. Y el
// Coaching Musical conserva su nombre: se encabeza con "el poder de la música",
// que se entiende a la primera, y el nombre aparece justo detrás.

/** Las tres fuerzas: sentir → decidir → construir. */
const FUERZAS = [
  {
    brand: "musical",
    kind: "El poder de la música",
    lead: "Llega donde el razonamiento no llega.",
    body:
      "Es nuestro Coaching Musical: integramos principios de la neurociencia y la psicología aplicada de la música para facilitar procesos de autoconocimiento, claridad y toma de decisiones.",
  },
  {
    brand: "expansivo",
    kind: "El coaching expansivo",
    lead: "Convierte esa claridad en decisiones.",
    body:
      "A través de herramientas de desarrollo humano y preguntas estratégicas, acompañamos a las personas a convertir el autoconocimiento en decisiones, hábitos y acciones alineadas con su propósito.",
  },
  {
    brand: "estrategia",
    kind: "La estrategia",
    lead: "Convierte las decisiones en resultados que se sostienen.",
    body:
      "Marca, sistemas y marketing digital: la estructura que hace que lo decidido funcione, y que siga funcionando sin depender de que estés en todo.",
  },
];

/** Lo que reconoces en el elefante, y lo que sostiene a quien construye algo. */
const CUALIDADES = [
  "Fortaleza",
  "Conciencia",
  "Sentido",
  "Humildad",
  "Expansión",
];

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
            <span className="eyebrow eyebrow-w">El método</span>
          </Reveal>
          {/*
            El titular es solo el nombre: el epígrafe de arriba ya dice que esto
            es el método, así que repetirlo hacía un titular largo que ocupaba
            media sección. La definición baja al párrafo, que es donde se puede
            explicar sin quedar enorme.
          */}
          <Reveal as="h2" className="display display-quote">
            Corazón de <em>Elefante</em>
          </Reveal>
          <Reveal as="p">
            Es la forma en que acompañamos a una persona desde tener algo
            valioso que dar hasta vivir de ello. Parte de algo que vemos una y
            otra vez: lo que de verdad mueve a alguien se siente antes de
            razonarse. Por eso el orden es sentir, decidir y construir.
          </Reveal>
          {/* Acaba en dos puntos: las cualidades de abajo completan la frase. */}
          <Reveal as="p">
            Y lleva el nombre del elefante porque recorrer ese camino pide lo
            mismo que reconoces en él:
          </Reveal>
          <Reveal className="corazon-tags">
            {CUALIDADES.map((c) => (
              <span key={c} className="gold">
                {c}
              </span>
            ))}
          </Reveal>
        </div>
      </div>

      {/* Las tres fuerzas: nacen visualmente de Corazón de Elefante, no como
          una sección independiente. */}
      <div className="shell corazon-coaching" id="fuerzas">
        <div className="corazon-coaching-link" aria-hidden="true" />
        <Reveal as="p" className="corazon-coaching-intro">
          Se pone en práctica con <span className="gold">tres fuerzas</span>.
        </Reveal>
        <Reveal stagger className="coaching-grid coaching-grid-tres">
          {FUERZAS.map((f) => (
            <article key={f.brand} className="coaching-card" data-brand={f.brand}>
              <span className="coaching-kind">{f.kind}</span>
              <p className="coaching-lead">{f.lead}</p>
              <p>{f.body}</p>
            </article>
          ))}
        </Reveal>

        {/*
          La frase que amarra el método y que antes faltaba: las fuerzas no van
          una por etapa. Es lo que lo convierte en un método y no en un menú de
          servicios, y es coherente con que los dos coachings sean transversales
          a los tres pilares.
        */}
        <Reveal as="p" className="corazon-fuerzas-cierre">
          Las tres se usan en las <span className="gold">tres etapas</span> del
          camino. En cada una se siente, se decide y se construye.
        </Reveal>
      </div>
    </section>
  );
}
