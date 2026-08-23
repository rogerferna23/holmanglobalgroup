import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReviews, type Review } from "@/lib/reviews";
import { STAGES, type Stage } from "@/lib/testimonials";
import { SITE } from "@/lib/config";
import {
  downloadCanvas,
  ensureFonts,
  fileSlug,
  renderCover,
  renderStory,
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

/** Tarjeta con la vista previa de una historia y su botón de descarga. */
function StoryCard({
  review,
  fontsReady,
}: {
  review: Review;
  fontsReady: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !fontsReady) return;
    let alive = true;
    setReady(false);
    void renderStory(canvas, review, DOMINIO).then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
    // La foto y el texto son lo único que cambia el dibujo.
  }, [review.id, review.photoUrl, review.quote, review.name, review.role, review.rating, review.stage, fontsReady]);

  return (
    <figure className="ig-card">
      <canvas ref={ref} width={STORY_W} height={STORY_H} className="ig-canvas" />
      <figcaption className="ig-card-foot">
        <span className="ig-card-name">{review.name}</span>
        <button
          type="button"
          className="ig-download"
          disabled={!ready}
          onClick={() =>
            ref.current &&
            downloadCanvas(ref.current, `hgg-historia-${fileSlug(review.name)}.png`)
          }
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

  /** Publicadas y agrupadas por etapa, en el mismo orden que el sitio. */
  const porEtapa = useMemo(() => {
    const publicadas = data.filter((r) => r.status === "aprobado");
    const map = {} as Record<Stage, Review[]>;
    for (const s of STAGES) map[s.id] = publicadas.filter((r) => r.stage === s.id);
    return map;
  }, [data]);

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
        await renderStory(canvas, items[i], DOMINIO);
        downloadCanvas(canvas, `hgg-historia-${stage}-${i + 1}-${fileSlug(items[i].name)}.png`);
        await new Promise((r) => setTimeout(r, 400));
      }
      setBulk(null);
    },
    [porEtapa]
  );

  const etapaActual = tab === "portadas" ? null : tab;
  const items = etapaActual ? porEtapa[etapaActual] || [] : [];

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
                : `${items.length} ${items.length === 1 ? "historia" : "historias"} listas.`}
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
            {items.map((r) => (
              <StoryCard key={r.id} review={r} fontsReady={fontsReady} />
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
