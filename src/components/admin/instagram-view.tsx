import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReviews, type Review } from "@/lib/reviews";
import { STAGES, type Stage } from "@/lib/testimonials";
import { SITE } from "@/lib/config";
import {
  downloadCanvas,
  ensureFonts,
  fileSlug,
  planStory,
  renderCover,
  renderStory,
  type StoryPart,
  STORY_H,
  STORY_W,
} from "@/lib/story-canvas";

// Panel de Instagram (brief "Experiencias en destacadas", ago 2026).
//
// Las mismas reseñas publicadas del sitio, pintadas en 1080×1920 para subirlas
// como historias y guardarlas en tres destacadas: Sentido, Marca y Sistema.
// No hay nada que rellenar aquí: lo que se sube en /admin/resenas aparece solo.
//
// Solo salen las reseñas publicadas ('aprobado'): las ocultas no deberían
// llegar a Instagram si no están en la web.

/** El dominio a secas, que es el cierre de cada historia. */
const DOMINIO = SITE.url.replace(/^https?:\/\//, "").replace(/\/$/, "");

/**
 * Una historia concreta: la reseña más el trozo que le toca. Las reseñas largas
 * se cuentan en varias (1/3, 2/3, 3/3) y cada una es su propia tarjeta, con su
 * descarga, para poder subirlas en orden.
 */
type Pieza = { review: Review; part: StoryPart };

/** Nombre del archivo. Lleva el número de parte solo cuando hay más de una. */
function nombreArchivo(p: Pieza): string {
  const base = `hgg-historia-${fileSlug(p.review.name)}`;
  return p.part.total > 1
    ? `${base}-${p.part.index}de${p.part.total}.png`
    : `${base}.png`;
}

/** Tarjeta con la vista previa de una historia y su botón de descarga. */
function StoryCard({ pieza, fontsReady }: { pieza: Pieza; fontsReady: boolean }) {
  const { review, part } = pieza;
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !fontsReady) return;
    let alive = true;
    setReady(false);
    void renderStory(canvas, review, DOMINIO, part).then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
    // La foto y la parte que toca pintar son lo único que cambia el dibujo.
  }, [review, part, fontsReady]);

  return (
    <figure className="ig-card">
      <canvas ref={ref} width={STORY_W} height={STORY_H} className="ig-canvas" />
      <figcaption className="ig-card-foot">
        <span className="ig-card-name">
          {review.name}
          {part.total > 1 && (
            <span className="ig-card-part">
              {part.index}/{part.total}
            </span>
          )}
        </span>
        <button
          type="button"
          className="ig-download"
          disabled={!ready}
          onClick={() => ref.current && downloadCanvas(ref.current, nombreArchivo(pieza))}
        >
          Descargar
        </button>
      </figcaption>
    </figure>
  );
}

/** Tarjeta de portada de destacada (una por etapa). */
function CoverCard({ stage, label, fontsReady }: { stage: Stage; label: string; fontsReady: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !fontsReady) return;
    let alive = true;
    void renderCover(canvas, stage).then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [stage, fontsReady]);

  return (
    <figure className="ig-card">
      <canvas ref={ref} width={STORY_W} height={STORY_H} className="ig-canvas" />
      <figcaption className="ig-card-foot">
        <span className="ig-card-name">Portada · {label}</span>
        <button
          type="button"
          className="ig-download"
          disabled={!ready}
          onClick={() =>
            ref.current && downloadCanvas(ref.current, `hgg-portada-${stage}.png`)
          }
        >
          Descargar
        </button>
      </figcaption>
    </figure>
  );
}

export function InstagramView() {
  const { data, loading, error } = useReviews();
  const [tab, setTab] = useState<Stage | "portadas">("sentido");
  const [fontsReady, setFontsReady] = useState(false);
  const [bulk, setBulk] = useState<string | null>(null);

  useEffect(() => {
    void ensureFonts().then(() => setFontsReady(true));
  }, []);

  /**
   * Publicadas y agrupadas por etapa, en el mismo orden que el sitio, y ya
   * expandidas en historias: una reseña corta da una, y una larga da las que
   * hagan falta, seguidas.
   *
   * Depende de `fontsReady` a propósito: el reparto se calcula midiendo el
   * texto, y medir sin las tipografías cargadas da un reparto equivocado.
   */
  const porEtapa = useMemo(() => {
    const map = {} as Record<Stage, Pieza[]>;
    for (const s of STAGES) map[s.id] = [];
    if (!fontsReady) return map;
    for (const r of data) {
      if (r.status !== "aprobado" || !r.stage) continue;
      for (const part of planStory(r.quote)) map[r.stage].push({ review: r, part });
    }
    return map;
  }, [data, fontsReady]);

  const sinEtapa = useMemo(
    () => data.filter((r) => r.status === "aprobado" && !r.stage),
    [data]
  );

  /**
   * Descarga todas las historias de una etapa, una detrás de otra. Se pintan en
   * un lienzo suelto (no el de la vista previa) y se espacian un poco: si se
   * disparan a la vez, Chrome descarta todas menos la primera.
   */
  const descargarEtapa = useCallback(
    async (stage: Stage) => {
      const items = porEtapa[stage] || [];
      if (items.length === 0) return;
      const canvas = document.createElement("canvas");
      for (let i = 0; i < items.length; i++) {
        setBulk(`Preparando ${i + 1} de ${items.length}…`);
        await renderStory(canvas, items[i].review, DOMINIO, items[i].part);
        // El número de delante mantiene el orden al subirlas: el explorador de
        // archivos las ordena igual que se leen en la destacada.
        const orden = String(i + 1).padStart(2, "0");
        downloadCanvas(canvas, `hgg-${stage}-${orden}-${nombreArchivo(items[i]).replace(/^hgg-historia-/, "")}`);
        await new Promise((r) => setTimeout(r, 400));
      }
      setBulk(null);
    },
    [porEtapa]
  );

  const etapaActual = tab === "portadas" ? null : tab;
  const items = etapaActual ? porEtapa[etapaActual] || [] : [];

  // Cuántas reseñas hay detrás de esas historias: si alguna se cuenta en varias,
  // los dos números no coinciden y conviene decirlo.
  const resenasEnEtapa = new Set(items.map((p) => p.review.id)).size;
  const repartidas = items.filter((p) => p.part.total > 1 && p.part.index === 1).length;

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <h1>Instagram</h1>
        <p>
          Las reseñas publicadas, ya en formato historia (1080×1920). Descarga
          las que quieras y súbelas a la destacada de su etapa.
        </p>
      </div>

      <div className="adm-card adm-card-pad ig-intro">
        <div className="adm-card-head">
          <span className="adm-card-title">Cómo se usa</span>
        </div>
        <ol className="ig-steps">
          <li>Descarga la portada de la etapa y súbela como historia.</li>
          <li>Descarga las reseñas de esa etapa y súbelas también.</li>
          <li>
            Crea la destacada con el nombre corto —{" "}
            <strong>Sentido</strong>, <strong>Marca</strong> o{" "}
            <strong>Sistema</strong> —, mete dentro esas historias y elige la
            portada como cubierta.
          </li>
        </ol>
        <p className="ig-note">
          Cada reseña nueva que subas en Reseñas aparece aquí sola. No hay que
          volver a preparar nada.
        </p>
      </div>

      <div className="ig-tabs">
        {STAGES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`ig-tab${tab === s.id ? " active" : ""}`}
            onClick={() => setTab(s.id)}
          >
            {s.label}
            <span className="ig-tab-count">{(porEtapa[s.id] || []).length}</span>
          </button>
        ))}
        <button
          type="button"
          className={`ig-tab${tab === "portadas" ? " active" : ""}`}
          onClick={() => setTab("portadas")}
        >
          Portadas
          <span className="ig-tab-count">3</span>
        </button>
      </div>

      {error && <p className="resena-error">{error}</p>}
      {loading && <p className="ig-note">Cargando reseñas…</p>}

      {!loading && etapaActual && (
        <>
          <div className="ig-toolbar">
            <span className="ig-note">
              {items.length === 0
                ? "Todavía no hay reseñas publicadas en esta etapa."
                : `${resenasEnEtapa} ${resenasEnEtapa === 1 ? "reseña" : "reseñas"} · ${items.length} ${items.length === 1 ? "historia" : "historias"}` +
                  (repartidas > 0
                    ? ` (${repartidas} ${repartidas === 1 ? "se cuenta" : "se cuentan"} en varias, súbelas en orden)`
                    : "")}
            </span>
            <button
              type="button"
              className="ig-download ig-download-all"
              disabled={items.length === 0 || bulk !== null || !fontsReady}
              onClick={() => void descargarEtapa(etapaActual)}
            >
              {bulk ?? "Descargar todas"}
            </button>
          </div>
          <div className="ig-grid">
            {items.map((p) => (
              <StoryCard
                key={`${p.review.id}-${p.part.index}`}
                pieza={p}
                fontsReady={fontsReady}
              />
            ))}
          </div>
          {sinEtapa.length > 0 && (
            <p className="ig-note ig-warn">
              Hay {sinEtapa.length}{" "}
              {sinEtapa.length === 1 ? "reseña publicada" : "reseñas publicadas"} sin
              etapa asignada. Asígnales una en Reseñas y aparecerán aquí.
            </p>
          )}
        </>
      )}

      {!loading && tab === "portadas" && (
        <div className="ig-grid">
          {STAGES.map((s) => (
            <CoverCard key={s.id} stage={s.id} label={s.label} fontsReady={fontsReady} />
          ))}
        </div>
      )}
    </div>
  );
}
