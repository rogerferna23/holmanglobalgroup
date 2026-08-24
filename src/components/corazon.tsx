import { Reveal } from "./reveal";
import { CUALIDADES, FUERZAS, METODO } from "@/lib/metodo";

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
// Los textos viven en lib/metodo.ts porque los comparte con la destacada de
// Método en Instagram: así la web y las historias dicen exactamente lo mismo.

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
          <Reveal as="p">{METODO.queEs}</Reveal>
          {/* Acaba en dos puntos: las cualidades de abajo completan la frase. */}
          <Reveal as="p">{METODO.porQue}</Reveal>
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
