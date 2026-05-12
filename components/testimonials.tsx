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
    initials: "ER",
    name: "Evelyn Rivas",
    role: "Empresaria Internacional · Venezuela",
    quote:
      "Holman Global Group LLC marcó un antes y un después en mi vida. La atención fue impecable, certera en cada detalle, y de profunda utilidad tanto en lo personal como en lo profesional. Un acompañamiento que se nota: con criterio, con humanidad y con resultados. Estoy inmensamente agradecida.",
  },
  {
    swatch: 2,
    initials: "DD",
    name: "Daniel Domínguez",
    role: "Asesor Estratégico de Seguros · Estados Unidos",
    quote:
      "Tener una marca personal sólida cambió la forma en que mis clientes me perciben. Holman no solo construyó mi página: me acompañó a entender quién soy y qué quiero transmitir. Profesionalismo total, paciencia y visión estratégica. Gracias por el proceso.",
  },
  {
    swatch: 3,
    initials: "NS",
    name: "Natha Sánchez",
    role: "Gerente en Marketing Digital · Colombia",
    quote:
      "El profesionalismo es increíble, el mejor trato y la mejor estructura. Puedo asegurar que mi visión hacia la vida y el ámbito laboral cambió por completo después de tener el gusto de conocer Holman Global Group.",
  },
  {
    swatch: 4,
    initials: "TA",
    name: "Tatiana Acosta",
    role: "Coach Internacional · España",
    quote:
      "Quiero darle las gracias a Holman por su entrega y su acogida a la hora de acompañarme en mi proceso. Tiene una empatía y un mimo en el proceso que me ayudó mucho a dar un paso muy importante para mí.",
  },
  {
    swatch: 5,
    initials: "VT",
    name: "Valentina Tafur",
    role: "Especialista en Interpretación de Espacios · Colombia",
    quote:
      "Increíble trabajo. Se acomodaron a mis tiempos y definitivamente se interesaron por mí, por lo que quería, y se lograron resultados que considero que sin el coaching no se habrían podido conseguir.",
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
