import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Seo } from "@/components/seo";
import { ArrowRightIcon, PlayIcon } from "@/components/icons";
import { CLARIDAD_WA_URL, SITE } from "@/lib/config";
import {
  articuloPorSlug,
  fechaArticulo,
  rutaArticulo,
  trozos,
  type Bloque,
} from "@/lib/blog";
import NoEncontrada from "./NoEncontrada";

/** Texto con [enlaces](/ruta): los internos navegan sin recargar. */
function Texto({ x }: { x: string }) {
  return (
    <>
      {trozos(x).map((t, i) =>
        !t.href ? (
          <span key={i}>{t.texto}</span>
        ) : t.href.startsWith("/") ? (
          <Link key={i} to={t.href}>
            {t.texto}
          </Link>
        ) : (
          <a key={i} href={t.href} target="_blank" rel="noopener noreferrer">
            {t.texto}
          </a>
        )
      )}
    </>
  );
}

/**
 * La portada del episodio con el botón de play: al pulsar carga el video de
 * YouTube (youtube-nocookie) en el mismo lugar. Hasta entonces no carga nada
 * de YouTube, así la página abre rápido.
 */
function VideoEpisodio({ id, imagen, alt }: { id: string; imagen: string; alt: string }) {
  const [sonando, setSonando] = useState(false);
  if (sonando) {
    return (
      <div className="pod-player">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={alt}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      className="pod-player"
      onClick={() => setSonando(true)}
      aria-label="Ver el episodio en video"
    >
      <img src={imagen} alt={alt} width={1280} height={720} />
      <span className="pod-play" aria-hidden="true">
        <PlayIcon width={26} height={26} />
      </span>
    </button>
  );
}

function BloqueArticulo({ b }: { b: Bloque }) {
  switch (b.t) {
    case "lead":
      return <p className="blog-lead"><Texto x={b.x} /></p>;
    case "h2":
      return <h2 className="display">{b.x}</h2>;
    case "cita":
      return <blockquote><Texto x={b.x} /></blockquote>;
    case "lista":
      return (
        <ul>
          {b.items.map((it) => (
            <li key={it}><Texto x={it} /></li>
          ))}
        </ul>
      );
    default:
      return <p><Texto x={b.x} /></p>;
  }
}

export default function BlogArticulo() {
  const { slug } = useParams();
  const a = articuloPorSlug(slug);
  if (!a) return <NoEncontrada />;

  const url = `${SITE.url}${rutaArticulo(a)}`;
  const imagen = `${SITE.url}${a.imagen}`;

  return (
    <>
      <Seo
        title={`${a.titulo} | Holman Global Group`}
        description={a.descripcion}
        image={imagen}
        type="article"
        jsonLd={[{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: a.titulo,
          description: a.descripcion,
          image: imagen,
          datePublished: a.fecha,
          inLanguage: "es",
          mainEntityOfPage: url,
          author: { "@type": "Person", name: a.autor },
          publisher: {
            "@type": "Organization",
            name: SITE.legalName,
            logo: { "@type": "ImageObject", url: `${SITE.url}/logo-h.png` },
          },
        }, a.youtube ? {
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: a.titulo,
          description: a.descripcion,
          thumbnailUrl: imagen,
          uploadDate: a.fecha,
          embedUrl: `https://www.youtube.com/embed/${a.youtube}`,
          contentUrl: `https://www.youtube.com/watch?v=${a.youtube}`,
        } : null]}
      />

      <article className="articulo">
        <header className="shell articulo-head">
          <Link to="/blog" className="articulo-volver">
            ← Blog
          </Link>
          <h1 className="display">{a.titulo}</h1>
          <p className="blog-meta">
            {a.autor} · {fechaArticulo(a.fecha)} · {a.lectura} min de lectura
          </p>
        </header>

        <div className="shell articulo-imagen">
          {a.youtube ? (
            <VideoEpisodio id={a.youtube} imagen={a.imagen} alt={a.imagenAlt} />
          ) : (
            <img src={a.imagen} alt={a.imagenAlt} width={1280} height={720} />
          )}
        </div>

        <div className="shell articulo-cuerpo">
          {a.bloques.map((b, i) => (
            <BloqueArticulo key={i} b={b} />
          ))}

          <div className="articulo-cta">
            <a
              href={CLARIDAD_WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Agenda tu Sesión de Claridad
              <ArrowRightIcon className="arrow" />
            </a>
            <Link to="/podcast" className="btn btn-ghost">
              Escuchar el episodio
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
