import { Link } from "react-router-dom";
import { Seo } from "@/components/seo";
import { ArrowRightIcon } from "@/components/icons";

// Página 404: cualquier enlace que no exista. Va dentro del sitio (con menú y
// pie) y ofrece un camino de vuelta en vez de dejar a la persona en blanco.
export default function NoEncontrada() {
  return (
    <>
      <Seo
        title="Página no encontrada — Holman Global Group"
        description="Este enlace cambió de lugar. Vuelve al inicio y sigue tu camino con Holman Global Group."
        noindex
      />
      <section className="no-encontrada">
        <div className="shell">
          <div className="eyebrow-row">
            <span className="bar" />
            <span className="eyebrow eyebrow-w">Error 404</span>
            <span className="bar" />
          </div>
          <h1 className="display no-encontrada-title">
            Esta página se salió
            <br />
            <em>del camino.</em>
          </h1>
          <p className="no-encontrada-lede">
            El enlace que buscas cambió de lugar. Desde aquí puedes volver al
            inicio o seguir por donde más te sirva.
          </p>
          <div className="no-encontrada-acciones">
            <Link to="/" className="btn btn-primary">
              Volver al inicio
              <ArrowRightIcon className="arrow" />
            </Link>
            <Link to="/podcast" className="btn btn-ghost">
              Escuchar el podcast
            </Link>
            <Link to="/tienda" className="btn btn-ghost">
              Ver la tienda
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
