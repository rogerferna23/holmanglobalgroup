import { Reveal } from "./reveal";

type Testimonial = {
  feature?: boolean;
  swatch: 1 | 2 | 3 | 4 | 5;
  initials: string;
  name: string;
  role: string;
  quote: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    feature: true,
    swatch: 1,
    initials: "VR",
    name: "Valentina Romero",
    role: "Fundadora · Atelier Lumen",
    quote:
      "Llegué con una idea borrosa y salí con una marca que respira como yo. El proceso fue casi terapéutico — más que diseñar un logo, me ayudaron a descubrir quién quería ser cuando trabajara.",
  },
  {
    swatch: 2,
    initials: "MC",
    name: "Mateo Cifuentes",
    role: "Productor musical",
    quote:
      "Tres sesiones de coaching musical me devolvieron algo que pensé que había perdido: ganas de crear sin miedo.",
  },
  {
    swatch: 3,
    initials: "LD",
    name: "Lucía Delgado",
    role: "Coach holística",
    quote:
      "Mi web nueva facturó en el primer mes lo que la anterior en seis. La diferencia es que esta vez había sistema detrás.",
  },
  {
    swatch: 4,
    initials: "JM",
    name: "Javier Morales",
    role: "Arquitecto · Estudio Raíz",
    quote:
      "No es solo branding. Es como si te ayudaran a recordar lo que siempre supiste pero no te atrevías a decir.",
  },
  {
    swatch: 5,
    initials: "SA",
    name: "Sofía Aguilar",
    role: "Terapeuta · Casa Sol",
    quote:
      "Pasé de no saber qué cobrar a tener un sistema que vende mientras duermo. Y todo empezó preguntándome quién soy.",
  },
];

export function Testimonials() {
  return (
    <section id="experiencias" className="testimonials">
      <div className="shell">
        <div className="section-head">
          <div className="meta">
            <div className="eyebrow-row">
              <span className="num">06</span>
              <span className="bar" />
              <span className="eyebrow eyebrow-w">Experiencias</span>
            </div>
            <h2 className="display">
              Quienes ya
              <br />
              encontraron su chispa.
            </h2>
          </div>
          <p className="lede">
            Las marcas que creamos no son productos terminados. Son comienzos. Esto es lo que
            cuentan quienes empezaron antes que tú.
          </p>
        </div>

        <Reveal stagger className="testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <article
              key={t.name}
              className={`testimonial${t.feature ? " feature" : ""}`}
            >
              <div className="quote-mark" aria-hidden="true">
                &ldquo;
              </div>
              <p className="quote">{t.quote}</p>
              <div className="testimonial-meta">
                <div
                  className={`avatar swatch-${t.swatch}`}
                  aria-hidden="true"
                >
                  {t.initials}
                </div>
                <div className="who">
                  <div className="name">{t.name}</div>
                  <div className="role">{t.role}</div>
                </div>
                <div className="stars" aria-label="5 de 5 estrellas">
                  ★★★★★
                </div>
              </div>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
