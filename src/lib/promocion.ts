/**
 * Material de promoción de los embajadores: las piezas fijas que vienen con el
 * sitio (public/promo) más las que sube Holman desde el admin (tabla ecos_promo
 * y bucket público ecos-promo). Cada pieza trae un texto sugerido que se arma
 * con el enlace de quien la comparte.
 */
import { SITE } from "@/lib/config";
import { getSupabase } from "@/lib/supabase";
import type { EcosPromo } from "@/lib/ecos";

/** Texto sugerido para presentar el club. «{enlace}» va con el de cada embajador. */
const TEXTO_ECOS =
  "¿Quieres vender mejor, comunicar tu mensaje con claridad y hablar con seguridad? Te invito a ECOS Business Club: clases en vivo cada semana, con práctica real y una comunidad de profesionales que se apoyan. Conócelo aquí 👉 {enlace}";

/** «{enlace_masterclass}» y «{enlace_claridad}» van con el código de cada embajador. */
const TEXTO_MASTERCLASS =
  "¿Sabes hacer algo valioso y todavía no te está generando los ingresos que merece? Este lunes 2 de noviembre a las 8 p. m. (hora de Colombia) hay una masterclass gratuita y en vivo con Holman Orjuela: «Cómo generar ingresos con negocios digitales». Reserva tu lugar gratis aquí 👉 {enlace_masterclass}";
const TEXTO_SENTIDO =
  "¿Sientes que es momento de darle un nuevo rumbo a tu vida o a tu negocio? El Programa Sentido te acompaña a encontrar claridad y convertirla en un plan. Empieza con una Sesión de Claridad gratis de 30 minutos con Holman o alguien de su equipo 👉 {enlace_claridad}";
const TEXTO_MARCA =
  "¿Tu marca muestra todo lo que vales? Marca con Huella construye una marca rentable desde tu historia: mensaje, oferta, imagen y página. Agenda tu Sesión de Claridad gratis con Holman o alguien de su equipo 👉 {enlace_claridad}";

/** Después de la masterclass del 2 de nov (8 p. m. Bogotá) sus piezas se ocultan solas. */
const FIN_MASTERCLASS = "2026-11-03T03:00:00Z";

/** Las piezas que vienen con el sitio: siempre hay algo para compartir. */
export const PROMO_BASE: EcosPromo[] = [
  { id: "base-ecos-45", tipo: "flyer", titulo: "ECOS · publicación (4:5)", texto: TEXTO_ECOS, file_path: null, file_name: "ecos-publicacion.jpg", url: "/promo/ecos-vertical-4x5.jpg", orden: -3, created_at: "2026-10-01T00:00:00Z" },
  { id: "base-ecos-916", tipo: "flyer", titulo: "ECOS · estados e historias (9:16)", texto: TEXTO_ECOS, file_path: null, file_name: "ecos-historia.jpg", url: "/promo/ecos-story-9x16.jpg", orden: -2, created_at: "2026-10-01T00:00:00Z" },
  { id: "base-ecos-11", tipo: "flyer", titulo: "ECOS · cuadrado (1:1)", texto: TEXTO_ECOS, file_path: null, file_name: "ecos-cuadrado.jpg", url: "/promo/ecos-cuadrado-1x1.jpg", orden: -1, created_at: "2026-10-01T00:00:00Z" },
  { id: "base-mc-45", tipo: "flyer", titulo: "Masterclass 2 nov · publicación (4:5)", texto: TEXTO_MASTERCLASS, file_path: null, file_name: "masterclass-2-nov.jpg", url: "/promo/masterclass-2nov-4x5.jpg", orden: -6, created_at: "2026-10-28T00:00:00Z", hasta: FIN_MASTERCLASS },
  { id: "base-mc-916", tipo: "flyer", titulo: "Masterclass 2 nov · estados e historias (9:16)", texto: TEXTO_MASTERCLASS, file_path: null, file_name: "masterclass-2-nov-historia.jpg", url: "/promo/masterclass-2nov-9x16.jpg", orden: -5, created_at: "2026-10-28T00:00:00Z", hasta: FIN_MASTERCLASS },
  { id: "base-mc-video", tipo: "video", titulo: "Masterclass 2 nov · video (9:16)", texto: TEXTO_MASTERCLASS, file_path: null, file_name: "masterclass-2-nov.mp4", url: "/promo/masterclass-2nov-9x16.mp4", orden: -6, created_at: "2026-10-28T00:00:00Z", hasta: FIN_MASTERCLASS },
  { id: "base-sentido-video", tipo: "video", titulo: "Programa Sentido · video (9:16)", texto: TEXTO_SENTIDO, file_path: null, file_name: "programa-sentido.mp4", url: "/promo/sentido-9x16.mp4", orden: -5, created_at: "2026-10-28T00:00:00Z" },
  { id: "base-marca-video", tipo: "video", titulo: "Marca con Huella · video (9:16)", texto: TEXTO_MARCA, file_path: null, file_name: "marca-con-huella.mp4", url: "/promo/marca-con-huella-9x16.mp4", orden: -4, created_at: "2026-10-28T00:00:00Z" },
];

/** Las piezas que todavía se muestran (las de una fecha pasada se ocultan). */
export function vigente(p: EcosPromo, ahora = Date.now()): boolean {
  return !p.hasta || Date.parse(p.hasta) > ahora;
}

/** El enlace del club de un embajador: la página de ECOS con su código. */
export function enlaceClub(code: string | null | undefined): string {
  const c = (code ?? "").trim();
  return `${SITE.url}/ecos${c ? `?ref=${encodeURIComponent(c)}` : ""}`;
}

/** WhatsApp con la invitación al club y el enlace del embajador, listo para reenviar. */
export function compartirClub(code: string): string {
  return `https://wa.me/?text=${encodeURIComponent(textoParaPublicar(TEXTO_ECOS, enlaceClub(code)))}`;
}

/**
 * El texto listo para publicar: con el enlace donde dice «{enlace}», o al final.
 * Con el código, también «{enlace_masterclass}» y «{enlace_claridad}» (para las
 * piezas que no llevan al club).
 */
export function textoParaPublicar(texto: string | null, enlace: string, code?: string | null): string {
  let t = (texto ?? "").trim();
  if (!t) return enlace;
  const c = encodeURIComponent((code ?? "").trim());
  const propios: [string, string][] = [
    ["{enlace_masterclass}", `${SITE.url}/masterclass${c ? `?by=${c}` : ""}`],
    ["{enlace_claridad}", `${SITE.url}/agendar${c ? `?ref=${c}` : ""}`],
  ];
  let conEnlace = false;
  for (const [marca, url] of propios) {
    if (t.includes(marca)) { t = t.split(marca).join(url); conEnlace = true; }
  }
  if (t.includes("{enlace}")) return t.split("{enlace}").join(enlace);
  return conEnlace ? t : `${t}\n\n${enlace}`;
}

/** Dónde está el archivo: en el sitio, en el bucket público o un enlace externo. */
export function urlDePromo(p: EcosPromo): string {
  if (p.file_path) return getSupabase().storage.from("ecos-promo").getPublicUrl(p.file_path).data.publicUrl;
  return p.url ?? "";
}

/** ¿Es un archivo que se puede descargar (y no un enlace a YouTube, Drive…)? */
export function esDescargable(p: EcosPromo): boolean {
  return !!p.file_path || (p.url ?? "").startsWith("/");
}

/** Descarga el archivo con su nombre, también desde el bucket (otro dominio). */
export async function descargarPromo(p: EcosPromo): Promise<void> {
  const url = urlDePromo(p);
  const nombre = p.file_name || url.split("/").pop() || "ecos";
  try {
    const blob = await (await fetch(url)).blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

/** En el celular: abre «compartir» con el archivo y el texto (Instagram, WhatsApp…). */
export async function compartirPromo(p: EcosPromo, texto: string): Promise<"compartido" | "no-soportado"> {
  try {
    const url = urlDePromo(p);
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], p.file_name || "ecos", { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: texto });
      return "compartido";
    }
  } catch (e) {
    // Cerró el menú de compartir: no es un error, no se descarga nada.
    if (e instanceof DOMException && e.name === "AbortError") return "compartido";
  }
  return "no-soportado";
}

/** El enlace de la tienda de un embajador: el catálogo de HGG con su código. */
export function enlaceTienda(code: string | null | undefined): string {
  const c = (code ?? "").trim();
  return `${SITE.url}/tienda${c ? `?ref=${encodeURIComponent(c)}` : ""}`;
}

/** WhatsApp con la invitación a la tienda y el enlace del embajador. */
export function compartirTienda(code: string): string {
  const texto = `Aquí puedes ver lo que ofrece Holman Global Group (coaching, marca, web y sistemas) y escoger lo que te sirve: ${enlaceTienda(code)}`;
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}
