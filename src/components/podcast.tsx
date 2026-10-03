import { useState } from "react";
import { Link } from "react-router-dom";
import {
  enlaceYoutube,
  fechaLarga,
  PODCAST_LINKS,
  PODCAST_PORTADA,
  proximos,
  publicados,
  type Episodio,
} from "@/lib/podcast";
import { ArrowRightIcon, HeadphonesIcon, PlayIcon, PodcastIcon, SpotifyIcon, YoutubeIcon } from "./icons";
import { Reveal } from "./reveal";

// ECOS Podcast: el primer escalón de la escalera (Podcast → Club → Sentido →
// Marca → Sistema). La sección de la home presenta el último episodio y lleva a
// /podcast, que tiene la lista completa. Los datos viven en lib/podcast.ts.

const PLATAFORMAS = [
  { key: "youtube", label: "YouTube", Icon: YoutubeIcon },
  { key: "spotify", label: "Spotify", Icon: SpotifyIcon },
  { key: "apple", label: "Apple Podcasts", Icon: PodcastIcon },
  { key: "amazon", label: "Amazon Music", Icon: HeadphonesIcon },
] as const;

/** Botones a cada plataforma. Las que aún no tienen enlace no se pintan. */
export function PodcastPlataformas() {
  const activas = PLATAFORMAS.filter((p) => PODCAST_LINKS[p.key]);
  if (!activas.length) {
    return <p className="pod-cuando">Cada viernes en YouTube y Spotify.</p>;
  }
  return (
    <div className="pod-plataformas">
      {activas.map(({ key, label, Icon }) => (
        <a
          key={key}
          href={PODCAST_LINKS[key]}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost pod-plataforma"
        >
          <Icon width={16} height={16} />
          {label}
        </a>
      ))}
    </div>
  );
}

/**
 * Episodio destacado. Con id de YouTube se reproduce aquí mismo al pulsar;
 * sin id, la imagen lleva al canal (si ya está el enlace).
 */
export function PodcastReproductor({ ep }: { ep: Episodio }) {
  const [sonando, setSonando] = useState(false);
  const img = ep.imagen ?? PODCAST_PORTADA;
  const destino = enlaceYoutube(ep);

  if (sonando && ep.youtube) {
    return (
      <div className="pod-player">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${ep.youtube}?autoplay=1&rel=0`}
          title={ep.titulo}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  const portada = (
    <>
      <img src={img} alt={`ECOS Podcast — ${ep.titulo}`} loading="lazy" />
      {(ep.youtube || destino) && (
        <span className="pod-play" aria-hidden="true">
          <PlayIcon width={26} height={26} />
        </span>
      )}
    </>
  );

  if (ep.youtube) {
    return (
      <button
        type="button"
        className={`pod-player${ep.imagen ? "" : " pod-player-cuadrada"}`}
        onClick={() => setSonando(true)}
        aria-label={`Reproducir «${ep.titulo}»`}
      >
        {portada}
      </button>
    );
  }
  if (destino) {
    return (
      <a
        href={destino}
        target="_blank"
        rel="noopener noreferrer"
        className={`pod-player${ep.imagen ? "" : " pod-player-cuadrada"}`}
        aria-label={`Ver «${ep.titulo}» en YouTube`}
      >
        {portada}
      </a>
    );
  }
  return <div className={`pod-player${ep.imagen ? "" : " pod-player-cuadrada"}`}>{portada}</div>;
}

/** Fila de un episodio en la lista. */
export function PodcastFila({ ep, proximo }: { ep: Episodio; proximo?: boolean }) {
  const destino = proximo ? "" : ep.spotify || enlaceYoutube(ep);
  const contenido = (
    <>
      <span className="pod-fila-fecha">
        {proximo ? `Llega el viernes ${fechaLarga(ep.fecha)}` : fechaLarga(ep.fecha)}
      </span>
      <span className="pod-fila-titulo">{ep.titulo}</span>
      <span className="pod-fila-min">{ep.minutos} min</span>
    </>
  );
  const clase = `pod-fila${proximo ? " pod-fila-proximo" : ""}`;
  return destino ? (
    <a href={destino} target="_blank" rel="noopener noreferrer" className={clase}>
      {contenido}
    </a>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}

/**
 * Sección de la home: portada con una frase debajo a la izquierda, las
 * plataformas en el centro y el último episodio, en pequeño, a la derecha.
 */
export function Podcast() {
  const [ultimo] = publicados();
  const siguiente = proximos()[0];
  if (!ultimo) return null;

  return (
    <section id="podcast" className="pod">
      <div className="shell pod-grid">
        <Reveal className="pod-portada" as="div">
          <Link to="/podcast" aria-label="ECOS Podcast: ver todos los episodios">
            <img
              src={PODCAST_PORTADA}
              alt="ECOS Podcast · Vive de aquello que amas"
              width={900}
              height={900}
              loading="lazy"
            />
          </Link>
          <p className="pod-lead">
            Conversaciones para convertir lo que te apasiona en un negocio con
            sentido. Cada viernes, gratis.
          </p>
        </Reveal>

        <Reveal className="pod-copy" as="div">
          <h2 className="pod-plataformas-titulo">Plataformas</h2>
          <PodcastPlataformas />
          <Link to="/podcast" className="pod-todos">
            Ver todos los episodios
            <ArrowRightIcon className="arrow" width={16} height={16} />
          </Link>
        </Reveal>

        <Reveal className="pod-mini" as="div">
          <PodcastReproductor ep={ultimo} />
          <span className="pod-etiqueta">Nuevo · {ultimo.minutos} min</span>
          <h3 className="display">{ultimo.titulo}</h3>
          {siguiente && (
            <p className="pod-siguiente">
              <span>Próximo viernes</span>
              {siguiente.titulo}
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
}
