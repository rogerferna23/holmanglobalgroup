/**
 * Piezas que comparten los tests de coach (autodescubrimiento y patrón del
 * dinero): el PDF, el radar del informe y los bloques de la pantalla.
 * Los estilos viven en test-autodescubrimiento.css (prefijo .tad-).
 */

/**
 * Genera el PDF en el navegador: fotografía cada hoja tal cual se ve en
 * pantalla (html2canvas) y la pone en una página A4 (jsPDF). Así el archivo
 * sale idéntico a la vista previa, sin depender del diálogo de impresión.
 *
 * Todas las hojas se fotografían de UNA vez y luego se recortan. Fotografiarlas
 * por separado hacía que, en algunos navegadores (Safari), la 2.ª y la 3.ª
 * salieran sin estilos: logo gigante y texto oscuro sobre fondo oscuro.
 */
export async function descargarInformePdf(nombreArchivo: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  await document.fonts.ready;
  const informe = document.querySelector<HTMLElement>(".tad-print-root .tad-informe");
  if (!informe) throw new Error("No se encontró el informe");
  const nHojas = informe.querySelectorAll(".tad-hoja").length;
  const todo = await html2canvas(informe, {
    scale: 2,
    backgroundColor: "#0B1016",
    useCORS: true,
    logging: false,
    // La copia interna del documento debe ser tan alta como todas las hojas.
    windowWidth: Math.max(window.innerWidth, informe.scrollWidth),
    windowHeight: Math.max(window.innerHeight, informe.scrollHeight),
  });
  const altoHoja = todo.height / nHojas;
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  for (let i = 0; i < nHojas; i++) {
    const hoja = document.createElement("canvas");
    hoja.width = todo.width;
    hoja.height = Math.round(altoHoja);
    hoja.getContext("2d")!.drawImage(todo, 0, Math.round(i * altoHoja), todo.width, hoja.height, 0, 0, hoja.width, hoja.height);
    if (i > 0) pdf.addPage();
    pdf.addImage(hoja.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297);
  }
  pdf.save(nombreArchivo);
}

/** El nombre de la persona apto para un archivo. */
export function nombreParaArchivo(nombre: string) {
  return (nombre.trim() || "Persona").replace(/[^\p{L}\p{N}]+/gu, "_");
}

export function formatearFecha(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

/** Radar en SVG (vectorial: se imprime nítido). Valores del 1 al 10. */
export function Radar({ ejes, label }: { ejes: { nombre: string; valor: number | null }[]; label: string }) {
  const size = 300;
  const c = size / 2;
  const r = 100;
  const n = ejes.length;
  const punto = (i: number, v: number) => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + Math.cos(ang) * r * (v / 10), c + Math.sin(ang) * r * (v / 10)] as const;
  };
  const poly = ejes.map((e, i) => punto(i, e.valor ?? 0).join(",")).join(" ");

  return (
    <svg className="tad-radar" viewBox={`-72 -4 ${size + 144} ${size + 8}`} role="img" aria-label={label}>
      {[2, 4, 6, 8, 10].map((lv) => (
        <polygon
          key={lv}
          points={ejes.map((_, i) => punto(i, lv).join(",")).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={lv === 10 ? 1 : 0.6}
        />
      ))}
      {ejes.map((_, i) => {
        const [x, y] = punto(i, 10);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={0.6} />;
      })}
      <polygon points={poly} fill="rgba(240,184,0,0.18)" stroke="#F0B800" strokeWidth={1.6} strokeLinejoin="round" />
      {ejes.map((e, i) => {
        if (e.valor == null) return null;
        const [x, y] = punto(i, e.valor);
        return <circle key={e.nombre} cx={x} cy={y} r={2.8} fill="#F0B800" />;
      })}
      {ejes.map((e, i) => {
        const [x, y] = punto(i, 12.6);
        const anchor = Math.abs(x - c) < 8 ? "middle" : x > c ? "start" : "end";
        return (
          <text key={e.nombre} x={x} y={y + 3} textAnchor={anchor} className="tad-radar-label">
            {e.nombre}
          </text>
        );
      })}
    </svg>
  );
}

export function Seccion({ titulo, sub, children }: { titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="tad-seccion">
      <h1 className="tad-titulo">{titulo}</h1>
      {sub && <p className="tad-sub">{sub}</p>}
      {children}
    </section>
  );
}

export function Campo({ label, ayuda, children }: { label: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <label className="tad-campo">
      <span className="tad-label">{label}</span>
      {ayuda && <span className="tad-ayuda">{ayuda}</span>}
      {children}
    </label>
  );
}
