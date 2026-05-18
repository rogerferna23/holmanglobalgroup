import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = {
  title: string;
  intro?: string;
  children: ReactNode;
};

export default function PolicyLayout({ title, intro, children }: Props) {
  useEffect(() => {
    document.title = `${title} · HGG`;
    window.scrollTo(0, 0);
  }, [title]);

  return (
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
  );
}
