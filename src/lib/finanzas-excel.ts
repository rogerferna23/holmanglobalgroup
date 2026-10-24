/**
 * Torre → Finanzas → «Descargar Excel». Arma en el navegador el mismo libro de
 * la plantilla (cinco hojas con fórmulas vivas), lleno con lo que hay en el
 * mes y con espacio para seguir escribiendo en Excel. Proyectado y real van
 * lado a lado para medir el cumplimiento.
 *
 * ExcelJS pesa: este archivo se carga solo al pulsar el botón.
 */
import ExcelJS from "exceljs";
import {
  nombreMes, rango, separar, type Costo, type Deuda, type Embajador, type Libro, type Venta,
} from "@/lib/finanzas";

const F = "Arial";
const COP = '"$"#,##0;[Red]-"$"#,##0;"-"';
const USD = '"US$"#,##0.00;[Red]-"US$"#,##0.00;"-"';
const PCT = '0.0%;[Red]-0.0%;"-"';
const DATE = "dd/mm/yyyy";
const RATE = '#,##0.00;-#,##0.00;"-"';
const C_IN = "FF0000FF", C_LINK = "FF008000", C_MISS = "FFC00000";
const FILL_IN: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
const FILL_HEAD: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A1A" } };
const FILL_TOT: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFE6D2" } };
const BORDE: Partial<ExcelJS.Borders> = (() => {
  const s: ExcelJS.Border = { style: "thin", color: { argb: "FFD9D9D9" } };
  return { top: s, left: s, bottom: s, right: s };
})();
const LEYENDA = "Celdas amarillas con texto azul = las completas tú · texto negro = fórmula (no tocar) · texto verde = viene de otra hoja · «Datos faltantes» = lo que falta en cada fila.";

const FL = "'Flujo de caja'";
const VH = "'Ventas HGG'";
const CE = "'Costos empresariales'";
const DP = "'Deudas personales'";
const INI = `${FL}!$B$5`, FIN = `${FL}!$B$6`, SEMS = `${FL}!$B$7`, TASA = `${FL}!$B$10`, SEM_HOY = `${FL}!$B$12`;

type Kind = "in" | "calc" | "link" | "miss";
type Spec = { h: string; w: number; kind: Kind; fmt?: string; f?: (r: number) => string; nota?: string };

const fecha = (s: string | null | undefined) => {
  if (!s) return null;
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const pct = (x: number | null | undefined) => (x === null || x === undefined ? null : x / 100);
const letra = (i: number) => {
  let s = "", n = i;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

function semanaF(c: string) {
  return `IF(OR(${c}<${INI},${c}>${FIN}),"Fuera del mes",MIN(${SEMS},INT((${c}-${INI})/7)+1))`;
}
function faltan(guard: string, partes: [string, string][]) {
  return `IF(${guard},"",${partes.map(([c, t]) => `IF(${c},"${t} · ","")`).join("&")})`;
}

function encabezado(ws: ExcelJS.Worksheet, titulo: string, sub: string, specs: Spec[]) {
  ws.getCell("A1").value = titulo;
  ws.getCell("A1").font = { name: F, size: 15, bold: true };
  ws.getCell("A2").value = sub;
  ws.getCell("A2").font = { name: F, size: 9, italic: true, color: { argb: "FF555555" } };
  ws.getCell("A3").value = LEYENDA;
  ws.getCell("A3").font = { name: F, size: 9, italic: true, color: { argb: "FF555555" } };
  specs.forEach((s, i) => {
    const c = ws.getCell(5, i + 1);
    c.value = s.h;
    c.font = { name: F, size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = FILL_HEAD;
    c.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
    c.border = BORDE;
    if (s.nota) c.note = s.nota;
    ws.getColumn(i + 1).width = s.w;
  });
  ws.getRow(5).height = 46;
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: 5, zoomScale: 90 }];
}

/** Escribe la tabla: entradas con los datos de la app, fórmulas en todas las filas. */
function cuerpo(ws: ExcelJS.Worksheet, specs: Spec[], r1: number, r2: number, datos: (unknown[] | undefined)[]) {
  for (let r = r1; r <= r2; r++) {
    const fila = datos[r - r1];
    specs.forEach((s, i) => {
      const c = ws.getCell(r, i + 1);
      c.border = BORDE;
      if (s.fmt) c.numFmt = s.fmt;
      if (s.kind === "in") {
        c.font = { name: F, size: 10, color: { argb: C_IN } };
        c.fill = FILL_IN;
        const v = fila?.[i];
        if (v !== null && v !== undefined && v !== "") c.value = v as ExcelJS.CellValue;
      } else {
        c.value = { formula: s.f!(r) };
        c.font = { name: F, size: s.kind === "miss" ? 9 : 10, color: { argb: s.kind === "link" ? C_LINK : s.kind === "miss" ? C_MISS : "FF000000" } };
        if (s.kind === "miss") c.alignment = { wrapText: true, vertical: "middle" };
      }
    });
  }
}

function totales(ws: ExcelJS.Worksheet, fila: number, ncols: number, cols: number[], r1: number, r2: number, fmt = COP) {
  for (let i = 1; i <= ncols; i++) {
    const c = ws.getCell(fila, i);
    c.fill = FILL_TOT; c.border = BORDE; c.font = { name: F, size: 10, bold: true };
  }
  ws.getCell(fila, 1).value = "Total";
  for (const col of cols) {
    const c = ws.getCell(fila, col);
    c.value = { formula: `SUM(${letra(col)}${r1}:${letra(col)}${r2})` };
    c.numFmt = fmt;
  }
}

function lista(ws: ExcelJS.Worksheet, col: string, r1: number, r2: number, formula: string, estricta = true) {
  for (let r = r1; r <= r2; r++) {
    ws.getCell(`${col}${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [formula], showErrorMessage: estricta };
  }
}

export async function construirLibro(libro: Libro): Promise<ExcelJS.Workbook> {
  const { periodo: p } = libro;
  const h = separar(libro.filas);
  const wb = new ExcelJS.Workbook();
  wb.creator = "HGG · Torre";
  wb.created = new Date();
  const mesTxt = nombreMes(p.mes);

  /* ---------------------------------------------------------- Embajadores */
  const E1 = 6, E2 = E1 + Math.max(h.embajadores.length + 10, 20) - 1;
  const V1 = 6, V2 = V1 + Math.max(h.ventas.length + 30, 60) - 1;
  const C1 = 6, C2 = C1 + Math.max(h.costos.length + 15, 40) - 1;
  const D1 = 6, D2 = D1 + Math.max(h.deudas.length + 10, 20) - 1;
  const VR = (col: string) => `${VH}!$${col}$${V1}:$${col}$${V2}`;
  const delMes = `${VR("B")},">="&${INI},${VR("B")},"<="&${FIN}`;
  const deSemana = `${VR("B")},">="&(${INI}+7*(${SEM_HOY}-1)),${VR("B")},"<="&MIN(${INI}+7*${SEM_HOY}-1,${FIN})`;

  const we = wb.addWorksheet("Embajadores");
  const eSpecs: Spec[] = [
    { h: "Nombre", w: 22, kind: "in" },
    { h: "Meta mensual de ingresos (COP)", w: 16, kind: "in", fmt: COP },
    { h: "Ventas reales del mes (COP)", w: 16, kind: "link", fmt: COP, f: (r) => `IF(A${r}="","",SUMIFS(${VR("H")},${VR("Q")},A${r},${VR("A")},"Real",${delMes}))` },
    { h: "Ventas proyectadas del mes (COP)", w: 16, kind: "link", fmt: COP, f: (r) => `IF(A${r}="","",SUMIFS(${VR("H")},${VR("Q")},A${r},${VR("A")},"Proyectada",${delMes}))` },
    { h: "Meta semanal (COP)", w: 15, kind: "calc", fmt: COP, f: (r) => `IF(B${r}="","",B${r}*7/(${FIN}-${INI}+1))` },
    { h: "Ventas logradas en la semana en curso (COP)", w: 17, kind: "link", fmt: COP, f: (r) => `IF(A${r}="","",SUMIFS(${VR("H")},${VR("Q")},A${r},${VR("A")},"Real",${deSemana}))` },
    { h: "N.º de ventas reales del mes", w: 11, kind: "link", fmt: "0", f: (r) => `IF(A${r}="","",COUNTIFS(${VR("Q")},A${r},${VR("A")},"Real",${delMes}))` },
    { h: "% de comisión", w: 11, kind: "in", fmt: PCT, nota: "Escríbelo como 10% (no como 10). «Ventas HGG» lo toma de aquí." },
    { h: "Comisión generada en el mes (COP)", w: 16, kind: "link", fmt: COP, f: (r) => `IF(A${r}="","",SUMIFS(${VR("S")},${VR("Q")},A${r},${VR("A")},"Real",${delMes}))` },
    { h: "Brecha frente a la meta mensual (COP)", w: 17, kind: "calc", fmt: COP, f: (r) => `IF(OR(A${r}="",B${r}=""),"",MAX(0,B${r}-C${r}))` },
    { h: "Brecha frente a la meta semanal (COP)", w: 17, kind: "calc", fmt: COP, f: (r) => `IF(OR(A${r}="",B${r}=""),"",MAX(0,E${r}-F${r}))` },
    { h: "% de avance del mes", w: 11, kind: "calc", fmt: PCT, f: (r) => `IF(OR(A${r}="",N(B${r})=0),"",C${r}/B${r})` },
    { h: "Datos faltantes", w: 32, kind: "miss", f: (r) => faltan(`A${r}=""`, [[`B${r}=""`, "meta mensual"], [`H${r}=""`, "% de comisión"]]) },
  ];
  encabezado(we, `Embajadores — ${mesTxt}`, "Las ventas y comisiones se leen de «Ventas HGG» (Vendedor responsable escrito igual). Reales = lo logrado; proyectadas = lo esperado.", eSpecs);
  cuerpo(we, eSpecs, E1, E2, h.embajadores.map(({ datos: e }: { datos: Embajador }) => [e.nombre, e.meta, null, null, null, null, null, pct(e.pct)]));
  totales(we, E2 + 1, eSpecs.length, [2, 3, 4, 6, 9, 10, 11], E1, E2);

  /* ---------------------------------------------------------- Ventas HGG */
  const wv = wb.addWorksheet("Ventas HGG");
  const EMB = (col: string) => `Embajadores!$${col}$${E1}:$${col}$${E2}`;
  const vSpecs: Spec[] = [
    { h: "Tipo (Proyectada / Real)", w: 12, kind: "in", nota: "Proyectada = lo que esperas vender. Real = lo que se vendió. Cada venta real va una sola vez." },
    { h: "Fecha de venta", w: 12, kind: "in", fmt: DATE },
    { h: "Cliente", w: 20, kind: "in" },
    { h: "Servicio", w: 22, kind: "in" },
    { h: "Valor vendido (USD)", w: 12, kind: "in", fmt: USD },
    { h: "Tasa de cambio (COP por USD)", w: 12, kind: "in", fmt: RATE },
    { h: "Valor en COP pactado directo (solo si se vendió en pesos)", w: 15, kind: "in", fmt: COP },
    { h: "Valor vendido (COP)", w: 15, kind: "calc", fmt: COP, f: (r) => `IF(G${r}<>"",G${r},IF(OR(E${r}="",F${r}=""),0,E${r}*F${r}))` },
    { h: "Anticipo (COP)", w: 14, kind: "in", fmt: COP, nota: "Real: lo que ya entró. Proyectada: el anticipo que esperas." },
    { h: "Fecha del anticipo", w: 12, kind: "in", fmt: DATE },
    { h: "Saldo cobrado después (COP) — solo real", w: 14, kind: "in", fmt: COP, nota: "Cuando entre un pago, súmalo aquí y pon la fecha. No crees otra fila." },
    { h: "Fecha del último cobro del saldo", w: 12, kind: "in", fmt: DATE },
    { h: "Total cobrado (COP)", w: 14, kind: "calc", fmt: COP, f: (r) => `N(I${r})+IF(A${r}="Real",N(K${r}),0)` },
    { h: "Saldo pendiente (COP)", w: 14, kind: "calc", fmt: COP, f: (r) => `H${r}-M${r}` },
    { h: "Fecha estimada de cobro del pendiente", w: 13, kind: "in", fmt: DATE },
    { h: "Estado", w: 12, kind: "calc", f: (r) => `IF(H${r}=0,"",IF(A${r}="Proyectada","Proyectada",IF(N${r}<=0,"Cobrada",IF(M${r}>0,"Cobro parcial","Por cobrar"))))` },
    { h: "Vendedor responsable", w: 18, kind: "in" },
    { h: "% comisión embajador", w: 10, kind: "link", fmt: PCT, f: (r) => `IF(Q${r}="",0,IFERROR(N(INDEX(${EMB("H")},MATCH(Q${r},${EMB("A")},0))),0))`, nota: "Sale de la hoja Embajadores. Si el vendedor no está ahí (por ejemplo Holman), es 0." },
    { h: "Comisión del embajador (COP)", w: 14, kind: "calc", fmt: COP, f: (r) => `H${r}*R${r}` },
    { h: "Closer", w: 14, kind: "in" },
    { h: "% comisión closer", w: 10, kind: "in", fmt: PCT },
    { h: "Comisión de closer (COP)", w: 14, kind: "calc", fmt: COP, f: (r) => `H${r}*N(U${r})` },
    { h: "Margen estimado antes de costos fijos (COP)", w: 16, kind: "calc", fmt: COP, f: (r) => `H${r}-S${r}-V${r}`, nota: "Vendido − comisiones. Los costos fijos se restan una sola vez, en el margen del mes." },
    {
      h: "Datos faltantes", w: 34, kind: "miss", f: (r) => faltan(`AND(B${r}="",C${r}="",E${r}="",G${r}="")`, [
        [`AND(A${r}<>"Real",A${r}<>"Proyectada")`, "tipo"], [`B${r}=""`, "fecha de venta"], [`AND(A${r}="Real",C${r}="")`, "cliente"],
        [`D${r}=""`, "servicio"], [`AND(E${r}="",G${r}="")`, "valor"], [`AND(E${r}<>"",G${r}="",F${r}="")`, "tasa de cambio"],
        [`Q${r}=""`, "vendedor"], [`AND(N(I${r})>0,J${r}="")`, "fecha del anticipo"], [`AND(A${r}="Real",N(K${r})>0,L${r}="")`, "fecha del cobro del saldo"],
        [`AND(N${r}>0,O${r}="")`, "fecha estimada de cobro"], [`AND(T${r}<>"",U${r}="")`, "% del closer"], [`N${r}<0`, "¡lo cobrado supera lo vendido!"],
      ]),
    },
    { h: "Aux: cobro 1 (monto)", w: 11, kind: "calc", fmt: COP, f: (r) => `N(I${r})`, nota: "Columnas auxiliares para el flujo: cada cobro con su fecha. No editar." },
    { h: "Aux: cobro 1 (fecha)", w: 11, kind: "calc", fmt: DATE, f: (r) => `IF(J${r}<>"",J${r},IF(A${r}="Proyectada",B${r},""))` },
    { h: "Aux: cobro 2 (monto)", w: 11, kind: "calc", fmt: COP, f: (r) => `IF(A${r}="Real",N(K${r}),H${r}-N(I${r}))` },
    { h: "Aux: cobro 2 (fecha)", w: 11, kind: "calc", fmt: DATE, f: (r) => `IF(A${r}="Real",IF(L${r}="","",L${r}),IF(O${r}<>"",O${r},B${r}))` },
    { h: "Aux: comisión del cobro 1", w: 11, kind: "calc", fmt: COP, f: (r) => `IF(H${r}=0,0,(S${r}+V${r})*Y${r}/H${r})` },
    { h: "Aux: comisión del cobro 2", w: 11, kind: "calc", fmt: COP, f: (r) => `IF(H${r}=0,0,(S${r}+V${r})*AA${r}/H${r})` },
  ];
  encabezado(wv, `Ventas HGG — ${mesTxt}`, "Vendido = lo pactado · Cobrado = anticipo + saldo que ya entró (con su fecha) · Pendiente = vendido − cobrado. Proyectadas y reales en la misma hoja, marcadas en la columna Tipo.", vSpecs);
  cuerpo(wv, vSpecs, V1, V2, h.ventas.map(({ datos: v }: { datos: Venta }) => [
    v.tipo === "real" ? "Real" : "Proyectada", fecha(v.fecha), v.cliente, v.servicio, v.usd, v.tasa, v.cop_directo, null,
    v.anticipo, fecha(v.fecha_anticipo), v.tipo === "real" ? v.saldo_cobrado : null, fecha(v.fecha_saldo), null, null,
    fecha(v.fecha_estimada), null, v.vendedor, null, null, v.closer, pct(v.pct_closer),
  ]));
  totales(wv, V2 + 1, vSpecs.length, [8, 9, 11, 13, 14, 19, 22, 23], V1, V2);
  wv.getCell(V2 + 1, 5).value = { formula: `SUM(E${V1}:E${V2})` };
  wv.getCell(V2 + 1, 5).numFmt = USD;
  lista(wv, "A", V1, V2, '"Proyectada,Real"');
  lista(wv, "Q", V1, V2, EMB("A"), false);
  lista(wv, "T", V1, V2, EMB("A"), false);

  /* ---------------------------------------------------------- Costos */
  const CATS = ["Herramientas", "Proveedores", "Entrega de servicios", "Impuestos", "Comisiones (pasarelas y bancos)", "Otros"];
  const wc = wb.addWorksheet("Costos empresariales");
  const enCop = (col: string, r: number) => `IF(${col}${r}="",0,IF(D${r}="USD",IF(AND(G${r}="",${TASA}=""),0,${col}${r}*IF(G${r}<>"",G${r},${TASA})),${col}${r}))`;
  const cSpecs: Spec[] = [
    { h: "Concepto", w: 28, kind: "in" },
    { h: "Categoría", w: 20, kind: "in" },
    { h: "Proveedor", w: 16, kind: "in" },
    { h: "Moneda", w: 8, kind: "in" },
    { h: "Presupuesto (en su moneda)", w: 14, kind: "in", fmt: "#,##0.00" },
    { h: "Real pagado (en su moneda)", w: 14, kind: "in", fmt: "#,##0.00" },
    { h: "Tasa de cambio (si es USD)", w: 12, kind: "in", fmt: RATE },
    { h: "Presupuesto del mes (COP)", w: 15, kind: "calc", fmt: COP, f: (r) => enCop("E", r) },
    { h: "Real del mes (COP)", w: 15, kind: "calc", fmt: COP, f: (r) => enCop("F", r) },
    { h: "Diferencia real − presupuesto (COP)", w: 15, kind: "calc", fmt: COP, f: (r) => `IF(F${r}="","",I${r}-H${r})` },
    { h: "Fecha de pago", w: 12, kind: "in", fmt: DATE },
    { h: "Semana del flujo", w: 10, kind: "calc", fmt: "0", f: (r) => `IF(AND(H${r}=0,I${r}=0),"",IF(K${r}="",1,${semanaF(`K${r}`)}))`, nota: "Sin fecha de pago, el costo cae en la semana 1 (criterio prudente)." },
    { h: "Fijo o variable", w: 11, kind: "in" },
    { h: "Notas", w: 30, kind: "in" },
    {
      h: "Datos faltantes", w: 30, kind: "miss", f: (r) => faltan(`A${r}=""`, [
        [`B${r}=""`, "categoría"], [`D${r}=""`, "moneda"], [`E${r}=""`, "presupuesto"],
        [`AND(D${r}="USD",G${r}="",${TASA}="")`, "tasa de cambio"], [`K${r}=""`, "fecha de pago"], [`L${r}="Fuera del mes"`, "la fecha no es de este mes"],
      ]),
    },
  ];
  encabezado(wc, `Costos empresariales de HGG — ${mesTxt}`, "Un costo por fila con lo que se paga EN ESTE MES: presupuesto y lo real. Las comisiones de embajadores y closers NO van aquí: salen de «Ventas HGG».", cSpecs);
  cuerpo(wc, cSpecs, C1, C2, h.costos.map(({ datos: c }: { datos: Costo }) => [
    c.concepto, c.categoria, c.proveedor, c.moneda, c.presupuesto, c.real, c.tasa, null, null, null, fecha(c.fecha), null, c.fijo, c.notas,
  ]));
  totales(wc, C2 + 1, cSpecs.length, [8, 9, 10], C1, C2);
  lista(wc, "B", C1, C2, `"${CATS.join(",")}"`);
  lista(wc, "D", C1, C2, '"COP,USD"');
  lista(wc, "M", C1, C2, '"Fijo,Variable"');
  // Resumen por categoría (Q:T)
  const CR = (col: string) => `$${col}$${C1}:$${col}$${C2}`;
  [["Q", 40, "Resumen por categoría (COP)"], ["R", 15, "Presupuesto"], ["S", 15, "Real"], ["T", 15, "Diferencia"]].forEach(([col, w, t]) => {
    const c = wc.getCell(`${col}5`);
    c.value = t as string; c.font = { name: F, size: 9, bold: true, color: { argb: "FFFFFFFF" } }; c.fill = FILL_HEAD; c.border = BORDE;
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    wc.getColumn(col as string).width = w as number;
  });
  wc.getColumn("P").width = 3;
  [...CATS, "Sin categoría"].forEach((cat, i) => {
    const r = 6 + i;
    wc.getCell(`Q${r}`).value = cat;
    const f = (col: string) => cat === "Sin categoría"
      ? `SUMIFS(${CR(col)},${CR("L")},">=1")-SUM(${col === "H" ? "R" : "S"}6:${col === "H" ? "R" : "S"}${r - 1})`
      : `SUMIFS(${CR(col)},${CR("B")},Q${r},${CR("L")},">=1")`;
    wc.getCell(`R${r}`).value = { formula: f("H") };
    wc.getCell(`S${r}`).value = { formula: f("I") };
    wc.getCell(`T${r}`).value = { formula: `S${r}-R${r}` };
  });
  const cTot = 6 + CATS.length + 1;
  wc.getCell(`Q${cTot}`).value = "Total costos empresariales del mes";
  wc.getCell(`R${cTot}`).value = { formula: `SUM(R6:R${cTot - 1})` };
  wc.getCell(`S${cTot}`).value = { formula: `SUM(S6:S${cTot - 1})` };
  wc.getCell(`T${cTot}`).value = { formula: `S${cTot}-R${cTot}` };
  for (let r = 6; r <= cTot; r++) {
    ["Q", "R", "S", "T"].forEach((col) => {
      const c = wc.getCell(`${col}${r}`);
      c.border = BORDE; c.font = { name: F, size: 10, bold: r === cTot };
      if (col !== "Q") c.numFmt = COP;
    });
  }
  const COSTO_PLAN = `${CE}!$R$${cTot}`, COSTO_REAL = `${CE}!$S$${cTot}`;

  /* ---------------------------------------------------------- Deudas */
  const wd = wb.addWorksheet("Deudas personales");
  const activa = (r: number) => `AND(N(C${r})>0,I${r}<>"Pagada")`;
  const dSpecs: Spec[] = [
    { h: "Entidad o acreedor", w: 22, kind: "in" },
    { h: "Tipo", w: 14, kind: "in" },
    { h: "Saldo total (COP)", w: 15, kind: "in", fmt: COP },
    { h: "Cuota mensual (COP)", w: 14, kind: "in", fmt: COP },
    { h: "Pago mínimo (COP)", w: 14, kind: "in", fmt: COP },
    { h: "Tasa de interés mensual", w: 11, kind: "in", fmt: "0.00%", nota: "Interés MENSUAL (ej.: 2,1% al mes)." },
    { h: "Tasa efectiva anual (equivalente)", w: 11, kind: "calc", fmt: PCT, f: (r) => `IF(F${r}="","",(1+F${r})^12-1)` },
    { h: "Fecha límite de pago", w: 12, kind: "in", fmt: DATE },
    { h: "Estado", w: 13, kind: "in" },
    { h: "Prioridad sugerida", w: 10, kind: "calc", fmt: "0", f: (r) => `IF(W${r}="","",1+COUNTIF($W$${D1}:$W$${D2},">"&W${r}))`, nota: "Avalancha: primero las que están en mora, después la de mayor tasa." },
    { h: "Prioridad que decides tú", w: 11, kind: "in", fmt: "0" },
    { h: "Pago planeado del mes (COP)", w: 15, kind: "calc", fmt: COP, f: (r) => `IF(OR(A${r}="",I${r}="Pagada"),0,MIN(IF(D${r}<>"",D${r},N(E${r})),N(C${r})*(1+N(F${r}))))`, nota: "La cuota; si no hay cuota fija, el mínimo." },
    { h: "Pagado real (COP)", w: 14, kind: "in", fmt: COP },
    { h: "Abono extraordinario planeado (COP)", w: 15, kind: "in", fmt: COP },
    { h: "Abono extraordinario real (COP)", w: 15, kind: "in", fmt: COP },
    { h: "Fecha del abono", w: 12, kind: "in", fmt: DATE },
    { h: "Semana de la cuota", w: 10, kind: "calc", fmt: "0", f: (r) => `IF(AND(L${r}=0,N(M${r})=0),"",IF(H${r}="",1,${semanaF(`H${r}`)}))` },
    { h: "Semana del abono", w: 10, kind: "calc", fmt: "0", f: (r) => `IF(AND(N(N${r})=0,N(O${r})=0),"",IF(P${r}="",${SEMS},${semanaF(`P${r}`)}))`, nota: "Un abono sin fecha cae en la última semana: primero lo obligatorio." },
    { h: "Interés estimado del mes (COP)", w: 14, kind: "calc", fmt: COP, f: (r) => `N(C${r})*N(F${r})` },
    { h: "Saldo al cierre — proyectado (COP)", w: 16, kind: "calc", fmt: COP, f: (r) => `IF(A${r}="","",MAX(0,N(C${r})+S${r}-L${r}-N(N${r})))` },
    { h: "Saldo al cierre — real (COP)", w: 16, kind: "calc", fmt: COP, f: (r) => `IF(A${r}="","",MAX(0,N(C${r})+S${r}-N(M${r})-N(O${r})))` },
    { h: "Meses para liquidar con el pago planeado", w: 13, kind: "calc", fmt: "0", f: (r) => `IF(OR(A${r}="",N(C${r})<=0,I${r}="Pagada"),"",IF(L${r}<=0,"Sin pago",IF(N(F${r})=0,ROUNDUP(C${r}/L${r},0),IF(L${r}<=S${r},"La cuota no cubre el interés",ROUNDUP(NPER(F${r},-L${r},C${r}),0)))))` },
    { h: "Puntaje (auxiliar)", w: 9, kind: "calc", fmt: "0.0000", f: (r) => `IF(${activa(r)},IF(I${r}="En mora",10,0)+N(F${r}),"")` },
    {
      h: "Datos faltantes", w: 32, kind: "miss", f: (r) => faltan(`A${r}=""`, [
        [`C${r}=""`, "saldo"], [`AND(D${r}="",E${r}="")`, "cuota o pago mínimo"], [`F${r}=""`, "tasa"], [`H${r}=""`, "fecha límite"],
        [`I${r}=""`, "estado"], [`Q${r}="Fuera del mes"`, "fecha límite fuera del mes"], [`R${r}="Fuera del mes"`, "fecha del abono fuera del mes"],
      ]),
    },
  ];
  encabezado(wd, "Deudas personales — plan para salir sin nuevos préstamos", "Lo planeado y lo pagado de verdad, lado a lado. Pagar de más que la cuota va como abono extraordinario.", dSpecs);
  cuerpo(wd, dSpecs, D1, D2, h.deudas.map(({ datos: d }: { datos: Deuda }) => [
    d.entidad, d.tipo, d.saldo, d.cuota, d.minimo, pct(d.tasa), null, fecha(d.fecha_limite), d.estado, null, d.prioridad_propia, null,
    d.pagado_real, d.abono_plan, d.abono_real, fecha(d.fecha_abono),
  ]));
  totales(wd, D2 + 1, dSpecs.length, [3, 4, 5, 12, 13, 14, 15, 19, 20, 21], D1, D2);
  lista(wd, "B", D1, D2, '"Tarjeta de crédito,Crédito de consumo,Libre inversión,Crédito con persona,Otro"', false);
  lista(wd, "I", D1, D2, '"Al día,En mora,En negociación,Pagada"');
  const DT = (col: string) => `${DP}!$${col}$${D2 + 1}`;
  const DR = (col: string) => `${DP}!$${col}$${D1}:$${col}$${D2}`;

  /* ---------------------------------------------------------- Flujo de caja */
  const wf = wb.addWorksheet("Flujo de caja");
  wb.views = [{ x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, activeTab: 4, visibility: "visible" }];
  [52, 16, 16, 16, 16, 16, 18, 46].forEach((w, i) => { wf.getColumn(i + 1).width = w; });
  const txt = (ref: string, v: string, font: Partial<ExcelJS.Font> = {}) => {
    const c = wf.getCell(ref); c.value = v; c.font = { name: F, size: 10, ...font }; return c;
  };
  const seccion = (r: number, t: string) => {
    for (let i = 1; i <= 8; i++) wf.getCell(r, i).fill = FILL_TOT;
    txt(`A${r}`, t, { size: 11, bold: true });
  };
  txt("A1", `Flujo de caja — ${mesTxt} (semanal y mensual)`, { size: 15, bold: true });
  txt("A2", "Dos bloques: Proyección (lo que esperas) y Real (lo que pasó). El saldo real cuenta solo dinero que ya entró; lo previsto se muestra aparte.", { size: 9, italic: true, color: { argb: "FF555555" } });
  txt("A3", LEYENDA, { size: 9, italic: true, color: { argb: "FF555555" } });

  seccion(4, "Parámetros del periodo");
  const r0 = rango(p.mes);
  const params: [number, string, ExcelJS.CellValue, string, "in" | "calc", string][] = [
    [5, "Inicio del periodo", fecha(p.mes), DATE, "in", "Cambia inicio y fin para usar el libro en otro mes."],
    [6, "Fin del periodo", fecha(new Date(r0.fin * 86_400_000).toISOString()), DATE, "in", ""],
    [7, "Semanas del periodo", { formula: "ROUNDUP((B6-B5+1)/7,0)" }, "0", "calc", "Semanas de 7 días desde el 1 (la última puede ser más corta)."],
    [8, "Presupuesto personal mínimo mensual (COP)", p.presupuesto_personal, COP, "in", "Meta de Holman: vivir con 3.000.000 COP al mes."],
    [9, "Saldo en caja al inicio del periodo (COP)", p.saldo_inicial, COP, "in", p.saldo_inicial === null ? "FALTA: lo disponible el día 1 (cuentas + efectivo)." : ""],
    [10, "Tasa de cambio de referencia (COP por USD)", p.tasa, RATE, "in", p.tasa === null ? "FALTA: para costos en USD sin tasa y la meta en USD." : ""],
    [11, "Semana en curso (1 a 5)", null, "0", "in", "Opcional. Vacío = la semana de hoy."],
    [12, "Semana que se usa", { formula: 'IF(B11<>"",B11,MAX(1,MIN(B7,INT((TODAY()-B5)/7)+1)))' }, "0", "calc", ""],
    [13, "% de comisiones sobre ventas (embajadores + closer + pasarela), estimado", pct(p.pct_comision), PCT, "in", p.pct_comision === null ? "FALTA: para la meta mínima. Vacío = 0% (la meta sale corta)." : ""],
    [14, "% de lo vendido que se cobra dentro del mismo mes", pct(p.pct_cobro), PCT, "in", p.pct_cobro === null ? "FALTA: con 50% de anticipo, escribe 50%. Vacío = 100% (la meta sale corta)." : ""],
    [15, "Saldo real en cuentas al cerrar el mes (COP)", p.saldo_final_real, COP, "in", "Al cierre: para cuadrar lo registrado contra el banco."],
  ];
  for (const [r, lab, val, fmt, kind, nota] of params) {
    txt(`A${r}`, lab);
    const c = wf.getCell(`B${r}`);
    if (val !== null && val !== undefined) c.value = val;
    c.numFmt = fmt; c.border = BORDE;
    c.font = { name: F, size: 10, color: { argb: kind === "in" ? C_IN : "FF000000" } };
    if (kind === "in") c.fill = FILL_IN;
    if (nota) txt(`C${r}`, nota, { size: 9, italic: true, color: { argb: nota.startsWith("FALTA") ? C_MISS : "FF555555" } });
    wf.mergeCells(`C${r}:H${r}`);
  }

  const WK = ["B", "C", "D", "E", "F"];
  const sumWeeks = (r: number) => `SUM(B${r}:F${r})`;
  type Bloque = Record<string, number>;

  function bloque(inicio: number, esc: "plan" | "real"): Bloque {
    const T = esc === "plan" ? "Proyectada" : "Real";
    const rows: Bloque = {};
    seccion(inicio, esc === "plan" ? "Proyección semanal (COP)" : "Ejecución real semanal (COP)");
    const head = inicio + 1;
    ["Concepto", "Semana 1", "Semana 2", "Semana 3", "Semana 4", "Semana 5", "Total del mes", "Cómo se calcula"].forEach((t, i) => {
      const c = wf.getCell(head, i + 1);
      c.value = t; c.font = { name: F, size: 9, bold: true, color: { argb: "FFFFFFFF" } }; c.fill = FILL_HEAD; c.border = BORDE;
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
    type Concepto = [string, string, "calc" | "link" | "in", string | undefined, ((c: string, k: number) => string) | null, "sum" | "first" | "last" | null, string];
    const conceptos: Concepto[] = [
      ["desde", "Desde", "calc", DATE, (_c, k) => `$B$5+7*${k - 1}`, null, ""],
      ["hasta", "Hasta", "calc", DATE, (_c, k) => `MIN($B$5+7*${k}-1,$B$6)`, null, ""],
      ["saldo", "Saldo inicial", "calc", COP, null, "first", "Semana 1 = B9; después, el saldo final de la semana anterior."],
      ["ventas", "Cobros de ventas", "link", COP, (c) =>
        `SUMIFS(${VR("Y")},${VR("A")},"${T}",${VR("Z")},">="&${c}${rows.desde},${VR("Z")},"<="&${c}${rows.hasta})+SUMIFS(${VR("AA")},${VR("A")},"${T}",${VR("AB")},">="&${c}${rows.desde},${VR("AB")},"<="&${c}${rows.hasta})`, "sum",
        esc === "plan" ? "Ventas proyectadas: anticipo esperado y el resto en la fecha estimada (sin fechas, en la fecha de venta)." : "Ventas reales: anticipos y saldos cobrados, por la fecha en que entraron."],
      ["otros", "Otros ingresos (fuera de ventas)", "in", COP, null, "sum", "Escríbelos aquí si los hay."],
      ["ingresos", "Total ingresos", "calc", COP, (c) => `${c}${rows.ventas}+${c}${rows.otros}`, "sum", ""],
      ...(esc === "real" ? [["previstos", "Previstos (pendientes con fecha en la semana)", "link", COP, (c: string) =>
        `SUMIFS(${VR("N")},${VR("A")},"Real",${VR("N")},">0",${VR("O")},">="&${c}${rows.desde},${VR("O")},"<="&${c}${rows.hasta})`, "sum", "Solo informativo: NO entra al saldo hasta que se cobre."] as Concepto] : []),
      ["personales", "Gastos personales", "in", COP, null, "sum", esc === "plan" ? "Vacío en la app = el presupuesto repartido por días." : "Lo que gastaste de verdad."],
      ["hgg", "Gastos de HGG", "link", COP, (_c, k) => `SUMIFS(${CE}!$${esc === "plan" ? "H" : "I"}$${C1}:$${esc === "plan" ? "H" : "I"}$${C2},${CE}!$L$${C1}:$L$${C2},${k})`, "sum", esc === "plan" ? "Presupuesto de «Costos empresariales»." : "Lo real de «Costos empresariales»."],
      ["comisiones", "Comisiones (sobre lo cobrado)", "link", COP, (c) =>
        `SUMIFS(${VR("AC")},${VR("A")},"${T}",${VR("Z")},">="&${c}${rows.desde},${VR("Z")},"<="&${c}${rows.hasta})+SUMIFS(${VR("AD")},${VR("A")},"${T}",${VR("AB")},">="&${c}${rows.desde},${VR("AB")},"<="&${c}${rows.hasta})`, "sum", "La comisión sale cuando entra el dinero de esa venta."],
      ["cuotas", "Cuotas de deudas", "link", COP, (_c, k) => `SUMIFS(${DR(esc === "plan" ? "L" : "M")},${DR("Q")},${k})`, "sum", esc === "plan" ? "Pago planeado." : "Pagado real."],
      ["abonos", "Abonos extraordinarios", "link", COP, (_c, k) => `SUMIFS(${DR(esc === "plan" ? "N" : "O")},${DR("R")},${k})`, "sum", ""],
      ["ahorro", "Ahorro", "in", COP, null, "sum", "Lo que separas (reserva o fondo de crecimiento)."],
      ["salidas", "Total salidas", "calc", COP, (c) => `SUM(${c}${rows.personales}:${c}${rows.ahorro})`, "sum", ""],
      ["neto", "Flujo neto", "calc", COP, (c) => `${c}${rows.ingresos}-${c}${rows.salidas}`, "sum", ""],
      ["final", "Saldo final (solo dinero cobrado)", "calc", COP, (c) => `${c}${rows.saldo}+${c}${rows.neto}`, "last", ""],
      ...(esc === "real" ? [["conPrevistos", "Saldo final si entran los previstos", "calc", COP, (c: string) => `${c}${rows.final}+SUM($B$${rows.previstos}:${c}${rows.previstos})`, "last", ""] as Concepto] : []),
      ["alerta", "Alerta", "calc", undefined, (c) => esc === "real"
        ? `IF(${c}${rows.final}<0,"Déficit",IF(${c}${rows.conPrevistos}<0,"Depende de cobros","OK"))`
        : `IF(${c}${rows.final}<0,"Déficit","OK")`, null, "Déficit = no alcanza sin pedir prestado."],
    ];
    let r = head + 1;
    for (const [key] of conceptos) rows[key] = r++;
    const sem = libro.periodo.semanas;
    const campo = (key: string) => key === "otros" ? `otros_${esc}` : key === "personales" ? `personales_${esc}` : `ahorro_${esc}`;
    for (const [key, label, kind, fmt, f, tot, nota] of conceptos) {
      const row = rows[key];
      const fuerte = ["ingresos", "salidas", "final", "conPrevistos"].includes(key);
      const a = wf.getCell(row, 1);
      a.value = label; a.border = BORDE; a.font = { name: F, size: 10, bold: fuerte };
      WK.forEach((c, i) => {
        const k = i + 1;
        const cell = wf.getCell(`${c}${row}`);
        cell.border = BORDE;
        if (fmt) cell.numFmt = fmt;
        cell.font = { name: F, size: 10, bold: fuerte, color: { argb: kind === "in" ? C_IN : kind === "link" ? C_LINK : "FF000000" } };
        if (key === "saldo") cell.value = { formula: k === 1 ? "N($B$9)" : `${WK[i - 1]}${rows.final}` };
        else if (kind === "in") {
          cell.fill = FILL_IN;
          const v = (sem[i] as Record<string, number | null> | undefined)?.[campo(key)];
          if (v !== null && v !== undefined) cell.value = v;
          else if (key === "personales" && esc === "plan") cell.value = { formula: `$B$8*MAX(0,${c}${rows.hasta}-${c}${rows.desde}+1)/($B$6-$B$5+1)` };
        } else if (f) cell.value = { formula: f(c, k) };
        if (fuerte) cell.fill = key === "final" || key === "conPrevistos" ? FILL_TOT : cell.fill;
      });
      const g = wf.getCell(`G${row}`);
      g.border = BORDE; g.font = { name: F, size: 10, bold: true };
      if (fmt) g.numFmt = fmt;
      if (tot === "sum") g.value = { formula: sumWeeks(row) };
      if (tot === "first") g.value = { formula: `B${row}` };
      if (tot === "last") g.value = { formula: `F${row}` };
      if (key === "alerta") g.value = { formula: `IF(MIN(B${rows.final}:F${rows.final})<0,"Déficit","OK")` };
      const hcell = wf.getCell(`H${row}`);
      hcell.value = nota || null; hcell.border = BORDE;
      hcell.font = { name: F, size: 9, italic: true, color: { argb: "FF555555" } };
      hcell.alignment = { wrapText: true, vertical: "middle" };
    }
    wf.addConditionalFormatting({
      ref: `B${rows.alerta}:G${rows.alerta}`,
      rules: [
        { type: "containsText", operator: "containsText", text: "Déficit", priority: 1, style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFF4CCCC" } } } },
        { type: "containsText", operator: "containsText", text: "Depende", priority: 2, style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFFCE5CD" } } } },
        { type: "containsText", operator: "containsText", text: "OK", priority: 3, style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFD9EAD3" } } } },
      ],
    });
    return rows;
  }

  const P = bloque(17, "plan");
  const R = bloque(P.alerta + 2, "real");

  // Indicadores y cumplimiento
  let r = R.alerta + 2;
  const ind: Record<string, number> = {};
  const fila = (key: string, label: string, formula: string, fmt: string | undefined, nota = "", link = false) => {
    ind[key] = r;
    const a = wf.getCell(`A${r}`); a.value = label; a.border = BORDE; a.font = { name: F, size: 10 }; a.alignment = { wrapText: true, vertical: "middle" };
    const b = wf.getCell(`B${r}`); b.value = { formula }; b.border = BORDE; b.font = { name: F, size: 10, bold: true, color: { argb: link ? C_LINK : "FF000000" } };
    if (fmt) b.numFmt = fmt;
    if (nota) { txt(`C${r}`, nota, { size: 9, italic: true, color: { argb: "FF555555" } }); wf.mergeCells(`C${r}:H${r}`); }
    r++;
  };
  const sub = (t: string) => { txt(`A${r}`, t, { bold: true }); r++; };

  seccion(r, "¿Se logró? Proyectado vs. real"); r++;
  ["Concepto", "Proyectado", "Real", "Diferencia (real − proyectado)", "% de cumplimiento", "", "", "Cómo leerlo"].forEach((t, i) => {
    if (!t) return;
    const c = wf.getCell(r, i + 1);
    c.value = t; c.font = { name: F, size: 9, bold: true, color: { argb: "FFFFFFFF" } }; c.fill = FILL_HEAD; c.border = BORDE;
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  r++;
  const cumRows: { label: string; plan: string; real: string; nota: string }[] = [
    { label: "Ventas del mes (vendido)", plan: `SUMIFS(${VR("H")},${VR("A")},"Proyectada",${delMes})`, real: `SUMIFS(${VR("H")},${VR("A")},"Real",${delMes})`, nota: "Más es mejor." },
    { label: "Meta mínima de ventas (piso) vs. vendido", plan: "PISO", real: `SUMIFS(${VR("H")},${VR("A")},"Real",${delMes})`, nota: "Por debajo del piso haría falta un préstamo." },
    { label: "Dinero cobrado", plan: `G${P.ventas}`, real: `G${R.ventas}`, nota: "Más es mejor." },
    { label: "Costos de HGG", plan: COSTO_PLAN, real: COSTO_REAL, nota: "Menos es mejor." },
    { label: "Gastos personales", plan: `G${P.personales}`, real: `G${R.personales}`, nota: "Menos es mejor." },
    { label: "Pagos a deudas (cuotas + abonos)", plan: `G${P.cuotas}+G${P.abonos}`, real: `G${R.cuotas}+G${R.abonos}`, nota: "Más es mejor." },
    { label: "Ahorro", plan: `G${P.ahorro}`, real: `G${R.ahorro}`, nota: "Más es mejor." },
    { label: "Saldo final en caja", plan: `G${P.final}`, real: `G${R.final}`, nota: "Más es mejor." },
    { label: "Deuda al cierre del mes", plan: DT("T"), real: DT("U"), nota: "Menos es mejor." },
  ];
  const cumInicio = r;
  const pisoFila: number[] = [];
  for (const c of cumRows) {
    txt(`A${r}`, c.label).border = BORDE;
    if (c.plan === "PISO") pisoFila.push(r);
    else wf.getCell(`B${r}`).value = { formula: c.plan };
    wf.getCell(`C${r}`).value = { formula: c.real };
    wf.getCell(`D${r}`).value = { formula: `C${r}-B${r}` };
    wf.getCell(`E${r}`).value = { formula: `IF(N(B${r})=0,"",C${r}/B${r})` };
    ["B", "C", "D"].forEach((col) => { const x = wf.getCell(`${col}${r}`); x.numFmt = COP; x.border = BORDE; x.font = { name: F, size: 10, bold: col === "C" }; });
    const e = wf.getCell(`E${r}`); e.numFmt = PCT; e.border = BORDE; e.font = { name: F, size: 10, bold: true };
    txt(`H${r}`, c.nota, { size: 9, italic: true, color: { argb: "FF555555" } });
    r++;
  }
  r++;

  seccion(r, "Indicadores del mes (COP)"); r++;
  sub("A. Vendido, cobrado y pendiente (ventas reales; cada peso una sola vez)");
  fila("vendido", "Ventas realizadas en el mes (valor vendido)", `SUMIFS(${VR("H")},${VR("A")},"Real",${delMes})`, COP, "Con fecha de venta en el mes, cobradas o no.", true);
  fila("vendidoUsd", "… de eso, pactado en USD", `SUMIFS(${VR("E")},${VR("A")},"Real",${delMes})`, USD, "", true);
  fila("cobrado", "Dinero efectivamente cobrado en el mes", `G${R.ventas}`, COP, "Todo lo que entró, aunque la venta sea de antes.");
  fila("pendiente", "Dinero pendiente por cobrar (todas las ventas reales)", `SUMIFS(${VR("N")},${VR("A")},"Real",${VR("N")},">0")`, COP, "Vendido y aún no cobrado.", true);
  fila("pendMes", "… con fecha estimada dentro del mes", `G${R.previstos}`, COP);
  fila("pendSin", "… sin fecha estimada", `SUMPRODUCT((${VR("A")}="Real")*(${VR("O")}="")*(${VR("N")}>0)*${VR("N")})`, COP, "Ponles fecha en «Ventas HGG».", true);
  fila("pendFuera", "… con fecha fuera del mes (vencida o posterior)", `B${r - 3}-B${r - 2}-B${r - 1}`, COP, "Las vencidas hay que gestionarlas ya.");
  fila("comGen", "Comisiones generadas por las ventas reales del mes", `SUMIFS(${VR("S")},${VR("A")},"Real",${delMes})+SUMIFS(${VR("V")},${VR("A")},"Real",${delMes})`, COP, "Embajadores + closer.", true);
  fila("comPag", "Comisiones pagadas en el mes (sobre lo cobrado)", `G${R.comisiones}`, COP);
  fila("costos", "Costos empresariales reales del mes", COSTO_REAL, COP, "", true);
  fila("margen", "Margen después de costos (sobre lo vendido)", `B${ind.vendido}-B${ind.comGen}-B${ind.costos}`, COP, "Vendido − comisiones generadas − costos. Mide el negocio.");
  fila("margenCaja", "Margen de caja después de costos (sobre lo cobrado)", `B${ind.cobrado}-B${ind.comPag}-B${ind.costos}`, COP, "Cobrado − comisiones pagadas − costos. Mide el bolsillo.");
  sub("B. Necesidades personales y capacidad de pago (proyección)");
  fila("presupuesto", "Presupuesto personal mínimo", "B8", COP);
  fila("necesidades", "Necesidades personales del mes (vivir + cuotas)", `MAX(B8,G${P.personales})+G${P.cuotas}`, COP);
  fila("capacidad", "Capacidad de pago de deudas (saldo inicial + ingresos − personales − HGG − comisiones − ahorro)", `N(B9)+G${P.ingresos}-G${P.personales}-G${P.hgg}-G${P.comisiones}-G${P.ahorro}`, COP, "Lo que queda para deudas sin pedir prestado.");
  fila("cobertura", "Cobertura de las cuotas (veces)", `IF(G${P.cuotas}=0,"",B${r - 1}/G${P.cuotas})`, '0.00"x"', "1,00x o más = las cuotas están cubiertas.");
  fila("excedente", "Excedente para abonos extraordinarios (o faltante si es negativo)", `B${ind.capacidad}-G${P.cuotas}`, COP);
  fila("deuda", "Deuda total al inicio del mes", DT("C"), COP, "", true);
  fila("intereses", "Intereses estimados del mes", DT("S"), COP, "", true);
  sub("C. Meta mínima de ventas");
  fila("salidas", "Salidas proyectadas sin comisiones (personales + HGG + cuotas + abonos + ahorro)", `G${P.personales}+G${P.hgg}+G${P.cuotas}+G${P.abonos}+G${P.ahorro}`, COP);
  fila("aportar", "Lo que deben poner las ventas (salidas − otros ingresos − saldo inicial)", `MAX(0,B${r - 1}-G${P.otros}-N(B9))`, COP);
  fila("meta", "Meta mínima de ventas del mes — plan completo", `IFERROR(B${r - 1}/(1-N(B13))/IF(N(B14)=0,1,B14),"Revisa B13 y B14")`, COP, "Ajusta por comisiones (B13) y por lo que se cobra en el mes (B14).");
  fila("piso", "Meta mínima de ventas del mes — piso (vivir + HGG + cuotas)", `IFERROR(MAX(0,G${P.personales}+G${P.hgg}+G${P.cuotas}-G${P.otros}-N(B9))/(1-N(B13))/IF(N(B14)=0,1,B14),"Revisa B13 y B14")`, COP, "Por debajo de esto haría falta un préstamo.");
  fila("metaUsd", "Meta mínima — plan completo, en USD", `IF(B10="","Falta la tasa (B10)",IFERROR(B${ind.meta}/B10,""))`, USD);
  fila("faltanVentas", "Ventas que faltan para el plan completo", `IF(ISNUMBER(B${ind.meta}),MAX(0,B${ind.meta}-B${ind.vendido}),"")`, COP);
  fila("metaSemanal", "Meta semanal de ventas — plan completo", `IF(ISNUMBER(B${ind.meta}),B${ind.meta}/B7,"")`, COP);
  sub("D. ¿Alcanza sin nuevos préstamos?");
  fila("minPlan", "Saldo más bajo del mes — proyección", `MIN(B${P.final}:F${P.final})`, COP);
  fila("minReal", "Saldo más bajo del mes — real (solo lo cobrado)", `MIN(B${R.final}:F${R.final})`, COP);
  fila("respuesta", "Respuesta",
    `IF(B${ind.minPlan}>=0,"Sí: con lo proyectado alcanza todo el mes","No todavía: faltan "&FIXED(-B${ind.minPlan},0)&" COP en la peor semana. Vende o cobra más, o mueve abonos/ahorro")`, undefined);
  fila("descuadre", "Descuadre: saldo real en cuentas − saldo final del flujo real", `IF(B15="","",B15-G${R.final})`, COP, "Distinto de 0 = hay dinero que entró o salió sin registrar.");
  for (const pr of pisoFila) wf.getCell(`B${pr}`).value = { formula: `B${ind.piso}` };
  void cumInicio;

  r++;
  seccion(r, "Datos que faltan (complétalos para que los números sean reales)"); r++;
  const checks: [string, string][] = [
    ["Saldo en caja al inicio (B9)", 'IF(B9="","Falta","OK")'],
    ["Tasa de cambio de referencia (B10)", 'IF(B10="","Falta","OK")'],
    ["% de comisiones estimado (B13)", 'IF(B13="","Falta","OK")'],
    ["% de lo vendido que se cobra en el mes (B14)", 'IF(B14="","Falta","OK")'],
    ["Embajadores con datos incompletos", `SUMPRODUCT((Embajadores!M${E1}:M${E2}<>"")*1)`],
    ["Ventas con datos incompletos", `SUMPRODUCT((${VH}!X${V1}:X${V2}<>"")*1)`],
    ["Costos con datos incompletos", `SUMPRODUCT((${CE}!O${C1}:O${C2}<>"")*1)`],
    ["Deudas con datos incompletos", `SUMPRODUCT((${DP}!X${D1}:X${D2}<>"")*1)`],
  ];
  const chk0 = r;
  for (const [lab, f] of checks) {
    txt(`A${r}`, lab).border = BORDE;
    const c = wf.getCell(`B${r}`);
    c.value = { formula: f }; c.border = BORDE; c.font = { name: F, size: 10, bold: true }; c.alignment = { horizontal: "center" };
    r++;
  }
  wf.addConditionalFormatting({
    ref: `B${chk0}:B${r - 1}`,
    rules: [
      { type: "containsText", operator: "containsText", text: "Falta", priority: 1, style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFF4CCCC" } } } },
      { type: "cellIs", operator: "greaterThan", formulae: ["0"], priority: 2, style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFFCE5CD" } } } },
    ],
  });
  wf.views = [{ state: "frozen", xSplit: 1, ySplit: 0, zoomScale: 90 }];

  for (const ws of wb.worksheets) {
    ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  }
  return wb;
}

export async function descargarExcel(libro: Libro) {
  const wb = await construirLibro(libro);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `HGG-finanzas-${libro.periodo.mes.slice(0, 7)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
