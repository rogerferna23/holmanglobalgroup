// Genera HGG-Setup-Guia.pdf con pdfkit.
// Ejecutar: node .tmp/generate-setup-pdf.js
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const OUT = path.resolve(__dirname, "..", "HGG-Setup-Guia.pdf");

// Paleta HGG
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
  BLUE: "#6FA8E0",
  WARN_BG: "#3A1F0E",
  WARN_BORDER: "#FF8A3D",
  WARN_TEXT: "#FFB088",
  INFO_BG: "#0E1A28",
};

const doc = new PDFDocument({
  size: "A4",
  margin: 60,
  bufferPages: true,
  info: {
    Title: "HGG — Guía de Setup",
    Author: "HGG",
    Subject: "Setup completo del panel admin y pagos",
  },
});

doc.pipe(fs.createWriteStream(OUT));

// Helpers
const W = doc.page.width;
const H = doc.page.height;
const M = 60; // margin

function drawBackground() {
  doc.save();
  doc.rect(0, 0, W, H).fill(COLORS.BG);
  // linea dorada arriba
  doc.lineWidth(2).strokeColor(COLORS.GOLD)
     .moveTo(M, 40).lineTo(W - M, 40).stroke();
  // headers
  doc.fillColor(COLORS.MUTED2).fontSize(8).font("Helvetica");
  doc.text("HGG — Holman Global Group", M, 25);
  doc.text("Guía de Setup", W - M - 100, 25, { width: 100, align: "right" });
  // footer
  doc.lineWidth(0.5).strokeColor(COLORS.HAIRLINE)
     .moveTo(M, H - 50).lineTo(W - M, H - 50).stroke();
  doc.fillColor(COLORS.MUTED2).fontSize(8);
  doc.text("hgg.studio", M, H - 35);
  doc.text(`Página ${doc.bufferedPageRange().count}`, W - M - 100, H - 35, {
    width: 100, align: "right",
  });
  doc.restore();
}

function newPage() {
  doc.addPage();
  drawBackground();
  doc.y = M + 5;
}

function h1(text) {
  if (doc.y > H - 180) newPage();
  doc.fillColor(COLORS.GOLD).font("Helvetica-Bold").fontSize(22);
  doc.text(text, M, doc.y, { width: W - 2 * M });
  doc.moveDown(0.4);
}

function h2(text) {
  if (doc.y > H - 150) newPage();
  doc.fillColor(COLORS.TEXT).font("Helvetica-Bold").fontSize(15);
  doc.text(text, M, doc.y, { width: W - 2 * M });
  doc.moveDown(0.3);
}

function h3(text) {
  if (doc.y > H - 130) newPage();
  doc.moveDown(0.4);
  doc.fillColor(COLORS.GOLD).font("Helvetica-Bold").fontSize(11);
  doc.text(text, M, doc.y, { width: W - 2 * M });
  doc.moveDown(0.2);
}

function body(text, opts = {}) {
  doc.fillColor(opts.color || COLORS.TEXT).font(opts.font || "Helvetica").fontSize(opts.size || 9.5);
  doc.text(text, M, doc.y, {
    width: W - 2 * M,
    lineGap: 2,
    align: "left",
    ...opts,
  });
  doc.moveDown(0.3);
}

function muted(text) {
  body(text, { color: COLORS.MUTED, size: 9 });
}

function spacer(h = 8) {
  doc.y += h;
}

function code(text) {
  doc.font("Courier").fontSize(8.5).fillColor(COLORS.GOLD);
  const padding = 6;
  const width = W - 2 * M;
  const lines = text.split("\n");
  const lineHeight = 12;
  const boxHeight = lines.length * lineHeight + padding * 2;
  if (doc.y + boxHeight > H - 80) newPage();
  doc.save();
  doc.rect(M, doc.y, width, boxHeight).fillColor(COLORS.BG3).fill();
  doc.lineWidth(0.5).strokeColor(COLORS.HAIRLINE)
     .rect(M, doc.y, width, boxHeight).stroke();
  doc.restore();
  doc.fillColor(COLORS.GOLD).font("Courier").fontSize(8.5);
  let y = doc.y + padding;
  for (const line of lines) {
    doc.text(line, M + padding, y, { width: width - 2 * padding, lineBreak: false });
    y += lineHeight;
  }
  doc.y = doc.y + boxHeight + 6;
  doc.font("Helvetica");
}

function calloutWarn(text) {
  callout(text, COLORS.WARN_BG, COLORS.WARN_BORDER, COLORS.WARN_TEXT);
}

function calloutInfo(text) {
  callout(text, COLORS.INFO_BG, COLORS.BLUE, COLORS.BLUE);
}

function callout(text, bg, border, color) {
  doc.font("Helvetica").fontSize(9);
  const padding = 8;
  const width = W - 2 * M;
  const innerWidth = width - 2 * padding;
  doc.fillColor(color);
  // medir altura
  const h = doc.heightOfString(text, { width: innerWidth, lineGap: 2 }) + 2 * padding;
  if (doc.y + h > H - 80) newPage();
  doc.save();
  doc.rect(M, doc.y, width, h).fillColor(bg).fill();
  doc.lineWidth(0.7).strokeColor(border).rect(M, doc.y, width, h).stroke();
  doc.restore();
  doc.fillColor(color).text(text, M + padding, doc.y + padding, {
    width: innerWidth, lineGap: 2,
  });
  doc.y = doc.y - h + h + 8;
  doc.font("Helvetica").fontSize(9.5);
}

function numbered(steps) {
  doc.font("Helvetica").fontSize(9.5);
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (doc.y > H - 100) newPage();
    const num = `${i + 1}.`;
    doc.fillColor(COLORS.GOLD).font("Helvetica-Bold");
    doc.text(num, M, doc.y, { width: 20, continued: false });
    const startY = doc.y - 12;
    if (typeof step === "string") {
      doc.fillColor(COLORS.TEXT).font("Helvetica");
      doc.text(step, M + 20, startY, { width: W - 2 * M - 20 });
    } else {
      const [title, detail] = step;
      doc.fillColor(COLORS.TEXT).font("Helvetica-Bold");
      doc.text(title, M + 20, startY, { width: W - 2 * M - 20 });
      doc.fillColor(COLORS.MUTED).font("Helvetica").fontSize(8.5);
      doc.text(detail, M + 20, doc.y, { width: W - 2 * M - 20, lineGap: 1.5 });
      doc.fontSize(9.5);
    }
    doc.moveDown(0.3);
  }
}

function envTable(rows) {
  const colWidths = [150, 170, 160];
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  // Header
  if (doc.y + 30 > H - 100) newPage();
  doc.save();
  doc.rect(M, doc.y, totalW, 22).fillColor(COLORS.GOLD).fill();
  doc.restore();
  doc.fillColor(COLORS.BG).font("Helvetica-Bold").fontSize(8);
  doc.text("VARIABLE", M + 6, doc.y + 7, { width: colWidths[0] - 10 });
  doc.text("DESCRIPCIÓN", M + colWidths[0] + 6, doc.y + 7, { width: colWidths[1] - 10 });
  doc.text("DÓNDE OBTENER", M + colWidths[0] + colWidths[1] + 6, doc.y + 7, { width: colWidths[2] - 10 });
  doc.y += 22;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    // medir altura segun cell mas larga
    doc.font("Helvetica").fontSize(8.5);
    const h0 = doc.heightOfString(r[0], { width: colWidths[0] - 12 });
    const h1 = doc.heightOfString(r[1], { width: colWidths[1] - 12 });
    const h2 = doc.heightOfString(r[2], { width: colWidths[2] - 12 });
    const rowH = Math.max(h0, h1, h2) + 12;

    if (doc.y + rowH > H - 80) {
      newPage();
      // re-render header
      doc.save();
      doc.rect(M, doc.y, totalW, 22).fillColor(COLORS.GOLD).fill();
      doc.restore();
      doc.fillColor(COLORS.BG).font("Helvetica-Bold").fontSize(8);
      doc.text("VARIABLE", M + 6, doc.y + 7, { width: colWidths[0] - 10 });
      doc.text("DESCRIPCIÓN", M + colWidths[0] + 6, doc.y + 7, { width: colWidths[1] - 10 });
      doc.text("DÓNDE OBTENER", M + colWidths[0] + colWidths[1] + 6, doc.y + 7, { width: colWidths[2] - 10 });
      doc.y += 22;
    }

    const bgColor = i % 2 === 0 ? COLORS.BG2 : COLORS.BG3;
    doc.save();
    doc.rect(M, doc.y, totalW, rowH).fillColor(bgColor).fill();
    doc.lineWidth(0.4).strokeColor(COLORS.HAIRLINE);
    doc.rect(M, doc.y, totalW, rowH).stroke();
    doc.restore();

    // col 1: variable name (courier dorado)
    doc.fillColor(COLORS.GOLD).font("Courier-Bold").fontSize(8);
    doc.text(r[0], M + 6, doc.y + 6, { width: colWidths[0] - 12 });
    // col 2: descripcion
    doc.fillColor(COLORS.TEXT).font("Helvetica").fontSize(8.5);
    doc.text(r[1], M + colWidths[0] + 6, doc.y + 6, { width: colWidths[1] - 12, lineGap: 1 });
    // col 3: donde
    doc.fillColor(COLORS.MUTED).font("Helvetica").fontSize(8);
    doc.text(r[2], M + colWidths[0] + colWidths[1] + 6, doc.y + 6, { width: colWidths[2] - 12, lineGap: 1 });

    doc.y += rowH;
  }
  doc.moveDown(0.4);
}

function checklist(items) {
  doc.font("Helvetica").fontSize(9.5);
  for (const it of items) {
    if (doc.y > H - 90) newPage();
    doc.save();
    doc.rect(M, doc.y, W - 2 * M, 22).fillColor(COLORS.BG2).fill();
    doc.lineWidth(0.4).strokeColor(COLORS.HAIRLINE)
       .moveTo(M, doc.y + 22).lineTo(W - M, doc.y + 22).stroke();
    doc.restore();
    doc.fillColor(COLORS.MUTED).font("Courier-Bold").fontSize(10);
    doc.text("[ ]", M + 8, doc.y + 6, { width: 24, continued: false });
    doc.fillColor(COLORS.TEXT).font("Helvetica").fontSize(9.5);
    doc.text(it, M + 32, doc.y + 6, { width: W - 2 * M - 40, lineGap: 1 });
    doc.y += 22;
  }
  doc.moveDown(0.3);
}

// ===================== PORTADA =====================
drawBackground();
doc.y = M + 100;

doc.fillColor(COLORS.GOLD).font("Helvetica-Bold").fontSize(48);
doc.text("HGG", M, doc.y, { width: W - 2 * M });

doc.fillColor(COLORS.GOLD).font("Helvetica-Bold").fontSize(28);
doc.text("Guía de Setup", M, doc.y, { width: W - 2 * M });

doc.moveDown(0.5);
doc.fillColor(COLORS.MUTED).font("Helvetica").fontSize(12);
doc.text(
  "Todo lo que tú necesitas hacer para que la web, el panel admin " +
  "y los métodos de pago funcionen en producción.",
  M, doc.y, { width: W - 2 * M, lineGap: 4 }
);

doc.moveDown(1);

// Indice
const toc = [
  ["1.", "Variables de entorno en Vercel"],
  ["2.", "Supabase (base de datos)"],
  ["3.", "PayPal (cobrar online)"],
  ["4.", "Wise (transferencia bancaria)"],
  ["5.", "Encriptación de datos (opcional)"],
  ["6.", "Probar todo end-to-end"],
  ["7.", "Salir a producción (checklist final)"],
];

for (const [num, title] of toc) {
  doc.save();
  doc.rect(M, doc.y, W - 2 * M, 28).fillColor(COLORS.BG2).fill();
  doc.lineWidth(0.4).strokeColor(COLORS.HAIRLINE);
  doc.rect(M, doc.y, W - 2 * M, 28).stroke();
  doc.restore();
  doc.fillColor(COLORS.GOLD).font("Courier-Bold").fontSize(11);
  doc.text(num, M + 14, doc.y + 9, { width: 30, continued: false });
  doc.fillColor(COLORS.TEXT).font("Helvetica").fontSize(11);
  doc.text(title, M + 44, doc.y + 9, { width: W - 2 * M - 50 });
  doc.y += 28;
}

doc.moveDown(1.5);
doc.fillColor(COLORS.MUTED2).font("Helvetica-Oblique").fontSize(10);
doc.text(
  "Estima: 30-45 min total. La mayoría es copiar-pegar. Si te atascas en algo, escríbeme.",
  M, doc.y, { width: W - 2 * M }
);

// ===================== SECCIÓN 1: ENV VARS =====================
newPage();
h1("1. Variables de entorno en Vercel");
body(
  "Las variables de entorno son secretos que tu sitio necesita para funcionar pero " +
  "no deben estar en el código. Se configuran en el dashboard de Vercel y se aplican " +
  "tras cada Redeploy."
);
spacer();

h3("Cómo añadirlas");
numbered([
  ["Entrar a Vercel", "https://vercel.com → tu proyecto holmanglobalgroup"],
  ["Abrir Settings", "Menú superior → pestaña Settings"],
  ["Ir a Environment Variables", "Sidebar izquierdo → Environment Variables"],
  ["Añadir cada variable", "Add New → Key + Value → marcar Production + Preview + Development → Save"],
  ["Redeploy", "Después de añadir todas: Deployments → último deploy → ... → Redeploy"],
]);

spacer(14);
h3("Variables OBLIGATORIAS (sin esto la web no funciona)");
envTable([
  ["ADMIN_EMAIL", "Tu email para entrar al panel admin", "Lo eliges tú"],
  ["ADMIN_PASSWORD", "Tu contraseña para entrar al panel", "Lo eliges tú (16+ chars, mezcla letras/números/símbolos)"],
  ["ADMIN_SESSION_SECRET", "Clave para firmar las cookies de sesión", "Generar 32+ caracteres aleatorios (ver página siguiente)"],
  ["NEXT_PUBLIC_SUPABASE_URL", "URL de tu proyecto Supabase", "Supabase → Settings → API → Project URL"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Llave pública de Supabase (segura para cliente)", "Supabase API → Publishable key"],
  ["SUPABASE_SERVICE_ROLE_KEY", "Llave secreta de Supabase (servidor)", "Supabase API → Secret key (¡NO compartir!)"],
]);

newPage();
h3("Generar el ADMIN_SESSION_SECRET");
body("Es una cadena aleatoria de mínimo 32 caracteres. Puedes usar cualquier método:");
body("Opción 1 — En PowerShell (Windows):");
code(`-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})`);
body("Opción 2 — Online:");
body(
  "Ir a https://www.random.org/strings/ → generar 1 string de 48 caracteres alfanuméricos."
);
calloutWarn(
  "IMPORTANTE: Guarda este secret donde guardas otros passwords (1Password, " +
  "Bitwarden, etc). Si lo pierdes y lo regeneras, todas las sesiones activas quedan " +
  "invalidadas y todos los admins deben volver a hacer login."
);

spacer(14);
h3("Variables para PAGOS (PayPal)");
envTable([
  ["NEXT_PUBLIC_PAYPAL_CLIENT_ID", "ID público de tu app PayPal", "PayPal Developer → tu app → Client ID"],
  ["PAYPAL_CLIENT_SECRET", "Secret de tu app PayPal", "PayPal Developer → tu app → Secret"],
  ["PAYPAL_ENV", "sandbox o live", "Pon 'sandbox' para pruebas, 'live' para cobros reales"],
  ["PAYPAL_WEBHOOK_ID", "ID del webhook (Fase 3)", "PayPal Developer → Webhooks → tu webhook → ID"],
  ["NEXT_PUBLIC_PAYMENT_CURRENCY", "Moneda principal (USD o EUR)", "Lo eliges tú — recomendado USD"],
]);

spacer(14);
h3("Variables para PAGOS (Wise / Transferencia)");
envTable([
  ["NEXT_PUBLIC_WISE_PAYMENT_LINK", "Link de pago Wise (si tienes uno)", "Wise → Send → Request → Get link"],
  ["NEXT_PUBLIC_WISE_HOLDER", "Nombre del titular de la cuenta", "Como aparece en tu Wise"],
  ["NEXT_PUBLIC_WISE_IBAN", "IBAN para transferencias", "Wise → Tu cuenta EUR"],
  ["NEXT_PUBLIC_WISE_SWIFT", "SWIFT/BIC", "Wise → Tu cuenta"],
  ["NEXT_PUBLIC_WISE_BANK", "Nombre del banco emisor", "Generalmente 'Wise Europe SA' o similar"],
  ["NEXT_PUBLIC_WISE_REFERENCE_PREFIX", "Prefijo de referencia (default 'HGG')", "Lo eliges tú"],
]);

spacer(14);
h3("Variables OPCIONALES (mejoran seguridad)");
envTable([
  ["PII_ENCRYPTION_KEY", "Encripta datos sensibles de clientes en BD", "Generar 32 bytes base64 (ver Sección 5)"],
  ["NEXT_PUBLIC_SITE_URL", "URL canónica (ej. https://hgg.studio)", "Tu dominio principal"],
]);

// ===================== SECCIÓN 2: SUPABASE =====================
newPage();
h1("2. Supabase (base de datos)");
body(
  "Supabase guarda permanentemente: ventas, gastos, vendedores, sesiones, audit log y " +
  "los usuarios admin que crees desde el panel. Sin Supabase, los datos viven solo en " +
  "el navegador (localStorage)."
);
spacer();

h3("2.1 Crear el proyecto");
numbered([
  ["Ir a Supabase", "https://supabase.com → Start your project"],
  ["Login con GitHub", "Mejor opción para no manejar otra contraseña"],
  ["New Project", "Nombre: hgg-admin · Region: la más cercana a tus clientes · Plan: Free"],
  ["Esperar 2 minutos", "Mientras provisiona la base de datos"],
  ["Copiar credenciales", "Settings → API: Project URL, Publishable key, Secret key (estas 3 son env vars)"],
]);

spacer(10);
h3("2.2 Crear las tablas (correr SQL)");
body(
  "En Supabase: SQL Editor (icono izquierdo) → New query → pegar TODO el bloque de código " +
  "que te envié por separado (lo llamamos 'schema completo HGG') → click Run."
);
body(
  "Verás 'Success. No rows returned'. Verifica en Table Editor que aparecen las tablas: " +
  "manual_sales, expenses, vendors, admin_users, approval_requests, admin_sessions, audit_log."
);
calloutInfo("Si ya corriste el bloque Fase 1 + Fase 2: ya está hecho, salta este paso.");

// ===================== SECCIÓN 3: PAYPAL =====================
newPage();
h1("3. PayPal (cobrar online)");
body(
  "PayPal procesa pagos con tarjeta y cuentas PayPal. Tiene dos entornos: " +
  "sandbox (para pruebas, no cobra dinero real) y live (cobros reales)."
);

h3("3.1 Crear cuenta business + app");
numbered([
  ["Crear cuenta business", "https://www.paypal.com/business — necesitas verificar identidad y banco"],
  ["Entrar al Developer Dashboard", "https://developer.paypal.com → Login con tu cuenta business"],
  ["Crear una App", "Apps & Credentials → Default Application (o New App): pon nombre 'HGG'"],
  ["Modo Sandbox primero", "PayPal te da automáticamente credenciales SANDBOX (test). Las copias así:"],
  ["Copiar Client ID y Secret SANDBOX",
   "Client: NEXT_PUBLIC_PAYPAL_CLIENT_ID  |  Secret: PAYPAL_CLIENT_SECRET  |  PAYPAL_ENV=sandbox"],
  ["Probar pagos con cuentas sandbox",
   "PayPal te crea cuentas de prueba (Sandbox Accounts). Úsalas para pagar y validar que el flujo funciona."],
]);

spacer(10);
h3("3.2 Pasar a LIVE (cuando ya pruebes que todo funciona)");
numbered([
  ["Cambiar a Live", "En PayPal Developer Dashboard → toggle arriba de Sandbox/Live → Live"],
  ["Copiar Client ID y Secret LIVE",
   "Estos son DIFERENTES de los sandbox. Actualiza en Vercel: NEXT_PUBLIC_PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET"],
  ["Cambiar PAYPAL_ENV", "En Vercel: cambiar PAYPAL_ENV de 'sandbox' a 'live'"],
  ["Redeploy", "Aplicar los cambios"],
  ["PRUEBA con 1 USD real",
   "Crear un producto de $1 temporal y comprarlo TÚ mismo con una tarjeta real. Confirmas que llega el dinero a tu PayPal business."],
]);

spacer(10);
h3("3.3 Configurar Webhook (Fase 3 — recomendado)");
body(
  "El webhook te notifica automáticamente cuando PayPal procesa un pago, hace un refund o lo deniega. " +
  "Sin webhook, si tu server se cae a mitad de captura, no te enteras del estado."
);
numbered([
  ["En PayPal Developer Dashboard", "Webhooks → Add Webhook"],
  ["Webhook URL", "https://hgg.studio/api/paypal/webhook"],
  ["Eventos a suscribirse (todos):",
   "CHECKOUT.ORDER.COMPLETED · PAYMENT.CAPTURE.COMPLETED · PAYMENT.CAPTURE.DENIED · PAYMENT.CAPTURE.REFUNDED · PAYMENT.CAPTURE.REVERSED"],
  ["Save Webhook", "PayPal te genera un Webhook ID — cópialo"],
  ["Añadir a Vercel", "Env var: PAYPAL_WEBHOOK_ID = <el id que te dio PayPal>"],
  ["Redeploy", "Aplicar"],
]);

calloutInfo("Los webhooks de sandbox y live son distintos. Crea uno en cada entorno cuando los uses.");

// ===================== SECCIÓN 4: WISE =====================
newPage();
h1("4. Wise (transferencia bancaria)");
body(
  "Wise es opcional, pero útil para clientes que prefieren transferencia y para pagos en EUR sin " +
  "fees altos. Hay dos modos de cobro:"
);
spacer();

h3("4.1 Modo A: Link de pago Wise (más fácil)");
body(
  "Si tienes cuenta business en Wise (Wise Business), puedes crear un 'Payment Link' que tus clientes " +
  "abren y completan el pago en wise.com."
);
numbered([
  ["Wise Business", "https://wise.com/business — abrir cuenta business gratuita"],
  ["Crear Payment Link", "Send → Request Payment → Get a link — guarda la URL"],
  ["Añadir a Vercel", "NEXT_PUBLIC_WISE_PAYMENT_LINK = <url completa>"],
  ["Aparece en el checkout", "En el modal de checkout, aparecerá 'Pagar con link de Wise'"],
]);

spacer(10);
h3("4.2 Modo B: Transferencia bancaria manual (tradicional)");
body(
  "El cliente ve tus datos bancarios y hace una transferencia normal. Tú lo verificas manualmente en Wise."
);
numbered([
  ["Añadir datos en Vercel", "Las env vars NEXT_PUBLIC_WISE_HOLDER, IBAN, SWIFT, BANK"],
  ["Cómo obtenerlas", "Wise → Tu cuenta EUR → Mostrar datos bancarios"],
  ["Aparece en checkout", "El cliente ve titular, IBAN, SWIFT, banco y un botón para copiar cada uno"],
  ["Concepto/Referencia",
   "Importante: el cliente debe incluir la referencia HGG-XXX en el concepto para que tú identifiques el pago"],
]);

calloutInfo("Puedes activar AMBOS modos simultáneamente — el cliente elegirá.");

// ===================== SECCIÓN 5: PII =====================
newPage();
h1("5. Encriptación de datos PII (opcional)");
body(
  "Si decides activar esta capa extra de seguridad, los nombres, emails y teléfonos de tus clientes " +
  "se guardarán encriptados en la base de datos. Aunque alguien obtenga un dump de la BD, no podrá " +
  "leer esos datos sin la clave."
);

h3("Para activar:");
numbered([
  ["Generar una clave de 32 bytes en base64",
   "Abrir PowerShell o terminal y correr el siguiente comando:"],
]);
code(`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`);
numbered([
  ["Copiar el resultado", "Será algo como: 'fL3DlvoPr20whpNzn587eAXmOyaMsKiBTWSukJEZtCY='"],
  ["Añadir a Vercel", "Env var: PII_ENCRYPTION_KEY = <la cadena que copiaste>"],
  ["Redeploy",
   "Tras esto, NUEVOS clientes se guardan encriptados; los existentes siguen en plano"],
  ["Guardar la key",
   "¡EN UN GESTOR DE PASSWORDS! Si la pierdes, los datos encriptados son irrecuperables."],
]);

calloutInfo(
  "Recomendación: activa esto solo cuando tengas tu primer cliente real con datos sensibles. " +
  "Mientras pruebas, déjalo desactivado para no complicar el debugging."
);

// ===================== SECCIÓN 6: TESTING =====================
newPage();
h1("6. Probar todo end-to-end");
body("Antes de salir a producción, valida que cada pieza funciona. Sigue esta secuencia:");
spacer();

h3("Tests obligatorios");
checklist([
  "La web pública carga (hgg.studio) sin errores",
  "Puedes hacer login en /admin con tu ADMIN_EMAIL/PASSWORD",
  "La página /admin/auditoria muestra entradas (al menos tu login)",
  "Configuración → Sesiones activas: aparece tu sesión actual marcada",
  "Puedes crear una venta manual desde Reportes → Ventas Manuales",
  "Puedes exportar a Excel desde Reportes → Exportar Excel",
  "Puedes añadir un gasto desde Reportes → Registro de Gastos",
  "En /tienda, hacer click en 'Pagar con PayPal' abre el modal",
  "En SANDBOX: completar un pago con cuenta de prueba PayPal funciona",
  "Pasar a LIVE y comprar 1 USD con tarjeta REAL — verificar que el dinero llega a tu PayPal",
  "Configurar webhook de PayPal y verificar que aparecen eventos en /admin/auditoria",
  "Si activaste Wise: el modal de checkout muestra los datos bancarios correctos",
  "Logout funciona (te echa del admin)",
  "Después de logout, /admin/auditoria registra 'logout'",
]);

// ===================== SECCIÓN 7: GO LIVE =====================
newPage();
h1("7. Salir a producción (checklist final)");
body("Antes de anunciar la web a clientes reales:");
spacer();

h3("Seguridad y configuración");
checklist([
  "ADMIN_PASSWORD tiene al menos 16 caracteres y NO se ha usado en otro sitio",
  "ADMIN_SESSION_SECRET tiene al menos 32 caracteres aleatorios",
  "SUPABASE_SERVICE_ROLE_KEY NO está en ningún commit (solo en Vercel env)",
  "PAYPAL_ENV está en 'live' (no sandbox)",
  "Las credenciales PayPal en Vercel son las LIVE (no las sandbox)",
  "Webhook PayPal configurado y PAYPAL_WEBHOOK_ID en Vercel",
  "Probaste 1 pago real con tarjeta y el dinero llegó a tu PayPal",
  "(Opcional) PII_ENCRYPTION_KEY activado y guardado en password manager",
]);

spacer(10);
h3("SEO y dominio");
checklist([
  "Dominio hgg.studio (o el que uses) apuntando a Vercel",
  "HTTPS funciona (candado verde en el navegador)",
  "Sitemap.xml accesible: https://hgg.studio/sitemap.xml",
  "Robots.txt accesible: https://hgg.studio/robots.txt",
  "Google Search Console: dominio verificado y sitemap enviado",
  "Vercel Analytics o similar activado para ver tráfico",
]);

spacer(10);
h3("Operacional");
checklist([
  "Sabes cómo entrar a /admin y a /admin/auditoria",
  "Sabes cómo crear/eliminar admins desde Configuración",
  "Sabes cómo revocar una sesión sospechosa desde Configuración",
  "Tienes guardada en password manager: ADMIN_PASSWORD, ADMIN_SESSION_SECRET, PII_ENCRYPTION_KEY",
  "Tienes acceso al Supabase Dashboard (para backups y emergencias)",
  "Tienes el número de soporte/contacto de PayPal Business a mano",
]);

spacer(20);
body(
  "Cuando todo esto esté marcado, estás listo para anunciar la web. " +
  "Si necesitas que cambie algo o ajustar la guía, escríbeme.",
  { color: COLORS.TEXT }
);
spacer(8);
doc.fillColor(COLORS.GOLD).font("Helvetica-Bold").fontSize(11);
doc.text("— Holman Global Group", M, doc.y, { width: W - 2 * M });

doc.end();

console.log(`PDF generado: ${OUT}`);
