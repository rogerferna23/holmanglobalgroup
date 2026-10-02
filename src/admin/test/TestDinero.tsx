import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ADMIN } from "@/lib/routes";
import {
  EMOCIONES,
  ESCALA,
  ESTILOS_MODELO,
  FRASES_OIDAS,
  MENTALIDAD,
  MOTORES,
  PATRONES,
  PREGUNTAS_INTERCALADAS,
  RELACION_MODELO,
  SIGNIFICADOS,
  TERMOSTATOS,
  estadoInicial,
  fraseHeredada,
  nivel,
  puntajes,
  type Modelo,
  type TestDineroState,
} from "@/lib/test-dinero";
import { InformeDinero } from "./InformeDinero";
import { Campo, Seccion, descargarInformePdf, nombreParaArchivo } from "./compartido";
import "@/styles/test-autodescubrimiento.css";
// Copia en texto de la misma hoja: va dentro del informe fuera de pantalla para
// que la foto del PDF tenga los estilos aunque el navegador tarde en cargar el .css.
import estilosInforme from "@/styles/test-autodescubrimiento.css?inline";

/**
 * Test del Patrón del Dinero — lo aplica Holman en sesión, marcando lo que la
 * persona responde. Pantalla completa para compartirla en Zoom. Solo
 * super/admin. Contenido y cálculo en src/lib/test-dinero.ts.
 *
 * Nada se guarda en el servidor: el borrador vive en este navegador (con su
 * propia clave, separada del otro test) y se borra con "Nuevo test".
 */

const PASOS = ["Persona", "Tu raíz", "Tu patrón", "Tu mentalidad", "Cierre", "Resultado"] as const;
const CLAVE_BORRADOR = "hgg-test-dinero";

function leerBorrador(): TestDineroState {
  try {
    const raw = localStorage.getItem(CLAVE_BORRADOR);
    if (raw) return { ...estadoInicial(), ...JSON.parse(raw) };
  } catch {
    /* sin almacenamiento: se empieza en blanco */
  }
  return estadoInicial();
}

type SetCampo = <K extends keyof TestDineroState>(k: K, v: TestDineroState[K]) => void;

export default function TestDinero() {
  const { profile } = useAuth();
  const [s, setS] = useState<TestDineroState>(leerBorrador);
  const [paso, setPaso] = useState(0);
  const [verPatron, setVerPatron] = useState(false);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    document.title = "Test del patrón del dinero · HGG";
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(s));
    } catch {
      /* ignorar */
    }
  }, [s]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [paso]);

  if (profile && !["super", "admin"].includes(profile.role)) {
    return (
      <div className="tad-app">
        <p className="tad-vacio">Esta herramienta es solo para el coach.</p>
      </div>
    );
  }

  const set: SetCampo = (k, v) => setS((p) => ({ ...p, [k]: v }));

  function nuevo() {
    if (!confirm("¿Empezar un test nuevo? Se borran las respuestas actuales.")) return;
    setS(estadoInicial());
    setPaso(0);
  }

  async function descargar() {
    if (generando) return;
    setGenerando(true);
    try {
      await descargarInformePdf(`Patron_del_dinero_${nombreParaArchivo(s.nombre)}_HGG.pdf`);
    } catch (e) {
      console.error(e);
      alert("No se pudo generar el PDF. Vuelve a intentarlo en unos segundos.");
    } finally {
      setGenerando(false);
    }
  }

  const respondidas = PREGUNTAS_INTERCALADAS.filter((q) => s.respuestas[q.patron][q.indice] != null).length;
  const calificadas = MENTALIDAD.filter((d) => s.mentalidad[d.id] != null).length;
  const total = PREGUNTAS_INTERCALADAS.length;

  return (
    <div className="tad-app">
      <header className="tad-top">
        <Link to={ADMIN.test} className="tad-volver">← Tests</Link>
        <div className="tad-top-titulo">
          <img src="/logo-h.png" alt="" />
          <span>Test del patrón del dinero</span>
        </div>
        <button type="button" className="tad-btn-ghost" onClick={nuevo}>Nuevo test</button>
      </header>

      <nav className="tad-pasos" aria-label="Pasos del test">
        {PASOS.map((p, i) => (
          <button
            key={p}
            type="button"
            className={`tad-paso-btn${i === paso ? " activo" : ""}${i < paso ? " hecho" : ""}`}
            onClick={() => setPaso(i)}
          >
            <span>{i + 1}</span>
            {p}
          </button>
        ))}
      </nav>

      <main className="tad-main">
        {paso === 0 && (
          <Seccion titulo="¿Con quién miramos el dinero hoy?" sub="Estos datos aparecen en el informe que le regalas.">
            <div className="tad-campos">
              <Campo label="Nombre de la persona">
                <input
                  className="tad-input"
                  value={s.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                  placeholder="Nombre y apellido"
                  autoFocus
                />
              </Campo>
              <Campo label="Fecha de la sesión">
                <input className="tad-input" type="date" value={s.fecha} onChange={(e) => set("fecha", e.target.value)} />
              </Campo>
            </div>
            <p className="tad-guia">
              Para abrir: «Vamos a mirar tu historia con el dinero sin juicio. Nada de lo que
              descubras está mal: todo tuvo una razón, y hoy puedes elegir de nuevo».
            </p>
          </Seccion>
        )}

        {paso === 1 && <Raiz s={s} set={set} />}

        {paso === 2 && (
          <Seccion titulo="Tu patrón" sub={`¿Con qué frecuencia te pasa? · ${respondidas} de ${total}`}>
            <label className="tad-toggle">
              <input type="checkbox" checked={verPatron} onChange={(e) => setVerPatron(e.target.checked)} />
              Mostrar a qué patrón apunta cada pregunta (desactívalo si compartes pantalla)
            </label>
            <ol className="tad-preg-lista">
              {PREGUNTAS_INTERCALADAS.map((q, i) => {
                const v = s.respuestas[q.patron][q.indice];
                return (
                  <li key={`${q.patron}-${q.indice}`} className="tad-preg">
                    <p>
                      <span className="tad-preg-n">{i + 1}</span>
                      {q.texto}
                      {verPatron && <em className="tad-preg-tag">{PATRONES.find((p) => p.id === q.patron)?.nombre}</em>}
                    </p>
                    <div className="tad-escala4">
                      {ESCALA.map((etq, val) => (
                        <button
                          key={etq}
                          type="button"
                          className={v === val ? "sel" : undefined}
                          onClick={() => {
                            const arr = [...s.respuestas[q.patron]];
                            arr[q.indice] = val;
                            set("respuestas", { ...s.respuestas, [q.patron]: arr });
                          }}
                        >
                          {etq}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Seccion>
        )}

        {paso === 3 && (
          <Seccion titulo="Tu mentalidad" sub={`Del 1 al 10, ¿dónde estás hoy? · ${calificadas} de ${MENTALIDAD.length}`}>
            <div className="tad-areas">
              {MENTALIDAD.map((d) => (
                <div key={d.id} className="tad-area">
                  <div className="tad-area-txt">
                    <b>{d.nombre}</b>
                    <span>{d.pregunta}</span>
                  </div>
                  <div className="tad-escala10">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={s.mentalidad[d.id] === n ? "sel" : undefined}
                        onClick={() => set("mentalidad", { ...s.mentalidad, [d.id]: n })}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Seccion>
        )}

        {paso === 4 && (
          <Seccion titulo="Cierre de la sesión" sub="El mantra y el siguiente paso salen en el informe. Lo demás es privado.">
            <Campo
              label="Su mantra del dinero (sale en el informe)"
              ayuda={
                fraseHeredada(s)
                  ? `Escríbanlo juntos, en positivo, como respuesta a «${fraseHeredada(s)}».`
                  : "Escríbanlo juntos, en positivo, como respuesta a la frase que heredó."
              }
            >
              <textarea
                className="tad-input"
                rows={2}
                value={s.mantra}
                onChange={(e) => set("mantra", e.target.value)}
                placeholder="Ej.: El dinero llega a mí con facilidad y lo uso para crecer y servir."
              />
            </Campo>
            <Campo label="Plan de trabajo / siguiente paso (se lo escribes a la persona — sale en el informe)">
              <textarea
                className="tad-input"
                rows={4}
                value={s.siguientePaso}
                onChange={(e) => set("siguientePaso", e.target.value)}
                placeholder="Ej.: Vamos a trabajar tu merecimiento y el orden de tu dinero. Estas dos semanas vas a…"
              />
            </Campo>
            <p className="tad-privado">Privado · solo lo ves tú</p>
            <div className="tad-indicios">
              {PATRONES.map((p) => (
                <Campo key={p.id} label={`Indicios de ${p.nombre} — frase que dijo`} ayuda={p.senales}>
                  <input
                    className="tad-input"
                    value={s.indicios[p.id]}
                    onChange={(e) => set("indicios", { ...s.indicios, [p.id]: e.target.value })}
                  />
                </Campo>
              ))}
            </div>
            <Campo label="Notas libres (intuiciones, objetivo para la próxima sesión)">
              <textarea
                className="tad-input"
                rows={4}
                value={s.notasPrivadas}
                onChange={(e) => set("notasPrivadas", e.target.value)}
              />
            </Campo>
          </Seccion>
        )}

        {paso === 5 && (
          <Seccion titulo="Resultado" sub="Así lo recibe la persona. Descárgalo y envíaselo de regalo.">
            <Resumen s={s} respondidas={respondidas} calificadas={calificadas} />
            <div className="tad-descargar">
              <button type="button" className="tad-btn" onClick={descargar} disabled={generando}>
                {generando ? "Generando PDF…" : "Descargar resultado (PDF)"}
              </button>
              <span>Se descarga el PDF con las cuatro hojas, tal cual las ves aquí.</span>
            </div>
            <div className="tad-preview">
              <InformeDinero s={s} />
            </div>
          </Seccion>
        )}
      </main>

      <footer className="tad-nav">
        <button type="button" className="tad-btn-ghost" disabled={paso === 0} onClick={() => setPaso(paso - 1)}>
          ← Anterior
        </button>
        {paso < PASOS.length - 1 ? (
          <button type="button" className="tad-btn" onClick={() => setPaso(paso + 1)}>
            {PASOS[paso + 1]} →
          </button>
        ) : (
          <button type="button" className="tad-btn" onClick={descargar} disabled={generando}>
            {generando ? "Generando PDF…" : "Descargar resultado"}
          </button>
        )}
      </footer>

      {/* Copia del informe fuera de pantalla: de aquí se fotografían las hojas del PDF. */}
      {createPortal(
        <div className="tad-print-root">
          <style>{estilosInforme}</style>
          <InformeDinero s={s} />
        </div>,
        document.body
      )}
    </div>
  );
}

/** Parte 1: lo que oyó, vio y vivió. Casi todo se marca; el detalle se escribe. */
function Raiz({ s, set }: { s: TestDineroState; set: SetCampo }) {
  const modelo = (k: "mama" | "papa", titulo: string) => {
    const m = s[k];
    const cambiar = (v: Partial<Modelo>) => set(k, { ...m, ...v });
    return (
      <div className="tad-bloque-raiz">
        <h2 className="tad-raiz-h">{titulo}</h2>
        <Opciones opciones={ESTILOS_MODELO} sel={m.estilos} onChange={(estilos) => cambiar({ estilos })} />
        <p className="tad-raiz-sub">¿Y tú hoy?</p>
        <Opciones
          unica
          opciones={RELACION_MODELO.map((r) => r.nombre)}
          sel={[RELACION_MODELO.find((r) => r.id === m.relacion)?.nombre ?? ""]}
          onChange={([n]) => cambiar({ relacion: RELACION_MODELO.find((r) => r.nombre === n)?.id ?? "" })}
        />
      </div>
    );
  };

  return (
    <Seccion titulo="Tu raíz" sub="Lo que oíste, lo que viste y lo que viviste con el dinero.">
      <div className="tad-bloque-raiz">
        <h2 className="tad-raiz-h">1 · Lo que oíste</h2>
        <p className="tad-raiz-sub">«¿Qué frases sobre el dinero se repetían en tu casa?»</p>
        <Opciones opciones={FRASES_OIDAS} sel={s.frases} onChange={(v) => set("frases", v)} />
        <Campo label="La frase que más le pesa, con sus palabras (sale en el informe)">
          <input
            className="tad-input"
            value={s.frasePrincipal}
            onChange={(e) => set("frasePrincipal", e.target.value)}
            placeholder={s.frases[0] ? `Si lo dejas vacío se usa «${s.frases[0]}»` : "Ej.: Mi papá siempre decía que…"}
          />
        </Campo>
      </div>

      <p className="tad-guia">«¿Cómo manejaba el dinero tu mamá? ¿Y tu papá? ¿Hoy te pareces, eres lo opuesto o una mezcla?»</p>
      {modelo("mama", "2 · Lo que viste en mamá")}
      {modelo("papa", "Lo que viste en papá")}

      <div className="tad-bloque-raiz">
        <h2 className="tad-raiz-h">3 · Lo que viviste</h2>
        <Campo label="«¿Qué momento con el dinero te marcó de niño?» (sale en el informe)">
          <textarea className="tad-input" rows={3} value={s.recuerdo} onChange={(e) => set("recuerdo", e.target.value)} />
        </Campo>
        <p className="tad-raiz-sub">¿Qué sentiste?</p>
        <Opciones opciones={EMOCIONES} sel={s.emociones} onChange={(v) => set("emociones", v)} />
      </div>

      <div className="tad-bloque-raiz">
        <h2 className="tad-raiz-h">4 · Lo que significa</h2>
        <p className="tad-raiz-sub">«Para ti, el dinero es…»</p>
        <Opciones opciones={SIGNIFICADOS} sel={s.significados} onChange={(v) => set("significados", v)} />
      </div>

      <div className="tad-bloque-raiz">
        <h2 className="tad-raiz-h">5 · Tu motor</h2>
        <p className="tad-raiz-sub">«¿Para qué quieres más dinero?»</p>
        <Opciones opciones={MOTORES} sel={s.motores} onChange={(v) => set("motores", v)} />
      </div>

      <div className="tad-bloque-raiz">
        <h2 className="tad-raiz-h">6 · Tu termostato</h2>
        <p className="tad-raiz-sub">«En los últimos años, tus ingresos…»</p>
        <Opciones
          unica
          opciones={TERMOSTATOS.map((t) => t.nombre)}
          sel={[TERMOSTATOS.find((t) => t.id === s.termostato)?.nombre ?? ""]}
          onChange={([n]) => set("termostato", TERMOSTATOS.find((t) => t.nombre === n)?.id ?? "")}
        />
      </div>
    </Seccion>
  );
}

/** Botones para marcar. Con `unica`, volver a tocar la marcada la desmarca. */
function Opciones({
  opciones,
  sel,
  onChange,
  unica,
}: {
  opciones: readonly string[];
  sel: string[];
  onChange: (v: string[]) => void;
  unica?: boolean;
}) {
  return (
    <div className="tad-opciones">
      {opciones.map((o) => {
        const activa = sel.includes(o);
        return (
          <button
            key={o}
            type="button"
            className={activa ? "sel" : undefined}
            aria-pressed={activa}
            onClick={() => {
              if (unica) onChange(activa ? [] : [o]);
              else onChange(activa ? sel.filter((x) => x !== o) : [...sel, o]);
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/** Lectura rápida para el coach (en pantalla, no en el informe). */
function Resumen({ s, respondidas, calificadas }: { s: TestDineroState; respondidas: number; calificadas: number }) {
  const total = PREGUNTAS_INTERCALADAS.length;
  return (
    <div className="tad-resumen">
      {(respondidas < total || calificadas < MENTALIDAD.length) && (
        <p className="tad-aviso">
          Faltan respuestas: {total - respondidas} preguntas del patrón y {MENTALIDAD.length - calificadas} áreas de
          mentalidad. El informe se genera igual con lo que haya.
        </p>
      )}
      <table className="tad-tabla">
        <thead>
          <tr>
            <th>Patrón</th>
            <th>Puntos</th>
            <th>%</th>
            <th>Nivel</th>
            <th>Indicio anotado</th>
          </tr>
        </thead>
        <tbody>
          {puntajes(s).map((p) => (
            <tr key={p.patron.id}>
              <td>{p.patron.nombre}</td>
              <td>{p.puntos}/15</td>
              <td>{p.pct}%</td>
              <td>{nivel(p.pct)}</td>
              <td>{s.indicios[p.patron.id] || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
