import { SITE } from "@/lib/config";
import {
  AREAS,
  areaFoco,
  nivel,
  promedioRueda,
  puntajes,
  type TestState,
} from "@/lib/test-heridas";

/**
 * El informe que se le regala a la persona: tres hojas A4 con la marca.
 * Se imprime con window.print() → "Guardar como PDF"; el CSS de impresión
 * (test-autodescubrimiento.css) deja solo estas hojas y conserva el fondo.
 * Aquí va solo lo que la persona ve: las notas privadas se quedan fuera.
 */
export function InformeTest({ s }: { s: TestState }) {
  const nombre = s.nombre.trim() || "Tu nombre";
  const fecha = formatearFecha(s.fecha);
  const prom = promedioRueda(s);
  const foco = areaFoco(s);
  const ranking = puntajes(s);
  const principales = ranking.filter((p) => p.pct > 0).slice(0, 2);
  const ordenRueda = [...AREAS]
    .filter((a) => s.rueda[a.id] != null)
    .sort((a, b) => (s.rueda[b.id] ?? 0) - (s.rueda[a.id] ?? 0));

  return (
    <div className="tad-informe">
      {/* ---------- Hoja 1: Rueda de la Vida ---------- */}
      <section className="tad-hoja">
        <Cabecera />
        <div className="tad-portada">
          <p className="tad-eyebrow">Mapa de autodescubrimiento</p>
          <h1 className="tad-h1">{nombre}</h1>
          <p className="tad-fecha">{fecha}</p>
        </div>

        <div className="tad-bloque">
          <p className="tad-eyebrow">01 · Rueda de la Vida</p>
          <h2 className="tad-h2">Así se ve tu vida hoy</h2>
          <p className="tad-p">
            Cada área la calificaste tú, del 1 al 10. Es una fotografía de este
            momento: el punto exacto desde donde empieza el camino.
          </p>
        </div>

        <div className="tad-rueda-grid">
          <Radar s={s} />
          <div>
            <ul className="tad-lista-areas">
              {ordenRueda.map((a) => (
                <li key={a.id} className={foco?.id === a.id ? "foco" : undefined}>
                  <span>{a.nombre}</span>
                  <b>{s.rueda[a.id]}</b>
                </li>
              ))}
            </ul>
            {prom != null && (
              <p className="tad-promedio">
                Promedio <b>{prom.toFixed(1)}</b> / 10
              </p>
            )}
          </div>
        </div>

        {foco && (
          <div className="tad-foco">
            <p className="tad-eyebrow">El área que hoy te pide atención</p>
            <h3 className="tad-h3">
              {foco.nombre} <span>· {s.rueda[foco.id]}/10</span>
            </h3>
            <div className="tad-foco-cols">
              {s.sentir.trim() && <Cita titulo="Lo que quieres sentir" texto={s.sentir} />}
              {s.frena.trim() && <Cita titulo="Lo que hoy pide trabajo" texto={s.frena} />}
              {s.distinto.trim() && <Cita titulo="Cuando esta área crezca" texto={s.distinto} />}
            </div>
          </div>
        )}
        <Pie n={1} />
      </section>

      {/* ---------- Hoja 2: las cinco heridas ---------- */}
      <section className="tad-hoja">
        <Cabecera />
        <div className="tad-bloque">
          <p className="tad-eyebrow">02 · Las cinco heridas</p>
          <h2 className="tad-h2">Lo que tu historia te enseñó a proteger</h2>
          <p className="tad-p">
            Todos llevamos las cinco heridas en distinta medida. Cada una trae una
            máscara —la forma en que aprendiste a protegerte— y, detrás de ella,
            una fuerza que se despierta cuando la miras con conciencia.
          </p>
        </div>

        <div className="tad-barras">
          {ranking.map((p) => (
            <div key={p.herida.id} className="tad-barra">
              <div className="tad-barra-top">
                <span className="tad-barra-nombre">
                  {p.herida.nombre}
                  <em>Máscara: {p.herida.mascara}</em>
                </span>
                <span className="tad-barra-valor">
                  {p.pct}% <small>{nivel(p.pct)}</small>
                </span>
              </div>
              <div className="tad-barra-pista">
                <div className="tad-barra-lleno" style={{ width: `${Math.max(p.pct, 2)}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="tad-heridas-top">
          {principales.map((p) => (
            <article key={p.herida.id} className="tad-herida-card">
              <p className="tad-eyebrow">Herida de {p.herida.nombre.toLowerCase()}</p>
              <p className="tad-origen">{p.herida.origen}</p>
              <dl>
                <dt>La fuerza que despierta</dt>
                <dd>{p.herida.fuerza}</dd>
                <dt>Tu práctica</dt>
                <dd>{p.herida.practica}</dd>
              </dl>
            </article>
          ))}
        </div>
        <Pie n={2} />
      </section>

      {/* ---------- Hoja 3: el siguiente paso ---------- */}
      <section className="tad-hoja">
        <Cabecera />
        <div className="tad-bloque">
          <p className="tad-eyebrow">03 · Hacia dónde vas</p>
          <h2 className="tad-h2">Tu siguiente paso</h2>
        </div>

        {s.siguientePaso.trim() && (
          <div className="tad-paso">
            <p>{s.siguientePaso}</p>
            <span>— Holman</span>
          </div>
        )}

        {principales.length > 0 && (
          <div className="tad-bloque">
            <p className="tad-eyebrow">Preguntas para llevarte</p>
            <ol className="tad-preguntas">
              {principales.map((p) => (
                <li key={p.herida.id}>{p.herida.pregunta}</li>
              ))}
              {foco && <li>¿Qué pequeño paso puedes dar esta semana por tu {foco.nombre.toLowerCase()}?</li>}
            </ol>
          </div>
        )}

        <div className="tad-cierre">
          <p className="tad-frase">
            La vida no es una línea.
            <br />
            <span>Es una partitura.</span>
          </p>
          <p className="tad-p">
            Este mapa es una herramienta de autoconocimiento y coaching. Míralo
            con curiosidad y con cariño: cada número es información para elegir
            mejor, y cada herida guarda una fuerza lista para despertar.
          </p>
          <p className="tad-contacto">
            {SITE.url.replace("https://", "")} · {SITE.whatsapp.display} · @holmanglobalgroup
          </p>
        </div>
        <Pie n={3} />
      </section>
    </div>
  );
}

function Cabecera() {
  return (
    <header className="tad-cab">
      <img src="/logo-h.png" alt="" />
      <span>
        Holman Global Group <em>· Corazón de Elefante</em>
      </span>
    </header>
  );
}

function Pie({ n }: { n: number }) {
  return (
    <footer className="tad-pie">
      <span>Mapa de autodescubrimiento · HGG</span>
      <span>{n} / 3</span>
    </footer>
  );
}

function Cita({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="tad-cita">
      <p className="tad-cita-t">{titulo}</p>
      <p>«{texto.trim()}»</p>
    </div>
  );
}

/** Radar de 10 ejes en SVG (vectorial: se imprime nítido). */
function Radar({ s }: { s: TestState }) {
  const size = 300;
  const c = size / 2;
  const r = 100;
  const n = AREAS.length;
  const punto = (i: number, v: number) => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + Math.cos(ang) * r * (v / 10), c + Math.sin(ang) * r * (v / 10)] as const;
  };
  const poly = AREAS.map((a, i) => punto(i, s.rueda[a.id] ?? 0).join(",")).join(" ");

  return (
    <svg className="tad-radar" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Rueda de la Vida">
      {[2, 4, 6, 8, 10].map((lv) => (
        <polygon
          key={lv}
          points={AREAS.map((_, i) => punto(i, lv).join(",")).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={lv === 10 ? 1 : 0.6}
        />
      ))}
      {AREAS.map((_, i) => {
        const [x, y] = punto(i, 10);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={0.6} />;
      })}
      <polygon points={poly} fill="rgba(240,184,0,0.18)" stroke="#F0B800" strokeWidth={1.6} strokeLinejoin="round" />
      {AREAS.map((a, i) => {
        const v = s.rueda[a.id];
        if (v == null) return null;
        const [x, y] = punto(i, v);
        return <circle key={a.id} cx={x} cy={y} r={2.8} fill="#F0B800" />;
      })}
      {AREAS.map((a, i) => {
        const [x, y] = punto(i, 12.6);
        const anchor = Math.abs(x - c) < 8 ? "middle" : x > c ? "start" : "end";
        return (
          <text key={a.id} x={x} y={y + 3} textAnchor={anchor} className="tad-radar-label">
            {a.nombre}
          </text>
        );
      })}
    </svg>
  );
}

function formatearFecha(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}
