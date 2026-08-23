import { useEffect, useRef } from "react";

// Cada paso del camino: el pilar (Sentido · Marca · Sistema) es el
// protagonista visual (primer nivel); la etapa (Eco · Fuego · Huella) es el
// nombre de esa etapa (segundo nivel). Sin viñetas de productos — las
// soluciones se presentan en "Nuestras Soluciones"; aquí solo la esencia.
//
// Los textos viven en lib/camino.ts porque los comparte con las historias de
// Instagram del panel: así la web y las destacadas dicen exactamente lo mismo.
import { CAMINO as STEPS } from "@/lib/camino";

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
              <span className="eyebrow eyebrow-w">Camino</span>
            </div>
            <h2 className="display">
              Nuestro
              <br />
              camino.
            </h2>
          </div>
          <p className="lede">
            Tres pasos. Una línea continua. De la confusión a un proyecto que respira contigo:
            claridad interior, marca con identidad y un sistema digital que vende mientras
            vives.
          </p>
        </div>

        <p className="process-intro">
          Coaching musical y expansivo: el método que activa claridad, identidad
          y ejecución.
        </p>

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
              <span className="stage">{s.stage}</span>
              <h3 className="display">{s.pillar}</h3>
              {s.desc.split("\n\n").map((para, di) => (
                <p
                  key={di}
                  className={`process-step-desc${di === 0 ? " lead" : ""}`}
                >
                  {para}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
