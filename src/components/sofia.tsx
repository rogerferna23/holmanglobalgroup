import { useEffect, useRef, useState, type FormEvent } from "react";
import { WHATSAPP_URL } from "@/lib/config";
import { ArrowRightIcon, WhatsAppIcon } from "./icons";
import { Reveal } from "./reveal";

// "Conoce a Sofía": chat en vivo embebido. La asistente saluda, el visitante
// escribe (o usa las respuestas rápidas) y Sofía responde orientando hacia el
// camino correcto. Las respuestas son guiadas del lado del cliente (sin backend)
// para que Sofía esté "viva" en el sitio desde ya.
//
// INTEGRACIÓN (Roger): cuando se conecte la IA real (WhatsApp Cloud API / Meta),
// basta con reemplazar `sofiaReply()` por la llamada al backend manteniendo el
// formato `Reply[]`. El resto del componente (UI, estado, scroll) no cambia.

type Cta = { label: string; href: string; external?: boolean };
type Reply = { text: string; cta?: Cta };
type Msg = { id: number; from: "sofia" | "user"; text: string; cta?: Cta };

const WHATSAPP_CTA: Cta = {
  label: "Escribir por WhatsApp",
  href: WHATSAPP_URL,
  external: true,
};

const QUICK_REPLIES = [
  "¿Qué es el coaching musical?",
  "Quiero claridad de marca",
  "Ver servicios y precios",
  "Hablar con un asesor",
];

function sofiaReply(raw: string): Reply[] {
  const text = raw.toLowerCase();
  const has = (...kw: string[]) => kw.some((k) => text.includes(k));

  if (has("hola", "buenas", "buenos", "hey", "saludos", "que tal", "qué tal"))
    return [
      {
        text:
          "¡Hola! 👋 Soy Sofía, la asistente de Holman Global Group. ¿Buscas claridad sobre tu propósito, tu marca o tu sistema digital?",
      },
    ];

  if (
    has(
      "musical",
      "música",
      "musica",
      "binaural",
      "anclaje",
      "nota",
      "sonido",
      "neurocien"
    )
  )
    return [
      {
        text:
          "El coaching musical usa neurociencia y psicología aplicada de la música —ondas binaurales y anclajes musicales— para llevarte a estados de claridad e introspección. Es la base de nuestro método.",
        cta: { label: "Ver el método", href: "#proceso" },
      },
    ];

  if (has("expansiv", "propósito", "proposito", "claridad", "potencial", "valores"))
    return [
      {
        text:
          "El coaching expansivo parte de tu potencial, no de tus problemas: trabajamos desde tus fortalezas y valores para construir claridad y dirección. ¿Damos el primer paso juntos?",
        cta: WHATSAPP_CTA,
      },
    ];

  if (has("marca", "branding", "logo", "identidad", "diseño", "diseno"))
    return [
      {
        text:
          "Creamos marcas con alma en tres niveles —desde la huella esencial hasta un universo completo—. Todo nace de tu propósito, no de plantillas.",
        cta: { label: "Ver servicios", href: "/tienda" },
      },
    ];

  if (
    has("sistema", "web", "página", "pagina", "sitio", "digital", "ventas", "automat", "delegaweb")
  )
    return [
      {
        text:
          "El sistema digital lo ejecuta Delegaweb, nuestra marca aliada: sitios premium y estructuras que venden mientras vives.",
        cta: { label: "Ver servicios", href: "/tienda" },
      },
    ];

  if (
    has("precio", "costo", "cuánto", "cuanto", "plan", "pagar", "inversión", "inversion", "tarifa")
  )
    return [
      {
        text:
          "Hay opciones para cada etapa. Puedes ver los planes y precios en la tienda, o te conecto con un asesor para una propuesta a tu medida.",
        cta: { label: "Ver la tienda", href: "/tienda" },
      },
    ];

  if (
    has("asesor", "humano", "persona", "hablar", "contacto", "contactar", "whatsapp", "llamar", "agendar", "cita")
  )
    return [
      {
        text:
          "Claro, te conecto con el equipo. Escríbenos por WhatsApp y un asesor te responde personalmente.",
        cta: WHATSAPP_CTA,
      },
    ];

  if (has("servicio", "ofrecen", "hacen", "ayuda", "ayudar", "quiénes", "quienes"))
    return [
      {
        text:
          "Acompañamos de la chispa al sistema: Sesiones de Coaching, Creación de Marca, Estructura con Propósito y crecimiento digital con Delegaweb. ¿Cuál te interesa?",
        cta: { label: "Ver servicios", href: "/tienda" },
      },
    ];

  if (has("gracias", "genial", "perfecto", "vale"))
    return [{ text: "¡A ti! 💛 Aquí estaré cuando quieras dar el siguiente paso." }];

  return [
    {
      text:
        "Cuéntame un poco más 🙂 Puedo orientarte sobre coaching musical, tu marca o tu sistema digital, y también conectarte con un asesor humano.",
      cta: WHATSAPP_CTA,
    },
  ];
}

export function Sofia() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: 0, from: "sofia", text: "Hola 👋 Soy Sofía. ¿En qué puedo ayudarte hoy?" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const idRef = useRef(1);
  const logRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);

  // Limpia timeouts pendientes al desmontar.
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  // Auto-scroll al último mensaje.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  const push = (m: Omit<Msg, "id">) =>
    setMessages((prev) => [...prev, { ...m, id: idRef.current++ }]);

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || typing) return;
    push({ from: "user", text });
    setInput("");
    setTyping(true);
    const replies = sofiaReply(text);
    const t = window.setTimeout(() => {
      setTyping(false);
      replies.forEach((r) => push({ from: "sofia", text: r.text, cta: r.cta }));
    }, 700 + Math.min(900, text.length * 18));
    timers.current.push(t);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <section id="sofia" className="sofia">
      <div className="shell sofia-grid">
        <Reveal className="sofia-copy" as="div">
          <div className="eyebrow-row">
            <span className="num">·</span>
            <span className="bar" />
            <span className="eyebrow eyebrow-w">Asistente IA</span>
          </div>
          <h2 className="display sofia-title">
            Conoce a <span className="accent-blue">Sofía</span>.
          </h2>
          <p className="sofia-body">
            Sofía es la asistente de Holman Global Group y está disponible aquí
            mismo. Entiende lo que necesitas, responde en segundos y te ayuda a
            encontrar el camino correcto —coaching, marca o sistema—, sin importar
            cuándo decidas escribir.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost sofia-human"
          >
            <WhatsAppIcon width={18} height={18} />
            ¿Prefieres una persona? Escríbenos
            <ArrowRightIcon className="arrow" />
          </a>
        </Reveal>

        <Reveal className="sofia-card sofia-chat" as="div">
          <div className="sofia-card-head">
            <span className="sofia-avatar" aria-hidden="true">
              S
            </span>
            <div className="sofia-card-id">
              <strong>Sofía</strong>
              <span className="sofia-status">
                <i className="sofia-dot" aria-hidden="true" />
                En línea · responde en segundos
              </span>
            </div>
          </div>

          <div
            className="sofia-log"
            ref={logRef}
            role="log"
            aria-live="polite"
            aria-label="Conversación con Sofía"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`sofia-bubble ${
                  m.from === "sofia" ? "sofia-bubble-in" : "sofia-bubble-out"
                }`}
              >
                <span>{m.text}</span>
                {m.cta &&
                  (m.cta.external ? (
                    <a
                      className="sofia-bubble-cta"
                      href={m.cta.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {m.cta.label}
                      <ArrowRightIcon width={13} height={13} />
                    </a>
                  ) : (
                    <a className="sofia-bubble-cta" href={m.cta.href}>
                      {m.cta.label}
                      <ArrowRightIcon width={13} height={13} />
                    </a>
                  ))}
              </div>
            ))}
            {typing && (
              <div
                className="sofia-bubble sofia-bubble-in sofia-typing"
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          <div className="sofia-quick">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                type="button"
                className="sofia-chip"
                onClick={() => send(q)}
                disabled={typing}
              >
                {q}
              </button>
            ))}
          </div>

          <form className="sofia-input" onSubmit={onSubmit}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escríbele a Sofía…"
              aria-label="Escribe tu mensaje para Sofía"
              autoComplete="off"
            />
            <button
              type="submit"
              className="sofia-send"
              aria-label="Enviar mensaje"
              disabled={typing || !input.trim()}
            >
              <ArrowRightIcon width={16} height={16} />
            </button>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
