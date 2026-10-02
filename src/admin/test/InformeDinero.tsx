import { SITE } from "@/lib/config";
import {
  BOTES,
  MENTALIDAD,
  RELACION_MODELO,
  TERMOSTATOS,
  fraseHeredada,
  lecturaTermostato,
  mentalidadPorFortalecer,
  motorDeCarencia,
  nivel,
  principales,
  promedioMentalidad,
  puntajes,
  type Modelo,
  type TestDineroState,
} from "@/lib/test-dinero";
import { Radar, formatearFecha } from "./compartido";

/**
 * El informe del Test del Patrón del Dinero: cuatro hojas A4 con la marca.
 * Usa las mismas clases .tad- del informe de autodescubrimiento, así los dos
 * regalos se ven de la misma familia. Aquí va solo lo que la persona ve: los
 * indicios y las notas privadas se quedan fuera.
 */
export function InformeDinero({ s }: { s: TestDineroState }) {
  const nombre = s.nombre.trim() || "Tu nombre";
  const frase = fraseHeredada(s);
  const otrasFrases = s.frases.filter((f) => f !== frase);
  const ranking = puntajes(s);
  const top = principales(s);
  const fortalecer = mentalidadPorFortalecer(s);
  const prom = promedioMentalidad(s);
  const termostato = TERMOSTATOS.find((t) => t.id === s.termostato);
  const ordenMentalidad = [...MENTALIDAD]
    .filter((d) => s.mentalidad[d.id] != null)
    .sort((a, b) => (s.mentalidad[b.id] ?? 0) - (s.mentalidad[a.id] ?? 0));
  const bajas = new Set(fortalecer.map((d) => d.id));

  return (
    <div className="tad-informe">
      {/* ---------- Hoja 1: tu raíz ---------- */}
      <section className="tad-hoja tad-hoja-densa">
        <Cabecera />
        <div className="tad-portada">
          <p className="tad-eyebrow">Mapa de tu patrón del dinero</p>
          <h1 className="tad-h1">{nombre}</h1>
          <p className="tad-fecha">{formatearFecha(s.fecha)}</p>
        </div>

        <div className="tad-bloque">
          <p className="tad-eyebrow">01 · Tu raíz</p>
          <h2 className="tad-h2">De dónde viene tu forma de vivir el dinero</h2>
          <p className="tad-p">
            Tu relación con el dinero se aprendió antes de que pudieras elegirla:
            con lo que oíste, lo que viste y lo que viviste. Mirarla con calma es
            el primer paso para escribir una nueva.
          </p>
        </div>

        {frase && (
          <div className="tad-frase-heredada">
            <p className="tad-cita-t">Lo que oíste</p>
            <p className="tad-frase-grande">«{frase}»</p>
            {otrasFrases.length > 0 && <Chips items={otrasFrases} />}
          </div>
        )}

        <div className="tad-raiz-grid">
          {(s.mama.estilos.length > 0 || s.mama.relacion) && <TarjetaModelo titulo="Lo que viste en mamá" m={s.mama} />}
          {(s.papa.estilos.length > 0 || s.papa.relacion) && <TarjetaModelo titulo="Lo que viste en papá" m={s.papa} />}
          {(s.recuerdo.trim() || s.emociones.length > 0) && (
            <div className="tad-raiz-card tad-raiz-ancha">
              <p className="tad-cita-t">Lo que viviste</p>
              {s.recuerdo.trim() && <p className="tad-raiz-texto">«{s.recuerdo.trim()}»</p>}
              {s.emociones.length > 0 && <Chips items={s.emociones} />}
            </div>
          )}
          {s.significados.length > 0 && (
            <div className="tad-raiz-card">
              <p className="tad-cita-t">Para ti el dinero es</p>
              <Chips items={s.significados} />
            </div>
          )}
          {s.motores.length > 0 && (
            <div className="tad-raiz-card">
              <p className="tad-cita-t">Lo que te mueve a ganarlo</p>
              <Chips items={s.motores} />
              {motorDeCarencia(s) && (
                <p className="tad-raiz-nota">
                  Cuando el motor nace del miedo o de demostrar, ningún monto alcanza. Al sanarlo, el dinero se vuelve libertad.
                </p>
              )}
            </div>
          )}
        </div>

        {termostato && (
          <div className="tad-termostato">
            <p className="tad-cita-t">Tu termostato · {termostato.nombre}</p>
            <p>{lecturaTermostato(s)}</p>
          </div>
        )}
        <Pie n={1} />
      </section>

      {/* ---------- Hoja 2: tu patrón ---------- */}
      <section className="tad-hoja">
        <Cabecera />
        <div className="tad-bloque">
          <p className="tad-eyebrow">02 · Tu patrón</p>
          <h2 className="tad-h2">Cómo te proteges con el dinero</h2>
          <p className="tad-p">
            Todos llevamos estos seis patrones en distinta medida. Cada uno fue
            una forma inteligente de cuidarte y, detrás de él, guarda un regalo
            que florece cuando lo miras con conciencia.
          </p>
        </div>

        <div className="tad-barras">
          {ranking.map((p) => (
            <div key={p.patron.id} className="tad-barra">
              <div className="tad-barra-top">
                <span className="tad-barra-nombre">
                  {p.patron.nombre}
                  <em>«{p.patron.esencia}»</em>
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
          {top.map((p) => (
            <article key={p.patron.id} className="tad-herida-card">
              <p className="tad-eyebrow">{p.patron.nombre}</p>
              <p className="tad-origen">{p.patron.origen}</p>
              <dl>
                <dt>Tu regalo</dt>
                <dd>{p.patron.regalo}</dd>
                <dt>Tu práctica</dt>
                <dd>{p.patron.practica}</dd>
              </dl>
            </article>
          ))}
        </div>
        <Pie n={2} />
      </section>

      {/* ---------- Hoja 3: tu mentalidad ---------- */}
      <section className="tad-hoja">
        <Cabecera />
        <div className="tad-bloque">
          <p className="tad-eyebrow">03 · Tu mentalidad</p>
          <h2 className="tad-h2">La rueda de tu riqueza</h2>
          <p className="tad-p">
            Ocho formas de pensar que hacen crecer el dinero. Las calificaste tú,
            del 1 al 10: es la fotografía de hoy y el punto exacto desde donde
            empieza tu cambio.
          </p>
        </div>

        <div className="tad-rueda-grid">
          <Radar label="Rueda de la mentalidad" ejes={MENTALIDAD.map((d) => ({ nombre: d.nombre, valor: s.mentalidad[d.id] }))} />
          <div>
            <ul className="tad-lista-areas">
              {ordenMentalidad.map((d) => (
                <li key={d.id} className={bajas.has(d.id) ? "foco" : undefined}>
                  <span>{d.nombre}</span>
                  <b>{s.mentalidad[d.id]}</b>
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

        {fortalecer.length > 0 && (
          <div className="tad-heridas-top">
            {fortalecer.map((d) => (
              <article key={d.id} className="tad-herida-card">
                <p className="tad-eyebrow">
                  {d.nombre} · {s.mentalidad[d.id]}/10
                </p>
                <p className="tad-origen">«{d.declaracion}»</p>
                <dl>
                  <dt>Tu acción</dt>
                  <dd>{d.accion}</dd>
                </dl>
              </article>
            ))}
          </div>
        )}
        <Pie n={3} />
      </section>

      {/* ---------- Hoja 4: tu plan ---------- */}
      <section className="tad-hoja tad-hoja-densa">
        <Cabecera />
        <div className="tad-bloque">
          <p className="tad-eyebrow">04 · Tu nuevo patrón</p>
          <h2 className="tad-h2">Lo que eliges creer desde hoy</h2>
        </div>

        {s.mantra.trim() && (
          <div className="tad-mantra">
            <p className="tad-cita-t">Tu mantra del dinero</p>
            <p>«{s.mantra.trim()}»</p>
            {frase && <span>En lugar de: «{frase}»</span>}
          </div>
        )}

        {s.siguientePaso.trim() && (
          <div className="tad-paso">
            <p>{s.siguientePaso}</p>
            <span>— Holman</span>
          </div>
        )}

        <div className="tad-bloque">
          <p className="tad-eyebrow">Tus botes</p>
          <p className="tad-p">Cada ingreso, por pequeño que sea, se reparte así. El hábito importa más que la cantidad.</p>
          <div className="tad-botes">
            {BOTES.map((b) => (
              <div key={b.nombre}>
                <b>{b.pct}%</b>
                <span>{b.nombre}</span>
              </div>
            ))}
          </div>
        </div>

        {top.length > 0 && (
          <div className="tad-bloque">
            <p className="tad-eyebrow">Preguntas para llevarte</p>
            <ol className="tad-preguntas">
              {top.map((p) => (
                <li key={p.patron.id}>{p.patron.pregunta}</li>
              ))}
            </ol>
          </div>
        )}

        <div className="tad-cierre">
          <p className="tad-frase">
            El dinero es un resultado.
            <br />
            <span>Tú eres la raíz.</span>
          </p>
          <p className="tad-p">
            Este mapa es una herramienta de autoconocimiento y coaching. Míralo
            con curiosidad y con cariño: cada patrón fue tu forma de cuidarte, y
            hoy puedes elegir uno nuevo.
          </p>
          <p className="tad-contacto">
            {SITE.url.replace("https://", "")} · {SITE.whatsapp.display} · @holmanglobalgroup
          </p>
        </div>
        <Pie n={4} />
      </section>
    </div>
  );
}

function TarjetaModelo({ titulo, m }: { titulo: string; m: Modelo }) {
  const relacion = RELACION_MODELO.find((r) => r.id === m.relacion)?.nombre;
  return (
    <div className="tad-raiz-card">
      <p className="tad-cita-t">{titulo}</p>
      {m.estilos.length > 0 && <Chips items={m.estilos} />}
      {relacion && <p className="tad-raiz-nota">Hoy: {relacion.toLowerCase()}</p>}
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <ul className="tad-chips">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
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
      <span>Mapa de tu patrón del dinero · HGG</span>
      <span>{n} / 4</span>
    </footer>
  );
}
