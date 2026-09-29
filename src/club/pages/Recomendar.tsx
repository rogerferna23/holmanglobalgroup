import { useState } from "react";
import { Link } from "react-router-dom";
import { useClub } from "@/contexts/ClubContext";
import { NegocioTabs } from "@/club/NegocioTabs";
import { avisoEmbajador, compartirAgenda, enlaceAgenda } from "@/lib/catalogo";

/**
 * Guía del embajador. Su trabajo cabe en una frase: abrir la conversación y
 * llevar a la persona a la Sesión de Claridad. El diagnóstico, la propuesta y
 * el cierre son de HGG. Por eso aquí no hay precios: la guía enseña a escuchar,
 * a invitar y a mandar el enlace.
 */

type Linea = { quien: "tu" | "ellos"; texto: string };
type Dialogo = { id: string; titulo: string; lleva: string; lineas: Linea[] };

/*
 * Método de invitación (basado en Eric Worre): primero preguntas, para que la
 * persona vea por sí misma lo que necesita; luego la invitación como pregunta
 * y como regalo («si te regalo…, ¿la agendarías?»); el enlace sale solo
 * después del sí, con el compromiso de agendar de una vez.
 */
const PASOS = [
  { titulo: "Escucha", texto: "Qué le cuesta a la persona." },
  { titulo: "Pregunta", texto: "Que descubra lo que necesita." },
  { titulo: "Regala", texto: "«Si te regalo una sesión, ¿la agendarías?»" },
  { titulo: "Envía", texto: "Tu enlace, justo después del sí." },
];

const DIALOGOS: Dialogo[] = [
  {
    id: "vender",
    titulo: "Le cuesta vender",
    lleva: "ECOS Business Club",
    lineas: [
      { quien: "ellos", texto: "Este mes ha estado flojo. La gente pregunta, pero al final se queda pensando." },
      { quien: "tu", texto: "Te entiendo, eso desgasta. ¿En qué momento sientes que se te va la venta?" },
      { quien: "ellos", texto: "Cuando llego al precio. Ahí se enfría todo." },
      { quien: "tu", texto: "¿Y cuánto calculas que te está costando eso cada mes?" },
      { quien: "ellos", texto: "Uf, bastante." },
      {
        quien: "tu",
        texto:
          "Yo estoy en ECOS, un club de empresarios donde entrenamos justo eso cada semana: vender, comunicar y hablar con seguridad. Holman, quien lo dirige, abre unos espacios de Sesión de Claridad: media hora contigo para ver dónde se te está yendo la venta. Si te consigo uno de regalo, ¿lo agendarías?",
      },
      { quien: "ellos", texto: "Sí, claro." },
      { quien: "tu", texto: "Perfecto. Te paso el enlace y lo escoges ahora que lo tienes presente: [tu enlace]. Cuando quede, me cuentas qué día te tocó." },
    ],
  },
  {
    id: "rumbo",
    titulo: "Busca rumbo",
    lleva: "Programa Sentido",
    lineas: [
      { quien: "ellos", texto: "Estoy en un momento de transición. Siento que lo que hago ya me quedó pequeño." },
      { quien: "tu", texto: "Qué valioso que lo tengas tan claro. ¿Qué te gustaría que fuera diferente dentro de un año?" },
      { quien: "ellos", texto: "Trabajar en algo que me llene, y vivir de eso." },
      { quien: "tu", texto: "¿Y qué has hecho hasta ahora para dar ese paso?" },
      { quien: "ellos", texto: "Lo he pensado mucho, pero sigo en el mismo lugar." },
      {
        quien: "tu",
        texto:
          "Te entiendo. Yo trabajo con Holman Orjuela, un coach que acompaña justo ese proceso: descubrir quién eres, qué quieres construir y cómo vivir de ello. Él abre algunos espacios de Sesión de Claridad, 30 minutos uno a uno. Si te regalo uno, ¿lo tomarías?",
      },
      { quien: "ellos", texto: "Sí, me interesa." },
      { quien: "tu", texto: "Excelente. Agéndalo hoy mismo para que no se quede en otra idea: [tu enlace]" },
    ],
  },
  {
    id: "marca",
    titulo: "Su imagen se quedó atrás",
    lleva: "Marca con Huella",
    lineas: [
      { quien: "ellos", texto: "Me da pena pasar mi Instagram. El logo lo hice yo." },
      { quien: "tu", texto: "Se nota el cariño que le pones a lo que haces. ¿Qué te gustaría que la gente sintiera al ver tu marca?" },
      { quien: "ellos", texto: "Que se vea profesional, que confíen." },
      { quien: "tu", texto: "¿Y cuántos clientes crees que se quedan en el camino porque la imagen todavía muestra menos de lo que vales?" },
      { quien: "ellos", texto: "Seguro varios." },
      {
        quien: "tu",
        texto:
          "En Holman Global Group construyen marcas desde la historia de quien las dirige: mensaje, logo, colores y página. Si te consigo una Sesión de Claridad de regalo para revisar tu marca con ellos, ¿la agendarías?",
      },
      { quien: "ellos", texto: "¡Claro!" },
      { quien: "tu", texto: "Perfecto. Escoge tu horario de una vez: [tu enlace]" },
    ],
  },
  {
    id: "sistema",
    titulo: "Está desbordado",
    lleva: "DelegaWork 360 · Sistemas con IA",
    lineas: [
      { quien: "ellos", texto: "Tengo clientes, pero se me pierden en WhatsApp y hago todo yo." },
      { quien: "tu", texto: "Eso quiere decir que el negocio creció. ¿Cuánto tiempo se te va en responder y hacer seguimiento?" },
      { quien: "ellos", texto: "Medio día, fácil." },
      { quien: "tu", texto: "¿Y qué harías con ese medio día si lo recuperas?" },
      { quien: "ellos", texto: "Vender más, o por fin descansar." },
      {
        quien: "tu",
        texto:
          "Holman Global Group monta sistemas que hacen ese trabajo: CRM, seguimiento automático y hasta una IA que responde con la voz de tu marca. Si te regalo una Sesión de Claridad para revisar qué se puede automatizar en tu negocio, ¿la tomarías?",
      },
      { quien: "ellos", texto: "Sí, me sirve." },
      { quien: "tu", texto: "Listo. Aquí está el enlace; agéndala ahora y me cuentas qué día quedó: [tu enlace]" },
    ],
  },
  {
    id: "frio",
    titulo: "Lo conoces poco",
    lleva: "Lo que la persona necesite",
    lineas: [
      { quien: "tu", texto: "Vi lo que publicaste sobre {tema}. Me gustó cómo lo cuentas." },
      { quien: "ellos", texto: "¡Gracias!" },
      { quien: "tu", texto: "¿Lo estás llevando como negocio?" },
      { quien: "ellos", texto: "Sí, estoy arrancando." },
      { quien: "tu", texto: "Qué bien. Y hoy, ¿qué es lo que más te está costando: conseguir clientes, darte a conocer o tener claro el rumbo?" },
      { quien: "ellos", texto: "Conseguir clientes, la verdad." },
      { quien: "tu", texto: "¿Y qué has probado hasta ahora?" },
      { quien: "ellos", texto: "Publico, pero casi nadie escribe." },
      {
        quien: "tu",
        texto:
          "Es muy común al empezar, y tiene solución. Trabajo con Holman Global Group, y Holman da unas Sesiones de Claridad: media hora para mirar tu caso y definir tu siguiente paso. Si te regalo una, ¿la agendarías?",
      },
      { quien: "ellos", texto: "Sí, dale." },
      { quien: "tu", texto: "Genial. Escoge tu horario hoy que lo tienes presente: [tu enlace]" },
    ],
  },
];

const PREGUNTAS = [
  {
    p: "«¿Cuánto cuesta?»",
    r: "Depende de lo que necesites, y para eso es la llamada: Holman te dice qué te sirve y cuánto vale. La sesión es un regalo.",
  },
  {
    p: "«¿Es una llamada de ventas?»",
    r: "Esa media hora es tuya: tú cuentas y Holman escucha. Al final, si hay algo que te sirva, te lo dice con toda claridad.",
  },
  {
    p: "«¿Y tú qué ganas?»",
    r: "Si terminas trabajando con ellos, recibo una comisión. Te lo recomiendo porque estoy ahí y me está sirviendo.",
  },
  {
    p: "«Déjame pensarlo.»",
    r: "Claro, es tu decisión. Cuéntame, ¿qué es exactamente lo que necesitas pensar? Tal vez te pueda ayudar con alguna duda.",
  },
  {
    p: "«Ando sin tiempo.»",
    r: "Es media hora y la agendas cuando te quede cómodo. Sales con claridad de tu siguiente paso.",
  },
];


/** Hora de mentira para cada mensaje: se ve como un chat real que avanza. */
function hora(i: number): string {
  const min = 12 + i * 2;
  return `10:${String(min).padStart(2, "0")}`;
}

export default function Recomendar() {
  const { member } = useClub();
  const code = member?.referral_code ?? "";
  const link = enlaceAgenda(code);
  const [copiado, setCopiado] = useState(false);
  const [sel, setSel] = useState(DIALOGOS[0].id);
  const d = DIALOGOS.find((x) => x.id === sel) ?? DIALOGOS[0];

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* el enlace está a la vista para tomarlo a mano */
    }
  }

  return (
    <div className="club-page rec">
      <header className="club-page-head">
        <p className="club-eyebrow">Negocio</p>
        <h1>Cómo recomendar</h1>
        <p className="club-page-sub">
          Tú abres la conversación y la llevas a una <strong>Sesión de Claridad</strong> gratis con Holman. Nosotros
          hacemos el resto.
        </p>
        <NegocioTabs />
      </header>

      <section className="rec-link">
        <p className="rec-link-label">Tu enlace para agendar una Sesión de Claridad</p>
        <div className="club-reflink-row">
          <input readOnly value={link} aria-label="Tu enlace de agenda" onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="club-btn small" onClick={copiar}>
            {copiado ? "Copiado" : "Copiar"}
          </button>
        </div>
        <div className="rec-acciones">
          <a className="club-btn small ghost" href={compartirAgenda(code)} target="_blank" rel="noopener noreferrer">
            Enviar por WhatsApp
          </a>
          <a className="club-btn small ghost" href={avisoEmbajador(member?.name ?? "", code)} target="_blank" rel="noopener noreferrer">
            Avisar a HGG
          </a>
        </div>
        <p className="club-muted">
          Es el que mandas después del «sí», para que la persona agende su sesión con Holman. Quien
          agenda por aquí también queda a tu nombre. (Para invitar a alguien al club está tu enlace
          del club, en «Comisiones».)
        </p>
      </section>

      <ol className="rec-pasos">
        {PASOS.map((p, i) => (
          <li key={p.titulo} className="rec-paso">
            <span className="rec-paso-num">{i + 1}</span>
            <span>
              <strong>{p.titulo}</strong>
              <span>{p.texto}</span>
            </span>
          </li>
        ))}
      </ol>

      <section>
        <div className="club-list-head">
          <h3>Diálogos</h3>
          <span className="club-muted">Elige la situación</span>
        </div>
        <div className="rec-situaciones" role="tablist">
          {DIALOGOS.map((x) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={x.id === sel}
              className={`rec-situacion${x.id === sel ? " active" : ""}`}
              onClick={() => setSel(x.id)}
            >
              {x.titulo}
            </button>
          ))}
        </div>
        <div className="rec-wa">
          <div className="rec-wa-top">
            <span className="rec-wa-avatar" aria-hidden>
              <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="9" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" /></svg>
            </span>
            <span>
              <span className="rec-wa-name">Tu contacto</span>
              <span className="rec-wa-state">Lleva a: {d.lleva}</span>
            </span>
          </div>
          <div className="rec-chat">
            {d.lineas.map((l, i) => {
              const primera = i === 0 || d.lineas[i - 1].quien !== l.quien;
              return (
                <p key={`${d.id}-${i}`} className={`rec-burbuja ${l.quien}${primera ? " cola" : ""}`}>
                  <span className="sr-only">{l.quien === "tu" ? "Tú: " : "La otra persona: "}</span>
                  {l.texto}
                  <span className="rec-hora" aria-hidden>
                    {hora(i)}
                    {l.quien === "tu" && <span className="rec-check">✓✓</span>}
                  </span>
                </p>
              );
            })}
          </div>
        </div>
      </section>

      <section>
        <div className="club-list-head">
          <h3>Si te preguntan…</h3>
        </div>
        <div className="rec-faq">
          {PREGUNTAS.map((q) => (
            <details key={q.p}>
              <summary>{q.p}</summary>
              <p>{q.r}</p>
            </details>
          ))}
        </div>
      </section>

      <Link to="catalogo" className="rec-catalogo">
        <span className="rec-catalogo-title">Ver el catálogo</span>
        <span className="rec-catalogo-sub">Qué ofrecemos y a quién le sirve. Descárgalo en PDF con tu enlace.</span>
        <span className="rec-catalogo-cta" aria-hidden>→</span>
      </Link>
    </div>
  );
}
