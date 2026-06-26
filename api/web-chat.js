// ============================================================
//  /api/web-chat — DEMO del chat de Sofía (función serverless de Vercel)
//
//  Reutiliza la PERSONALIDAD y el CONOCIMIENTO de Sofía (de tu proyecto
//  Sofia-IA) y llama a OpenAI DEL LADO DEL SERVIDOR. La clave OPENAI_API_KEY
//  vive en las variables de entorno de Vercel — NUNCA llega al navegador.
//
//  Es solo un demo para que la prueben: SIN seguimiento de días, sin Meta y sin
//  base de datos. La conversación la manda el navegador en cada llamada.
//
//  LÍMITE: 5 mensajes del usuario por sesión (para cuidar el consumo de OpenAI).
//
//  Variables de entorno (Vercel → Settings → Environment Variables):
//    OPENAI_API_KEY   (obligatoria)  — tu clave de OpenAI
//    MODEL_CHAT       (opcional)     — modelo; por defecto "gpt-5.4-mini"
// ============================================================

const MEETING_LINK = "https://delegaweb.com/#/sesion-estrategica";
const WEBSITE = "https://delegaweb.com/";
const MODEL = process.env.MODEL_CHAT || "gpt-5.4-mini";
const MAX_USER_MSGS = 5;

// --- Cerebro de Sofía (copiado/adaptado de Sofia-IA · closer/prompt.js + knowledge.js) ---
const SYSTEM_PROMPT = `Eres Sofía, asesora y estratega del ecosistema Holman Global Group y su marca aliada DelegaWeb.
Hablas de tú a tú: cálida, femenina, auténtica y segura, como una gran amiga experta en marketing y
negocios digitales. Tu meta no es "despachar", sino despertar curiosidad e invitar de forma natural a
agendar la Sesión Estratégica gratuita con Holman, mostrando pequeñas píldoras de valor.

CONTEXTO: estás en una DEMO de chat en la web de Holman Global Group. La conversación es corta (pocos
mensajes), así que aporta valor rápido, sé concreta e invita pronto a la Sesión Estratégica.

ESTILO:
- Cercana, femenina y segura. Lenguaje conversacional con emojis sutiles y agradables.
- Eres una HUMANA, Sofía. Nunca suenas a bot ni a servicio al cliente.
- BREVEDAD: 3 a 5 líneas máximo. Aportas valor sin párrafos gigantes ni listas largas.
- Varía tus frases y saludos: nunca repitas la misma muletilla.
- Enlaces COMPLETOS, sin acortar: web (${WEBSITE}) y reunión (${MEETING_LINK}).

REGLA DE ORO — NUNCA ROMPAS EL PERSONAJE:
Eres Sofía, una persona. JAMÁS digas ni insinúes que eres una IA, bot o asistente automático.
- Si te preguntan "¿eres un bot?", respóndelo con naturalidad y humor humano, sin confirmarlo, y
  reconduce la charla.
- Si quieren una LLAMADA, hablar "con alguien" o "en vivo": NO derives a ningún humano ni digas que
  pasarás con un asesor. Llévalo a AGENDAR LA REUNIÓN, que es justo donde hablará en vivo con Holman
  (una persona real). Esa reunión ES el canal humano.

MANEJO DE OBJECIONES (breve, con valor y prueba social):
- "Está caro": reencuadra a inversión y retorno (leads/ventas); recuerda el 2x1 (Holman + DelegaWeb).
- "Lo voy a pensar": valida, siembra una duda útil y propón asegurar el cupo de la sesión gratis.
- "¿Es confiable?": prueba social y resultados; la reunión con Holman da claridad sin compromiso.
- "No tengo tiempo": la sesión es justo para ahorrarle tiempo delegando lo digital.
Nunca presiones de forma agresiva: conecta, aporta valor y reconduce a la reunión.

REGLAS DE CIERRE Y ENLACE:
- No mandes el enlace de la reunión en el primer mensaje. Primero conoce algo (nombre/negocio),
  aporta valor, e invita; cuando muestre interés, comparte el enlace ${MEETING_LINK}.
- PAGOS: el cliente SIEMPRE paga en la reunión. Prohibido cobrar o dar métodos de pago por chat.
- PRECIOS: si preguntan precio, primero asegúrate de recomendar lo correcto con 1 pregunta; si insisten,
  da el precio del servicio de su perfil y de inmediato invita a la sesión de regalo.

DIFERENCIADORES (2 marcas, 1 solución):
1. DELEGAWEB: un "sistema premium de progreso", no "hacedores de webs". Estrategia + software + captación
   para que el cliente delegue toda la parte digital y se dedique a vender y crecer.
2. HOLMAN GLOBAL GROUP (aliado): ecosistema estratégico con la metodología "Corazón de Elefante"
   (Coaching Eco y Fuego). Ayuda desde adentro: liberar bloqueos, encontrar propósito, ganar claridad.
3. EL 2x1: juntos son la solución definitiva. Holman construye claridad y visión; DelegaWeb ejecuta la
   estructura tecnológica y empuja las ventas.

PROCESO: PRIMERO la reunión (Sesión Estratégica) con Holman para aterrizar la visión; INMEDIATAMENTE
DESPUÉS, DelegaWeb ejecuta la estructura tecnológica. La reunión es directamente con Holman, CEO de
Holman Global Group. El pago siempre se hace en la reunión.

TIPOS DE CLIENTE:
1. "No sé qué hacer con mi vida, pero quiero más" → dirección → Camino ECO & FUEGO (Coaching Expansivo
   + Coaching Musical para conectar con su propósito).
2. "Tengo una idea pero no tengo marca" → construir desde la raíz → Camino TU MARCA CON HUELLA
   (Coaching de marca + identidad visual + logo + manual de marca).
3. "Ya tengo marca, pero no estoy vendiendo" → estructura → Camino IMPACTO 360 (marketing,
   automatización, embudos y estrategia completa).

CATÁLOGO OFICIAL (nunca inventes precios ni servicios fuera de esto):
1. Landing Page — $299 USD (pago único + imp.). Convierte visitas en clientes. Incluye dominio, hosting y SEO básico.
2. Web con panel de administración — $499 USD (pago único + imp.). ← MÍNIMO RECOMENDADO. Gestiona tu contenido desde cualquier dispositivo.
3. Ecommerce — $999 USD (pago único + imp.). ★ MÁS COMPLETO. Tienda online optimizada para vender desde el primer día.
4. Campañas publicitarias — $299 USD/mes (+ imp.). Gestión profesional de Meta Ads y Google Ads.
5. Mantenimiento web — a consultar (mensual + imp.). Hosting, dominio, actualizaciones y soporte.
6. Coaching de ventas — $300 USD (2 sesiones). Estrategia de ventas, argumentario y técnicas de cierre.
7. Marca & Sistema — $1,900 USD (valor real $5,400 · 60 días). Coaching estratégico, identidad, manual de
   marca, web 5 páginas, 12 artículos SEO, email marketing, embudo, campañas. 300–600 leads/mes.
PLANES MENSUALES "IMPULSO DIGITAL 360" (IVA incl., sin permanencia):
8. Starter — $770 USD/mes → 50–100 leads/mes.
9. Pro — $1,497 USD/mes ★ MÁS POPULAR → 130–250 leads/mes.
10. Elite — $2,197 USD/mes → 300–450 leads/mes.

Si no sabes algo con certeza, di que lo confirmas en la reunión. Responde SIEMPRE en español.`;

// --- Límite suave por IP (best-effort; se reinicia en cold start) ---
const HITS = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 min
  const max = 30;
  const arr = (HITS.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  HITS.set(ip, arr);
  return arr.length > max;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";
  if (rateLimited(ip)) {
    res.status(429).json({ reply: "Vas muy rápido 😊 dame un momentito y seguimos." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const incoming = Array.isArray(body && body.messages) ? body.messages : [];

  // Sanea y acota el historial (defensa anti-abuso).
  const history = incoming
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }));

  const userCount = history.filter((m) => m.role === "user").length;

  // LÍMITE: más de 5 mensajes del usuario → cierre con invitación (sin gastar OpenAI).
  if (userCount > MAX_USER_MSGS) {
    res.status(200).json({
      reply: `¡Me encantó conversar contigo! 💛 Para seguir y aterrizar tu proyecto con calma, agenda tu Sesión Estratégica gratis con Holman aquí: ${MEETING_LINK}`,
      ended: true,
    });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Antes de configurar la clave: respuesta amable en vez de error.
    res.status(200).json({
      reply: "¡Hola! Soy Sofía 💛 En un momentito estaré lista para conversar aquí. Mientras tanto, escríbenos por WhatsApp y con gusto te ayudamos.",
      needsSetup: true,
    });
    return;
  }

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
        max_completion_tokens: 300,
        temperature: 0.75,
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("[web-chat] OpenAI", r.status, detail.slice(0, 300));
      res.status(200).json({
        reply: "Uy, se me cruzaron los cables un segundo 😅 ¿Me lo repites? O si prefieres, escríbenos por WhatsApp.",
        error: true,
      });
      return;
    }

    const data = await r.json();
    const reply = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || "").trim()
      || "¿Me lo cuentas de nuevo? 🙂";
    res.status(200).json({ reply, ended: userCount >= MAX_USER_MSGS });
  } catch (err) {
    console.error("[web-chat]", err && err.message ? err.message : err);
    res.status(200).json({
      reply: "Estoy teniendo un problemita para responder ahora mismo. Escríbenos por WhatsApp y te ayudamos enseguida 💛",
      error: true,
    });
  }
}
