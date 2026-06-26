import { useEffect, useRef, useState, type FormEvent } from "react";
import { WHATSAPP_URL } from "@/lib/config";
import { ArrowRightIcon, WhatsAppIcon } from "./icons";
import { Reveal } from "./reveal";

// "Conoce a Sofía": DEMO en vivo de la asistente con IA. El chat llama a la
// función serverless `/api/web-chat` (Vercel), que usa el cerebro de Sofía y
// OpenAI del lado del servidor. Es una probada: límite de 5 mensajes por sesión.
// Si la API aún no está lista (sin OPENAI_API_KEY / en local sin `vercel dev`),
// el chat degrada con elegancia e invita a WhatsApp.

type Msg = { id: number; from: "sofia" | "user"; text: string };

const MEETING_LINK = "https://delegaweb.com/#/sesion-estrategica";
const MAX_USER_MSGS = 5;

const GREETING =
  "¡Hola! 👋 Soy Sofía, del equipo de Holman Global Group. Cuéntame en qué andas —tu idea, tu marca o tu negocio— y te oriento al toque. ¿Qué tienes en mente?";

const STARTERS = [
  "Quiero una web que venda",
  "¿Qué planes y precios tienen?",
  "Tengo una idea pero no sé por dónde empezar",
];

// Convierte las URLs del texto en enlaces clicables (seguro, sin innerHTML).
function renderText(text: string) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part.replace(/[.,)]+$/, "")}
        target="_blank"
        rel="noopener noreferrer"
        className="sofia-link"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function Sofia() {
  const [messages, setMessages] = useState<Msg[]>([{ id: 0, from: "sofia", text: GREETING }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [ended, setEnded] = useState(false);

  const idRef = useRef(1);
  const logRef = useRef<HTMLDivElement | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  const push = (from: Msg["from"], text: string) =>
    setMessages((prev) => [...prev, { id: idRef.current++, from, text }]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy.current || ended) return;
    busy.current = true;

    const nextCount = userCount + 1;
    // Historial para la IA (incluye el saludo y el mensaje nuevo).
    const history = [
      ...messages.map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text })),
      { role: "user", content: text },
    ];

    push("user", text);
    setInput("");
    setUserCount(nextCount);
    setTyping(true);

    try {
      const res = await fetch("/api/web-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      if (!mounted.current) return;
      setTyping(false);
      push("sofia", data && data.reply ? data.reply : "Gracias por tu mensaje 💛");
      if ((data && data.ended) || nextCount >= MAX_USER_MSGS) setEnded(true);
    } catch {
      if (!mounted.current) return;
      setTyping(false);
      push(
        "sofia",
        "Ahora mismo no logro responder aquí 😅 Escríbenos por WhatsApp y te ayudamos enseguida 💛"
      );
    } finally {
      busy.current = false;
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const showStarters = userCount === 0 && !ended;

  return (
    <section id="sofia" className="sofia">
      <div className="shell sofia-grid">
        <Reveal className="sofia-copy" as="div">
          <div className="eyebrow-row">
            <span className="num">·</span>
            <span className="bar" />
            <span className="eyebrow eyebrow-w">Asistente IA · Demo</span>
          </div>
          <h2 className="display sofia-title">
            Conoce a <span className="accent-blue">Sofía</span>.
          </h2>
          <p className="sofia-body">
            Sofía es nuestra asistente con inteligencia artificial. Pruébala aquí
            mismo: cuéntale tu idea o tu negocio y mira cómo entiende, orienta y te
            lleva al siguiente paso. Es una probada —para la conversación completa,
            te conecta con el equipo.
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
                className={`sofia-bubble ${m.from === "sofia" ? "sofia-bubble-in" : "sofia-bubble-out"}`}
              >
                <span>{renderText(m.text)}</span>
              </div>
            ))}
            {typing && (
              <div className="sofia-bubble sofia-bubble-in sofia-typing" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          {showStarters && (
            <div className="sofia-quick">
              {STARTERS.map((s) => (
                <button key={s} type="button" className="sofia-chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {ended ? (
            <div className="sofia-ended">
              <a
                href={MEETING_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary sofia-ended-cta"
              >
                Agenda tu sesión gratis
                <ArrowRightIcon className="arrow" />
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost sofia-ended-cta"
              >
                <WhatsAppIcon width={16} height={16} />
                WhatsApp
              </a>
            </div>
          ) : (
            <form className="sofia-input" onSubmit={onSubmit}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escríbele a Sofía…"
                aria-label="Escribe tu mensaje para Sofía"
                autoComplete="off"
                disabled={typing}
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
          )}
        </Reveal>
      </div>
    </section>
  );
}
