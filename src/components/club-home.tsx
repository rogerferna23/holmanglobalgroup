import { Link } from "react-router-dom";
import { ECOS } from "@/lib/ecos";
import { CLUB } from "@/lib/routes";
import { ArrowRightIcon } from "./icons";
import { Reveal } from "./reveal";

// Bloque corto del Club ECOS en la home, justo antes del cierre. La venta
// completa está en /ecos; aquí solo se presenta y se lleva allá.
// Mientras dure el mes de regalo (hasta ECOS.trialEndsAt) se nombra la prueba;
// después, el precio.
export function ClubHome() {
  const enPrueba = Date.now() < new Date(ECOS.trialEndsAt).getTime();

  return (
    <section id="club" className="club-home">
      <Reveal className="shell club-home-box" as="div">
        <img
          src="/ecos-placa.png"
          alt="ECOS Business Club"
          width={72}
          height={72}
          className="club-home-placa"
          loading="lazy"
        />
        <div className="eyebrow-row">
          <span className="bar" />
          <span className="eyebrow eyebrow-w">ECOS Business Club</span>
          <span className="bar" />
        </div>
        <h2 className="display">
          Las habilidades necesarias
          <br />
          <em>para un negocio.</em>
        </h2>
        <p className="club-home-body">
          Clases en vivo cada semana para aprender a vender, comunicar y hablar
          en público, con una comunidad que te ve avanzar.
        </p>
        <ul className="club-home-materias">
          {ECOS.plazas.map((p) => (
            <li key={p.id}>{p.label}</li>
          ))}
        </ul>
        <Link to={CLUB.landing} className="btn btn-primary">
          {enPrueba ? "Prueba octubre gratis" : "Conoce el club"}
          <ArrowRightIcon className="arrow" />
        </Link>
        <p className="club-home-nota">
          {enPrueba
            ? `Sin tarjeta para empezar · luego $${ECOS.priceUsd} al mes`
            : `$${ECOS.priceUsd} al mes`}
        </p>
      </Reveal>
    </section>
  );
}
