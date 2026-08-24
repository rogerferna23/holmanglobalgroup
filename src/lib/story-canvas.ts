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
import { partesDeDesc, pasoDe } from "@/lib/camino";
import { CUALIDADES, FUERZAS, METODO } from "@/lib/metodo";

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
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Ancho de un texto, a prueba de navegadores.
 *
 * Con emojis hay motores que no consiguen medir la cadena entera y devuelven un
 * ancho absurdo, casi cero. Si luego se pinta centrado, el navegador coloca la
 * línea como si no ocupara nada: empieza justo en el centro y se sale por la
 * derecha. Pasó con una reseña que lleva "❤️" al final de un párrafo.
 *
 * Medir carácter a carácter no falla de esa manera, así que se toma el mayor de
 * los dos: la medida directa cuando es buena (respeta kerning y ligaduras), y
 * la suma por caracteres cuando la directa se queda corta.
 */
function textWidth(ctx: CanvasRenderingContext2D, text: string): number {
  const directo = ctx.measureText(text).width;
  let porPartes = 0;
  for (const ch of text) porPartes += ctx.measureText(ch).width;
  return Math.max(directo, porPartes);
}

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
      if (textWidth(ctx, tryLine) <= maxW || !line) {
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
 * Pinta una línea centrada en `cx` sin dejarle el centrado al navegador: se
 * mide con `textWidth` y se coloca a mano por la izquierda. Es la otra mitad de
 * la defensa — si el motor cree que la línea mide cero, da igual: empieza donde
 * se le diga. `maxW` va también en el `fillText` para que, si el emoji acaba
 * dibujándose más ancho de lo medido, se ajuste en vez de salirse.
 */
function drawCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxW: number
) {
  const medido = textWidth(ctx, text);
  const w = Math.min(medido, maxW);
  ctx.save();
  ctx.textAlign = "left";
  // El tope solo se pasa cuando de verdad hace falta: `fillText` con maxWidth
  // condensa las letras, y no tiene sentido arriesgarse a eso en el caso normal.
  if (medido > maxW) ctx.fillText(text, cx - w / 2, y, maxW);
  else ctx.fillText(text, cx - w / 2, y);
  ctx.restore();
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
    chars.reduce((sum, c) => sum + textWidth(ctx, c), 0) +
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
    drawCentered(
      ctx, initialsOf(review.name), STORY_W / 2, avatarCY + avatarR * 0.27, avatarR * 2
    );
  }

  // Aro dorado alrededor del avatar.
  ctx.strokeStyle = "rgba(240,184,0,0.5)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(STORY_W / 2, avatarCY, avatarR + 12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = WHITE;
  ctx.font = `400 46px ${F_DISPLAY}`;
  drawCentered(ctx, review.name, STORY_W / 2, avatarCY + avatarR + 76, QUOTE_MAX_W);

  if (review.role) {
    ctx.fillStyle = MUTED;
    ctx.font = `300 32px ${F_BODY}`;
    drawCentered(ctx, review.role, STORY_W / 2, avatarCY + avatarR + 126, QUOTE_MAX_W);
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
    drawCentered(ctx, "“", STORY_W / 2, y + 100, QUOTE_MAX_W);
  }
  y += L.markH;

  // Vuelta a la letra de la cita: la comilla decorativa se pinta con la de
  // display a 150px y, si no se restaura aquí, el texto sale con ese cuerpo.
  ctx.font = `300 ${size}px ${F_BODY}`;
  ctx.fillStyle = WHITE;
  for (const line of lines) {
    y += lineH;
    drawCentered(ctx, line, STORY_W / 2, y, QUOTE_MAX_W);
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
// Tarjeta de etapa y tarjeta de cierre
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cabecera común de las historias: etiqueta dorada y línea corta debajo.
 * Devuelve la altura ocupada para que cada tarjeta siga a partir de ahí.
 */
function drawHeader(ctx: CanvasRenderingContext2D, etiqueta: string, top: number) {
  ctx.fillStyle = GOLD;
  ctx.font = `400 30px ${F_DISPLAY}`;
  tracked(ctx, etiqueta, STORY_W / 2, top, 7);

  ctx.strokeStyle = "rgba(240,184,0,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(STORY_W / 2 - 40, top + 34);
  ctx.lineTo(STORY_W / 2 + 40, top + 34);
  ctx.stroke();
}

/** Pie común: hairline y dominio, pegados al borde de la zona segura. */
function drawFooter(ctx: CanvasRenderingContext2D, site: string) {
  const footY = STORY_H - SAFE_BOTTOM;
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(SIDE + 120, footY - 60);
  ctx.lineTo(STORY_W - SIDE - 120, footY - 60);
  ctx.stroke();

  ctx.fillStyle = "rgba(184,190,199,0.75)";
  ctx.font = `300 26px ${F_BODY}`;
  tracked(ctx, site.toUpperCase(), STORY_W / 2, footY - 8, 5);
}

/**
 * La tarjeta que abre cada destacada: qué es esta etapa.
 *
 * El texto sale de lib/camino.ts, que es el mismo que pinta el bloque Proceso
 * de la web — el requisito era que las dos cosas digan lo mismo siempre.
 *
 * Va antes de las experiencias a propósito: una destacada que solo se llama
 * "Sentido" no le dice nada a quien llega de fuera, y las reseñas quedan como
 * elogios sueltos. Explicando primero la etapa, las reseñas pasan a ser la
 * prueba de algo que la persona acaba de entender.
 */
export async function renderStageCard(
  canvas: HTMLCanvasElement,
  stage: Stage,
  site: string
): Promise<void> {
  const ctx = ctxOf(canvas);
  const paso = pasoDe(stage);
  const { titular, cuerpo } = partesDeDesc(paso.desc);

  paintBackground(ctx);
  ctx.textBaseline = "alphabetic";

  // "EL CAMINO · SENTIDO" — distinta de "EXPERIENCIAS · SENTIDO" de las
  // reseñas, para que de un vistazo se sepa qué clase de tarjeta es.
  drawHeader(ctx, `EL CAMINO · ${paso.pillar.toUpperCase()}`, SAFE_TOP);
  drawFooter(ctx, site);

  // El texto se mide antes de colocar nada: el bloque entero va centrado en el
  // hueco libre, igual que en las tarjetas de reseña, para que al pasar de una
  // a otra en la destacada no salte.
  const promesa = fitParaPintar(ctx, titular, "amplio", 54);
  const detalle = fitParaPintar(ctx, cuerpo, "amplio", 42);

  const NUM_H = 150;
  const PILAR_H = 96;
  const ETAPA_H = 28;
  const alto =
    NUM_H + 26 + PILAR_H + 18 + ETAPA_H + 64 +
    promesa.lines.length * promesa.lineH + 46 +
    detalle.lines.length * detalle.lineH;

  const cx = STORY_W / 2;
  const bandaTop = SAFE_TOP + 120;
  const bandaBottom = STORY_H - SAFE_BOTTOM - 120;
  let y = bandaTop + (bandaBottom - bandaTop - alto) / 2;

  // Número de etapa, grande y tenue: da la sensación de paso 1 de 3.
  ctx.fillStyle = "rgba(240,184,0,0.16)";
  ctx.font = `400 210px ${F_DISPLAY}`;
  drawCentered(ctx, paso.n, cx, y + NUM_H, QUOTE_MAX_W);
  y += NUM_H + 26;

  // Pilar y etapa: "Sentido" manda, "Eco" acompaña.
  ctx.fillStyle = WHITE;
  ctx.font = `400 ${PILAR_H}px ${F_DISPLAY}`;
  drawCentered(ctx, paso.pillar, cx, y + PILAR_H, QUOTE_MAX_W);
  y += PILAR_H + 18;

  ctx.fillStyle = "rgba(184,190,199,0.8)";
  ctx.font = `300 ${ETAPA_H}px ${F_BODY}`;
  tracked(ctx, paso.stage.toUpperCase(), cx, y + ETAPA_H, 8);
  y += ETAPA_H + 64;

  // La promesa en corto, en dorado.
  ctx.fillStyle = GOLD;
  ctx.font = `300 ${promesa.size}px ${F_BODY}`;
  for (const line of promesa.lines) {
    y += promesa.lineH;
    drawCentered(ctx, line, cx, y, QUOTE_MAX_W);
  }
  y += 46;

  // El desarrollo.
  ctx.fillStyle = WHITE;
  ctx.font = `300 ${detalle.size}px ${F_BODY}`;
  for (const line of detalle.lines) {
    y += detalle.lineH;
    drawCentered(ctx, line, cx, y, QUOTE_MAX_W);
  }

  paintGrain(ctx);
}

/**
 * La tarjeta que cierra cada destacada.
 *
 * Pide responder a la historia con una sola palabra —la de la etapa— en vez de
 * mandar a un enlace: se queda dentro de Instagram, cuesta un toque, y a Sofía
 * le llega el mensaje con la miniatura de esta historia, así que ve de qué
 * etapa viene la persona sin preguntarlo. Dar la palabra exacta es lo que hace
 * que responder no cueste nada.
 */
export async function renderCtaCard(
  canvas: HTMLCanvasElement,
  stage: Stage,
  site: string
): Promise<void> {
  const ctx = ctxOf(canvas);
  const paso = pasoDe(stage);
  const palabra = paso.pillar.toUpperCase();

  paintBackground(ctx);
  ctx.textBaseline = "alphabetic";

  drawHeader(ctx, `EL CAMINO · ${palabra}`, SAFE_TOP);
  drawFooter(ctx, site);

  const cx = STORY_W / 2;

  ctx.font = `400 82px ${F_DISPLAY}`;
  const pregunta = wrap(ctx, "¿Te reconoces aquí?", QUOTE_MAX_W);
  ctx.font = `300 44px ${F_BODY}`;
  const intro = wrap(ctx, "Responde a esta historia con la palabra", QUOTE_MAX_W);
  ctx.font = `300 40px ${F_BODY}`;
  const cola = wrap(ctx, "y te decimos cuál es tu siguiente paso.", QUOTE_MAX_W);

  const CAPSULA_H = 132;
  const alto =
    pregunta.length * 100 + 76 +
    intro.length * 64 + 40 +
    CAPSULA_H + 56 +
    cola.length * 58;

  const bandaTop = SAFE_TOP + 120;
  const bandaBottom = STORY_H - SAFE_BOTTOM - 120;
  let y = bandaTop + (bandaBottom - bandaTop - alto) / 2;

  ctx.fillStyle = WHITE;
  ctx.font = `400 82px ${F_DISPLAY}`;
  for (const line of pregunta) {
    y += 100;
    drawCentered(ctx, line, cx, y, QUOTE_MAX_W);
  }
  y += 76;

  ctx.fillStyle = MUTED;
  ctx.font = `300 44px ${F_BODY}`;
  for (const line of intro) {
    y += 64;
    drawCentered(ctx, line, cx, y, QUOTE_MAX_W);
  }
  y += 40;

  // La palabra, en dorado y dentro de una cápsula: es la instrucción entera.
  ctx.font = `400 76px ${F_DISPLAY}`;
  const anchoPalabra = textWidth(ctx, palabra) + 44 * 2;
  ctx.fillStyle = "rgba(240,184,0,0.10)";
  ctx.strokeStyle = "rgba(240,184,0,0.55)";
  ctx.lineWidth = 2;
  roundedRect(ctx, cx - anchoPalabra / 2, y, anchoPalabra, CAPSULA_H, CAPSULA_H / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = GOLD;
  drawCentered(ctx, palabra, cx, y + 90, QUOTE_MAX_W);
  y += CAPSULA_H + 56;

  ctx.fillStyle = MUTED;
  ctx.font = `300 40px ${F_BODY}`;
  for (const line of cola) {
    y += 58;
    drawCentered(ctx, line, cx, y, QUOTE_MAX_W);
  }

  // Flechita hacia la caja de responder, que Instagram pinta justo debajo de
  // la zona segura. Señala dónde se escribe sin tener que decirlo.
  ctx.strokeStyle = "rgba(240,184,0,0.45)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 18, y + 62);
  ctx.lineTo(cx, y + 82);
  ctx.lineTo(cx + 18, y + 62);
  ctx.stroke();

  paintGrain(ctx);
}

// ─────────────────────────────────────────────────────────────────────────────
// La destacada de Método
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Las historias de la destacada de Método, en el orden en que se leen. El texto
 * sale de lib/metodo.ts, que es el mismo que pinta la sección Corazón de
 * Elefante de la web.
 */
export type MetodoCard =
  | { kind: "que-es" }
  | { kind: "cualidades" }
  | { kind: "fuerza"; i: number }
  | { kind: "remate" }
  | { kind: "cierre" };

export const METODO_CARDS: MetodoCard[] = [
  { kind: "que-es" },
  { kind: "cualidades" },
  ...FUERZAS.map((_, i) => ({ kind: "fuerza" as const, i })),
  { kind: "remate" },
  { kind: "cierre" },
];

/** Lo que se lee bajo cada tarjeta en el panel. */
export function metodoLabel(card: MetodoCard): string {
  if (card.kind === "que-es") return "Qué es el método";
  if (card.kind === "cualidades") return "Por qué un elefante";
  if (card.kind === "fuerza") return FUERZAS[card.i].kind;
  if (card.kind === "remate") return "Las tres etapas";
  return "Cierre · responder";
}

/** Trozo del nombre de archivo. */
export function metodoSlug(card: MetodoCard): string {
  if (card.kind === "fuerza") return `fuerza-${FUERZAS[card.i].brand}`;
  return card.kind;
}

/**
 * Cuerpo de letra más grande con el que el texto entra en un alto dado. A
 * diferencia de `fitIn`, que mide contra la caja fija de las tarjetas de reseña,
 * aquí el alto lo pone quien llama: cada tarjeta de Método tiene un hueco
 * distinto y se aprovecha entero.
 */
function fitEnAlto(
  ctx: CanvasRenderingContext2D,
  texto: string,
  maxH: number,
  desde: number,
  min: number
): { size: number; lineH: number; lines: string[] } {
  for (let size = desde; size >= min; size -= 2) {
    ctx.font = `300 ${size}px ${F_BODY}`;
    const lineH = lineHeightFor(size);
    const lines = wrap(ctx, texto, QUOTE_MAX_W);
    if (lines.length * lineH <= maxH) return { size, lineH, lines };
  }
  ctx.font = `300 ${min}px ${F_BODY}`;
  return {
    size: min,
    lineH: lineHeightFor(min),
    lines: wrap(ctx, texto, QUOTE_MAX_W),
  };
}

/**
 * Pinta un párrafo centrado en la banda libre, con el cuerpo más grande que
 * quepa en ella. Es el cuerpo de casi todas las tarjetas de Método. Devuelve la
 * línea base de la última línea, por si hay que seguir debajo.
 */
function drawParagraph(
  ctx: CanvasRenderingContext2D,
  texto: string,
  desde: number,
  top: number,
  bottom: number,
  color: string
): number {
  const ajuste = fitEnAlto(ctx, texto, bottom - top, desde, 30);
  const alto = ajuste.lines.length * ajuste.lineH;
  let y = top + (bottom - top - alto) / 2;
  ctx.fillStyle = color;
  ctx.font = `300 ${ajuste.size}px ${F_BODY}`;
  for (const line of ajuste.lines) {
    y += ajuste.lineH;
    drawCentered(ctx, line, STORY_W / 2, y, QUOTE_MAX_W);
  }
  return y;
}

/** Una historia de la destacada de Método. */
export async function renderMetodoCard(
  canvas: HTMLCanvasElement,
  card: MetodoCard,
  site: string
): Promise<void> {
  const ctx = ctxOf(canvas);
  paintBackground(ctx);
  ctx.textBaseline = "alphabetic";

  const cx = STORY_W / 2;
  const bandaTop = SAFE_TOP + 130;
  const bandaBottom = STORY_H - SAFE_BOTTOM - 120;

  if (card.kind === "que-es") {
    drawHeader(ctx, "EL MÉTODO", SAFE_TOP);
    ctx.fillStyle = WHITE;
    ctx.font = `400 92px ${F_DISPLAY}`;
    const titulo = wrap(ctx, METODO.nombre, QUOTE_MAX_W);
    let y = bandaTop + 40;
    for (const line of titulo) {
      y += 100;
      drawCentered(ctx, line, cx, y, QUOTE_MAX_W);
    }
    drawParagraph(ctx, METODO.queEs, 56, y + 70, bandaBottom, MUTED);
  }

  if (card.kind === "cualidades") {
    drawHeader(ctx, "POR QUÉ UN ELEFANTE", SAFE_TOP);

    // La frase de la web acaba en dos puntos; aquí también, y las cualidades
    // de abajo la completan igual que en la sección. Se mide todo antes para
    // centrar frase y lista como un solo bloque.
    const PASO = 100;
    const frase = fitEnAlto(ctx, METODO.porQue, 300, 48, 34);
    const alto =
      frase.lines.length * frase.lineH + 90 + CUALIDADES.length * PASO;
    let y = bandaTop + (bandaBottom - bandaTop - alto) / 2;

    ctx.fillStyle = WHITE;
    ctx.font = `300 ${frase.size}px ${F_BODY}`;
    for (const line of frase.lines) {
      y += frase.lineH;
      drawCentered(ctx, line, cx, y, QUOTE_MAX_W);
    }

    y += 90;
    ctx.font = `400 64px ${F_DISPLAY}`;
    ctx.fillStyle = GOLD;
    for (const c of CUALIDADES) {
      y += PASO;
      drawCentered(ctx, c, cx, y, QUOTE_MAX_W);
    }
  }

  if (card.kind === "fuerza") {
    const f = FUERZAS[card.i];
    // Las tres fuerzas van en dorado, igual que en la web: un color por fuerza
    // hacía que las tres compitieran entre sí.
    const color = GOLD;
    drawHeader(ctx, `LAS TRES FUERZAS · ${card.i + 1} DE 3`, SAFE_TOP);

    // Se mide todo primero y se centra como un solo bloque: si la cabecera va
    // anclada arriba y el cuerpo flotando abajo, queda un agujero en medio.
    const FUNCION_H = 30;
    const TITULO_H = 92;
    const LEAD_H = 62;

    ctx.font = `400 76px ${F_DISPLAY}`;
    const titulo = wrap(ctx, f.kind, QUOTE_MAX_W);
    ctx.font = `300 46px ${F_BODY}`;
    const lead = wrap(ctx, f.lead, QUOTE_MAX_W);

    const altoArriba =
      FUNCION_H + 66 + titulo.length * TITULO_H + 30 + lead.length * LEAD_H;
    const cuerpo = fitEnAlto(
      ctx, f.body, bandaBottom - bandaTop - altoArriba - 70, 48, 30
    );
    const alto = altoArriba + 70 + cuerpo.lines.length * cuerpo.lineH;

    let y = bandaTop + (bandaBottom - bandaTop - alto) / 2;

    // Qué hace en el motor: sentir, decidir o construir.
    y += FUNCION_H;
    ctx.fillStyle = color;
    ctx.font = `300 ${FUNCION_H}px ${F_BODY}`;
    tracked(ctx, f.funcion.toUpperCase(), cx, y, 8);
    y += 66;

    ctx.fillStyle = WHITE;
    ctx.font = `400 76px ${F_DISPLAY}`;
    for (const line of titulo) {
      y += TITULO_H;
      drawCentered(ctx, line, cx, y, QUOTE_MAX_W);
    }
    y += 30;

    ctx.fillStyle = color;
    ctx.font = `300 46px ${F_BODY}`;
    for (const line of lead) {
      y += LEAD_H;
      drawCentered(ctx, line, cx, y, QUOTE_MAX_W);
    }
    y += 70;

    ctx.fillStyle = MUTED;
    ctx.font = `300 ${cuerpo.size}px ${F_BODY}`;
    for (const line of cuerpo.lines) {
      y += cuerpo.lineH;
      drawCentered(ctx, line, cx, y, QUOTE_MAX_W);
    }
  }

  if (card.kind === "remate") {
    drawHeader(ctx, "EL MÉTODO", SAFE_TOP);
    ctx.fillStyle = WHITE;
    const ajuste = fitParaPintar(ctx, METODO.remate, "amplio", 62);
    const alto = ajuste.lines.length * ajuste.lineH;
    let y = bandaTop + (bandaBottom - bandaTop - alto) / 2 - 60;
    ctx.font = `300 ${ajuste.size}px ${F_BODY}`;
    for (const line of ajuste.lines) {
      y += ajuste.lineH;
      drawCentered(ctx, line, cx, y, QUOTE_MAX_W);
    }

    // Las tres etapas, nombradas, para que enlacen con las otras destacadas.
    y += 120;
    ctx.fillStyle = GOLD;
    ctx.font = `400 44px ${F_DISPLAY}`;
    tracked(ctx, "SENTIDO · MARCA · SISTEMA", cx, y, 5);
  }

  if (card.kind === "cierre") {
    drawHeader(ctx, "EL MÉTODO", SAFE_TOP);

    let y = bandaTop + 90;
    ctx.fillStyle = WHITE;
    ctx.font = `400 82px ${F_DISPLAY}`;
    for (const line of wrap(ctx, "¿En cuál estás hoy?", QUOTE_MAX_W)) {
      drawCentered(ctx, line, cx, y, QUOTE_MAX_W);
      y += 100;
    }

    y += 46;
    ctx.fillStyle = MUTED;
    ctx.font = `300 42px ${F_BODY}`;
    for (const line of wrap(ctx, "Responde a esta historia con la palabra", QUOTE_MAX_W)) {
      drawCentered(ctx, line, cx, y, QUOTE_MAX_W);
      y += 60;
    }

    // Las tres palabras, cada una en su cápsula: la instrucción entera.
    y += 40;
    const ALTO = 116;
    ctx.font = `400 60px ${F_DISPLAY}`;
    for (const palabra of ["SENTIDO", "MARCA", "SISTEMA"]) {
      const ancho = textWidth(ctx, palabra) + 40 * 2;
      ctx.fillStyle = "rgba(240,184,0,0.10)";
      ctx.strokeStyle = "rgba(240,184,0,0.55)";
      ctx.lineWidth = 2;
      roundedRect(ctx, cx - ancho / 2, y, ancho, ALTO, ALTO / 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = GOLD;
      drawCentered(ctx, palabra, cx, y + 78, QUOTE_MAX_W);
      y += ALTO + 22;
    }

    y += 50;
    ctx.fillStyle = MUTED;
    ctx.font = `300 38px ${F_BODY}`;
    for (const line of wrap(ctx, "y te decimos cuál es tu siguiente paso.", QUOTE_MAX_W)) {
      drawCentered(ctx, line, cx, y, QUOTE_MAX_W);
      y += 54;
    }

    // Flechita hacia la caja de responder que Instagram pinta debajo.
    ctx.strokeStyle = "rgba(240,184,0,0.45)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - 18, y + 40);
    ctx.lineTo(cx, y + 60);
    ctx.lineTo(cx + 18, y + 40);
    ctx.stroke();
  }

  drawFooter(ctx, site);
  paintGrain(ctx);
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
export type CoverId = Stage | "metodo";

/** Lo que dice cada portada: arriba pequeño, y el nombre grande debajo. */
const COVER_TEXT: Record<CoverId, { arriba: string; nombre: string }> = {
  sentido: { arriba: "EXPERIENCIAS", nombre: "SENTIDO" },
  marca: { arriba: "EXPERIENCIAS", nombre: "MARCA" },
  sistema: { arriba: "EXPERIENCIAS", nombre: "SISTEMA" },
  // La de Método no habla de experiencias: es la que explica cómo trabajamos.
  metodo: { arriba: "CORAZÓN DE ELEFANTE", nombre: "MÉTODO" },
};

export async function renderCover(
  canvas: HTMLCanvasElement,
  id: CoverId
): Promise<void> {
  const ctx = ctxOf(canvas);
  paintBackground(ctx);

  const cx = STORY_W / 2;
  const cy = STORY_H / 2;

  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "rgba(184,190,199,0.8)";
  ctx.font = `400 32px ${F_DISPLAY}`;
  tracked(ctx, COVER_TEXT[id].arriba, cx, cy - 130, 10);

  ctx.strokeStyle = "rgba(240,184,0,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 150, cy - 80);
  ctx.lineTo(cx + 150, cy - 80);
  ctx.stroke();

  ctx.fillStyle = GOLD;
  ctx.font = `400 120px ${F_DISPLAY}`;
  tracked(ctx, COVER_TEXT[id].nombre, cx, cy + 60, 6);

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
