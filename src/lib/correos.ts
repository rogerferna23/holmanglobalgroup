import { createContext, useCallback, useContext } from "react";
import { getSupabase } from "@/lib/supabase";

/**
 * Torre → Correos: email marketing con Resend. Todo pasa por la función
 * `admin-correos` (la clave de Resend nunca llega al navegador). Aquí viven los
 * tipos, la llamada y las plantillas que arman el HTML del correo.
 *
 * Los correos del club (bienvenida, avisos, recordatorios) son aparte y no se
 * tocan desde aquí.
 */

export type Segmento = { id: string; name: string; created_at: string };
export type Contacto = {
  id: string; email: string; first_name: string | null; last_name: string | null;
  created_at: string; unsubscribed: boolean; segmentos: string[]; bloqueado: boolean;
};
export type Envio = {
  id: string; name: string; segment_id: string; status: string;
  created_at: string; scheduled_at: string | null; sent_at: string | null;
};
export type Bloqueado = { email: string; motivo: string | null; created_at: string };

// Cada acción devuelve su propio objeto; si algo falla, la promesa se rechaza con el mensaje.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LlamarCorreos = <T = any>(accion: string, datos?: Record<string, unknown>) => Promise<T>;

/** En la vista previa de desarrollo, las respuestas salen de aquí. */
export const CorreosMockContext = createContext<LlamarCorreos | null>(null);

export function useCorreosApi(): LlamarCorreos {
  const mock = useContext(CorreosMockContext);
  const real = useCallback<LlamarCorreos>(async (accion, datos = {}) => {
    const { data, error } = await getSupabase().functions.invoke("admin-correos", { body: { accion, ...datos } });
    if (error) {
      // supabase-js esconde el cuerpo de la respuesta en error.context.
      let msg = error.message;
      try {
        const ctx = (error as { context?: Response }).context;
        const body = ctx ? await ctx.json() : null;
        if (body?.error) msg = body.error;
      } catch { /* sin cuerpo */ }
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);
  return mock ?? real;
}

export const ESTADO_ENVIO: Record<string, string> = {
  draft: "Borrador", queued: "En cola", scheduled: "Programado", sending: "Enviando", sent: "Enviado", canceled: "Cancelado",
};

// ── Plantillas ──────────────────────────────────────────────────────────────

export type Plantilla = "carta" | "bitacora" | "html";

export const PLANTILLAS: { id: Plantilla; label: string; nota: string }[] = [
  { id: "carta", label: "Carta", nota: "Fondo blanco, casi solo texto, botón dorado. La que mejor llega a la bandeja principal." },
  { id: "bitacora", label: "Bitácora del Elefante", nota: "Boletín de marca, fondo oscuro con dorado. Para noticias y contenido." },
  { id: "html", label: "HTML propio", nota: "Pegas el HTML completo (debe llevar {{{RESEND_UNSUBSCRIBE_URL}}})." },
];

export type Borrador = {
  plantilla: Plantilla;
  segmento: string;
  asunto: string;
  /** Texto que se ve junto al asunto en la bandeja. */
  preheader: string;
  saludo: boolean;
  etiqueta: string;
  titulo: string;
  cuerpo: string;
  boton: string;
  enlace: string;
  despedida: string;
  htmlPropio: string;
};

export const BORRADOR_VACIO: Borrador = {
  plantilla: "carta", segmento: "", asunto: "", preheader: "", saludo: true,
  etiqueta: "", titulo: "", cuerpo: "", boton: "", enlace: "",
  despedida: "Un abrazo,\nHolman", htmlPropio: "",
};

const SITIO = "https://holmanglobalgroup.com";
/** El nombre de cada persona lo pone Resend al enviar; si no lo tiene, queda vacío. */
const NOMBRE = "{{{FIRST_NAME|}}}";
const BAJA = "{{{RESEND_UNSUBSCRIBE_URL}}}";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

/** Enlaces al sitio con UTM, para saber en el admin qué trajo cada correo. */
export function conUtm(url: string, campana: string) {
  try {
    const u = new URL(url);
    if (!/holmanglobalgroup\.com$/.test(u.hostname) || u.searchParams.has("utm_source")) return url;
    u.searchParams.set("utm_source", "email");
    u.searchParams.set("utm_medium", "email");
    u.searchParams.set("utm_campaign", slug(campana) || "correo");
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Texto a párrafos. Línea en blanco = párrafo nuevo; **así** = negrita;
 * línea que empieza con «> » = frase destacada; las URL se vuelven enlace.
 */
function parrafos(texto: string, estilos: { p: string; frase: string; enlace: string }, campana: string) {
  return texto
    .trim()
    .split(/\n\s*\n/)
    .filter((b) => b.trim())
    .map((bloque) => {
      const frase = bloque.trim().startsWith(">");
      const limpio = frase ? bloque.trim().replace(/^>\s?/gm, "") : bloque.trim();
      const html = esc(limpio)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${conUtm(u.replace(/&amp;/g, "&"), campana).replace(/&/g, "&amp;")}" style="${estilos.enlace}">${u}</a>`)
        .replace(/\n/g, "<br>");
      return `<p style="${frase ? estilos.frase : estilos.p}">${html}</p>`;
    })
    .join("\n");
}

function preheaderHtml(t: string) {
  if (!t.trim()) return "";
  // Oculto en el cuerpo; los espacios de relleno evitan que la bandeja muestre el resto.
  return `<div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:transparent; opacity:0;">${esc(t)}${"&#847; &zwnj; &nbsp; ".repeat(30)}</div>`;
}

const despedidaHtml = (t: string) => esc(t.trim()).replace(/\n/g, "<br>");

function carta(b: Borrador) {
  const f = "font-family: Arial, Helvetica, sans-serif;";
  const p = `margin:0 0 18px 0; ${f}`;
  const cuerpo = parrafos(b.cuerpo, {
    p,
    frase: `margin:0 0 18px 0; padding-left:14px; border-left:3px solid #F0B800; font-style:italic; color:#111827; ${f}`,
    enlace: "color:#0B1016; text-decoration:underline;",
  }, b.asunto);
  const boton = b.boton.trim() && b.enlace.trim()
    ? `<p style="margin:28px 0 28px 0;"><a href="${esc(conUtm(b.enlace.trim(), b.asunto))}" style="display:inline-block; background-color:#F0B800; color:#0B1016; padding:14px 36px; border-radius:999px; font-weight:bold; font-size:15px; text-decoration:none; ${f}">${esc(b.boton.trim())}</a></p>`
    : "";
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(b.asunto)}</title></head>
<body style="margin:0; padding:0; background-color:#ffffff; ${f}">
${preheaderHtml(b.preheader)}
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding: 32px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%;">
        <tr>
          <td style="font-size:16px; line-height:1.7; color:#1f2933; ${f}">
${b.saludo ? `            <p style="${p}">Hola, ${NOMBRE}:</p>\n` : ""}${b.titulo.trim() ? `            <p style="margin:0 0 18px 0; font-size:20px; font-weight:bold; color:#0B1016; ${f}">${esc(b.titulo.trim())}</p>\n` : ""}${cuerpo}
${boton}
            <p style="margin:0 0 32px 0; ${f}">${despedidaHtml(b.despedida)}</p>
            <p style="margin:0; font-size:12px; line-height:1.6; color:#8a95a3; ${f}">Holman Global Group · <a href="${BAJA}" style="color:#8a95a3;">Darme de baja</a></p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function bitacora(b: Borrador) {
  const f = "font-family:'Josefin Sans', Arial, sans-serif;";
  const q = "font-family:'Questrial', Arial, sans-serif;";
  const p = `margin:0 0 20px 0; font-size:15px; color:#c5d0d8; line-height:1.85; ${f} font-weight:300;`;
  const cuerpo = parrafos(b.cuerpo, {
    p,
    frase: `margin:0 0 20px 0; font-size:16px; color:#ffffff; line-height:1.8; ${q} font-style:italic;`,
    enlace: "color:#F0B800; text-decoration:underline;",
  }, b.asunto);
  const etiqueta = b.etiqueta.trim() || "La Bitácora del Elefante";
  const boton = b.boton.trim() && b.enlace.trim()
    ? `<p style="margin:12px 0 32px 0;"><a href="${esc(conUtm(b.enlace.trim(), b.asunto))}" style="display:inline-block; background-color:#F0B800; color:#0B1016; padding:14px 34px; border-radius:999px; font-weight:600; font-size:14px; letter-spacing:0.5px; text-decoration:none; ${f}">${esc(b.boton.trim())}</a></p>`
    : "";
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(b.asunto)}</title>
<link href="https://fonts.googleapis.com/css2?family=Questrial&family=Josefin+Sans:wght@300;400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0; padding:0; background-color:#060c12; ${f}">
${preheaderHtml(b.preheader)}
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#060c12;" bgcolor="#060c12">
  <tr>
    <td align="center" style="padding: 32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%;">
        <tr>
          <td align="center" bgcolor="#0B1016" style="background-color:#0B1016; padding: 32px 32px 24px 32px; border-top: 3px solid #F0B800;">
            <img src="${SITIO}/logo-elefante.png" alt="Holman Global Group" width="72" height="72" style="display:block; margin:0 auto 10px auto;">
            <p style="margin:0; font-size:10px; letter-spacing:5px; color:#F0B800; text-transform:uppercase; ${f}">${esc(etiqueta)}</p>
          </td>
        </tr>
        <tr><td bgcolor="#F0B800" style="background-color:#F0B800; height:2px; font-size:0; line-height:0;">&nbsp;</td></tr>
        <tr>
          <td bgcolor="#0B1016" style="background-color:#0B1016; padding: 36px 40px;">
${b.titulo.trim() ? `            <h1 style="margin:0 0 20px 0; font-size:24px; font-weight:400; color:#ffffff; line-height:1.4; ${q}">${esc(b.titulo.trim())}</h1>\n            <div style="width:40px; height:2px; background-color:#F0B800; margin-bottom:24px;"></div>\n` : ""}${b.saludo ? `            <p style="${p}">Hola, ${NOMBRE}:</p>\n` : ""}${cuerpo}
${boton}
            <p style="margin:0; font-size:15px; color:#ffffff; line-height:1.7; ${f}">${despedidaHtml(b.despedida)}</p>
          </td>
        </tr>
        <tr><td bgcolor="#F0B800" style="background-color:#F0B800; height:1px; font-size:0; line-height:0;">&nbsp;</td></tr>
        <tr>
          <td align="center" bgcolor="#060c12" style="background-color:#060c12; padding:28px 32px; text-align:center;">
            <p style="margin:0 0 18px 0; line-height:2.2;">
              <a href="https://www.instagram.com/holmanglobalgroup" style="color:#b0bec5; text-decoration:none; font-size:11px; ${f} margin:0 8px; letter-spacing:1px;">Instagram</a>
              <span style="color:#F0B800;">·</span>
              <a href="https://www.linkedin.com/in/holman-orjuela-a1b586225" style="color:#b0bec5; text-decoration:none; font-size:11px; ${f} margin:0 8px; letter-spacing:1px;">LinkedIn</a>
              <span style="color:#F0B800;">·</span>
              <a href="${conUtm(SITIO, b.asunto)}" style="color:#b0bec5; text-decoration:none; font-size:11px; ${f} margin:0 8px; letter-spacing:1px;">Web</a>
            </p>
            <p style="margin:0 0 6px 0; font-size:11px; color:#5a6a7a; ${f} line-height:1.6;">Holman Global Group LLC · 30 N Gould St Ste N, Sheridan, WY · United States</p>
            <p style="margin:0; font-size:11px; ${f}"><a href="${BAJA}" style="color:#5a6a7a; text-decoration:underline;">Darme de baja</a></p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function armarHtml(b: Borrador): string {
  if (b.plantilla === "html") return b.htmlPropio;
  return b.plantilla === "bitacora" ? bitacora(b) : carta(b);
}

/** Lo que se ve en la vista previa: el nombre de ejemplo y la baja sin destino. */
export function paraVistaPrevia(html: string, nombre = "Holman") {
  return html
    .replace(/\{\{\{\s*(?:FIRST_NAME|contact\.first_name)\s*(?:\|[^}]*)?\}\}\}/g, esc(nombre))
    .replace(/\{\{\{\s*RESEND_UNSUBSCRIBE_URL\s*\}\}\}/g, "#");
}

/** Lo que falta para poder enviar. Vacío = listo. */
export function faltantes(b: Borrador, html: string): string[] {
  const f: string[] = [];
  if (!b.segmento) f.push("la lista");
  if (!b.asunto.trim()) f.push("el asunto");
  if (b.plantilla === "html" ? !b.htmlPropio.trim() : !b.cuerpo.trim()) f.push("el texto");
  if (b.boton.trim() && !b.enlace.trim()) f.push("el enlace del botón");
  if (!/RESEND_UNSUBSCRIBE_URL/.test(html)) f.push("el enlace de baja");
  return f;
}
