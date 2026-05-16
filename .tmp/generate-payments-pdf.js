// Genera HGG-Metodos-de-Pago.pdf
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const OUT = path.resolve(__dirname, "..", "HGG-Metodos-de-Pago.pdf");

const COLORS = {
  GOLD: "#F0B800",
  BG: "#0B1016",
  BG2: "#0E141C",
  BG3: "#131B25",
  HAIRLINE: "#2A323C",
  TEXT: "#FFFFFF",
  MUTED: "#B8BEC7",
  MUTED2: "#6B7380",
  GREEN: "#4ADE80",
  RED: "#FF7A7A",
  ORANGE: "#FF8A3D",
  BLUE: "#6FA8E0",
  PURPLE: "#9B7BD8",
};

const doc = new PDFDocument({
  size: "A4",
  margin: 55,
  bufferPages: true,
  info: {
    Title: "HGG — Metodos de Pago",
    Author: "HGG",
    Subject: "Stripe, PayPal y proveedores locales por region",
  },
});
doc.pipe(fs.createWriteStream(OUT));

const W = doc.page.width;
const H = doc.page.height;
const M = 55;

function drawBackground() {
  doc.save();
  doc.rect(0, 0, W, H).fill(COLORS.BG);
  // banner gold top
  doc.rect(0, 0, W, 30).fillColor(COLORS.GOLD).fill();
  doc.fillColor(COLORS.BG).font("Helvetica-Bold").fontSize(9);
  doc.text("HGG - METODOS DE PAGO", M, 11);
  doc.text(`Pag ${doc.bufferedPageRange().count}`, W - M - 50, 11, { width: 50, align: "right" });
  // footer
  doc.lineWidth(0.5).strokeColor(COLORS.HAIRLINE)
     .moveTo(M, H - 45).lineTo(W - M, H - 45).stroke();
  doc.fillColor(COLORS.MUTED2).fontSize(8).font("Helvetica");
  doc.text("hgg.studio - Stripe, PayPal y alternativas regionales", M, H - 30, { width: W - 2 * M });
  doc.restore();
}

function newPage() {
  doc.addPage();
  drawBackground();
  doc.y = 55;
}

drawBackground();

function h1(text, color = COLORS.GOLD) {
  if (doc.y > H - 200) newPage();
  doc.moveDown(0.5);
  doc.fillColor(color).font("Helvetica-Bold").fontSize(22);
  doc.text(text, M, doc.y, { width: W - 2 * M });
  doc.moveDown(0.3);
  doc.lineWidth(2).strokeColor(color).moveTo(M, doc.y).lineTo(M + 60, doc.y).stroke();
  doc.moveDown(0.5);
}

function h2(text) {
  if (doc.y > H - 150) newPage();
  doc.moveDown(0.4);
  doc.fillColor(COLORS.TEXT).font("Helvetica-Bold").fontSize(15);
  doc.text(text, M, doc.y, { width: W - 2 * M });
  doc.moveDown(0.3);
}

function h3(text) {
  if (doc.y > H - 130) newPage();
  doc.moveDown(0.3);
  doc.fillColor(COLORS.GOLD).font("Helvetica-Bold").fontSize(11);
  doc.text(text, M, doc.y, { width: W - 2 * M });
  doc.moveDown(0.2);
}

function body(text, opts = {}) {
  if (doc.y > H - 80) newPage();
  doc.fillColor(opts.color || COLORS.TEXT).font(opts.font || "Helvetica").fontSize(opts.size || 9.5);
  doc.text(text, M, doc.y, { width: W - 2 * M, lineGap: 2, align: "left", ...opts });
  doc.moveDown(0.3);
}

function muted(text) { body(text, { color: COLORS.MUTED, size: 9 }); }

function spacer(h = 6) { doc.y += h; }

function bullet(text, accent = COLORS.GOLD) {
  if (doc.y > H - 60) newPage();
  doc.fillColor(accent).font("Helvetica-Bold").fontSize(9.5);
  doc.text("- ", M, doc.y, { continued: true, width: W - 2 * M });
  doc.fillColor(COLORS.TEXT).font("Helvetica").fontSize(9.5);
  doc.text(text, { lineGap: 1.5, width: W - 2 * M - 12 });
  doc.moveDown(0.2);
}

function calloutWarn(text) { callout(text, "#3A1F0E", COLORS.ORANGE, "#FFB088", "ATENCION"); }
function calloutInfo(text) { callout(text, "#0E1A28", COLORS.BLUE, COLORS.BLUE, "INFO"); }
function calloutTip(text) { callout(text, "#0E1F18", COLORS.GREEN, COLORS.GREEN, "CONSEJO"); }

function callout(text, bg, border, color, label) {
  doc.font("Helvetica").fontSize(9);
  const padding = 8;
  const width = W - 2 * M;
  const h = doc.heightOfString(text, { width: width - 2 * padding, lineGap: 2 }) + 2 * padding + 14;
  if (doc.y + h > H - 80) newPage();
  doc.save();
  doc.rect(M, doc.y, width, h).fillColor(bg).fill();
  doc.lineWidth(0.7).strokeColor(border).rect(M, doc.y, width, h).stroke();
  doc.restore();
  doc.fillColor(border).font("Helvetica-Bold").fontSize(8);
  doc.text(label, M + padding, doc.y + 4);
  doc.fillColor(color).font("Helvetica").fontSize(9);
  doc.text(text, M + padding, doc.y + 16, { width: width - 2 * padding, lineGap: 2 });
  doc.y += h - 16 + 6;
}

function table(headers, rows, widths) {
  const totalW = widths.reduce((a, b) => a + b, 0);
  const startX = M;
  // Header
  if (doc.y + 24 > H - 80) newPage();
  doc.save();
  doc.rect(startX, doc.y, totalW, 22).fillColor(COLORS.GOLD).fill();
  doc.restore();
  doc.fillColor(COLORS.BG).font("Helvetica-Bold").fontSize(8.5);
  let x = startX;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x + 6, doc.y + 7, { width: widths[i] - 10 });
    x += widths[i];
  }
  doc.y += 22;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    doc.font("Helvetica").fontSize(8.5);
    // medir
    let rowH = 12;
    for (let i = 0; i < row.length; i++) {
      const cellH = doc.heightOfString(String(row[i]), { width: widths[i] - 12 });
      if (cellH > rowH) rowH = cellH;
    }
    rowH += 12;
    if (doc.y + rowH > H - 80) {
      newPage();
      // re-render header
      doc.save();
      doc.rect(startX, doc.y, totalW, 22).fillColor(COLORS.GOLD).fill();
      doc.restore();
      doc.fillColor(COLORS.BG).font("Helvetica-Bold").fontSize(8.5);
      let xh = startX;
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], xh + 6, doc.y + 7, { width: widths[i] - 10 });
        xh += widths[i];
      }
      doc.y += 22;
    }
    const bgColor = r % 2 === 0 ? COLORS.BG2 : COLORS.BG3;
    doc.save();
    doc.rect(startX, doc.y, totalW, rowH).fillColor(bgColor).fill();
    doc.lineWidth(0.4).strokeColor(COLORS.HAIRLINE);
    doc.rect(startX, doc.y, totalW, rowH).stroke();
    doc.restore();
    let cx = startX;
    for (let i = 0; i < row.length; i++) {
      const isFirst = i === 0;
      doc.fillColor(isFirst ? COLORS.GOLD : COLORS.TEXT)
         .font(isFirst ? "Helvetica-Bold" : "Helvetica")
         .fontSize(8.5);
      doc.text(String(row[i]), cx + 6, doc.y + 6, { width: widths[i] - 12, lineGap: 1 });
      cx += widths[i];
    }
    doc.y += rowH;
  }
  doc.moveDown(0.4);
}

// ============= PORTADA =============
doc.y = 80;
doc.fillColor(COLORS.GOLD).font("Helvetica-Bold").fontSize(40);
doc.text("Metodos de Pago", M, doc.y, { width: W - 2 * M });
doc.fillColor(COLORS.GOLD).font("Helvetica-Bold").fontSize(20);
doc.text("Stripe + PayPal + alternativas locales", M, doc.y, { width: W - 2 * M });

doc.moveDown(0.7);
doc.fillColor(COLORS.MUTED).font("Helvetica").fontSize(12);
doc.text(
  "Guia completa de los metodos de pago mas usados en USA, Europa y Latinoamerica. " +
  "Como se implementan, cuanto cuestan y cual conviene a HGG segun su mercado.",
  M, doc.y, { width: W - 2 * M, lineGap: 4 }
);

doc.moveDown(1.5);

// Indice
const toc = [
  ["1.", "Como se ve un checkout moderno"],
  ["2.", "Estados Unidos"],
  ["3.", "Europa (especialmente Espana)"],
  ["4.", "Latinoamerica"],
  ["5.", "Como se implementa Stripe"],
  ["6.", "Como se implementa PSE / Mercado Pago"],
  ["7.", "Comparacion de costos"],
  ["8.", "Recomendacion para HGG"],
];
for (const [num, title] of toc) {
  doc.save();
  doc.rect(M, doc.y, W - 2 * M, 28).fillColor(COLORS.BG2).fill();
  doc.lineWidth(0.4).strokeColor(COLORS.HAIRLINE);
  doc.rect(M, doc.y, W - 2 * M, 28).stroke();
  doc.restore();
  doc.fillColor(COLORS.GOLD).font("Courier-Bold").fontSize(11);
  doc.text(num, M + 14, doc.y + 9, { width: 30 });
  doc.fillColor(COLORS.TEXT).font("Helvetica").fontSize(11);
  doc.text(title, M + 44, doc.y + 9, { width: W - 2 * M - 50 });
  doc.y += 28;
}

// ============ SECCION 1 — CHECKOUT MODERNO ============
newPage();
h1("1. Como se ve un checkout moderno");
body(
  "Antes de hablar de metodos, lo mas importante: NO necesitas cientos de botones. " +
  "Los proveedores modernos (Stripe, Mercado Pago) tienen UN componente unificado que " +
  "automaticamente detecta el pais del cliente y muestra solo los metodos relevantes para el."
);
spacer();

h3("Lo que ve un cliente en USA");
bullet("Tarjeta credito/debito", COLORS.GREEN);
bullet("Apple Pay (si tiene iPhone)", COLORS.GREEN);
bullet("Google Pay (si tiene Android)", COLORS.GREEN);
bullet("Stripe Link (one-click checkout)", COLORS.GREEN);
bullet("Affirm / Afterpay (si el monto > $150 aprox)", COLORS.GREEN);

spacer(8);
h3("Lo que ve un cliente en Espana");
bullet("Tarjeta credito/debito", COLORS.BLUE);
bullet("Apple Pay + Google Pay", COLORS.BLUE);
bullet("Klarna (pago en 3 cuotas sin intereses)", COLORS.BLUE);
bullet("SEPA Direct Debit (para suscripciones)", COLORS.BLUE);
bullet("Stripe Link", COLORS.BLUE);

spacer(8);
h3("Lo que ve un cliente en Colombia");
bullet("Tarjeta credito/debito internacional", COLORS.ORANGE);
bullet("Mercado Pago (que abre PSE, Nequi, Daviplata, etc.)", COLORS.ORANGE);
bullet("PSE directo (si usas Wompi de Bancolombia)", COLORS.ORANGE);

spacer(8);
calloutInfo(
  "Cada cliente solo ve 3-5 opciones relevantes para SU pais y SU dispositivo. " +
  "No hay 'cientos de botones' - Stripe y Mercado Pago hacen el filtrado automatico."
);

// ============ SECCION 2 — USA ============
newPage();
h1("2. Estados Unidos", COLORS.BLUE);
body(
  "USA es el mercado mas estandarizado: tarjetas dominan, Apple Pay y Google Pay tienen " +
  "alta adopcion, BNPL (Buy Now Pay Later) crece rapido."
);
spacer();

table(
  ["METODO", "ADOPCION", "CUANDO USARLO"],
  [
    ["Tarjeta credito/debito", "~90%", "Universal, indispensable. Visa/Mastercard/Amex/Discover"],
    ["Apple Pay", "Alta", "iOS tiene ~50% del market USA. Imprescindible para mobile"],
    ["Google Pay", "Media-alta", "Para Android"],
    ["Stripe Link", "Creciente", "Autocomplete email + tarjeta, mejora conversion +14%"],
    ["Cash App Pay", "Media", "Popular en demografia joven (Gen Z)"],
    ["ACH Direct Debit", "Alta B2B", "Suscripciones recurrentes mensuales"],
    ["Affirm", "Alta high-ticket", "Pagos > $150 en cuotas mensuales"],
    ["Afterpay", "Alta retail", "4 pagos sin intereses, popular en moda y belleza"],
    ["Klarna", "Creciente", "Similar a Afterpay, tambien en USA"],
  ],
  [120, 75, 240]
);

calloutTip(
  "Para HGG: empezar con Tarjeta + Apple Pay + Google Pay + Stripe Link. " +
  "Si vendes servicios > $300, anadir Klarna o Affirm puede subir conversion 20-30%."
);

// ============ SECCION 3 — EUROPA ============
newPage();
h1("3. Europa", COLORS.PURPLE);
body(
  "Europa tiene tarjetas como base universal, mas metodos locales fuertes por pais. " +
  "Lo destacable: cada pais tiene SU metodo dominante distinto al de tarjetas."
);
spacer();

table(
  ["METODO", "PAIS", "NOTAS"],
  [
    ["Tarjeta", "Todos", "Visa/Mastercard. American Express limitado en Europa"],
    ["Apple Pay / Google Pay", "Todos", "Alto uso mobile, especialmente en UK, ES, FR"],
    ["Stripe Link", "Todos", "Buena adopcion creciente"],
    ["SEPA Direct Debit", "Zona SEPA", "Domiciliacion bancaria - mejor para suscripciones B2B"],
    ["Klarna", "DE, SE, NO, DK, FI", "Pago en 3 cuotas o 30 dias sin intereses"],
    ["iDEAL", "Paises Bajos", "70% del e-commerce nacional. Imprescindible para NL"],
    ["Bancontact", "Belgica", "Standard local"],
    ["Giropay", "Alemania", "Transferencia bancaria instantanea"],
    ["EPS", "Austria", "Equivalente a Giropay alemana"],
    ["P24 (Przelewy24)", "Polonia", "Mainstream local"],
    ["Multibanco", "Portugal", "Pago en cajero o app bancaria"],
  ],
  [110, 100, 225]
);

spacer();
calloutWarn(
  "Espana NO tiene metodo local fuerte en Stripe. Bizum (el mas popular) NO esta disponible. " +
  "Si quieres Bizum tendrias que usar Redsys, ServiRed o un PSP local. Para Espana, lo mas " +
  "practico hoy es: Tarjeta + Apple Pay + Google Pay + Klarna."
);

// ============ SECCION 4 — LATAM ============
newPage();
h1("4. Latinoamerica", COLORS.ORANGE);

calloutWarn(
  "Stripe NO esta disponible en todos los paises Latam. Solo tiene cobertura completa en MEXICO y BRASIL. " +
  "Para Colombia, Venezuela, Argentina, Chile, Peru y otros: clientes pueden pagar con tarjeta " +
  "internacional via Stripe, pero los metodos LOCALES (PSE, Nequi, Pix, etc.) requieren OTROS proveedores."
);

spacer();
h2("Mexico (Stripe nativo)");
table(
  ["METODO", "ADOPCION", "NOTAS"],
  [
    ["Tarjeta", "Universal", "Visa/Mastercard/Amex/Carnet"],
    ["OXXO", "~30%", "Voucher para pagar en efectivo en tiendas OXXO"],
    ["SPEI", "Alta B2B", "Transferencia interbancaria instantanea"],
    ["Apple Pay / Google Pay", "Creciente", "Mobile en zonas urbanas"],
    ["Mercado Pago", "Alta", "NO esta en Stripe - integracion separada"],
  ],
  [110, 90, 235]
);

spacer();
h2("Brasil (Stripe nativo)");
table(
  ["METODO", "ADOPCION", "NOTAS"],
  [
    ["Pix", "~80%", "Pago instantaneo del Banco Central. EL mas usado"],
    ["Boleto Bancario", "Alta", "Voucher de pago en efectivo o app bancaria"],
    ["Tarjeta", "Universal", "Visa/Mastercard/Elo/Hipercard"],
    ["Apple Pay / Google Pay", "Creciente", "Mobile, en aumento"],
  ],
  [110, 90, 235]
);

newPage();
h2("Resto de Latam (Stripe no soporta, usar alternativas)");
body(
  "Para Colombia, Venezuela, Argentina, Chile, Peru, Ecuador, Bolivia, Uruguay, Paraguay, " +
  "Republica Dominicana, etc. necesitas otros proveedores:"
);
spacer();

table(
  ["PROVEEDOR", "COBERTURA", "METODOS DESTACADOS"],
  [
    ["Mercado Pago", "Toda Latam", "Cards, PSE (CO), Pix (BR), Nequi, billetera MP, Cuotas"],
    ["dLocal", "Toda Latam", "One-stop con todos los metodos locales por pais"],
    ["EBANX", "Toda Latam", "Similar a dLocal, fuerte en Brasil y Mexico"],
    ["Wompi (Bancolombia)", "Colombia", "PSE, Nequi, Bancolombia transfer, cards"],
    ["PayU Latam", "Multi-pais", "Cards + metodos locales por pais"],
    ["RapiPago / PagoFacil", "Argentina", "Voucher en efectivo en kioscos"],
    ["Webpay Plus", "Chile", "El metodo dominante en Chile"],
  ],
  [125, 100, 210]
);

spacer();
calloutInfo(
  "Para tu mercado actual de HGG (Venezuela, Colombia, Espana, USA, Mexico), la combinacion " +
  "MAS practica seria: Stripe (para USA, EU y MEX) + PayPal (para todos) + Mercado Pago (para CO, " +
  "ya que cubre PSE y Nequi en un solo proveedor)."
);

// ============ SECCION 5 — IMPLEMENTAR STRIPE ============
newPage();
h1("5. Como se implementa Stripe");
body(
  "Stripe usa un componente llamado 'Payment Element' que es UNA sola pieza de UI que se adapta " +
  "automaticamente al cliente. No tienes que programar cada metodo de pago por separado."
);

spacer();
h3("Paso 1 - Configurar metodos en Dashboard");
body(
  "Entras a tu cuenta Stripe -> Settings -> Payment methods. Veras una lista con TODOS los metodos " +
  "disponibles. Activas los que quieras con un toggle. Algunos requieren aprobacion (Klarna, Affirm) " +
  "que tarda 1-2 dias."
);

spacer();
h3("Paso 2 - Codigo del frontend");
body(
  "Pones UN solo componente en tu checkout. En React es asi de simple:"
);

spacer(4);
doc.save();
doc.roundedRect(M, doc.y, W - 2 * M, 90, 4).fillColor(COLORS.BG3).fill();
doc.lineWidth(0.5).strokeColor(COLORS.HAIRLINE)
   .roundedRect(M, doc.y, W - 2 * M, 90, 4).stroke();
doc.restore();
doc.fillColor(COLORS.GREEN).font("Courier").fontSize(8.5);
const codeLines = [
  "import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';",
  "",
  "function CheckoutForm() {",
  "  return (",
  "    <form>",
  "      <PaymentElement />  {/* Aqui Stripe muestra TODO automaticamente */}",
  "      <button>Pagar</button>",
  "    </form>",
  "  );",
  "}",
];
let cy = doc.y + 8;
for (const line of codeLines) {
  doc.text(line, M + 10, cy, { width: W - 2 * M - 20, lineBreak: false });
  cy += 11;
}
doc.y += 96;

spacer(4);
h3("Paso 3 - El cliente ve solo lo relevante");
body(
  "Cuando un cliente abre el checkout, Stripe automaticamente:"
);
bullet("Detecta su ubicacion (por IP + billing address)");
bullet("Detecta su dispositivo (iOS/Android para Apple Pay/Google Pay)");
bullet("Detecta el monto (oculta BNPL si es muy bajo, los muestra si > $150)");
bullet("Muestra solo los metodos relevantes con un selector limpio");

spacer();
calloutInfo(
  "Resultado: el cliente en USA ve 4 opciones, el de Espana ve 5, el de Mexico ve 4. " +
  "Cada uno solo ve lo que puede usar. Tu solo programaste UN componente."
);

// ============ SECCION 6 — MERCADO PAGO / PSE ============
newPage();
h1("6. Como se implementa PSE / Mercado Pago", COLORS.ORANGE);
body(
  "Mercado Pago tiene un sistema similar: el 'Checkout Pro' o 'Checkout Bricks'. " +
  "Es UN componente que abre un flujo con todas las opciones locales."
);

spacer();
h3("Opcion A - Checkout Pro (mas simple)");
bullet("Pones UN boton 'Pagar con Mercado Pago' en tu checkout");
bullet("Cliente hace click -> se abre ventana de Mercado Pago");
bullet("Cliente elige metodo: Tarjeta, PSE (CO), Pix (BR), Nequi, billetera MP, etc.");
bullet("Si elige PSE -> Mercado Pago le muestra la lista de bancos");
bullet("Cliente confirma -> vuelve a tu web con resultado");

spacer();
h3("Opcion B - Checkout Bricks (embebido en tu sitio)");
bullet("Componente embebido en tu pagina (sin redirect)");
bullet("Cliente ve todos los metodos disponibles directamente en tu sitio");
bullet("Similar al Stripe Payment Element pero para Latam");

spacer();
h3("Como funciona PSE especificamente");
body(
  "PSE (Pagos Seguros en Linea) es el sistema oficial de transferencias del sistema financiero colombiano. " +
  "El flujo es siempre el mismo:"
);
bullet("Cliente selecciona 'PSE' o 'Debito desde cuenta bancaria'", COLORS.ORANGE);
bullet("Se abre un dropdown con TODOS los bancos colombianos (Bancolombia, Davivienda, BBVA, etc.)", COLORS.ORANGE);
bullet("Cliente selecciona su banco", COLORS.ORANGE);
bullet("Se redirige al sitio web de SU banco", COLORS.ORANGE);
bullet("Cliente hace login en su banco normal", COLORS.ORANGE);
bullet("Autoriza el debito desde su cuenta", COLORS.ORANGE);
bullet("Vuelve a tu sitio con confirmacion", COLORS.ORANGE);

spacer();
calloutTip(
  "PSE es MUY confiable en Colombia. Es la forma estandar de pagar online sin tarjeta. " +
  "Casi todo colombiano con cuenta bancaria sabe usarlo. Tasa de exito > 95%."
);

// ============ SECCION 7 — COSTOS ============
newPage();
h1("7. Comparacion de costos");
body(
  "Lo que cada proveedor cobra por transaccion. Estos numeros varian por pais, " +
  "tipo de cliente y volumen, pero te dan una idea aproximada."
);

spacer();
table(
  ["PROVEEDOR", "USA", "EUROPA", "LATAM"],
  [
    ["Stripe (tarjeta)", "2.9% + $0.30", "1.5% + 0.25€ EU / 2.5% no-EU", "3.6% + $3 MXN / no en todo Latam"],
    ["Stripe Link", "Igual que tarjeta", "Igual que tarjeta", "N/A"],
    ["Apple/Google Pay", "Igual que tarjeta", "Igual que tarjeta", "Igual que tarjeta"],
    ["Klarna (BNPL)", "Stripe + 6%", "Stripe + ~6%", "N/A"],
    ["Affirm/Afterpay", "Stripe + 6%", "N/A", "N/A"],
    ["PayPal", "3.49% + $0.49", "1.9-3.4% + fee fijo", "3.49% + fee"],
    ["Mercado Pago", "N/A", "N/A", "3.99-4.99% + impuestos"],
    ["Wompi (CO)", "N/A", "N/A", "2.99% + COP 900 + IVA"],
    ["dLocal", "N/A", "N/A", "Negociable, ~3-5%"],
  ],
  [125, 100, 110, 100]
);

spacer();
calloutInfo(
  "OBSERVACIONES IMPORTANTES: 1) Los fees fijos pequenos (como $0.30) son significativos para " +
  "ventas pequenas ($1-$10). Para alto volumen, negocias mejor tarifa. 2) PayPal es MAS CARO " +
  "que Stripe en general pero tiene mayor cobertura. 3) Mercado Pago aplica IVA en pais de cobro."
);

// ============ SECCION 8 — RECOMENDACION ============
newPage();
h1("8. Recomendacion para HGG");
body(
  "Mirando tus testimonios y mercados (Venezuela, Colombia, USA, Espana, posiblemente Mexico), " +
  "te propongo un plan progresivo. Cada fase aporta cobertura adicional."
);

spacer();
h3("Fase 0 - Lo que ya tienes (ahora)");
bullet("PayPal: tarjetas + cuenta PayPal", COLORS.GREEN);
body("Cobertura: ~80% mundial. Es lo que esta funcionando hoy.", { color: COLORS.MUTED, size: 9 });

spacer(8);
h3("Fase 1 - Anadir Stripe (recomendado a corto plazo)");
bullet("Stripe con: Tarjeta + Apple Pay + Google Pay + Link", COLORS.BLUE);
body(
  "Cobertura: USA, Europa entera, Latam con tarjeta internacional. " +
  "Boost de conversion estimado: +20-30% (Apple Pay y Google Pay reducen friccion en mobile). " +
  "Tiempo de integracion: 4-6 horas.",
  { color: COLORS.MUTED, size: 9 }
);

spacer(8);
h3("Fase 2 - Anadir Mercado Pago (para Latam local)");
bullet("Mercado Pago Checkout Pro o Bricks", COLORS.ORANGE);
body(
  "Cobertura local en Colombia (PSE, Nequi), Argentina (Mercado Credito), " +
  "Mexico (OXXO via MP), Brasil (Pix via MP), Chile (Webpay via MP). " +
  "Tiempo de integracion: 6-8 horas.",
  { color: COLORS.MUTED, size: 9 }
);

spacer(8);
h3("Fase 3 - Solo si crece el volumen (>$5k/mes en Latam)");
bullet("Anadir Wompi (Colombia) o dLocal (toda Latam)", COLORS.PURPLE);
body(
  "Mejores fees que Mercado Pago para volumen alto. Solo se justifica cuando ya tienes " +
  "ventas regulares y los fees suman.",
  { color: COLORS.MUTED, size: 9 }
);

spacer(12);
h3("Lo que pediria YO en orden");
bullet("1. Terminar lo de PayPal Live (es la fase que vas)");
bullet("2. Anadir Stripe en proxima iteracion (Fase 1 arriba)");
bullet("3. Migrar a Vite + IONOS como ya planeamos");
bullet("4. Mientras tanto monitorear de donde vienen los clientes que abandonan checkout");
bullet("5. Si ves muchos colombianos abandonando -> Fase 2 (Mercado Pago)");
bullet("6. Si llegas a $5k/mes en Latam -> Fase 3 (Wompi/dLocal)");

spacer(12);
calloutTip(
  "Mi recomendacion mas honesta: NO complicar el checkout antes de tiempo. " +
  "Con PayPal + Stripe cubres el 85% de tu mercado actual. Anadir proveedores " +
  "Latam tiene sentido cuando ves DEMANDA real (clientes que pierdes por falta de PSE)."
);

// FOOTER FINAL
spacer(20);
doc.fillColor(COLORS.GOLD).font("Helvetica-Bold").fontSize(10);
doc.text("- Holman Global Group", M, doc.y, { width: W - 2 * M });

doc.end();
console.log(`PDF generado: ${OUT}`);
