import { Link } from "react-router-dom";
import { Seo } from "@/components/seo";
import { CtaFinal } from "@/components/cta-final";
import { ArrowRightIcon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { ARTICULOS, fechaArticulo, rutaArticulo } from "@/lib/blog";
import { PAGE_SEO } from "@/lib/seo";

// Lista de artículos del blog (del más nuevo al más viejo). Los artículos viven
// en src/content/blog/articulos.json.
export default function Blog() {
  return (
    <>
      <Seo {...PAGE_SEO.blog} />
      <section className="blog-head">
        <div className="shell">
          <div className="eyebrow-row">
            <span className="num">·</span>
            <span className="bar" />
            <span className="eyebrow eyebrow-w">Blog</span>
          </div>
          <h1 className="display blog-title">
            Ideas para vivir
            <br />
            <em>de lo que amas.</em>
          </h1>
        </div>
      </section>

      <section className="blog-lista-sec">
        <Reveal stagger className="shell blog-lista">
          {ARTICULOS.map((a) => (
            <Link key={a.slug} to={rutaArticulo(a)} className="blog-card">
              <img src={a.imagen} alt={a.imagenAlt} loading="lazy" width={1280} height={720} />
              <div className="blog-card-info">
                <span className="blog-meta">
                  {fechaArticulo(a.fecha)} · {a.lectura} min de lectura
                </span>
                <h2 className="display">{a.titulo}</h2>
                <p>{a.descripcion}</p>
                <span className="blog-leer">
                  Leer artículo
                  <ArrowRightIcon className="arrow" width={16} height={16} />
                </span>
              </div>
            </Link>
          ))}
        </Reveal>
      </section>

      <CtaFinal />
    </>
  );
}
