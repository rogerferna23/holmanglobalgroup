import { useEffect, useRef } from "react";

const STEPS = [
  {
    n: "01",
    kind: "Propósito",
    h: ["Eco", ""],
    items: [
      "Coaching expansivo",
      "Coaching musical",
      "Descubrimiento personal",
      "Claridad de vida y marca",
    ],
  },
  {
    n: "02",
    kind: "Marca",
    h: ["Fuego", ""],
    items: [
      "Creación de marca",
      "Logo y paleta",
      "Dirección visual",
      "Comunicación y voz",
    ],
  },
  {
    n: "03",
    kind: "Sistema",
    h: ["Huella", ""],
    items: [
      "Sitios web premium",
      "Estrategia digital",
      "Estructura de ventas",
      "Automatización básica",
    ],
  },
];

export function Process() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const fill = fillRef.current;
    if (!section || !fill) return;

    let ticking = false;
    const update = () => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height + vh * 0.4;
      const scrolled = vh - rect.top;
      const pct = Math.max(0, Math.min(1, scrolled / total));
      fill.style.width = `${pct * 100}%`;
      stepRefs.current.forEach((s, i) => {
        if (!s) return;
        const threshold = 0.25 + i * 0.22;
        s.classList.toggle("lit", pct > threshold);
      });
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    // Recalibrar cuando cambia la altura del contenido (imagenes/fuentes que cargan tarde).
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => update());
      ro.observe(section);
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      if (ro) ro.disconnect();
    };
  }, []);

  return (
    <section ref={sectionRef} id="proceso" className="process">
      <div className="shell">
        <div className="section-head">
          <div className="meta">
            <div className="eyebrow-row">
              <span className="num">02</span>
              <span className="bar" />
              <span className="eyebrow eyebrow-w">Método</span>
            </div>
            <h2 className="display">
              Cómo lo
              <br />
              hacemos.
            </h2>
          </div>
          <p className="lede">
            Tres pasos. Una línea continua. De la confusión a un proyecto que respira contigo:
            claridad interior, marca con identidad y un sistema digital que vende mientras
            vives.
          </p>
        </div>

        <div className="process-track">
          <div className="process-line" aria-hidden="true">
            <div ref={fillRef} className="fill" />
          </div>

          {STEPS.map((s, i) => (
            <div
              key={s.n}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              className="process-step"
              data-step={i + 1}
            >
              <div className="process-node">{s.n}</div>
              <span className="kind">{s.kind}</span>
              <h3 className="display">
                {s.h[0]}
                {s.h[1] && (
                  <>
                    <br />
                    {s.h[1]}
                  </>
                )}
              </h3>
              <ul>
                {s.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
