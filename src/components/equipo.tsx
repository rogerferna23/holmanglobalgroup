import { useState } from "react";
import { Reveal } from "./reveal";

type Member = {
  name: string;
  position: string; // acrónimo del cargo (CEO, CTO…)
  role: string; // descripción del cargo
  photo: string; // en public/equipo/*.jpg
  initials: string; // fallback si la foto aún no está disponible
};

// Fotos: Holman las envía por separado. Colócalas en public/equipo/ con estos
// nombres exactos (holman.jpg, roger.jpg, alberto.jpg, natalia.jpg). Mientras
// no existan, la tarjeta muestra las iniciales sobre un fondo de marca.
const TEAM: Member[] = [
  {
    name: "Holman Orjuela",
    position: "CEO",
    role: "Fundador & Coach",
    photo: "/equipo/holman.jpg",
    initials: "HO",
  },
  {
    name: "Roger Fernandez",
    position: "CTO",
    role: "Director de Tecnología",
    photo: "/equipo/roger.jpg",
    initials: "RF",
  },
  {
    name: "Alberto Deleyto",
    position: "CSO",
    role: "Socio Estratégico",
    photo: "/equipo/alberto.jpg",
    initials: "AD",
  },
  {
    name: "Natalia Sánchez",
    position: "CMO",
    role: "Directora de Marketing",
    photo: "/equipo/natalia.jpg",
    initials: "NS",
  },
];

function MemberCard({ m }: { m: Member }) {
  const [photoOk, setPhotoOk] = useState(true);
  return (
    <article className="equipo-card">
      <div className="equipo-photo">
        {photoOk ? (
          <img
            src={m.photo}
            alt={`${m.name} — ${m.position} · ${m.role}`}
            loading="lazy"
            onError={() => setPhotoOk(false)}
          />
        ) : (
          <span className="equipo-initials" aria-hidden="true">
            {m.initials}
          </span>
        )}
      </div>
      <span className="equipo-pos">{m.position}</span>
      <h3 className="equipo-name display">{m.name}</h3>
      <p className="equipo-role">{m.role}</p>
    </article>
  );
}

export function Equipo() {
  return (
    <section id="equipo" className="equipo">
      <div className="shell">
        <div className="section-head">
          <div className="meta">
            <div className="eyebrow-row">
              <span className="num">07</span>
              <span className="bar" />
              <span className="eyebrow eyebrow-w">Equipo</span>
            </div>
            <h2 className="display">
              Quiénes
              <br />
              somos.
            </h2>
          </div>
          <p className="lede">
            Cuatro personas que unen propósito, tecnología, estrategia y marca
            para acompañarte en cada etapa de tu camino.
          </p>
        </div>

        <Reveal stagger className="equipo-grid">
          {TEAM.map((m) => (
            <MemberCard key={m.name} m={m} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
