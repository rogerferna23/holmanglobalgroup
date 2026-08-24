import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReviews, type Review } from "@/lib/reviews";
import { STAGES, type Stage } from "@/lib/testimonials";
import { SITE } from "@/lib/config";
import {
  downloadCanvas,
  ensureFonts,
  fileSlug,
  metodoLabel,
  metodoSlug,
  METODO_CARDS,
  planStory,
  renderCover,
  renderCtaCard,
  renderMetodoCard,
  renderStageCard,
  renderStory,
  type CoverId,
  type MetodoCard,
  type StoryPart,
  STORY_H,
  STORY_W,
} from "@/lib/story-canvas";

// Panel de Instagram (brief "Experiencias en destacadas", ago 2026).
//
// Cada destacada se cuenta en este orden, que es el que hace que se entienda
// sola, sin que Holman tenga que explicar nada a nadie:
//
//   portada  →  qué es esta etapa  →  las experiencias  →  cierre
//
// La tarjeta de etapa viene del bloque Proceso de la web (lib/camino.ts), así
// que web e Instagram dicen lo mismo. El cierre pide responder a la historia
// con la palabra de la etapa: la respuesta le llega a Sofía por DM con la
// miniatura de la historia, o sea que sabe de qué etapa viene la persona sin
// preguntarlo.
//
// Solo salen las reseñas publicadas ('aprobado'): las ocultas no deberían
// llegar a Instagram si no están en la web.

/** El dominio a secas, que es el cierre de cada historia. */
const DOMINIO = SITE.url.replace(/^https?:\/\//, "").replace(/\/$/, "");

/**
 * Una historia suelta de una destacada. Puede ser la tarjeta de etapa que abre,
 * una reseña, o el cierre. Las reseñas muy largas se cuentan en varias partes
 * (1/2, 2/2) y cada parte es su propia historia, para poder subirlas en orden.
 */
type Pieza =
  | { kind: "etapa"; stage: Stage }
  | { kind: "resena"; stage: Stage; review: Review; part: StoryPart }
  | { kind: "cierre"; stage: Stage }
  | { kind: "metodo"; card: MetodoCard };

/** Lo que se lee bajo cada tarjeta en el panel. */
function etiquetaDe(p: Pieza): string {
  if (p.kind === "etapa") return "Qué es esta etapa";
  if (p.kind === "cierre") return "Cierre · responder";
  if (p.kind === "metodo") return metodoLabel(p.card);
  return p.review.name;
}

/** Nombre del archivo. El número de delante mantiene el orden de subida. */
function nombreArchivo(p: Pieza, orden: number): string {
  const n = String(orden).padStart(2, "0");
  if (p.kind === "metodo") return `hgg-metodo-${n}-${metodoSlug(p.card)}.png`;
  if (p.kind === "etapa") return `hgg-${p.stage}-${n}-etapa.png`;
  if (p.kind === "cierre") return `hgg-${p.stage}-${n}-cierre.png`;
  const parte = p.part.total > 1 ? `-${p.part.index}de${p.part.total}` : "";
  return `hgg-${p.stage}-${n}-${fileSlug(p.review.name)}${parte}.png`;
}

/** Pinta la pieza que toque en el lienzo dado. */
function pintar(canvas: HTMLCanvasElement, p: Pieza): Promise<void> {
  if (p.kind === "metodo") return renderMetodoCard(canvas, p.card, DOMINIO);
  if (p.kind === "etapa") return renderStageCard(canvas, p.stage, DOMINIO);
  if (p.kind === "cierre") return renderCtaCard(canvas, p.stage, DOMINIO);
  return renderStory(canvas, p.review, DOMINIO, p.part);
}

/** Tarjeta con la vista previa de una historia y su botón de descarga. */
function StoryCard({
  pieza,
  orden,
  fontsReady,
}: {
  pieza: Pieza;
  orden: number;
  fontsReady: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !fontsReady) return;
    let alive = true;
    setReady(false);
    void pintar(canvas, pieza).then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [pieza, fontsReady]);

  return (
    <figure className={`ig-card ig-card-${pieza.kind}`}>
      <span className="ig-card-orden">{orden}</span>
      <canvas ref={ref} width={STORY_W} height={STORY_H} className="ig-canvas" />
      <figcaption className="ig-card-foot">
        <span className="ig-card-name">
          {etiquetaDe(pieza)}
          {pieza.kind === "resena" && pieza.part.total > 1 && (
            <span className="ig-card-part">
              {pieza.part.index}/{pieza.part.total}
            </span>
          )}
        </span>
        <button
          type="button"
          className="ig-download"
          disabled={!ready}
          onClick={() =>
            ref.current && downloadCanvas(ref.current, nombreArchivo(pieza, orden))
          }
        >
          Descargar
        </button>
      </figcaption>
    </figure>
  );
}

/** Tarjeta de portada de destacada (una por etapa). */
function CoverCard({ id, label, fontsReady }: { id: CoverId; label: string; fontsReady: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !fontsReady) return;
    let alive = true;
    void renderCover(canvas, id).then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [id, fontsReady]);

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
            ref.current && downloadCanvas(ref.current, `hgg-portada-${id}.png`)
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
  const [tab, setTab] = useState<Stage | "metodo" | "portadas">("sentido");
  const [fontsReady, setFontsReady] = useState(false);
  const [bulk, setBulk] = useState<string | null>(null);

  useEffect(() => {
    void ensureFonts().then(() => setFontsReady(true));
  }, []);

  /**
   * Cada destacada entera, en el orden en que se sube: la tarjeta de etapa
   * primero, luego las reseñas publicadas de esa etapa (una corta da una
   * historia; una larga, las que hagan falta), y el cierre al final.
   *
   * Depende de `fontsReady` a propósito: el reparto del texto en líneas se
   * calcula midiendo, y medir sin las tipografías cargadas da otro reparto.
   */
  const porEtapa = useMemo(() => {
    const map = {} as Record<Stage, Pieza[]>;
    for (const s of STAGES) map[s.id] = [];
    if (!fontsReady) return map;

    for (const s of STAGES) map[s.id].push({ kind: "etapa", stage: s.id });
    for (const r of data) {
      if (r.status !== "aprobado" || !r.stage) continue;
      const stage = r.stage;
      for (const part of planStory(r.quote)) {
        map[stage].push({ kind: "resena", stage, review: r, part });
      }
    }
    // El cierre va el último, después de las experiencias.
    for (const s of STAGES) map[s.id].push({ kind: "cierre", stage: s.id });

    return map;
  }, [data, fontsReady]);

  /** La destacada de Método: no depende de las reseñas, es siempre la misma. */
  const metodoPiezas = useMemo<Pieza[]>(
    () => METODO_CARDS.map((card) => ({ kind: "metodo", card })),
    []
  );

  const sinEtapa = useMemo(
    () => data.filter((r) => r.status === "aprobado" && !r.stage),
    [data]
  );

  /**
   * Descarga todas las historias de una etapa, una detrás de otra. Se pintan en
   * un lienzo suelto (no el de la vista previa) y se espacian un poco: si se
   * disparan a la vez, Chrome descarta todas menos la primera.
   */
  const descargarTodas = useCallback(async (items: Pieza[]) => {
    if (items.length === 0) return;
    const canvas = document.createElement("canvas");
    for (let i = 0; i < items.length; i++) {
      setBulk(`Preparando ${i + 1} de ${items.length}…`);
      await pintar(canvas, items[i]);
      // El número que llevan delante mantiene el orden al subirlas: el
      // explorador de archivos las ordena igual que se leen en la destacada.
      downloadCanvas(canvas, nombreArchivo(items[i], i + 1));
      await new Promise((r) => setTimeout(r, 400));
    }
    setBulk(null);
  }, []);

  const items: Pieza[] =
    tab === "portadas" ? [] : tab === "metodo" ? metodoPiezas : porEtapa[tab] || [];

  // Cuántas reseñas hay detrás de esas historias: si alguna se cuenta en varias,
  // los dos números no coinciden y conviene decirlo.
  const resenas = items.filter((p) => p.kind === "resena");
  const resenasEnEtapa = new Set(resenas.map((p) => p.review.id)).size;
  const repartidas = resenas.filter(
    (p) => p.part.total > 1 && p.part.index === 1
  ).length;

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <h1>Instagram</h1>
        <p>
          Cada destacada, entera y en orden: qué es la etapa, las experiencias
          de quienes la vivieron, y el cierre. En 1080×1920, listas para subir.
        </p>
      </div>

      <div className="adm-card adm-card-pad ig-intro">
        <div className="adm-card-head">
          <span className="adm-card-title">Cómo se usa</span>
        </div>
        <ol className="ig-steps">
          <li>
            Descarga las historias de una etapa con{" "}
            <strong>Descargar todas</strong>: salen numeradas en el orden en que
            se leen.
          </li>
          <li>Súbelas a tu historia en ese orden y guárdalas en una destacada.</li>
          <li>
            Llama a la destacada con el nombre corto —{" "}
            <strong>Sentido</strong>, <strong>Marca</strong> o{" "}
            <strong>Sistema</strong> — y elige su portada como cubierta.
          </li>
        </ol>
        <p className="ig-note">
          <strong>Créalas en orden inverso:</strong> Método, Sistema, Marca y
          Sentido la última. Instagram coloca a la izquierda la destacada que
          actualizaste más recientemente, así que así quedan leyéndose{" "}
          Sentido · Marca · Sistema · Método.
        </p>
        <p className="ig-note">
          La tarjeta de etapa sale del bloque Proceso de la web: si cambias ese
          texto allí, cambia aquí solo. Y cada reseña nueva que subas en Reseñas
          aparece sin que tengas que preparar nada.
        </p>
      </div>

      {/*
        Las pestañas van en el orden en que hay que CREAR las destacadas, no en
        el que se leen: Instagram pone a la izquierda del perfil la que se
        actualizó más tarde, así que la última que se crea es la primera que se
        ve. Método primero y Sentido al final.
      */}
      <div className="ig-tabs">
        <button
          type="button"
          className={`ig-tab${tab === "metodo" ? " active" : ""}`}
          onClick={() => setTab("metodo")}
        >
          Método
          <span className="ig-tab-count">{metodoPiezas.length}</span>
        </button>
        {[...STAGES].reverse().map((s) => (
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
          <span className="ig-tab-count">4</span>
        </button>
      </div>

      {error && <p className="resena-error">{error}</p>}
      {loading && <p className="ig-note">Cargando reseñas…</p>}

      {!loading && tab !== "portadas" && (
        <>
          <div className="ig-toolbar">
            <span className="ig-note">
              {tab === "metodo"
                ? `${items.length} historias, en este orden`
                : `${items.length} ${items.length === 1 ? "historia" : "historias"}, en este orden · ${resenasEnEtapa} ${resenasEnEtapa === 1 ? "experiencia" : "experiencias"}` +
                  (repartidas > 0
                    ? ` (${repartidas} ${repartidas === 1 ? "se cuenta" : "se cuentan"} en varias)`
                    : "") +
                  (resenasEnEtapa === 0 ? " — aún sin experiencias en esta etapa" : "")}
            </span>
            <button
              type="button"
              className="ig-download ig-download-all"
              disabled={items.length === 0 || bulk !== null || !fontsReady}
              onClick={() => void descargarTodas(items)}
            >
              {bulk ?? "Descargar todas"}
            </button>
          </div>
          <div className="ig-grid">
            {items.map((p, i) => (
              <StoryCard
                key={
                  p.kind === "resena"
                    ? `${p.review.id}-${p.part.index}`
                    : p.kind === "metodo"
                      ? `metodo-${i}`
                      : `${p.kind}-${p.stage}`
                }
                pieza={p}
                orden={i + 1}
                fontsReady={fontsReady}
              />
            ))}
          </div>
          {tab !== "metodo" && sinEtapa.length > 0 && (
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
          {/* En el orden en que se crean las destacadas, no en el que se leen. */}
          <CoverCard id="metodo" label="Método" fontsReady={fontsReady} />
          {[...STAGES].reverse().map((s) => (
            <CoverCard key={s.id} id={s.id} label={s.label} fontsReady={fontsReady} />
          ))}
        </div>
      )}
    </div>
  );
}
