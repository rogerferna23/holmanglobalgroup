import { useState } from "react";
import { Reveal } from "./reveal";

type Member = {
  name: string;
  position: string; // acrónimo del cargo (CEO, CTO…)
  role: string; // descripción del cargo
  photo: string; // en public/equipo/*.jpg
  initials: string; // fallback si la foto aún no está disponible
  bio: string; // reverso de la tarjeta (aparece al hover)
};

// Fotos en public/equipo/ (holman.jpg, roger.jpg, alberto.jpg, natalia.jpg).
// Si falta una, la cara frontal muestra las iniciales sobre un fondo de marca.
const TEAM: Member[] = [
  {
    name: "Holman Orjuela",
    position: "CEO",
    role: "Fundador & Coach",
    photo: "/equipo/holman.jpg",
    initials: "HO",
    bio: "Es el corazón detrás de HGG. Acompaña a personas y marcas a descubrir su propósito a través del coaching musical y expansivo, y diseña las estrategias que convierten esa claridad en un negocio real.",
  },
  {
    name: "Roger Fernandez",
    position: "CTO",
    role: "Director de Tecnología",
    photo: "/equipo/roger.jpg",
    initials: "RF",
    bio: "Construye los sistemas digitales que hacen posible que HGG opere y escale. Desde sitios web hasta automatizaciones e inteligencia artificial, se encarga de que la tecnología trabaje para el negocio.",
  },
  {
    name: "Alberto Deleyto",
    position: "CSO",
    role: "Socio Estratégico",
    photo: "/equipo/alberto.jpg",
    initials: "AD",
    bio: "Fue el puente que hizo posible esta alianza. Su rol es pensar en grande, identificar oportunidades estratégicas y asegurar que HGG crezca con visión, solidez y las alianzas correctas.",
  },
  {
    name: "Natalia Sánchez",
    position: "CMO",
    role: "Directora de Marketing",
    photo: "/equipo/natalia.jpg",
    initials: "NS",
    bio: "Lleva la voz de HGG al mundo. Diseña y ejecuta las campañas, gestiona las redes sociales y construye la presencia digital que atrae a las personas correctas hacia la marca.",
  },
];

function MemberCard({ m }: { m: Member }) {
  const [photoOk, setPhotoOk] = useState(true);
  return (
    <article className="equipo-card">
      <div
        className="equipo-flip"
        tabIndex={0}
        aria-label={`${m.name}, ${m.position}. ${m.bio}`}
      >
        <div className="equipo-flip-inner">
          <div className="equipo-face equipo-front">
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
          <div className="equipo-face equipo-back">
            <span className="equipo-back-name">{m.name}</span>
            <p className="equipo-bio">{m.bio}</p>
          </div>
        </div>
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
              Las personas
              <br />
              detrás del camino.
            </h2>
          </div>
          <p className="lede">
            Cuatro personas que unen propósito, tecnología, estrategia y marca
            para acompañarte en cada etapa de tu camino. Pasa el cursor —o
            toca— sobre cada foto para conocerlas.
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
