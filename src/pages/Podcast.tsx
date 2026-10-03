import { Link } from "react-router-dom";
import { Seo } from "@/components/seo";
import { CtaFinal } from "@/components/cta-final";
import { ArrowRightIcon } from "@/components/icons";
import {
  PodcastFila,
  PodcastPlataformas,
  PodcastReproductor,
} from "@/components/podcast";
import { Reveal } from "@/components/reveal";
import { CLUB } from "@/lib/routes";
import { PODCAST_PORTADA, proximos, publicados } from "@/lib/podcast";
import { PAGE_SEO } from "@/lib/seo";
import { SITE } from "@/lib/config";

export default function Podcast() {
  const eps = publicados();
  const [ultimo, ...anteriores] = eps;
  const vienen = proximos();

  return (
    <>
      <Seo {...PAGE_SEO.podcast} image={`${SITE.url}/podcast/og.jpg`} />

      <section className="pod-page-head">
        <div className="shell pod-page-grid">
          <img
            src={PODCAST_PORTADA}
            alt="ECOS Podcast · Vive de aquello que amas"
            className="pod-page-portada"
            width={600}
            height={600}
          />
          <div>
            <div className="eyebrow-row">
              <span className="num">·</span>
              <span className="bar" />
              <span className="eyebrow eyebrow-w">ECOS Podcast</span>
            </div>
            <h1 className="display pod-title">
              Vive de aquello
              <br />
              <em>que amas.</em>
            </h1>
            <p className="pod-body">
              Holman Orjuela, coach estratégico de marca y negocios, e Ingrid,
              especialista en marketing y comunicación, conversan sobre las
              habilidades necesarias para convertir lo que te apasiona en un
              negocio: ventas, marketing, oratoria, coaching y las herramientas
              que están cambiando la forma de trabajar.
            </p>
            <PodcastPlataformas />
          </div>
        </div>
      </section>

      {ultimo && (
        <section className="pod-page-eps">
          <div className="shell">
            <Reveal className="pod-page-destacado" as="div">
              <PodcastReproductor ep={ultimo} />
              <div className="pod-destacado-info">
                <span className="pod-etiqueta">Último episodio · {ultimo.minutos} min</span>
                <h2 className="display">{ultimo.titulo}</h2>
                <p>{ultimo.resumen}</p>
              </div>
            </Reveal>

            {(anteriores.length > 0 || vienen.length > 0) && (
              <div className="pod-lista">
                {vienen.map((ep) => (
                  <PodcastFila key={ep.slug} ep={ep} proximo />
                ))}
                {anteriores.map((ep) => (
                  <PodcastFila key={ep.slug} ep={ep} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="pod-club">
        <div className="shell">
          <Reveal className="pod-club-box" as="div">
            <div className="eyebrow-row">
              <span className="num">·</span>
              <span className="bar" />
              <span className="eyebrow eyebrow-w">ECOS Business Club</span>
            </div>
            <h2 className="display">
              ¿Quieres llevarlo
              <br />
              a la práctica?
            </h2>
            <p className="pod-body">
              En el club ECOS lo que escuchas aquí se vuelve práctica: clases en
              vivo de ventas, marketing y oratoria cada semana, con una comunidad
              que te ve avanzar.
            </p>
            <Link to={CLUB.landing} className="btn btn-primary">
              Conoce el club
              <ArrowRightIcon className="arrow" />
            </Link>
          </Reveal>
        </div>
      </section>

      <CtaFinal />
    </>
  );
}
