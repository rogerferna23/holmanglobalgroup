import { Seo } from "@/components/seo";
import { CtaFinal } from "@/components/cta-final";
import { PAGE_SEO } from "@/lib/seo";

// Página placeholder del Blog ("Próximamente"). Ya tiene ruta y SEO para que
// el enlace del menú funcione; el contenido se añadirá más adelante.
export default function Blog() {
  return (
    <>
      <Seo {...PAGE_SEO.blog} />
      <section className="blog-soon">
        <div className="shell">
          <div className="eyebrow-row">
            <span className="num">·</span>
            <span className="bar" />
            <span className="eyebrow eyebrow-w">Blog</span>
          </div>
          <h1 className="display blog-soon-title">
            Muy pronto,
            <br />
            ideas con propósito.
          </h1>
          <p className="blog-soon-lede">
            Estamos preparando el blog de Holman Global Group: reflexiones sobre
            propósito, marca y sistemas digitales para vivir de lo que amas.
            Vuelve pronto.
          </p>
        </div>
      </section>
      <CtaFinal />
    </>
  );
}
