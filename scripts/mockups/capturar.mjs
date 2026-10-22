// Captura páginas reales del sitio (con `pnpm dev` corriendo) para meterlas
// en los mockups de la tienda. Abre Chrome headless por el protocolo de
// DevTools, marca el aviso de cookies como resuelto y guarda un PNG.
// Uso: node scripts/mockups/capturar.mjs <ruta|url> <ancho> <alto> <salida.png> [espera_ms] [scrollY|completa]
// Con una URL completa (https://…) captura ese sitio; «completa» toma la
// página entera de arriba a abajo (para recortar piezas después).
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [ruta, ancho, alto, salida, espera = "3500", scrollY = "0"] = process.argv.slice(2);
if (!salida) {
  console.error("Uso: node capturar.mjs <ruta> <ancho> <alto> <salida.png> [espera_ms] [scrollY]");
  process.exit(1);
}
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PUERTO = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PUERTO}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "cap-"))}`, "about:blank",
], { stdio: "ignore" });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  let destino;
  for (let i = 0; i < 50 && !destino; i++) {
    await dormir(200);
    try {
      const lista = await (await fetch(`http://127.0.0.1:${PUERTO}/json`)).json();
      destino = lista.find((t) => t.type === "page");
    } catch { /* todavía arrancando */ }
  }
  const ws = new WebSocket(destino.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pendientes = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pendientes.has(m.id)) { pendientes.get(m.id)(m.result); pendientes.delete(m.id); }
  });
  const cdp = (method, params = {}) => new Promise((r) => {
    pendientes.set(++id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });
  const movil = Number(ancho) < 768;
  await cdp("Emulation.setDeviceMetricsOverride", {
    width: Number(ancho), height: Number(alto), deviceScaleFactor: 2, mobile: movil,
  });
  await cdp("Page.enable");
  await cdp("Page.addScriptToEvaluateOnNewDocument", {
    source: `try { localStorage.setItem("hgg-consent-v2", JSON.stringify({ analytics: false, marketing: false })); } catch {}`,
  });
  await cdp("Page.navigate", { url: ruta.startsWith("http") ? ruta : `http://localhost:3000${ruta}` });
  await dormir(Number(espera));
  const completa = scrollY === "completa";
  if (completa) {
    // Recorre la página para que carguen las imágenes y animaciones perezosas.
    const { result } = await cdp("Runtime.evaluate", { expression: "document.documentElement.scrollHeight" });
    for (let y = 0; y < result.value; y += 700) {
      await cdp("Runtime.evaluate", { expression: `window.scrollTo({ top: ${y}, behavior: "instant" })` });
      await dormir(250);
    }
    await cdp("Runtime.evaluate", { expression: `window.scrollTo({ top: 0, behavior: "instant" })` });
    await dormir(800);
  } else if (Number(scrollY)) {
    await cdp("Runtime.evaluate", { expression: `window.scrollTo({ top: ${scrollY}, behavior: "instant" })` });
    await dormir(1200);
  }
  // Fuerza los reveal-on-scroll que no alcanzaron a dispararse.
  await cdp("Runtime.evaluate", {
    expression: `document.querySelectorAll(".reveal,[data-reveal]").forEach((el) => el.classList.add("in", "visible", "is-visible"))`,
  });
  await dormir(600);
  let opciones = { format: "png" };
  if (completa) {
    const { result } = await cdp("Runtime.evaluate", { expression: "document.documentElement.scrollHeight" });
    opciones = { ...opciones, captureBeyondViewport: true, clip: { x: 0, y: 0, width: Number(ancho), height: result.value, scale: 1 } };
  }
  const { data } = await cdp("Page.captureScreenshot", opciones);
  writeFileSync(salida, Buffer.from(data, "base64"));
  console.log("ok", salida);
  ws.close();
} finally {
  chrome.kill();
}
