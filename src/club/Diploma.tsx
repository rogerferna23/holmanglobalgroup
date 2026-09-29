import { useEffect, useState } from "react";

/**
 * Diploma de reconocimiento de ECOS, dibujado en el navegador (canvas) con los
 * colores y las fuentes de la marca. Sale como imagen vertical 1080×1350, el
 * formato que Instagram muestra más grande, para que la persona lo suba a redes.
 */

export type Hito = { meses: number; titulo: string; texto: string };

/** Los reconocimientos que existen. Para sumar uno nuevo basta con agregarlo aquí. */
export const HITOS: Hito[] = [
  {
    meses: 2,
    titulo: "Dos meses en ECOS",
    texto: "por completar sus primeros dos meses de formación en ventas, marketing y oratoria en ECOS Business Club.",
  },
];

const ORO = "#F0B800";
const FONDO = "#0B1016";
const BLANCO = "#FFFFFF";
const GRIS = "#B8BEC7";

function cargarImagen(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

/** Parte un texto en renglones que quepan en `ancho`. */
function renglones(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string[] {
  const out: string[] = [];
  let linea = "";
  for (const palabra of texto.split(" ")) {
    const prueba = linea ? `${linea} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > ancho && linea) { out.push(linea); linea = palabra; } else linea = prueba;
  }
  if (linea) out.push(linea);
  return out;
}

function espaciado(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, sep: number) {
  // Texto centrado con letras separadas (canvas no tiene letter-spacing en todos los navegadores).
  const ancho = [...texto].reduce((a, c) => a + ctx.measureText(c).width + sep, -sep);
  let cx = x - ancho / 2;
  for (const c of texto) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + sep; }
}

export async function dibujarDiploma(nombre: string, fecha: string, hito: Hito): Promise<string> {
  const W = 1080, H = 1350;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;

  // Las fuentes del sitio: si no se cargan, el canvas usa las de respaldo.
  try {
    await Promise.all([
      document.fonts.load(`88px Questrial`),
      document.fonts.load(`30px "Josefin Sans"`),
      document.fonts.load(`600 24px "Josefin Sans"`),
    ]);
  } catch { /* sigue con las de respaldo */ }
  const DISPLAY = `Questrial, "Helvetica Neue", Arial, sans-serif`;
  const CUERPO = `"Josefin Sans", "Helvetica Neue", Arial, sans-serif`;

  // Fondo con un brillo dorado suave arriba.
  ctx.fillStyle = FONDO;
  ctx.fillRect(0, 0, W, H);
  const brillo = ctx.createRadialGradient(W / 2, 260, 20, W / 2, 260, 700);
  brillo.addColorStop(0, "rgba(240,184,0,0.16)");
  brillo.addColorStop(1, "rgba(240,184,0,0)");
  ctx.fillStyle = brillo;
  ctx.fillRect(0, 0, W, H);

  // Doble marco dorado.
  ctx.strokeStyle = ORO;
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 44, W - 88, H - 88);
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1;
  ctx.strokeRect(62, 62, W - 124, H - 124);
  ctx.globalAlpha = 1;

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Logo de ECOS.
  const logo = await cargarImagen("/ecos-placa.png");
  if (logo) ctx.drawImage(logo, W / 2 - 75, 130, 150, 150);

  ctx.fillStyle = ORO;
  ctx.font = `600 22px ${CUERPO}`;
  espaciado(ctx, "ECOS · BUSINESS CLUB", W / 2, 336, 7);

  ctx.textAlign = "center";
  ctx.fillStyle = BLANCO;
  ctx.font = `64px ${DISPLAY}`;
  ctx.fillText("Reconocimiento", W / 2, 450);

  ctx.fillStyle = GRIS;
  ctx.font = `28px ${CUERPO}`;
  ctx.fillText(hito.titulo, W / 2, 500);

  ctx.fillStyle = ORO;
  ctx.fillRect(W / 2 - 70, 540, 140, 2);

  ctx.fillStyle = GRIS;
  ctx.font = `30px ${CUERPO}`;
  ctx.fillText("Otorgado a", W / 2, 630);

  // El nombre, tan grande como quepa.
  let tam = 92;
  ctx.font = `${tam}px ${DISPLAY}`;
  while (ctx.measureText(nombre).width > W - 220 && tam > 44) { tam -= 4; ctx.font = `${tam}px ${DISPLAY}`; }
  ctx.fillStyle = BLANCO;
  ctx.fillText(nombre, W / 2, 745);
  const anchoNombre = Math.min(ctx.measureText(nombre).width + 60, W - 200);
  ctx.fillStyle = ORO;
  ctx.fillRect(W / 2 - anchoNombre / 2, 780, anchoNombre, 2);

  ctx.fillStyle = GRIS;
  ctx.font = `32px ${CUERPO}`;
  renglones(ctx, hito.texto, 820).forEach((l, i) => ctx.fillText(l, W / 2, 860 + i * 48));

  ctx.fillStyle = BLANCO;
  ctx.font = `28px ${CUERPO}`;
  ctx.fillText(fecha, W / 2, 1040);

  // Firma.
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(W / 2 - 150, 1130, 300, 1);
  ctx.fillStyle = BLANCO;
  ctx.font = `34px ${DISPLAY}`;
  ctx.fillText("Holman Orjuela", W / 2, 1180);
  ctx.fillStyle = ORO;
  ctx.font = `600 18px ${CUERPO}`;
  ctx.textAlign = "left";
  espaciado(ctx, "FUNDADOR · HOLMAN GLOBAL GROUP", W / 2, 1216, 4);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(184,190,199,0.7)";
  ctx.font = `22px ${CUERPO}`;
  ctx.fillText("holmanglobalgroup.com/ecos", W / 2, 1270);

  return c.toDataURL("image/png");
}

/** Tarjeta del diploma: vista previa, descargar y compartir. */
export function TarjetaDiploma({ nombre, fecha, hito }: { nombre: string; fecha: string; hito: Hito }) {
  const [src, setSrc] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void dibujarDiploma(nombre, fecha, hito).then((u) => { if (vivo) setSrc(u); });
    return () => { vivo = false; };
  }, [nombre, fecha, hito]);

  const archivo = `diploma-ecos-${hito.meses}-meses.png`;

  function descargar() {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = archivo;
    a.click();
  }

  async function compartir() {
    if (!src) return;
    setMsg(null);
    try {
      const blob = await (await fetch(src)).blob();
      const file = new File([blob], archivo, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: "Cumplí dos meses en ECOS Business Club 🎓 holmanglobalgroup.com/ecos" });
      } else {
        descargar();
        setMsg("Lo descargamos: súbelo desde tu galería a tus redes.");
      }
    } catch {
      /* la persona cerró el menú de compartir */
    }
  }

  return (
    <div className="club-diploma">
      {src ? <img src={src} alt={`Diploma de ${nombre}: ${hito.titulo}`} /> : <div className="club-diploma-cargando">Preparando tu diploma…</div>}
      <div className="club-diploma-acciones">
        <button type="button" className="club-btn small" onClick={compartir} disabled={!src}>Compartir</button>
        <button type="button" className="club-link-btn" onClick={descargar} disabled={!src}>Descargar imagen</button>
      </div>
      {msg && <p className="club-muted">{msg}</p>}
    </div>
  );
}
