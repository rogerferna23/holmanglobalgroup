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
          <svg className="ele" viewBox="0 0 400 400" fill="none" aria-hidden="true">
            <path
              id="elephantPath"
              d="
                M 80 220
                C 80 180, 100 150, 140 140
                C 170 132, 200 134, 220 142
                C 240 130, 270 124, 300 132
                C 330 140, 350 165, 348 200
                C 346 225, 332 240, 318 246
                L 318 280
                C 318 296, 308 304, 296 304
                C 284 304, 276 296, 276 280
                L 276 256
                L 230 256
                L 230 280
                C 230 296, 220 304, 208 304
                C 196 304, 188 296, 188 280
                L 188 252
                C 168 248, 150 240, 140 226
                L 138 234
                C 132 256, 116 264, 108 254
                C 104 248, 106 238, 116 226
                C 110 224, 102 218, 96 210
                C 88 218, 80 222, 80 220 Z
              "
            />
            <path d="M 80 220 C 60 230, 50 250, 56 268 C 60 280, 72 286, 80 280 C 86 274, 84 264, 78 260" />
            <circle cx="170" cy="170" r="2.5" fill="#F0B800" stroke="none" />
            <path d="M 100 232 C 92 240, 88 250, 90 258" opacity="0.6" />
            <path d="M 220 142 C 210 168, 208 192, 218 212" opacity="0.5" />
            <path
              d="M 200 70 C 204 80, 210 84, 208 96 C 206 104, 198 104, 196 96 C 195 90, 200 86, 200 80 Z"
              fill="#F0B800"
              fillOpacity="0.6"
              stroke="#F0B800"
              strokeWidth="0.8"
            />
            <line x1="200" y1="60" x2="200" y2="70" opacity="0.4" />
            <line x1="180" y1="78" x2="188" y2="82" opacity="0.4" />
            <line x1="220" y1="78" x2="212" y2="82" opacity="0.4" />
          </svg>
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
            Creemos que las marcas más poderosas nacen cuando una persona descubre quién es,
            conecta con su propósito y decide construir desde la autenticidad.
          </Reveal>
          <Reveal as="p">
            El elefante representa fuerza, consciencia, sensibilidad y propósito. No buscamos
            crear marcas vacías, sino proyectos con identidad, impacto y alma.
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
