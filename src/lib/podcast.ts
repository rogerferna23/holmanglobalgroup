// ECOS Podcast · Vive de aquello que amas.
//
// Es el primer escalón de la escalera de valor de HGG: Podcast (gratis) →
// Club ECOS → Sentido → Marca → Sistema. Aquí vive todo lo que el sitio dice
// del podcast (la sección de la home y la página /podcast leen lo mismo).
//
// Para publicar un episodio nuevo: añadirlo arriba de EPISODIOS con su fecha.
// Mientras la fecha no llegue, la web lo muestra como «Llega el viernes…».
// Cuando el video esté en YouTube, poner su id en `youtube` y se reproduce aquí
// mismo (con youtube-nocookie, permitido en la CSP de vercel.json).

export type Episodio = {
  slug: string;
  titulo: string;
  /** Fecha de estreno (YYYY-MM-DD). Antes de esta fecha sale como «próximo». */
  fecha: string;
  minutos: number;
  resumen: string;
  /** Id del video de YouTube (lo que va después de «v=»). */
  youtube?: string;
  /** Enlace del episodio en Spotify. */
  spotify?: string;
  /** Miniatura propia en /public; si no hay, se usa la portada del show. */
  imagen?: string;
};

/**
 * Enlaces del show. Los que estén vacíos no se pintan: así se pueden ir
 * llenando a medida que cada plataforma lo apruebe (Apple tarda unos días).
 */
export const PODCAST_LINKS = {
  youtube: "https://www.youtube.com/@holmanglobalgroup",
  spotify: "https://open.spotify.com/show/3mqFWecXnMMvqYjkpFZ4ZZ",
  // Falta el enlace PÚBLICO (podcasts.apple.com/…); el de podcastsconnect es el panel privado.
  apple: "",
} as const;

export const PODCAST_PORTADA = "/podcast/portada.jpg";

export const EPISODIOS: Episodio[] = [
  {
    slug: "ia-trabajos",
    titulo: "¿Qué trabajos reemplazará la IA?",
    fecha: "2026-10-16",
    minutos: 30,
    resumen:
      "Desde el papá de Charlie en «Charlie y la fábrica de chocolate» hasta las tiendas sin cajeros y los carros sin conductor: qué trabajos va a transformar la IA y qué se queda en manos humanas.",
  },
  {
    slug: "ia-trampa-o-herramienta",
    titulo: "¿La IA es trampa o herramienta?",
    fecha: "2026-10-09",
    minutos: 23,
    resumen:
      "Ingrid cuenta cómo pasó de sentir que ChatGPT era trampa a usarlo para todo, y Holman pone el foco donde está la diferencia: en cómo la usas.",
  },
  {
    slug: "que-es-el-coaching",
    titulo: "¿Qué es el coaching?",
    fecha: "2026-10-02",
    minutos: 16,
    resumen:
      "Una herramienta de lenguaje que te lleva a lugares a los que por tu cuenta tardarías años en llegar. Cómo llegó el coaching a nuestras vidas, en qué se diferencia de la terapia y la mentoría, y los saltos cuánticos.",
    imagen: "/podcast/que-es-el-coaching.jpg",
  },
];

// Fecha local (no UTC): en Colombia, el jueves en la noche ya sería viernes en UTC.
const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const yaSalio = (e: Episodio) => e.fecha <= hoy();

export const publicados = () => EPISODIOS.filter(yaSalio);
export const proximos = () => EPISODIOS.filter((e) => !yaSalio(e)).reverse();

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** «2 de octubre». */
export function fechaLarga(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]}`;
}

export const enlaceYoutube = (e: Episodio) =>
  e.youtube ? `https://www.youtube.com/watch?v=${e.youtube}` : PODCAST_LINKS.youtube;
