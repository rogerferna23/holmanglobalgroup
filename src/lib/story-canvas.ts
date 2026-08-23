// Reseñas → imágenes de Instagram (brief "Experiencias en destacadas", ago 2026).
//
// Holman quería llevar las reseñas del sitio a historias destacadas de
// Instagram, una destacada por etapa: Sentido, Marca y Sistema. En vez de pedir
// cada imagen a mano, el panel /admin/instagram pinta aquí mismo cada reseña en
// 1080×1920 y la descarga como PNG.
//
// Se dibuja con Canvas 2D y nada más: sin html2canvas ni ninguna dependencia
// nueva. La contrapartida es que el layout se calcula a mano (no hay flexbox),
// así que todo va en píxeles sobre el lienzo de 1080×1920 y las medidas se
// escriben tal cual, sin escalados intermedios.
//
// Los colores y las tipografías son los mismos tokens de styles/main.css: si
// allí cambia la marca, hay que cambiarla también aquí (son dos mundos, CSS y
// canvas, y el canvas no lee custom properties).

import type { Stage } from "@/lib/testimonials";
import { STAGE_LABEL } from "@/lib/testimonials";
import { initialsOf, type Review } from "@/lib/reviews";

/** Lienzo de historia de Instagram. Es también el de las portadas. */
export const STORY_W = 1080;
export const STORY_H = 1920;

/** Tokens de marca (espejo de :root en styles/main.css). */
const BG = "#0B1016";
const BG_DEEP = "#070B10";
const GOLD = "#F0B800";
const WHITE = "#FFFFFF";
const MUTED = "#B8BEC7";
const HAIRLINE = "rgba(255,255,255,0.10)";

const F_DISPLAY = '"Questrial", "Helvetica Neue", Helvetica, Arial, sans-serif';
const F_BODY = '"Josefin Sans", "Helvetica Neue", Helvetica, Arial, sans-serif';

/** Mismos degradados que .avatar.swatch-N, para el avatar sin foto. */
const SWATCHES: [string, string][] = [
  ["#2a3340", "#1a2230"],
  ["#3a2a40", "#221a30"],
  ["#2a4036", "#1a2c25"],
  ["#40362a", "#302420"],
  ["#2c3a40", "#1a2530"],
];

/**
 * La zona segura de Instagram: arriba tapa el nombre de la cuenta y abajo la
 * caja de "enviar mensaje". Todo lo que importa se pinta dentro de estos
 * márgenes o queda escondido detrás de la interfaz.
 */
const SAFE_TOP = 250;
const SAFE_BOTTOM = 250;
const SIDE = 96;

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de dibujo
// ─────────────────────────────────────────────────────────────────────────────

function ctxOf(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("El navegador no dejó abrir el lienzo 2D.");
  return ctx;
}

/** Fondo de marca: oscuro con un halo dorado muy tenue arriba. */
function paintBackground(ctx: CanvasRenderingContext2D) {
  const base = ctx.createLinearGradient(0, 0, 0, STORY_H);
  base.addColorStop(0, BG);
  base.addColorStop(1, BG_DEEP);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  const halo = ctx.createRadialGradient(
    STORY_W / 2, STORY_H * 0.3, 0,
    STORY_W / 2, STORY_H * 0.3, STORY_W * 0.85
  );
  halo.addColorStop(0, "rgba(240,184,0,0.07)");
  halo.addColorStop(1, "rgba(240,184,0,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, STORY_W, STORY_H);
}

/**
 * Grano de película, el mismo efecto que el overlay del sitio. Se pinta por
 * píxel sobre una capa aparte y se compone al 5%: a tamaño de historia son dos
 * millones de píxeles, pero solo se hace una vez por imagen.
 */
function paintGrain(ctx: CanvasRenderingContext2D) {
  const layer = document.createElement("canvas");
  layer.width = STORY_W;
  layer.height = STORY_H;
  const lctx = layer.getContext("2d");
  if (!lctx) return;
  const img = lctx.createImageData(STORY_W, STORY_H);
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    px[i] = px[i + 1] = px[i + 2] = v;
    px[i + 3] = 255;
  }
  lctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.globalCompositeOperation = "overlay";
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

/**
 * Caracteres invisibles que se cuelan al pegar una reseña desde WhatsApp, Word
 * o el navegador: marcas de dirección, juntadores de ancho cero y el BOM. No se
 * ven, pero se cuentan al medir y descuadran el reparto en líneas. Los
 * separadores de línea y párrafo de Unicode sí se conservan, como saltos.
 */
const INVISIBLES = new RegExp("[\\u200b-\\u200f\\u2060\\ufeff]", "g");
const SEPARADORES = new RegExp("[\\u2028\\u2029]", "g");

function limpiar(texto: string): string {
  return texto
    .replace(INVISIBLES, "")
    .replace(SEPARADORES, "\n")
    .replace(/\r\n?/g, "\n")
    .trim();
}

/** Parte el texto en líneas que caben en `maxW`. Corta palabras larguísimas. */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    let line = "";
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      const tryLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(tryLine).width <= maxW || !line) {
        line = tryLine;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/**
 * La historia tiene dos disposiciones y se elige la que haga falta.
 *
 * `amplio` es la de siempre: comilla decorativa, foto grande y márgenes
 * generosos. Es la que se usa mientras la reseña quepa, que son casi todas.
 *
 * `compacto` aparece solo cuando una reseña muy larga no entra de otra forma:
 * quita la comilla, encoge un poco la foto y recorta márgenes. Con eso gana
 * ~240px de alto, que es lo que permite que una reseña de 1.200 caracteres
 * siga contándose en una sola historia en vez de partirse en cuatro.
 */
type Layout = {
  /** Altura de la etiqueta de etapa. */
  top: number;
  /** Hueco de la comilla decorativa (0 = no se pinta). */
  markH: number;
  avatarR: number;
  /** Distancia del centro de la foto al borde inferior de la zona segura. */
  avatarUp: number;
  starsH: number;
  /** Aire entre el bloque de texto y la foto. */
  gapAbove: number;
};

const AMPLIO: Layout = {
  top: 250, markH: 110, avatarR: 84, avatarUp: 340, starsH: 90, gapAbove: 90,
};

const COMPACTO: Layout = {
  top: 210, markH: 0, avatarR: 64, avatarUp: 286, starsH: 80, gapAbove: 64,
};

const LAYOUTS = { amplio: AMPLIO, compacto: COMPACTO };
export type LayoutName = keyof typeof LAYOUTS;

const QUOTE_MAX_W = STORY_W - SIDE * 2;

/** Alto libre para la cita en una disposición dada. */
function quoteBox(l: Layout): { top: number; bottom: number; maxH: number } {
  const footY = STORY_H - SAFE_BOTTOM;
  const top = l.top + 100;
  const bottom = footY - l.avatarUp - l.avatarR - l.gapAbove;
  return { top, bottom, maxH: bottom - top - l.starsH - l.markH };
}

/**
 * Cuerpos de letra. El máximo es para las reseñas de una o dos frases; el
 * mínimo de `amplio` (30px) es el que ya se venía usando y con el que se ven
 * bien las reseñas de ~900 caracteres. `compacto` puede bajar un poco más
 * porque tiene más sitio, pero no tanto como para que deje de leerse.
 */
const MAX_SIZE = 58;
const MIN_AMPLIO = 30;
const MIN_COMPACTO = 26;

/** Tope de historias por reseña. Más de dos se hace pesado de ver. */
const MAX_PARTES = 2;

function lineHeightFor(size: number): number {
  return Math.round(size * 1.45);
}

/**
 * Busca el cuerpo más grande con el que el texto entra entero en esa
 * disposición. Devuelve null si ni al mínimo cabe.
 */
type Ajuste = { size: number; lineH: number; lines: string[]; layout: LayoutName };

function fitIn(
  ctx: CanvasRenderingContext2D,
  text: string,
  layout: LayoutName,
  min: number,
  desde: number = MAX_SIZE
): Ajuste | null {
  const { maxH } = quoteBox(LAYOUTS[layout]);
  for (let size = desde; size >= min; size -= 2) {
    ctx.font = `300 ${size}px ${F_BODY}`;
    const lineH = lineHeightFor(size);
    const lines = wrap(ctx, text, QUOTE_MAX_W);
    if (lines.length * lineH <= maxH) return { size, lineH, lines, layout };
  }
  return null;
}

/**
 * Lo mismo, pero para el momento de pintar: siempre devuelve algo. Si ni al
 * mínimo cabe —solo puede pasar si este navegador mide distinto al que hizo el
 * plan— sigue bajando hasta que entre.
 */
function fitParaPintar(
  ctx: CanvasRenderingContext2D,
  text: string,
  layout: LayoutName,
  desde: number
): Ajuste {
  const min = layout === "compacto" ? MIN_COMPACTO : MIN_AMPLIO;
  return (
    fitIn(ctx, text, layout, min, desde) ??
    fitIn(ctx, text, layout, 16, min - 2) ?? {
      size: 16,
      lineH: lineHeightFor(16),
      lines: wrap(ctx, text, QUOTE_MAX_W),
      layout,
    }
  );
}

/**
 * ¿Esta línea cierra una idea? Se usa para cortar entre historias por el final
 * de una frase y no a mitad, que es lo que hace que el corte no se note.
 */
function cierraFrase(line: string): boolean {
  return /[.!?:;…]["”»)]?$/.test(line.trim());
}

/**
 * Reparte las líneas en `partes` grupos de tamaño parecido, moviendo cada corte
 * hasta el final de frase más cercano (como mucho dos líneas arriba o abajo).
 */
function repartir(lines: string[], partes: number, maxPorParte: number): string[][] {
  const objetivo = Math.ceil(lines.length / partes);
  const grupos: string[][] = [];
  let i = 0;
  while (i < lines.length) {
    const restantes = partes - grupos.length - 1;
    let corte = Math.min(i + objetivo, lines.length);

    // Solo se busca frase si aún queda margen para no pasarse del máximo.
    if (corte < lines.length) {
      for (let d = 0; d <= 2; d++) {
        const abajo = corte + d;
        const arriba = corte - d;
        if (abajo <= lines.length && abajo - i <= maxPorParte && cierraFrase(lines[abajo - 1])) {
          corte = abajo;
          break;
        }
        if (arriba > i && cierraFrase(lines[arriba - 1])) {
          corte = arriba;
          break;
        }
      }
    }

    // Que lo que queda alcance para las partes que faltan (ninguna vacía).
    const sobran = lines.length - corte;
    if (restantes > 0 && sobran < restantes) corte = lines.length - restantes;

    grupos.push(lines.slice(i, corte));
    i = corte;
  }
  return grupos;
}

/** Una historia concreta: su trozo de texto ya medido y su lugar en la serie. */
/**
 * Una historia concreta. Lleva el **texto**, no las líneas ya partidas: el
 * reparto en líneas se rehace al pintar, con el mismo lienzo que dibuja, para
 * que medir y dibujar no puedan discrepar. `size` es el cuerpo que salió del
 * plan y sirve de punto de partida.
 */
export type StoryPart = {
  index: number; // 1-based
  total: number;
  size: number;
  layout: LayoutName;
  text: string;
};

/** Lienzo suelto solo para medir texto, sin tocar el que se está pintando. */
let midiendo: CanvasRenderingContext2D | null = null;

function measuringCtx(): CanvasRenderingContext2D {
  if (!midiendo) {
    const c = document.createElement("canvas");
    c.width = STORY_W;
    c.height = STORY_H;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("El navegador no dejó abrir el lienzo 2D.");
    midiendo = ctx;
  }
  return midiendo;
}

/**
 * Decide cómo se cuenta una reseña.
 *
 * El orden importa y es el que se pidió: primero intentar que quepa entera en
 * una sola historia con la disposición de siempre; si no, seguir en una sola
 * pero apretando el diseño y bajando la letra; y solo cuando ni así entra,
 * repartirla en dos. Nunca más de dos: tres o cuatro tarjetas por una misma
 * reseña se hacen pesadas de ver.
 *
 * Hay que llamar antes a `ensureFonts()`: sin las tipografías cargadas se mide
 * con la de reserva y la decisión sale mal.
 */
export function planStory(quote: string): StoryPart[] {
  const ctx = measuringCtx();
  const texto = limpiar(quote);
  const completo = `“${texto}”`;

  // 1) Lo normal: entera, con el diseño de siempre.
  const amplio = fitIn(ctx, completo, "amplio", MIN_AMPLIO);
  if (amplio) {
    return [{ index: 1, total: 1, size: amplio.size, layout: "amplio", text: completo }];
  }

  // 2) Muy larga: entera igualmente, con el diseño compacto y la letra menor.
  const compacto = fitIn(ctx, completo, "compacto", MIN_COMPACTO);
  if (compacto) {
    return [{ index: 1, total: 1, size: compacto.size, layout: "compacto", text: completo }];
  }

  // 3) Larguísima: en dos historias, ya con la letra a un tamaño cómodo.
  return repartirEnPartes(ctx, texto);
}

/**
 * Reparte una reseña en dos historias, buscando el cuerpo de letra más grande
 * con el que las dos entren. Se prueba primero con el diseño de siempre y, si
 * ni así caben en dos, con el compacto —igual que cuando va en una sola—, para
 * que el tope de dos tarjetas se respete de verdad.
 *
 * Solo se pasa de dos con una reseña descomunal (más de ~3.000 caracteres), y
 * entonces se hacen las mínimas que hagan falta: es preferible eso a dejarla
 * ilegible.
 */
function repartirEnPartes(
  ctx: CanvasRenderingContext2D,
  texto: string
): StoryPart[] {
  const intentos: { layout: LayoutName; desde: number; hasta: number }[] = [
    { layout: "amplio", desde: 44, hasta: MIN_AMPLIO },
    { layout: "compacto", desde: 40, hasta: MIN_COMPACTO },
  ];

  for (const intento of intentos) {
    const { maxH } = quoteBox(LAYOUTS[intento.layout]);
    for (let size = intento.desde; size >= intento.hasta; size -= 2) {
      const { lines, maxPorParte } = medirReparto(ctx, texto, size, maxH);
      const partes = Math.ceil(lines.length / maxPorParte);
      if (partes > MAX_PARTES) continue;
      return armarPartes(
        repartir(lines, Math.max(2, partes), maxPorParte),
        size, intento.layout
      );
    }
  }

  // Reseña fuera de toda medida: las partes que hagan falta, al mínimo.
  const { maxH } = quoteBox(COMPACTO);
  const { lines, maxPorParte } = medirReparto(ctx, texto, MIN_COMPACTO, maxH);
  const partes = Math.max(2, Math.ceil(lines.length / maxPorParte));
  return armarPartes(
    repartir(lines, partes, maxPorParte), MIN_COMPACTO, "compacto"
  );
}

/**
 * Mide el texto a un cuerpo dado: en cuántas líneas cae y cuántas caben por
 * historia. Se mide con la comilla de apertura puesta, que es lo que se pinta
 * luego, para que la primera línea no se quede corta por un carácter que no se
 * contó.
 */
function medirReparto(
  ctx: CanvasRenderingContext2D,
  texto: string,
  size: number,
  maxH: number
): { lines: string[]; maxPorParte: number } {
  ctx.font = `300 ${size}px ${F_BODY}`;
  const lineH = lineHeightFor(size);
  return {
    lines: wrap(ctx, `“${texto}`, QUOTE_MAX_W),
    maxPorParte: Math.max(1, Math.floor(maxH / lineH)),
  };
}

/** Pone la puntuación de los cortes y numera las partes. */
function armarPartes(
  grupos: string[][],
  size: number,
  layout: LayoutName
): StoryPart[] {
  // Los puntos suspensivos solo marcan los cortes que caen a mitad de frase. Si
  // el corte cayó justo en un punto, la frase ya está cerrada y añadirlos daría
  // "en palabras...." — cuatro puntos seguidos.
  const cortadaAMitad = grupos.map(
    (grupo, i) => i < grupos.length - 1 && !cierraFrase(grupo[grupo.length - 1])
  );

  return grupos.map((grupo, i) => {
    const ultima = i === grupos.length - 1;
    const trozo = [...grupo];
    if (cortadaAMitad[i - 1]) trozo[0] = `…${trozo[0]}`;
    if (ultima) trozo[trozo.length - 1] = `${trozo[trozo.length - 1]}”`;
    else if (cortadaAMitad[i]) trozo[trozo.length - 1] = `${trozo[trozo.length - 1]}…`;
    return {
      index: i + 1,
      total: grupos.length,
      size,
      layout,
      // Las líneas se vuelven a juntar: al pintar se reparten otra vez con el
      // lienzo de destino, que es el que manda.
      text: trozo.join(" "),
    };
  });
}

/** Estrella de cinco puntas centrada en (cx, cy). */
function star(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, filled: boolean
) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.42;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = GOLD;
    ctx.fill();
  } else {
    ctx.strokeStyle = "rgba(240,184,0,0.35)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, rating: number
) {
  const r = 22;
  const gap = 58;
  const startX = cx - (gap * 4) / 2;
  for (let i = 0; i < 5; i++) {
    star(ctx, startX + gap * i, cy, r, i < rating);
  }
}

/** Texto centrado con espaciado entre letras (canvas no trae letter-spacing). */
function tracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number, y: number, spacing: number
) {
  const chars = [...text];
  const width =
    chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) +
    spacing * (chars.length - 1);
  // Se pinta letra a letra desde la izquierda, así que el textAlign "center"
  // que traiga el contexto hay que apagarlo o cada letra se centraría sola.
  ctx.save();
  ctx.textAlign = "left";
  let x = cx - width / 2;
  for (const c of chars) {
    ctx.fillText(c, x, y);
    x += ctx.measureText(c).width + spacing;
  }
  ctx.restore();
}

/**
 * Carga la foto de la reseña. Va con `crossOrigin` porque las fotos viven en el
 * Storage público de Supabase: sin eso el lienzo queda "manchado" y el navegador
 * prohíbe exportar el PNG. Si la foto no carga, se devuelve null y la tarjeta
 * cae a las iniciales — el mismo comportamiento que las tarjetas del sitio.
 */
function loadPhoto(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Dibuja la foto recortada en círculo, sin deformarla (equivale a cover). */
function drawPhotoCircle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number, cy: number, r: number
) {
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, sx, sy, side, side, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

/**
 * Las tipografías de marca tienen que estar cargadas antes de medir el texto:
 * si no, el canvas mide con Arial, parte las líneas por donde no es y luego
 * pinta con Questrial. Se piden explícitamente los cuerpos que usa el diseño.
 */
export async function ensureFonts(): Promise<void> {
  const fonts = [
    `300 58px ${F_BODY}`,
    `400 44px ${F_BODY}`,
    `400 96px ${F_DISPLAY}`,
    `400 34px ${F_DISPLAY}`,
  ];
  try {
    await Promise.all(fonts.map((f) => document.fonts.load(f)));
    await document.fonts.ready;
  } catch {
    // Sin la API de fuentes se pinta con la de reserva: se ve peor, no rompe.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Historia de una reseña
// ─────────────────────────────────────────────────────────────────────────────

export type StoryReview = Pick<
  Review, "name" | "role" | "quote" | "rating" | "stage" | "photoUrl"
>;

/**
 * Pinta una historia de 1080×1920, de arriba abajo: etiqueta de etapa, comilla,
 * cita, estrellas, foto, nombre y cargo, y el cierre con el dominio. El bloque
 * central se centra en el hueco entre la etiqueta y la ficha de la persona, así
 * una reseña corta no queda flotando arriba.
 *
 * `part` es el trozo que toca pintar, salido de `planStory`. Cuando la reseña
 * cabe entera solo hay una parte y no se nota nada; cuando va repartida, la
 * ficha de la persona se repite en todas (quien entre por la mitad tiene que
 * saber quién habla) y arriba aparece el contador "1 / 3".
 */
export async function renderStory(
  canvas: HTMLCanvasElement,
  review: StoryReview,
  site: string,
  part: StoryPart
): Promise<void> {
  const ctx = ctxOf(canvas);
  const photo = await loadPhoto(review.photoUrl);
  const L = LAYOUTS[part.layout];

  paintBackground(ctx);
  ctx.textBaseline = "alphabetic";

  // Etiqueta de etapa arriba: "EXPERIENCIAS · SENTIDO".
  const etapa = review.stage ? STAGE_LABEL[review.stage] : "";
  ctx.fillStyle = GOLD;
  ctx.font = `400 30px ${F_DISPLAY}`;
  ctx.textAlign = "center";
  tracked(
    ctx,
    etapa ? `EXPERIENCIAS · ${etapa.toUpperCase()}` : "EXPERIENCIAS",
    STORY_W / 2,
    L.top,
    7
  );

  // Línea dorada corta bajo la etiqueta.
  ctx.strokeStyle = "rgba(240,184,0,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(STORY_W / 2 - 40, L.top + 34);
  ctx.lineTo(STORY_W / 2 + 40, L.top + 34);
  ctx.stroke();

  // Contador, solo si la reseña va repartida en varias historias.
  if (part.total > 1) {
    ctx.fillStyle = "rgba(184,190,199,0.7)";
    ctx.font = `300 24px ${F_BODY}`;
    tracked(ctx, `${part.index} / ${part.total}`, STORY_W / 2, L.top + 82, 4);
  }

  // Ficha de la persona, anclada abajo: foto, nombre, cargo.
  // El pie se apila de abajo arriba: dominio, hairline, cargo, nombre y foto.
  // Las distancias son fijas para que el cargo nunca caiga sobre la línea.
  const footY = STORY_H - SAFE_BOTTOM;
  const avatarR = L.avatarR;
  const avatarCY = footY - L.avatarUp;

  if (photo) {
    drawPhotoCircle(ctx, photo, STORY_W / 2, avatarCY, avatarR);
  } else {
    const [from, to] = SWATCHES[Math.abs(hash(review.name)) % SWATCHES.length];
    const g = ctx.createLinearGradient(
      STORY_W / 2 - avatarR, avatarCY - avatarR,
      STORY_W / 2 + avatarR, avatarCY + avatarR
    );
    g.addColorStop(0, from);
    g.addColorStop(1, to);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(STORY_W / 2, avatarCY, avatarR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.font = `400 ${Math.round(avatarR * 0.76)}px ${F_DISPLAY}`;
    ctx.textAlign = "center";
    ctx.fillText(initialsOf(review.name), STORY_W / 2, avatarCY + avatarR * 0.27);
  }

  // Aro dorado alrededor del avatar.
  ctx.strokeStyle = "rgba(240,184,0,0.5)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(STORY_W / 2, avatarCY, avatarR + 12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = WHITE;
  ctx.font = `400 46px ${F_DISPLAY}`;
  ctx.textAlign = "center";
  ctx.fillText(review.name, STORY_W / 2, avatarCY + avatarR + 76, QUOTE_MAX_W);

  if (review.role) {
    ctx.fillStyle = MUTED;
    ctx.font = `300 32px ${F_BODY}`;
    ctx.fillText(review.role, STORY_W / 2, avatarCY + avatarR + 126, QUOTE_MAX_W);
  }

  // Cierre: hairline y dominio, ya pegado al borde de la zona segura.
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(SIDE + 120, footY - 60);
  ctx.lineTo(STORY_W - SIDE - 120, footY - 60);
  ctx.stroke();

  ctx.fillStyle = "rgba(184,190,199,0.75)";
  ctx.font = `300 26px ${F_BODY}`;
  tracked(ctx, site.toUpperCase(), STORY_W / 2, footY - 8, 5);

  // Bloque central: comilla + cita + estrellas, centrado en el hueco libre.
  //
  // El texto se reparte en líneas AQUÍ, con este mismo lienzo, y no se
  // aprovecha el reparto del plan. Es a propósito: no todos los navegadores
  // miden igual —con emojis, Safari devuelve en `measureText` el ancho del
  // símbolo estrecho y luego dibuja el emoji a color, más ancho— y una línea
  // medida en un lienzo y pintada en otro puede salirse. Midiendo y pintando en
  // el mismo sitio, lo que se calcula es exactamente lo que se ve.
  const box = quoteBox(L);
  const { size, lineH, lines } = fitParaPintar(ctx, part.text, part.layout, part.size);

  // La comilla decorativa solo abre la primera historia; en las siguientes se
  // queda el hueco reservado para que todas las partes se vean a la misma
  // altura, en vez de bailar entre una y otra. En el diseño compacto no hay
  // comilla: ese hueco es justo parte del sitio que se gana.
  const quoteH = lines.length * lineH;
  const totalH = L.markH + quoteH + L.starsH;
  let y = box.top + (box.bottom - box.top - totalH) / 2;

  if (L.markH > 0 && part.index === 1) {
    ctx.fillStyle = "rgba(240,184,0,0.22)";
    ctx.font = `400 150px ${F_BODY}`;
    ctx.textAlign = "center";
    ctx.fillText("“", STORY_W / 2, y + 100);
  }
  y += L.markH;

  // Vuelta a la letra de la cita: la comilla decorativa se pinta con la de
  // display a 150px y, si no se restaura aquí, el texto sale con ese cuerpo.
  ctx.font = `300 ${size}px ${F_BODY}`;
  ctx.fillStyle = WHITE;
  for (const line of lines) {
    y += lineH;
    // El ancho máximo va en el propio fillText, y no solo al repartir en
    // líneas, porque no todos los navegadores miden igual: con emojis, Safari
    // devuelve en `measureText` el ancho del símbolo estrecho y luego dibuja el
    // emoji a color, que es bastante más ancho — y la línea se salía del
    // lienzo. Pasando el ancho aquí, el navegador la ajusta con su medida
    // buena en vez de desbordarse. El textAlign se fija dentro del bucle a
    // propósito: así ninguna línea depende de lo que dejara puesto otro dibujo.
    ctx.textAlign = "center";
    ctx.fillText(line, STORY_W / 2, y, QUOTE_MAX_W);
  }

  drawStars(ctx, STORY_W / 2, y + L.starsH / 2 + 26, review.rating);

  paintGrain(ctx);
}

/** Hash estable del nombre → mismo degradado para la misma persona. */
function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return h;
}

// ─────────────────────────────────────────────────────────────────────────────
// Portada de destacada
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Portada de una destacada: fondo de marca, "EXPERIENCIAS" pequeño y el nombre
 * de la etapa grande en dorado, entre dos líneas finas.
 *
 * Instagram recorta la portada a un círculo centrado, así que todo se pinta
 * alrededor del centro del lienzo y nada se acerca a los bordes.
 */
export async function renderCover(
  canvas: HTMLCanvasElement,
  stage: Stage
): Promise<void> {
  const ctx = ctxOf(canvas);
  paintBackground(ctx);

  const cx = STORY_W / 2;
  const cy = STORY_H / 2;

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "rgba(184,190,199,0.8)";
  ctx.font = `400 32px ${F_DISPLAY}`;
  tracked(ctx, "EXPERIENCIAS", cx, cy - 130, 10);

  ctx.strokeStyle = "rgba(240,184,0,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 150, cy - 80);
  ctx.lineTo(cx + 150, cy - 80);
  ctx.stroke();

  ctx.fillStyle = GOLD;
  ctx.font = `400 120px ${F_DISPLAY}`;
  tracked(ctx, STAGE_LABEL[stage].toUpperCase(), cx, cy + 60, 6);

  ctx.strokeStyle = "rgba(240,184,0,0.5)";
  ctx.beginPath();
  ctx.moveTo(cx - 150, cy + 120);
  ctx.lineTo(cx + 150, cy + 120);
  ctx.stroke();

  paintGrain(ctx);
}

// ─────────────────────────────────────────────────────────────────────────────
// Descarga
// ─────────────────────────────────────────────────────────────────────────────

/** Igual que en lib/reviews.ts: escrito así para no meter marcas sueltas en el fuente. */
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

/** Nombre de archivo sin tildes ni espacios, para que sirva en cualquier sitio. */
export function fileSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(COMBINING_MARKS, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "hgg"
  );
}

/** Baja el lienzo como PNG. */
export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
