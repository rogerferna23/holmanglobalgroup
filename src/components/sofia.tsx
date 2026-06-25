import { useEffect, useRef, useState, type FormEvent } from "react";
import { SITE, WHATSAPP_URL } from "@/lib/config";
import { ArrowRightIcon, WhatsAppIcon } from "./icons";
import { Reveal } from "./reveal";

// "Conoce a Sofía": chat en vivo GUIADO (estilo WhatsApp, sin seguimiento de
// días). Sofía no responde frases sueltas: lleva una conversación con estado
// (saluda → pregunta qué necesita → conoce el negocio → pregunta la etapa →
// recomienda un servicio → conecta con un asesor con la info ya resumida).
//
// El motor (`advance`) es una máquina de pasos del lado del cliente, sin backend.
// INTEGRACIÓN (Roger): cuando se conecte la IA real (WhatsApp Cloud API / Meta),
// se reemplaza `advance()` por la llamada al backend manteniendo el tipo `Turn`
// (replies + chips); la UI y el estado no cambian.

type Cta = { label: string; href: string; external?: boolean };
type Reply = { text: string; cta?: Cta };
type Chip = { label: string; value: string };
type Msg = { id: number; from: "sofia" | "user"; text: string; cta?: Cta };

type Goal = "coaching" | "marca" | "web" | "explora";
type Stage = "idea" | "marca" | "escala";
type StepId = "ask_goal" | "ask_business" | "ask_stage" | "recommend" | "open";
type Profile = { goal?: Goal; business?: string; stage?: Stage };
type Flow = { step: StepId; profile: Profile };
type Turn = { replies: Reply[]; flow: Flow; chips: Chip[] };

const GREETING =
  "¡Hola! 👋 Soy Sofía, la asistente de Holman Global Group. Te hago un par de preguntas rápidas para guiarte mejor. Para empezar, ¿qué es lo que más necesitas hoy?";

const INITIAL_FLOW: Flow = { step: "ask_goal", profile: {} };

const GOAL_CHIPS: Chip[] = [
  { label: "Claridad y coaching", value: "goal:coaching" },
  { label: "Crear o mejorar mi marca", value: "goal:marca" },
  { label: "Una web que venda", value: "goal:web" },
  { label: "Solo estoy explorando", value: "goal:explora" },
];
const STAGE_CHIPS: Chip[] = [
  { label: "Apenas es una idea", value: "stage:idea" },
  { label: "Tengo marca pero no vende", value: "stage:marca" },
  { label: "Quiero escalar mi negocio", value: "stage:escala" },
];
const RECO_CHIPS: Chip[] = [
  { label: "Sí, hablar con un asesor", value: "asesor" },
  { label: "Ver precios", value: "precios" },
  { label: "Tengo otra duda", value: "duda" },
];
const OPEN_CHIPS: Chip[] = [
  { label: "¿Qué es el coaching musical?", value: "info:musical" },
  { label: "Hablar con un asesor", value: "asesor" },
  { label: "Empezar de nuevo", value: "reset" },
];

const GOAL_LABEL: Record<Goal, string> = {
  coaching: "claridad y coaching",
  marca: "crear o mejorar mi marca",
  web: "una web o sistema que venda",
  explora: "orientación",
};
const STAGE_LABEL: Record<Stage, string> = {
  idea: "apenas estás empezando",
  marca: "ya tienes marca pero aún no vende como quieres",
  escala: "ya tienes negocio y quieres escalar",
};

const has = (t: string, ...kw: string[]) => kw.some((k) => t.includes(k));

function parseGoal(t: string): Goal | null {
  if (t.startsWith("goal:")) return t.slice(5) as Goal;
  if (has(t, "web", "sitio", "página", "pagina", "sistema", "vende", "digital", "ecommerce", "tienda")) return "web";
  if (has(t, "marca", "branding", "logo", "identidad")) return "marca";
  if (has(t, "coaching", "claridad", "propósito", "proposito", "musical", "mentor")) return "coaching";
  if (has(t, "explor", "mirando", "viendo", "curios")) return "explora";
  return null;
}
function parseStage(t: string): Stage | null {
  if (t.startsWith("stage:")) return t.slice(6) as Stage;
  if (has(t, "no vende", "no funciona", "tengo marca", "ya tengo marca", "estanc")) return "marca";
  if (has(t, "escal", "crecer", "crece", "más clientes", "mas clientes", "facturar")) return "escala";
  if (has(t, "idea", "empez", "desde cero", "arrancar", "nuevo")) return "idea";
  return null;
}

function businessAck(business: string): string {
  const c = business.toLowerCase();
  if (has(c, "idea", "no sé", "no se", "aún no", "aun no", "empez")) return "Me encanta, las mejores marcas empiezan justo así 🙌";
  if (business.length > 44) return "Suena a un proyecto con mucho potencial 🙌";
  return `Me encanta lo de "${business}" 🙌`;
}

function recommend(p: Profile): { name: string; pitch: string; cta: Cta } {
  const sistema = {
    name: "Sistema y Web premium",
    pitch: "un sitio premium y un sistema que vende mientras vives, ejecutado por Delegaweb, nuestra marca aliada de sistemas digitales",
    cta: { label: "Ver servicios web", href: "/tienda" },
  };
  const marca = {
    name: "Creación de Marca",
    pitch: "construir una marca con alma y alineada a tu propósito, desde la huella esencial hasta un universo de marca completo",
    cta: { label: "Ver creación de marca", href: "/tienda" },
  };
  const coaching = {
    name: "Sesiones de Coaching",
    pitch: "empezar por la claridad con coaching musical y expansivo para definir tu propósito y tu dirección",
    cta: { label: "Ver coaching", href: "/tienda" },
  };
  if (p.goal === "web" || p.stage === "escala") return sistema;
  if (p.goal === "marca" || p.stage === "marca" || p.stage === "idea") return marca;
  if (p.goal === "coaching") return coaching;
  return coaching;
}

function infoAside(t: string): Reply | null {
  if (t.startsWith("info:musical") || has(t, "musical", "música", "musica", "binaural", "anclaje", "neurocien"))
    return { text: "El coaching musical usa neurociencia y psicología aplicada de la música —ondas binaurales y anclajes musicales— para llevarte a estados de claridad e introspección. Es la base de nuestro método 🎵" };
  if (has(t, "expansiv", "potencial", "fortalezas"))
    return { text: "El coaching expansivo parte de tu potencial, no de tus problemas: trabaja desde tus fortalezas y valores para darte claridad y dirección ✨" };
  if (has(t, "precio", "costo", "cuánto", "cuanto", "plan", "tarifa", "inversión", "inversion", "pagar"))
    return { text: "Tenemos opciones para cada etapa. Aquí puedes ver todos los planes y precios 👇", cta: { label: "Ver la tienda", href: "/tienda" } };
  if (has(t, "delegaweb"))
    return { text: "Delegaweb es nuestra marca aliada de sistemas digitales: ejecuta los sitios web premium y el sistema que vende mientras vives." };
  if (has(t, "gracias")) return { text: "¡A ti! 💛" };
  return null;
}

function handoff(p: Profile): Turn {
  const parts = [
    "Hola 👋 Vengo del chat de Sofía en la web.",
    p.goal ? `Me interesa ${GOAL_LABEL[p.goal]}.` : "",
    p.business ? `Mi proyecto: ${p.business}.` : "",
    p.stage ? `Etapa: ${STAGE_LABEL[p.stage]}.` : "",
  ].filter(Boolean);
  const href = `https://wa.me/${SITE.phone.e164}?text=${encodeURIComponent(parts.join(" "))}`;
  return {
    replies: [
      {
        text: "¡Genial! Te dejo con el equipo para una propuesta a tu medida. Toca abajo y seguimos por WhatsApp, con tu info ya lista 👇",
        cta: { label: "Continuar por WhatsApp", href, external: true },
      },
    ],
    flow: { step: "open", profile: p },
    chips: OPEN_CHIPS,
  };
}

function advance(flow: Flow, raw: string): Turn {
  const t = raw.toLowerCase().trim();
  const p = flow.profile;

  if (t === "reset" || has(t, "empezar de nuevo", "reiniciar", "empieza de nuevo", "volver a empezar"))
    return { replies: [{ text: "¡Listo, empecemos de nuevo! ¿Qué es lo que más necesitas hoy?" }], flow: { step: "ask_goal", profile: {} }, chips: GOAL_CHIPS };

  if (t === "asesor" || has(t, "asesor", "humano", "persona", "agente", "hablar con", "contacto", "contactar", "whatsapp", "llámame", "llamame", "agendar", "cita"))
    return handoff(p);

  switch (flow.step) {
    case "ask_goal": {
      const goal = parseGoal(t);
      if (!goal) {
        const aside = infoAside(t);
        return {
          replies: aside
            ? [aside, { text: "Y dime, ¿qué es lo que más necesitas hoy? 👇" }]
            : [{ text: "Cuéntame, ¿qué buscas hoy? Puedes tocar una opción 👇" }],
          flow,
          chips: GOAL_CHIPS,
        };
      }
      const ack: Record<Goal, string> = {
        coaching: "Me encanta empezar por ahí 🎯",
        marca: "Buenísimo, una marca con alma lo cambia todo ✨",
        web: "¡Perfecto! Un buen sistema digital cambia las reglas 🚀",
        explora: "¡Genial, exploremos juntos! 🙂",
      };
      return {
        replies: [{ text: `${ack[goal]} Antes de recomendarte algo, cuéntame: ¿a qué se dedica tu negocio o qué idea tienes en mente?` }],
        flow: { step: "ask_business", profile: { ...p, goal } },
        chips: [{ label: "Todavía es solo una idea", value: "Todavía es una idea nueva" }],
      };
    }
    case "ask_business": {
      const business = raw.trim().slice(0, 140) || "un proyecto nuevo";
      return {
        replies: [{ text: `${businessAck(business)} ¿Y en qué momento estás ahora mismo?` }],
        flow: { step: "ask_stage", profile: { ...p, business } },
        chips: STAGE_CHIPS,
      };
    }
    case "ask_stage": {
      const stage = parseStage(t);
      if (!stage)
        return { replies: [{ text: "¿En qué punto estás hoy? Toca la opción que más se parezca 👇" }], flow, chips: STAGE_CHIPS };
      const np = { ...p, stage };
      const r = recommend(np);
      return {
        replies: [
          { text: `Gracias por contarme 🙌 Por lo que veo (${STAGE_LABEL[stage]}), te recomiendo empezar por ${r.name}: ${r.pitch}.`, cta: r.cta },
          { text: "¿Quieres que el equipo te prepare una propuesta personalizada?" },
        ],
        flow: { step: "recommend", profile: np },
        chips: RECO_CHIPS,
      };
    }
    case "recommend": {
      if (t === "precios" || has(t, "precio", "cuánto", "cuanto", "plan", "tarifa", "costo"))
        return { replies: [{ text: "Aquí puedes ver todos los planes y precios 👇 Y si quieres algo a tu medida, te conecto con un asesor.", cta: { label: "Ver la tienda", href: "/tienda" } }], flow, chips: RECO_CHIPS };
      if (t === "duda" || has(t, "duda", "pregunta", "otra cosa"))
        return { replies: [{ text: "Claro, cuéntame tu duda y te ayudo 🙂" }], flow: { step: "open", profile: p }, chips: OPEN_CHIPS };
      const aside = infoAside(t);
      if (aside) return { replies: [aside, { text: "¿Te preparo una propuesta con el equipo?" }], flow, chips: RECO_CHIPS };
      return { replies: [{ text: "¿Te gustaría que te preparen una propuesta a tu medida? Te puedo conectar con un asesor." }], flow, chips: RECO_CHIPS };
    }
    case "open":
    default: {
      const aside = infoAside(t);
      if (aside) return { replies: [aside], flow, chips: OPEN_CHIPS };
      return { replies: [{ text: "Puedo ayudarte con coaching musical, tu marca o tu sistema digital, y conectarte con un asesor cuando quieras 🙂" }], flow, chips: OPEN_CHIPS };
    }
  }
}

export function Sofia() {
  const [messages, setMessages] = useState<Msg[]>([{ id: 0, from: "sofia", text: GREETING }]);
  const [chips, setChips] = useState<Chip[]>(GOAL_CHIPS);
  const [flow, setFlow] = useState<Flow>(INITIAL_FLOW);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const idRef = useRef(1);
  const logRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);
  const busy = useRef(false);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  const push = (m: Omit<Msg, "id">) => setMessages((prev) => [...prev, { ...m, id: idRef.current++ }]);

  // `value` lo lee el motor (p. ej. "goal:web"); `label` es lo que ve el usuario.
  const send = (value: string, label?: string) => {
    const shown = (label ?? value).trim();
    if (!shown || busy.current) return;
    busy.current = true;
    push({ from: "user", text: shown });
    setInput("");
    setTyping(true);
    setChips([]);
    const turn = advance(flow, value);
    const t = window.setTimeout(() => {
      setTyping(false);
      turn.replies.forEach((r) => push({ from: "sofia", text: r.text, cta: r.cta }));
      setFlow(turn.flow);
      setChips(turn.chips);
      busy.current = false;
    }, 650 + Math.min(900, shown.length * 16));
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
            mismo. Te hace un par de preguntas, entiende tu negocio y te guía al
            camino correcto —coaching, marca o sistema—. Cuando estés listo, te
            conecta con el equipo con tu información ya lista.
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
                <span>{m.text}</span>
                {m.cta &&
                  (m.cta.external ? (
                    <a className="sofia-bubble-cta" href={m.cta.href} target="_blank" rel="noopener noreferrer">
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
              <div className="sofia-bubble sofia-bubble-in sofia-typing" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          {chips.length > 0 && !typing && (
            <div className="sofia-quick">
              {chips.map((c) => (
                <button key={c.value} type="button" className="sofia-chip" onClick={() => send(c.value, c.label)}>
                  {c.label}
                </button>
              ))}
            </div>
          )}

          <form className="sofia-input" onSubmit={onSubmit}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escríbele a Sofía…"
              aria-label="Escribe tu mensaje para Sofía"
              autoComplete="off"
            />
            <button type="submit" className="sofia-send" aria-label="Enviar mensaje" disabled={typing || !input.trim()}>
              <ArrowRightIcon width={16} height={16} />
            </button>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
