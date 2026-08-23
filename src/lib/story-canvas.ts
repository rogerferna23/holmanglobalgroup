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
 * Busca el cuerpo de letra más grande con el que la cita entra en el alto
 * disponible. Una reseña de dos frases se ve grande y una de diez sigue
 * cabiendo, sin tener que tocar nada a mano.
 */
function fitQuote(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  maxH: number
): { size: number; lineH: number; lines: string[] } {
  for (let size = 58; size >= 30; size -= 2) {
    ctx.font = `300 ${size}px ${F_BODY}`;
    const lineH = Math.round(size * 1.45);
    const lines = wrap(ctx, text, maxW);
    if (lines.length * lineH <= maxH) return { size, lineH, lines };
  }
  const size = 30;
  ctx.font = `300 ${size}px ${F_BODY}`;
  const lineH = Math.round(size * 1.45);
  return { size, lineH, lines: wrap(ctx, text, maxW) };
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
 * Pinta una reseña como historia de 1080×1920, de arriba abajo: etiqueta de
 * etapa, comilla, cita, estrellas, foto, nombre y cargo, y el cierre con el
 * dominio. El bloque central se centra en el hueco entre la etiqueta y la
 * ficha de la persona, así una reseña corta no queda flotando arriba.
 */
export async function renderStory(
  canvas: HTMLCanvasElement,
  review: StoryReview,
  site: string
): Promise<void> {
  const ctx = ctxOf(canvas);
  const photo = await loadPhoto(review.photoUrl);

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
    SAFE_TOP,
    7
  );

  // Línea dorada corta bajo la etiqueta.
  ctx.strokeStyle = "rgba(240,184,0,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(STORY_W / 2 - 40, SAFE_TOP + 34);
  ctx.lineTo(STORY_W / 2 + 40, SAFE_TOP + 34);
  ctx.stroke();

  // Ficha de la persona, anclada abajo: foto, nombre, cargo.
  // El pie se apila de abajo arriba: dominio, hairline, cargo, nombre y foto.
  // Las distancias son fijas para que el cargo nunca caiga sobre la línea.
  const footY = STORY_H - SAFE_BOTTOM;
  const avatarR = 84;
  const avatarCY = footY - 340;

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
    ctx.font = `400 64px ${F_DISPLAY}`;
    ctx.textAlign = "center";
    ctx.fillText(initialsOf(review.name), STORY_W / 2, avatarCY + 22);
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
  ctx.fillText(review.name, STORY_W / 2, avatarCY + avatarR + 76);

  if (review.role) {
    ctx.fillStyle = MUTED;
    ctx.font = `300 32px ${F_BODY}`;
    ctx.fillText(review.role, STORY_W / 2, avatarCY + avatarR + 126);
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
  const blockTop = SAFE_TOP + 100;
  const blockBottom = avatarCY - avatarR - 90;
  const maxW = STORY_W - SIDE * 2;

  const starsH = 90;
  const markH = 110;
  const { size, lineH, lines } = fitQuote(
    ctx, `“${review.quote.trim()}”`, maxW, blockBottom - blockTop - starsH - markH
  );

  const quoteH = lines.length * lineH;
  const totalH = markH + quoteH + starsH;
  let y = blockTop + (blockBottom - blockTop - totalH) / 2;

  // Comilla decorativa.
  ctx.fillStyle = "rgba(240,184,0,0.22)";
  ctx.font = `400 150px ${F_BODY}`;
  ctx.textAlign = "center";
  ctx.fillText("“", STORY_W / 2, y + 100);
  y += markH;

  // Vuelta a la letra de la cita: la comilla decorativa se pinta con la de
  // display a 150px y, si no se restaura aquí, el texto sale con ese cuerpo.
  ctx.font = `300 ${size}px ${F_BODY}`;
  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  for (const line of lines) {
    y += lineH;
    ctx.fillText(line, STORY_W / 2, y);
  }

  drawStars(ctx, STORY_W / 2, y + starsH / 2 + 26, review.rating);

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
