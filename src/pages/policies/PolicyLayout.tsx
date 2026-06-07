import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/seo";
import { SITE } from "@/lib/config";

type Props = {
  title: string;
  intro?: string;
  description?: string;
  children: ReactNode;
};

export default function PolicyLayout({
  title,
  intro,
  description,
  children,
}: Props) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <>
      <Seo
        title={`${title} — ${SITE.name}`}
        description={
          description ??
          intro ??
          `${title} de ${SITE.name}. Información legal, de privacidad y condiciones de uso.`
        }
      />
      <section className="policy">
        <div className="shell policy-shell">
          <Link to="/" className="policy-back">
            ← Volver al inicio
          </Link>
          <header className="policy-head">
            <div className="eyebrow-row">
              <span className="num">·</span>
              <span className="bar" />
              <span className="eyebrow eyebrow-w">Políticas</span>
            </div>
            <h1 className="display policy-title">{title}</h1>
            {intro && <p className="policy-intro">{intro}</p>}
          </header>

          <article className="policy-body">{children}</article>
        </div>
      </section>
    </>
  );
}
