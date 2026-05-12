// Genera HGG-Config-PasoAPaso.pdf — guia practica de configuracion.
// Cada paso: que dato necesitas, donde buscarlo, como copiarlo.
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const OUT = path.resolve(__dirname, "..", "HGG-Config-PasoAPaso.pdf");

const COLORS = {
  GOLD: "#F0B800",
  GOLD_DARK: "#D99800",
  BG: "#0B1016",
  BG2: "#0E141C",
  BG3: "#131B25",
  BG4: "#1A2330",
  HAIRLINE: "#2A323C",
  HAIRLINE2: "#3A434F",
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
  margin: 60,
  bufferPages: true,
  info: {
    Title: "HGG — Configuración paso a paso",
    Author: "HGG",
    Subject: "Manual de configuración: qué datos necesitas y cómo conseguirlos",
  },
});
doc.pipe(fs.createWriteStream(OUT));

const W = doc.page.width;
const H = doc.page.height;
const M = 55;

let stepCounter = 0;

function drawBackground() {
  doc.save();
  doc.rect(0, 0, W, H).fill(COLORS.BG);
  // banner dorado arriba
  doc.rect(0, 0, W, 30).fillColor(COLORS.GOLD).fill();
  doc.fillColor(COLORS.BG).font("Helvetica-Bold").fontSize(9);
  doc.text("HGG — CONFIGURACIÓN PASO A PASO", M, 11);
  doc.text(`Pag ${doc.bufferedPageRange().count}`, W - M - 50, 11, { width: 50, align: "right" });
  // footer
  doc.lineWidth(0.5).strokeColor(COLORS.HAIRLINE)
     .moveTo(M, H - 45).lineTo(W - M, H - 45).stroke();
  doc.fillColor(COLORS.MUTED2).fontSize(8).font("Helvetica");
  doc.text("hgg.studio · Manual técnico para administradores", M, H - 30, { width: W - 2 * M });
  doc.restore();
}

function newPage() {
  doc.addPage();
  drawBackground();
  doc.y = 55;
}

drawBackground();

function reset(y) { doc.y = y; }

function chip(text, color, x, y) {
  doc.font("Helvetica-Bold").fontSize(7);
  const w = doc.widthOfString(text) + 12;
  doc.save();
  doc.roundedRect(x, y, w, 14, 7).fillColor(color).fill();
  doc.restore();
  doc.fillColor(COLORS.BG).text(text, x + 6, y + 3, { width: w - 12 });
  return w;
}

function sectionHeader(num, title, accentColor) {
  if (doc.y > H - 200) newPage();
  doc.moveDown(0.5);
  // numero grande en cuadro
  const boxSize = 36;
  doc.save();
  doc.roundedRect(M, doc.y, boxSize, boxSize, 8).fillColor(accentColor || COLORS.GOLD).fill();
  doc.restore();
  doc.fillColor(COLORS.BG).font("Helvetica-Bold").fontSize(20);
  doc.text(String(num), M, doc.y + 8, { width: boxSize, align: "center" });
  // titulo al lado
  doc.fillColor(COLORS.TEXT).font("Helvetica-Bold").fontSize(18);
  doc.text(title, M + boxSize + 14, doc.y + 9, { width: W - 2 * M - boxSize - 14 });
  doc.y = doc.y + boxSize + 14;
  // linea inferior
  doc.lineWidth(2).strokeColor(accentColor || COLORS.GOLD)
     .moveTo(M, doc.y - 4).lineTo(M + 60, doc.y - 4).stroke();
  doc.moveDown(0.3);
}

function subheader(text) {
  if (doc.y > H - 130) newPage();
  doc.moveDown(0.4);
  doc.fillColor(COLORS.GOLD).font("Helvetica-Bold").fontSize(13);
  doc.text(text, M, doc.y, { width: W - 2 * M });
  doc.moveDown(0.2);
}

function body(text, opts = {}) {
  if (doc.y > H - 80) newPage();
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

function spacer(h = 6) { doc.y += h; }

function step(title, instructions) {
  stepCounter++;
  if (doc.y > H - 200) newPage();
  // Header del paso
  const headerH = 26;
  doc.save();
  doc.roundedRect(M, doc.y, W - 2 * M, headerH, 6).fillColor(COLORS.BG3).fill();
  doc.lineWidth(0.5).strokeColor(COLORS.HAIRLINE2)
     .roundedRect(M, doc.y, W - 2 * M, headerH, 6).stroke();
  doc.restore();
  // numero del paso
  doc.fillColor(COLORS.GOLD).font("Helvetica-Bold").fontSize(11);
  doc.text(`PASO ${stepCounter}`, M + 12, doc.y + 8, { width: 70 });
  // titulo
  doc.fillColor(COLORS.TEXT).font("Helvetica-Bold").fontSize(11);
  doc.text(title, M + 80, doc.y + 8, { width: W - 2 * M - 90 });
  doc.y += headerH + 8;

  // Cuerpo
  for (const inst of instructions) {
    renderInstruction(inst);
  }
  spacer(8);
}

function renderInstruction(inst) {
  if (typeof inst === "string") {
    body(`›  ${inst}`, { color: COLORS.TEXT, size: 9.5 });
    return;
  }
  if (inst.type === "url") {
    body(`›  ${inst.action}`, { color: COLORS.TEXT, size: 9.5 });
    if (doc.y > H - 60) newPage();
    doc.fillColor(COLORS.BLUE).font("Courier").fontSize(9);
    doc.text(`   ${inst.url}`, M, doc.y, { width: W - 2 * M, lineGap: 1 });
    doc.moveDown(0.4);
    return;
  }
  if (inst.type === "click") {
    body(`›  ${inst.text}`, { color: COLORS.TEXT, size: 9.5 });
    return;
  }
  if (inst.type === "copy") {
    // Box con: ETIQUETA, valor de ejemplo, donde va
    if (doc.y + 70 > H - 60) newPage();
    const boxH = 64;
    doc.save();
    doc.roundedRect(M + 16, doc.y, W - 2 * M - 16, boxH, 4)
       .fillColor(COLORS.BG2).fill();
    doc.lineWidth(0.5).strokeColor(COLORS.GOLD)
       .roundedRect(M + 16, doc.y, W - 2 * M - 16, boxH, 4).stroke();
    doc.restore();
    // Etiqueta arriba a la izquierda
    chip("COPIAR", COLORS.GOLD, M + 24, doc.y + 8);
    // Nombre del campo
    doc.fillColor(COLORS.MUTED).font("Helvetica-Bold").fontSize(8);
    doc.text("CAMPO EN VERCEL", M + 90, doc.y + 8, { width: 120 });
    doc.fillColor(COLORS.GOLD).font("Courier-Bold").fontSize(9.5);
    doc.text(inst.envVar, M + 90, doc.y + 20, { width: W - 2 * M - 110 });
    // Ejemplo abajo
    doc.fillColor(COLORS.MUTED).font("Helvetica").fontSize(7.5);
    doc.text("EJEMPLO:", M + 24, doc.y + 42);
    doc.fillColor(COLORS.MUTED2).font("Courier").fontSize(8);
    doc.text(inst.example || "—", M + 80, doc.y + 42, { width: W - 2 * M - 100 });
    doc.y += boxH + 6;
    return;
  }
  if (inst.type === "warn") {
    if (doc.y + 40 > H - 60) newPage();
    doc.fillColor(COLORS.ORANGE).font("Helvetica").fontSize(9);
    const h = doc.heightOfString(inst.text, { width: W - 2 * M - 36, lineGap: 1.5 }) + 14;
    doc.save();
    doc.rect(M + 16, doc.y, 3, h).fillColor(COLORS.ORANGE).fill();
    doc.restore();
    doc.fillColor(COLORS.ORANGE).font("Helvetica-Bold").fontSize(8);
    doc.text("⚠  ATENCIÓN", M + 26, doc.y + 4);
    doc.fillColor(COLORS.TEXT).font("Helvetica").fontSize(9);
    doc.text(inst.text, M + 26, doc.y + 16, { width: W - 2 * M - 36, lineGap: 1.5 });
    doc.y += h + 6;
    return;
  }
  if (inst.type === "tip") {
    if (doc.y + 30 > H - 60) newPage();
    doc.fillColor(COLORS.BLUE).font("Helvetica").fontSize(9);
    const h = doc.heightOfString(inst.text, { width: W - 2 * M - 36, lineGap: 1.5 }) + 14;
    doc.save();
    doc.rect(M + 16, doc.y, 3, h).fillColor(COLORS.BLUE).fill();
    doc.restore();
    doc.fillColor(COLORS.BLUE).font("Helvetica-Bold").fontSize(8);
    doc.text("ℹ  CONSEJO", M + 26, doc.y + 4);
    doc.fillColor(COLORS.TEXT).font("Helvetica").fontSize(9);
    doc.text(inst.text, M + 26, doc.y + 16, { width: W - 2 * M - 36, lineGap: 1.5 });
    doc.y += h + 6;
    return;
  }
  if (inst.type === "code") {
    if (doc.y + 30 > H - 60) newPage();
    const lines = inst.text.split("\n");
    const lineHeight = 12;
    const padding = 8;
    const boxH = lines.length * lineHeight + 2 * padding;
    doc.save();
    doc.roundedRect(M + 16, doc.y, W - 2 * M - 16, boxH, 4)
       .fillColor(COLORS.BG).fill();
    doc.lineWidth(0.5).strokeColor(COLORS.HAIRLINE2)
       .roundedRect(M + 16, doc.y, W - 2 * M - 16, boxH, 4).stroke();
    doc.restore();
    doc.fillColor(COLORS.GREEN).font("Courier").fontSize(8.5);
    let y = doc.y + padding;
    for (const line of lines) {
      doc.text(line, M + 24, y, { width: W - 2 * M - 32, lineBreak: false });
      y += lineHeight;
    }
    doc.y += boxH + 6;
    return;
  }
}

// ============= PORTADA =============
reset(80);
doc.fillColor(COLORS.GOLD).font("Helvetica-Bold").fontSize(40);
doc.text("Configuración", M, doc.y, { width: W - 2 * M });
doc.fillColor(COLORS.GOLD).font("Helvetica-Bold").fontSize(28);
doc.text("paso a paso", M, doc.y, { width: W - 2 * M });

doc.moveDown(1);
doc.fillColor(COLORS.MUTED).font("Helvetica").fontSize(12);
doc.text(
  "Cada dato que necesitas, dónde encontrarlo, cómo copiarlo y dónde pegarlo. " +
  "Sigue las secciones en orden — están diseñadas para que no te falte ningún paso.",
  M, doc.y, { width: W - 2 * M, lineGap: 4 }
);

doc.moveDown(2);

// Resumen de secciones con colores
const sections = [
  { n: "0", title: "Preparación — abrir cuentas", color: COLORS.MUTED, time: "5 min" },
  { n: "1", title: "Supabase (base de datos)", color: COLORS.GREEN, time: "10 min" },
  { n: "2", title: "Vercel — credenciales admin", color: COLORS.BLUE, time: "3 min" },
  { n: "3", title: "PayPal Sandbox (pruebas)", color: COLORS.ORANGE, time: "15 min" },
  { n: "4", title: "PayPal Live (cobros reales)", color: COLORS.RED, time: "10 min" },
  { n: "5", title: "PayPal Webhook", color: COLORS.PURPLE, time: "5 min" },
  { n: "6", title: "Wise (opcional)", color: COLORS.BLUE, time: "10 min" },
  { n: "7", title: "Encriptación (opcional)", color: COLORS.PURPLE, time: "5 min" },
];

for (const s of sections) {
  doc.save();
  doc.roundedRect(M, doc.y, W - 2 * M, 32, 6).fillColor(COLORS.BG2).fill();
  doc.lineWidth(0.5).strokeColor(COLORS.HAIRLINE)
     .roundedRect(M, doc.y, W - 2 * M, 32, 6).stroke();
  doc.restore();
  // numero en cuadrado de color
  doc.save();
  doc.roundedRect(M + 8, doc.y + 8, 18, 18, 4).fillColor(s.color).fill();
  doc.restore();
  doc.fillColor(COLORS.BG).font("Helvetica-Bold").fontSize(11);
  doc.text(s.n, M + 8, doc.y + 11, { width: 18, align: "center" });
  // titulo
  doc.fillColor(COLORS.TEXT).font("Helvetica-Bold").fontSize(11);
  doc.text(s.title, M + 36, doc.y + 11, { width: W - 2 * M - 100 });
  // tiempo
  doc.fillColor(COLORS.MUTED).font("Helvetica").fontSize(9);
  doc.text(s.time, W - M - 60, doc.y + 11, { width: 50, align: "right" });
  doc.y += 32 + 4;
}

doc.moveDown(1);
doc.fillColor(COLORS.MUTED2).font("Helvetica-Oblique").fontSize(9);
doc.text(
  "Total estimado: 30-60 minutos. Lo más laborioso es validar tu cuenta business de PayPal.",
  M, doc.y, { width: W - 2 * M }
);

// ============= SECCIÓN 0 =============
newPage();
sectionHeader("0", "Preparación: cuentas que necesitas", COLORS.MUTED);
body(
  "Antes de tocar Vercel, asegúrate de tener (o crear) cuentas en estos servicios. " +
  "Te conviene tenerlos abiertos en pestañas separadas mientras configuras."
);
spacer();

stepCounter = 0;
step("Vercel — donde está alojada tu web", [
  { type: "url", action: "Abre Vercel y verifica que ya tienes el proyecto:", url: "https://vercel.com/dashboard" },
  "Deberías ver un proyecto llamado 'holmanglobalgroup' o similar.",
  { type: "tip", text: "Si no lo ves, es porque la cuenta de Vercel no es la misma que tu GitHub. Cambia de cuenta arriba a la derecha." },
]);

step("Supabase — base de datos (ya configurado por ti)", [
  { type: "url", action: "Confirma que tienes el proyecto creado:", url: "https://supabase.com/dashboard" },
  "Debes ver un proyecto llamado 'Holman Global Group' o similar.",
  "Si las tablas (manual_sales, expenses, admin_sessions, audit_log...) ya existen, este paso está hecho.",
]);

step("PayPal — para cobros con tarjeta y cuentas PayPal", [
  { type: "url", action: "Si no tienes cuenta business, créala aquí:", url: "https://www.paypal.com/business" },
  "PayPal te pedirá: nombre del negocio, dirección, banco para recibir los cobros.",
  { type: "warn", text: "La verificación de PayPal puede tardar 24-48h. Empieza este paso AHORA si vas a usar PayPal." },
  { type: "url", action: "Una vez verificada, ve al Developer Dashboard:", url: "https://developer.paypal.com" },
]);

step("Wise — opcional, para transferencias bancarias", [
  "Solo necesario si quieres ofrecer transferencia bancaria como opción.",
  { type: "url", action: "Cuenta personal o business gratuita:", url: "https://wise.com" },
  { type: "tip", text: "Si ya tienes Wise personal puedes empezar con esa. Para usar 'Payment Link' necesitarás upgrade a business." },
]);

// ============= SECCIÓN 1 =============
newPage();
sectionHeader("1", "Supabase — obtener las 3 credenciales", COLORS.GREEN);
body(
  "Necesitas extraer 3 datos de Supabase y pegarlos en Vercel. Esto conecta tu web a la base " +
  "de datos donde se guardarán ventas, gastos, sesiones de admin, audit log, etc."
);

stepCounter = 0;
step("Entrar a tu proyecto en Supabase", [
  { type: "url", action: "Abrir:", url: "https://supabase.com/dashboard" },
  "Click en tu proyecto 'Holman Global Group'.",
]);

step("Ir a la sección API", [
  "En el sidebar izquierdo (abajo del todo) busca el icono de engranaje ⚙ 'Project Settings'.",
  "Dentro de Project Settings, en el sidebar busca y haz click en 'API Keys'.",
  { type: "tip", text: "Si ves la pestaña 'Publishable and secret API keys' (formato nuevo) úsala. La pestaña 'Legacy anon, service_role' también sirve." },
]);

step("Copiar la URL del proyecto", [
  "Dentro de Project Settings, busca también 'Data API' en el sidebar.",
  "Verás un campo 'API URL' con algo como:  https://xxxxxxxxx.supabase.co/rest/v1/",
  { type: "warn", text: "Quita el /rest/v1/ del final. Solo necesitas la parte: https://xxxxxxxxx.supabase.co" },
  {
    type: "copy",
    envVar: "NEXT_PUBLIC_SUPABASE_URL",
    example: "https://ugaqokaqxyvuecyfcgso.supabase.co",
  },
]);

step("Copiar la Publishable key (anon)", [
  "Vuelve a API Keys.",
  "Bajo 'Publishable key', verás un valor que empieza con 'sb_publishable_...'",
  "Click el botón de copiar (icono al lado del valor).",
  {
    type: "copy",
    envVar: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    example: "sb_publishable_JNc8eNTwGjK8LSrM97M0LA_XncoM...",
  },
]);

step("Copiar la Secret key (service_role)", [
  "Más abajo en la misma página: 'Secret keys'.",
  "Click el icono del ojo (👁) para revelar el valor — empieza con 'sb_secret_...'",
  "Copia el valor completo.",
  {
    type: "copy",
    envVar: "SUPABASE_SERVICE_ROLE_KEY",
    example: "sb_secret_aDC5W3xX9y2zKpQbVnM8rT...",
  },
  { type: "warn", text: "Esta clave es como la llave maestra. NUNCA la pongas en un repositorio público, en un email o en una captura compartida. Solo va en Vercel env vars." },
]);

step("Pegar las 3 en Vercel", [
  { type: "url", action: "Abrir tu proyecto en Vercel:", url: "https://vercel.com/dashboard" },
  "Click en tu proyecto → pestaña Settings (arriba) → Environment Variables (sidebar).",
  "Para cada una de las 3 variables: click 'Add New', poner el nombre exacto + valor, marcar las 3 environments (Production / Preview / Development), Save.",
  { type: "tip", text: "Si no marcas las 3 environments, los deploys de preview/development no funcionarán." },
]);

// ============= SECCIÓN 2 =============
newPage();
sectionHeader("2", "Vercel — credenciales del admin", COLORS.BLUE);
body(
  "Aquí inventas tus propias credenciales para entrar al panel /admin. " +
  "Estos datos NO los obtienes de ningún sitio, los decides tú."
);

stepCounter = 0;
step("Elegir tu email de admin", [
  "Usa un email que solo tú controles. NO uses uno compartido.",
  {
    type: "copy",
    envVar: "ADMIN_EMAIL",
    example: "tu-email-personal@gmail.com",
  },
]);

step("Elegir tu contraseña de admin", [
  "Mínimo 16 caracteres. Mezcla: letras mayúsculas + minúsculas + números + símbolos.",
  "NO uses una contraseña que ya uses en otro sitio.",
  { type: "tip", text: "Usa un gestor de passwords (1Password / Bitwarden / Apple Keychain) para generarla y guardarla. NUNCA la tengas en un .txt o en un email." },
  {
    type: "copy",
    envVar: "ADMIN_PASSWORD",
    example: "Mi$Negocio2026Holman!Global7$",
  },
]);

step("Generar el ADMIN_SESSION_SECRET", [
  "Es una cadena aleatoria larga, sirve para firmar cookies de sesión.",
  "Abre PowerShell en Windows (busca 'PowerShell' en el menú inicio) y ejecuta:",
  {
    type: "code",
    text: "-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})",
  },
  "Te imprimirá una cadena tipo: fL3DlvoPr20whpNzn587eAXmOyaMsKiBTWSukJEZtCY...",
  "Copia esa cadena.",
  {
    type: "copy",
    envVar: "ADMIN_SESSION_SECRET",
    example: "fL3DlvoPr20whpNzn587eAXmOyaMsKiBTWSukJEZtCYgQRF1",
  },
  { type: "warn", text: "Guarda esta cadena en tu password manager. Si la pierdes y la regeneras, todos los admins deben volver a hacer login." },
]);

step("Pegar las 3 en Vercel y hacer Redeploy", [
  "Misma operación que las de Supabase: Vercel → Settings → Environment Variables → Add New.",
  "Después de añadirlas todas: Deployments (arriba) → último deploy → menú '...' → Redeploy.",
  { type: "tip", text: "Las env vars solo se aplican en builds NUEVOS. Por eso necesitas Redeploy cada vez que añades o cambias variables." },
]);

// ============= SECCIÓN 3 =============
newPage();
sectionHeader("3", "PayPal Sandbox — pruebas sin dinero real", COLORS.ORANGE);
body(
  "Sandbox es el modo de prueba de PayPal. Los pagos funcionan igual pero con dinero falso. " +
  "Úsalo para validar que el flujo funciona ANTES de cobrar a clientes reales."
);

stepCounter = 0;
step("Entrar al Developer Dashboard de PayPal", [
  { type: "url", action: "Abrir:", url: "https://developer.paypal.com" },
  "Login con tu cuenta business de PayPal.",
]);

step("Localizar tu App", [
  "En el menú superior: 'Apps & Credentials'.",
  "Asegúrate de tener seleccionada la pestaña 'Sandbox' (no Live) arriba.",
  "Verás 'Default Application'. Si no hay ninguna, click 'Create App':",
  "  - App Name: HGG",
  "  - Type: Merchant",
  "  - Sandbox Account: el que te ofrezca por defecto",
  "Click Create App.",
]);

step("Copiar Client ID de Sandbox", [
  "Click en tu app 'HGG' (o 'Default Application').",
  "En la página de la app, copia 'Client ID' (cadena larga alfanumérica).",
  {
    type: "copy",
    envVar: "NEXT_PUBLIC_PAYPAL_CLIENT_ID",
    example: "AaXyZ1234abcdEfghIjklMnopQrsTuvwxyz...",
  },
]);

step("Copiar Secret de Sandbox", [
  "Más abajo en la misma página: 'Secret key 1'.",
  "Click 'Show' para revelar la secret y copiarla.",
  {
    type: "copy",
    envVar: "PAYPAL_CLIENT_SECRET",
    example: "ELxyZ9876defghIjklMnopQrsTuvwxyz1234...",
  },
  { type: "warn", text: "Esta secret es como una contraseña. NUNCA la pongas en el código del cliente ni la compartas." },
]);

step("Configurar PAYPAL_ENV en sandbox", [
  "En Vercel, añade esta env var con valor literal 'sandbox':",
  {
    type: "copy",
    envVar: "PAYPAL_ENV",
    example: "sandbox",
  },
  { type: "warn", text: "Más tarde, cuando ya hayas probado todo, cambiarás esto a 'live'. Por ahora, dejarlo en 'sandbox'." },
]);

step("Obtener cuentas de prueba", [
  "En PayPal Developer Dashboard: 'Sandbox' (menú superior) → 'Accounts'.",
  "Verás 2 cuentas de prueba: una Business (sb-xxxxx@business.example.com) y una Personal (sb-yyyyy@personal.example.com).",
  "Click en la cuenta Personal → 'View/Edit Account' → la password está ahí.",
  "Usa esa cuenta para hacer pagos de prueba en tu propio sitio.",
  { type: "tip", text: "Si en tu sitio escribes la cuenta Personal y su password, PayPal procesará el pago como si fuera real, pero sin mover dinero. Verás la transacción en la Business sandbox." },
]);

step("Probar 1 pago en sandbox", [
  "Después de Redeploy en Vercel, ve a https://hgg.studio/tienda",
  "Click en cualquier producto → 'Pagar con PayPal'.",
  "Login con la cuenta Personal sandbox.",
  "Confirma el pago.",
  "Deberías ver una pantalla de éxito en tu web.",
  { type: "tip", text: "Si falla, revisa /admin/auditoria — verás el evento 'paypal.create_order' y entenderás dónde falló." },
]);

// ============= SECCIÓN 4 =============
newPage();
sectionHeader("4", "PayPal Live — cobros reales", COLORS.RED);
body(
  "SOLO cambia a Live cuando hayas probado sandbox y todo funcione. " +
  "Live = dinero real. Cualquier bug puede costarte dinero o ralentizar tus cobros."
);

stepCounter = 0;
step("Cambiar el toggle a Live", [
  "Entra a https://developer.paypal.com → Apps & Credentials.",
  "ARRIBA de la página verás un toggle 'Sandbox / Live'. Cámbialo a Live.",
  "Verás ahora la lista de apps LIVE (diferente de las sandbox).",
]);

step("Crear/seleccionar tu App Live", [
  "Si no hay ninguna, 'Create App' → mismo proceso pero ahora en modo Live.",
  "Click en tu app live.",
]);

step("Copiar Client ID y Secret de LIVE", [
  "Las claves de LIVE son DIFERENTES de las sandbox.",
  "Tienes que actualizar las MISMAS env vars en Vercel:",
  {
    type: "copy",
    envVar: "NEXT_PUBLIC_PAYPAL_CLIENT_ID",
    example: "AaXyZ-LIVE-Client-ID-aqui...",
  },
  {
    type: "copy",
    envVar: "PAYPAL_CLIENT_SECRET",
    example: "ELxyZ-LIVE-Secret-aqui...",
  },
]);

step("Cambiar PAYPAL_ENV a 'live'", [
  "En Vercel → la variable existente PAYPAL_ENV → Edit → cambiar a 'live'.",
  "Save.",
  {
    type: "copy",
    envVar: "PAYPAL_ENV",
    example: "live",
  },
]);

step("Redeploy", [
  "Vercel → Deployments → último → ... → Redeploy.",
  { type: "warn", text: "Después del Redeploy, los pagos serán REALES. Cualquiera que compre en tu web te pagará dinero real (y tú recibirás dinero real)." },
]);

step("Validar con compra real de 1 USD", [
  "Crea temporalmente un producto de $1 en tu catálogo (o pídele a un amigo que te compre uno barato).",
  "Cómpralo TÚ MISMO con tu tarjeta personal real.",
  "Verifica en tu PayPal Business que el dinero llegó (menos los fees de PayPal, ~$0.30 + 3.5%).",
  "Si llegó: ✓ todo funciona en vivo.",
  "Si NO llegó: revisa /admin/auditoria para ver el evento de fallo y escribe a soporte PayPal.",
]);

// ============= SECCIÓN 5 =============
newPage();
sectionHeader("5", "PayPal Webhook — recibir notificaciones", COLORS.PURPLE);
body(
  "El webhook te avisa cuando PayPal procesa pagos, los deniega o hace reembolsos. " +
  "Sin webhook, no sabrás si un pago se completó cuando tu servidor estaba caído."
);

stepCounter = 0;
step("Ir a Webhooks en PayPal Developer", [
  { type: "url", action: "Abrir:", url: "https://developer.paypal.com" },
  "Apps & Credentials → tu app live (o sandbox, según el modo en que estés).",
  "Scroll hasta abajo: sección 'Webhooks'.",
  "Click 'Add Webhook'.",
]);

step("Configurar el endpoint del webhook", [
  "Webhook URL:",
  { type: "code", text: "https://hgg.studio/api/paypal/webhook" },
  { type: "warn", text: "Si tu dominio es diferente a hgg.studio, ajusta la URL al tuyo." },
]);

step("Suscribir a los eventos importantes", [
  "Marca los siguientes checkboxes en la lista de events:",
  "  ✓  CHECKOUT.ORDER.COMPLETED",
  "  ✓  PAYMENT.CAPTURE.COMPLETED",
  "  ✓  PAYMENT.CAPTURE.DENIED",
  "  ✓  PAYMENT.CAPTURE.REFUNDED",
  "  ✓  PAYMENT.CAPTURE.REVERSED",
  "Click 'Save'.",
]);

step("Copiar el Webhook ID", [
  "PayPal te genera un Webhook ID — algo como '8WL6841234X567890ABCDEF'.",
  "Cópialo.",
  {
    type: "copy",
    envVar: "PAYPAL_WEBHOOK_ID",
    example: "8WL6841234X567890ABCDEF",
  },
]);

step("Pegar en Vercel + Redeploy", [
  "Misma operación: Vercel → Environment Variables → Add New.",
  "Después: Redeploy.",
  { type: "tip", text: "Para sandbox y live se crean webhooks SEPARADOS. Si pasas de sandbox a live, crea uno nuevo en live y actualiza la env var." },
]);

step("Verificar que funciona", [
  "Después del redeploy, haz un pago de prueba (sandbox o real).",
  "Entra a /admin/auditoria.",
  "Filtra por acción 'paypal.capture' o 'paypal.create_order'.",
  "Deberías ver entradas nuevas — significa que el webhook está enviando eventos correctamente.",
]);

// ============= SECCIÓN 6 =============
newPage();
sectionHeader("6", "Wise — transferencia bancaria (opcional)", COLORS.BLUE);
body(
  "Wise permite a los clientes pagar por transferencia. Hay 2 modos: con un 'Payment Link' " +
  "(más fácil para el cliente) o con datos bancarios manuales (más tradicional)."
);

stepCounter = 0;
step("Decidir qué modo usar", [
  "Modo A: Payment Link → necesitas Wise Business. Más fácil para el cliente.",
  "Modo B: IBAN/SWIFT → cualquier cuenta Wise (incluso personal) sirve. El cliente hace transfer normal.",
  { type: "tip", text: "Puedes activar AMBOS modos. El cliente elige cuál prefiere." },
]);

subheader("Modo A — Payment Link");

step("Crear el Payment Link en Wise", [
  { type: "url", action: "Abrir Wise:", url: "https://wise.com" },
  "Login con tu cuenta business.",
  "En el dashboard: 'Send' → 'Request' (Solicitar) → 'Get a link'.",
  "Define un monto inicial (puedes dejar abierto si Wise lo permite) o crea uno por servicio.",
  "Copia el link que te genera.",
  {
    type: "copy",
    envVar: "NEXT_PUBLIC_WISE_PAYMENT_LINK",
    example: "https://wise.com/pay/r/abcXYZ123",
  },
]);

subheader("Modo B — Datos bancarios manuales");

step("Obtener tus datos bancarios EUR", [
  "Wise → 'Account' (Mi cuenta) → cuenta EUR.",
  "Click 'Show bank details' (Mostrar datos bancarios).",
  "Verás: titular, IBAN, SWIFT/BIC, nombre del banco.",
]);

step("Copiar cada dato a su env var", [
  {
    type: "copy",
    envVar: "NEXT_PUBLIC_WISE_HOLDER",
    example: "Holman Orjuela",
  },
  {
    type: "copy",
    envVar: "NEXT_PUBLIC_WISE_IBAN",
    example: "BE12 3456 7890 1234",
  },
  {
    type: "copy",
    envVar: "NEXT_PUBLIC_WISE_SWIFT",
    example: "TRWIBEB1XXX",
  },
  {
    type: "copy",
    envVar: "NEXT_PUBLIC_WISE_BANK",
    example: "Wise Europe SA",
  },
]);

step("(Opcional) Prefijo de referencia", [
  "Para que las transferencias entrantes sean fáciles de identificar:",
  {
    type: "copy",
    envVar: "NEXT_PUBLIC_WISE_REFERENCE_PREFIX",
    example: "HGG",
  },
  "Con esto, las referencias serán HGG-001, HGG-002, etc.",
]);

step("Redeploy y verificar en /tienda", [
  "Vercel → Redeploy.",
  "Ve a /tienda → click en un producto → modal de checkout → pestaña 'Wise'.",
  "Verifica que aparecen tus datos bancarios correctamente.",
]);

// ============= SECCIÓN 7 =============
newPage();
sectionHeader("7", "Encriptación PII — capa extra (opcional)", COLORS.PURPLE);
body(
  "Esto activa la encriptación de nombres, emails y teléfonos de tus clientes en la base de datos. " +
  "Es como añadir una caja fuerte dentro de otra caja fuerte. Solo necesario si manejas muchos clientes."
);

stepCounter = 0;
step("Decidir si activarlo ahora o después", [
  { type: "tip", text: "RECOMENDACIÓN: déjalo desactivado mientras pruebas todo. Actívalo cuando tengas tu primer cliente real." },
  "Razón: si lo activas ahora y luego pierdes la key, no puedes leer ningún dato encriptado.",
]);

step("Generar la clave de encriptación", [
  "Abre PowerShell y ejecuta:",
  {
    type: "code",
    text: 'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
  },
  "Te imprimirá algo como: fL3DlvoPr20whpNzn587eAXmOyaMsKiBTWSukJEZtCYgQRF1abc=",
  "Copia esa cadena entera (los 44 caracteres aprox).",
  {
    type: "copy",
    envVar: "PII_ENCRYPTION_KEY",
    example: "fL3DlvoPr20whpNzn587eAXmOyaMsKiBTWSukJEZtCYgQRF1abc=",
  },
]);

step("Guardar la clave en un lugar SEGURO", [
  { type: "warn", text: "Si pierdes esta clave, los datos encriptados NO se pueden recuperar de ninguna forma. Es como tirar la llave de una caja fuerte al océano." },
  "Guardar en MÍNIMO 2 lugares separados:",
  "  1. Password manager (1Password, Bitwarden, etc).",
  "  2. Archivo cifrado en un USB físico guardado en otro sitio.",
  "  3. (Opcional) Imprimir en papel y guardar en caja fuerte.",
]);

step("Pegar en Vercel + Redeploy", [
  "Vercel → Environment Variables → Add New → PII_ENCRYPTION_KEY = <la clave>.",
  "Redeploy.",
  "Desde este momento, NUEVOS datos de clientes se guardarán encriptados.",
  "Los datos VIEJOS (anteriores al deploy) siguen en plano. Esto es intencional para no romper nada.",
]);

// ============= ÚLTIMA PÁGINA - RESUMEN =============
newPage();
sectionHeader("✓", "Resumen — qué tienes que copiar", COLORS.GREEN);
body(
  "Si quieres una checklist rápida de TODO lo que necesitas tener en Vercel al final, " +
  "estas son las variables. Las marcadas con * son obligatorias."
);
spacer();

doc.fillColor(COLORS.GOLD).font("Helvetica-Bold").fontSize(11);
doc.text("OBLIGATORIAS", M, doc.y);
doc.moveDown(0.3);

const obligatorias = [
  ["ADMIN_EMAIL", "Tu email"],
  ["ADMIN_PASSWORD", "Tu contraseña fuerte"],
  ["ADMIN_SESSION_SECRET", "Cadena aleatoria 32+ chars"],
  ["NEXT_PUBLIC_SUPABASE_URL", "https://xxx.supabase.co"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_..."],
  ["SUPABASE_SERVICE_ROLE_KEY", "sb_secret_..."],
  ["NEXT_PUBLIC_PAYPAL_CLIENT_ID", "PayPal client ID"],
  ["PAYPAL_CLIENT_SECRET", "PayPal secret"],
  ["PAYPAL_ENV", "sandbox  →  live (cuando pruebes)"],
];

for (const [name, ex] of obligatorias) {
  doc.save();
  doc.rect(M, doc.y, W - 2 * M, 18).fillColor(COLORS.BG2).fill();
  doc.restore();
  doc.fillColor(COLORS.GOLD).font("Courier-Bold").fontSize(9);
  doc.text(name, M + 8, doc.y + 5, { width: 250 });
  doc.fillColor(COLORS.MUTED).font("Courier").fontSize(8);
  doc.text(ex, M + 270, doc.y + 5, { width: W - 2 * M - 280 });
  doc.y += 19;
}

doc.moveDown(0.6);
doc.fillColor(COLORS.GOLD).font("Helvetica-Bold").fontSize(11);
doc.text("RECOMENDADAS", M, doc.y);
doc.moveDown(0.3);

const recomendadas = [
  ["PAYPAL_WEBHOOK_ID", "ID del webhook PayPal"],
  ["NEXT_PUBLIC_PAYMENT_CURRENCY", "USD (default)"],
  ["NEXT_PUBLIC_SITE_URL", "https://hgg.studio"],
];

for (const [name, ex] of recomendadas) {
  doc.save();
  doc.rect(M, doc.y, W - 2 * M, 18).fillColor(COLORS.BG2).fill();
  doc.restore();
  doc.fillColor(COLORS.BLUE).font("Courier-Bold").fontSize(9);
  doc.text(name, M + 8, doc.y + 5, { width: 250 });
  doc.fillColor(COLORS.MUTED).font("Courier").fontSize(8);
  doc.text(ex, M + 270, doc.y + 5, { width: W - 2 * M - 280 });
  doc.y += 19;
}

doc.moveDown(0.6);
doc.fillColor(COLORS.GOLD).font("Helvetica-Bold").fontSize(11);
doc.text("OPCIONALES (Wise + Encryption)", M, doc.y);
doc.moveDown(0.3);

const opcionales = [
  ["NEXT_PUBLIC_WISE_PAYMENT_LINK", "Link de Wise (si usas modo A)"],
  ["NEXT_PUBLIC_WISE_HOLDER", "Tu nombre como titular"],
  ["NEXT_PUBLIC_WISE_IBAN", "BE12 3456 7890 1234"],
  ["NEXT_PUBLIC_WISE_SWIFT", "TRWIBEB1XXX"],
  ["NEXT_PUBLIC_WISE_BANK", "Wise Europe SA"],
  ["NEXT_PUBLIC_WISE_REFERENCE_PREFIX", "HGG"],
  ["PII_ENCRYPTION_KEY", "Cadena base64 32 bytes"],
];

for (const [name, ex] of opcionales) {
  doc.save();
  doc.rect(M, doc.y, W - 2 * M, 18).fillColor(COLORS.BG2).fill();
  doc.restore();
  doc.fillColor(COLORS.PURPLE).font("Courier-Bold").fontSize(9);
  doc.text(name, M + 8, doc.y + 5, { width: 250 });
  doc.fillColor(COLORS.MUTED).font("Courier").fontSize(8);
  doc.text(ex, M + 270, doc.y + 5, { width: W - 2 * M - 280 });
  doc.y += 19;
}

doc.moveDown(1.5);
doc.fillColor(COLORS.MUTED).font("Helvetica-Oblique").fontSize(9);
doc.text(
  "Cualquier duda mientras configuras, escríbeme. Mejor preguntar que romper algo en producción.",
  M, doc.y, { width: W - 2 * M, lineGap: 2 }
);

doc.moveDown(0.5);
doc.fillColor(COLORS.GOLD).font("Helvetica-Bold").fontSize(10);
doc.text("— Holman Global Group", M, doc.y);

doc.end();

console.log(`PDF generado: ${OUT}`);
