// El camino: Sentido → Marca → Sistema (brief "Experiencias en destacadas",
// ago 2026).
//
// Vivía dentro de components/process.tsx, que era el único sitio que lo
// pintaba. Ahora lo lee también el generador de historias de Instagram
// (lib/story-canvas.ts), y se saca aquí para que sea **el mismo texto**, no una
// copia: si Holman cambia la frase de una etapa en la web, la historia de
// Instagram cambia con ella. Era el requisito — que todo diga lo mismo sin
// tener que acordarse de actualizar dos sitios.
//
// Nomenclatura (ver reglas de marca): el pilar —Sentido · Marca · Sistema— es
// el protagonista, y la etapa —Eco · Fuego · Huella— es el nombre interno de
// esa etapa. La palabra "propósito" de estos textos se queda como está: el
// cambio a "Sentido" no fue total en el sitio y aquí no se generaliza.

import type { Stage } from "@/lib/testimonials";

export type Paso = {
  /** Número de la etapa, como se pinta: "01", "02", "03". */
  n: string;
  /** Etapa (Eco · Fuego · Huella). */
  stage: string;
  /** Pilar (Sentido · Marca · Sistema) — el nombre que ve el cliente. */
  pillar: string;
  /**
   * Descripción. La primera línea es la promesa en corto y el resto el
   * desarrollo, separados por una línea en blanco. Las dos partes se pintan
   * distinto en la web y en las historias.
   */
  desc: string;
  /** Enlace con las reseñas, que se agrupan por esta misma etapa. */
  id: Stage;
};

export const CAMINO: Paso[] = [
  {
    n: "01",
    id: "sentido",
    stage: "Eco",
    pillar: "Sentido",
    desc:
      "Descubre quién eres.\n\nConecta con aquello que amas y encuentra el propósito sobre el que construirás todo lo demás.",
  },
  {
    n: "02",
    id: "marca",
    stage: "Fuego",
    pillar: "Marca",
    desc:
      "Convierte tu esencia en una marca.\n\nTransforma tu propósito en una identidad auténtica capaz de conectar con las personas correctas.",
  },
  {
    n: "03",
    id: "sistema",
    stage: "Huella",
    pillar: "Sistema",
    desc:
      "Construye un sistema para vivir de ello.\n\nDesarrolla la estructura, las herramientas y la estrategia para crecer con propósito.",
  },
];

/** El paso de una etapa concreta. */
export function pasoDe(id: Stage): Paso {
  const paso = CAMINO.find((p) => p.id === id);
  if (!paso) throw new Error(`Etapa desconocida: ${id}`);
  return paso;
}

/** La promesa en corto (primera línea) y el desarrollo (el resto). */
export function partesDeDesc(desc: string): { titular: string; cuerpo: string } {
  const [titular, ...resto] = desc.split("\n\n");
  return { titular: titular.trim(), cuerpo: resto.join(" ").trim() };
}
