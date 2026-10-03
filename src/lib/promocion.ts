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

/** Las piezas que vienen con el sitio: siempre hay algo para compartir. */
export const PROMO_BASE: EcosPromo[] = [
  { id: "base-ecos-45", tipo: "flyer", titulo: "ECOS · publicación (4:5)", texto: TEXTO_ECOS, file_path: null, file_name: "ecos-publicacion.jpg", url: "/promo/ecos-vertical-4x5.jpg", orden: -3, created_at: "2026-10-01T00:00:00Z" },
  { id: "base-ecos-916", tipo: "flyer", titulo: "ECOS · estados e historias (9:16)", texto: TEXTO_ECOS, file_path: null, file_name: "ecos-historia.jpg", url: "/promo/ecos-story-9x16.jpg", orden: -2, created_at: "2026-10-01T00:00:00Z" },
  { id: "base-ecos-11", tipo: "flyer", titulo: "ECOS · cuadrado (1:1)", texto: TEXTO_ECOS, file_path: null, file_name: "ecos-cuadrado.jpg", url: "/promo/ecos-cuadrado-1x1.jpg", orden: -1, created_at: "2026-10-01T00:00:00Z" },
];

/** El enlace del club de un embajador: la página de ECOS con su código. */
export function enlaceClub(code: string | null | undefined): string {
  const c = (code ?? "").trim();
  return `${SITE.url}/ecos${c ? `?ref=${encodeURIComponent(c)}` : ""}`;
}

/** WhatsApp con la invitación al club y el enlace del embajador, listo para reenviar. */
export function compartirClub(code: string): string {
  return `https://wa.me/?text=${encodeURIComponent(textoParaPublicar(TEXTO_ECOS, enlaceClub(code)))}`;
}

/** El texto listo para publicar: con el enlace donde dice «{enlace}», o al final. */
export function textoParaPublicar(texto: string | null, enlace: string): string {
  const t = (texto ?? "").trim();
  if (!t) return enlace;
  return t.includes("{enlace}") ? t.split("{enlace}").join(enlace) : `${t}\n\n${enlace}`;
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
