import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ADMIN } from "@/lib/routes";
import {
  AREAS,
  ESCALA,
  HERIDAS,
  PREGUNTAS_INTERCALADAS,
  areaFoco,
  areaMasBaja,
  estadoInicial,
  nivel,
  puntajes,
  type AreaId,
  type TestState,
} from "@/lib/test-heridas";
import { InformeTest } from "./InformeTest";
import "@/styles/test-autodescubrimiento.css";

/**
 * Test de Autodescubrimiento — lo aplica Holman en sesión, marcando lo que la
 * persona responde. Pantalla completa (sin la barra del panel) para poder
 * compartirla en Zoom. Solo super/admin: los vendedores no la ven.
 *
 * Nada se guarda en el servidor: el borrador vive en este navegador para no
 * perder la sesión si se recarga la página, y se borra con "Nuevo test".
 */

const PASOS = ["Persona", "Rueda de la Vida", "Exploración", "Heridas", "Cierre", "Resultado"] as const;
const CLAVE_BORRADOR = "hgg-test-autodescubrimiento";

function leerBorrador(): TestState {
  try {
    const raw = localStorage.getItem(CLAVE_BORRADOR);
    if (raw) return { ...estadoInicial(), ...JSON.parse(raw) };
  } catch {
    /* sin almacenamiento: se empieza en blanco */
  }
  return estadoInicial();
}

export default function TestAutodescubrimiento() {
  const { profile } = useAuth();
  const [s, setS] = useState<TestState>(leerBorrador);
  const [paso, setPaso] = useState(0);
  const [verHerida, setVerHerida] = useState(false);

  useEffect(() => {
    document.title = "Test de autodescubrimiento · HGG";
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

  const set = <K extends keyof TestState>(k: K, v: TestState[K]) => setS((p) => ({ ...p, [k]: v }));

  function nuevo() {
    if (!confirm("¿Empezar un test nuevo? Se borran las respuestas actuales.")) return;
    setS(estadoInicial());
    setPaso(0);
  }

  function descargar() {
    const titulo = document.title;
    const limpio = (s.nombre.trim() || "Persona").replace(/[^\p{L}\p{N}]+/gu, "_");
    document.title = `Mapa_${limpio}_HGG`;
    window.print();
    setTimeout(() => (document.title = titulo), 500);
  }

  const respondidas = PREGUNTAS_INTERCALADAS.filter((q) => s.respuestas[q.herida][q.indice] != null).length;
  const calificadas = AREAS.filter((a) => s.rueda[a.id] != null).length;

  return (
    <div className="tad-app">
      <header className="tad-top">
        <Link to={ADMIN.home} className="tad-volver">← Panel</Link>
        <div className="tad-top-titulo">
          <img src="/logo-h.png" alt="" />
          <span>Test de autodescubrimiento</span>
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
          <Seccion titulo="¿Con quién hacemos el viaje hoy?" sub="Estos datos aparecen en el informe que le regalas.">
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
              Para abrir: «Esto es una fotografía de hoy. Responde con lo primero que sientas; aquí
              cada respuesta es valiosa».
            </p>
          </Seccion>
        )}

        {paso === 1 && (
          <Seccion
            titulo="Rueda de la Vida"
            sub={`Del 1 al 10, ¿cómo está cada área hoy? · ${calificadas} de ${AREAS.length}`}
          >
            <div className="tad-areas">
              {AREAS.map((a) => (
                <div key={a.id} className="tad-area">
                  <div className="tad-area-txt">
                    <b>{a.nombre}</b>
                    <span>{a.pregunta}</span>
                  </div>
                  <div className="tad-escala10">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={s.rueda[a.id] === n ? "sel" : undefined}
                        onClick={() => set("rueda", { ...s.rueda, [a.id]: n })}
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

        {paso === 2 && <Exploracion s={s} set={set} />}

        {paso === 3 && (
          <Seccion titulo="Las cinco heridas" sub={`¿Con qué frecuencia te pasa? · ${respondidas} de 25`}>
            <label className="tad-toggle">
              <input type="checkbox" checked={verHerida} onChange={(e) => setVerHerida(e.target.checked)} />
              Mostrar a qué herida apunta cada pregunta (desactívalo si compartes pantalla)
            </label>
            <ol className="tad-preg-lista">
              {PREGUNTAS_INTERCALADAS.map((q, i) => {
                const v = s.respuestas[q.herida][q.indice];
                return (
                  <li key={`${q.herida}-${q.indice}`} className="tad-preg">
                    <p>
                      <span className="tad-preg-n">{i + 1}</span>
                      {q.texto}
                      {verHerida && <em className="tad-preg-tag">{HERIDAS.find((h) => h.id === q.herida)?.nombre}</em>}
                    </p>
                    <div className="tad-escala4">
                      {ESCALA.map((etq, val) => (
                        <button
                          key={etq}
                          type="button"
                          className={v === val ? "sel" : undefined}
                          onClick={() => {
                            const arr = [...s.respuestas[q.herida]];
                            arr[q.indice] = val;
                            set("respuestas", { ...s.respuestas, [q.herida]: arr });
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

        {paso === 4 && (
          <Seccion titulo="Cierre de la sesión" sub="Tus observaciones. Solo «Siguiente paso» aparece en el informe.">
            <Campo label="Plan de trabajo / siguiente paso (se lo escribes a la persona — sale en el informe)">
              <textarea
                className="tad-input"
                rows={4}
                value={s.siguientePaso}
                onChange={(e) => set("siguientePaso", e.target.value)}
                placeholder="Ej.: Vamos a trabajar tu amor propio y tu relación con el dinero para que… Mientras tanto, estas dos semanas vas a…"
              />
            </Campo>
            <p className="tad-privado">Privado · solo lo ves tú</p>
            <Campo label="Emociones dominantes que observaste">
              <input className="tad-input" value={s.emociones} onChange={(e) => set("emociones", e.target.value)} />
            </Campo>
            <div className="tad-indicios">
              {HERIDAS.map((h) => (
                <Campo key={h.id} label={`Indicios de ${h.nombre.toLowerCase()} — frase que dijo`} ayuda={h.senales}>
                  <input
                    className="tad-input"
                    value={s.indicios[h.id]}
                    onChange={(e) => set("indicios", { ...s.indicios, [h.id]: e.target.value })}
                  />
                </Campo>
              ))}
            </div>
            <Campo label="Notas libres (intuiciones, sensaciones, objetivo de conciencia para la próxima sesión)">
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
              <button type="button" className="tad-btn" onClick={descargar}>Descargar resultado (PDF)</button>
              <span>En la ventana que se abre elige «Guardar como PDF».</span>
            </div>
            <div className="tad-preview">
              <InformeTest s={s} />
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
          <button type="button" className="tad-btn" onClick={descargar}>Descargar resultado</button>
        )}
      </footer>

      {/* Copia del informe solo para imprimir: fuera del resto de la app. */}
      {createPortal(
        <div className="tad-print-root">
          <InformeTest s={s} />
        </div>,
        document.body
      )}
    </div>
  );
}

function Exploracion({ s, set }: { s: TestState; set: <K extends keyof TestState>(k: K, v: TestState[K]) => void }) {
  const baja = areaMasBaja(s);
  const foco = areaFoco(s);
  const area = foco ? foco.nombre.toLowerCase() : "esta área";
  return (
    <Seccion
      titulo="Exploración del área más baja"
      sub={baja ? `La más baja es ${baja.nombre} (${s.rueda[baja.id]}/10). Puedes elegir otra si la persona lo pide.` : "Califica primero la Rueda de la Vida."}
    >
      <Campo label="Área a explorar">
        <select
          className="tad-input"
          value={s.areaFoco}
          onChange={(e) => set("areaFoco", e.target.value as AreaId | "")}
        >
          <option value="">{baja ? `La más baja (${baja.nombre})` : "La más baja"}</option>
          {AREAS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre} {s.rueda[a.id] != null ? `· ${s.rueda[a.id]}` : ""}
            </option>
          ))}
        </select>
      </Campo>
      <p className="tad-guia">
        Anota con sus propias palabras: estas tres respuestas aparecen en el informe.
      </p>
      <Campo label={`¿Qué te gustaría sentir en ${area}?`}>
        <textarea className="tad-input" rows={2} value={s.sentir} onChange={(e) => set("sentir", e.target.value)} />
      </Campo>
      <Campo label={`¿Qué es lo que hoy más te pesa o te frena en ${area}?`}>
        <textarea className="tad-input" rows={2} value={s.frena} onChange={(e) => set("frena", e.target.value)} />
      </Campo>
      <Campo label={`Si tu nota en ${area} subiera dos puntos, ¿qué sería distinto en tu vida?`}>
        <textarea className="tad-input" rows={2} value={s.distinto} onChange={(e) => set("distinto", e.target.value)} />
      </Campo>
    </Seccion>
  );
}

/** Lectura rápida para el coach (en pantalla, no en el informe). */
function Resumen({ s, respondidas, calificadas }: { s: TestState; respondidas: number; calificadas: number }) {
  const ranking = puntajes(s);
  return (
    <div className="tad-resumen">
      {(respondidas < 25 || calificadas < AREAS.length) && (
        <p className="tad-aviso">
          Faltan respuestas: {AREAS.length - calificadas} áreas de la rueda y {25 - respondidas} preguntas de heridas.
          El informe se genera igual con lo que haya.
        </p>
      )}
      <table className="tad-tabla">
        <thead>
          <tr>
            <th>Herida</th>
            <th>Puntos</th>
            <th>%</th>
            <th>Nivel</th>
            <th>Indicio anotado</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((p) => (
            <tr key={p.herida.id}>
              <td>{p.herida.nombre} <small>({p.herida.mascara})</small></td>
              <td>{p.puntos}/15</td>
              <td>{p.pct}%</td>
              <td>{nivel(p.pct)}</td>
              <td>{s.indicios[p.herida.id] || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Seccion({ titulo, sub, children }: { titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="tad-seccion">
      <h1 className="tad-titulo">{titulo}</h1>
      {sub && <p className="tad-sub">{sub}</p>}
      {children}
    </section>
  );
}

function Campo({ label, ayuda, children }: { label: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <label className="tad-campo">
      <span className="tad-label">{label}</span>
      {ayuda && <span className="tad-ayuda">{ayuda}</span>}
      {children}
    </label>
  );
}
