// Blog de HGG. Los artículos viven en src/content/blog/articulos.json, que
// también lee el build (scripts/seo-routes.mjs) para darle a cada artículo su
// página con título, descripción, imagen y el texto ya escrito en el HTML, para
// que Google lo lea sin esperar al JavaScript.
//
// Para publicar uno nuevo: añadirlo al JSON. Bloques: "lead" (entrada),
// "p" (párrafo), "h2" (subtítulo), "cita" y "lista" (con "items"). En el texto,
// [palabras](/ruta) se convierte en enlace.

import data from "@/content/blog/articulos.json";

export type Bloque =
  | { t: "lead" | "p" | "h2" | "cita"; x: string }
  | { t: "lista"; items: string[] };

export type Articulo = {
  slug: string;
  titulo: string;
  descripcion: string;
  /** YYYY-MM-DD */
  fecha: string;
  autor: string;
  /** Minutos de lectura. */
  lectura: number;
  imagen: string;
  imagenAlt: string;
  bloques: Bloque[];
};

/** Del más nuevo al más viejo. */
export const ARTICULOS: Articulo[] = (data as unknown as Articulo[])
  .slice()
  .sort((a, b) => b.fecha.localeCompare(a.fecha));

export const articuloPorSlug = (slug: string | undefined) =>
  ARTICULOS.find((a) => a.slug === slug);

export const rutaArticulo = (a: Articulo) => `/blog/${a.slug}`;

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** «3 de octubre de 2026». */
export function fechaArticulo(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

/** Parte un texto en trozos, separando los [enlaces](/ruta). */
export function trozos(texto: string): { texto: string; href?: string }[] {
  const out: { texto: string; href?: string }[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let ultimo = 0;
  for (const m of texto.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > ultimo) out.push({ texto: texto.slice(ultimo, i) });
    out.push({ texto: m[1], href: m[2] });
    ultimo = i + m[0].length;
  }
  if (ultimo < texto.length) out.push({ texto: texto.slice(ultimo) });
  return out;
}
