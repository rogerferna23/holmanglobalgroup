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
  {
    titulo: "Escucha",
    texto:
      "Pon atención a lo que la gente cuenta de su negocio o de su vida. En el catálogo están las frases que dice quien necesita cada programa.",
  },
  {
    titulo: "Profundiza",
    texto:
      "Haz dos o tres preguntas: qué le cuesta, qué ha intentado, cuánto le está costando. Que la persona se dé cuenta por sí misma de lo que necesita.",
  },
  {
    titulo: "Invita con valor",
    texto:
      "Ofrece la Sesión de Claridad como un regalo y en forma de pregunta: «Si te regalo una sesión con Holman, ¿la agendarías?».",
  },
  {
    titulo: "Confirma y envía",
    texto:
      "Con el sí, manda tu enlace y pide que agende de una vez. Luego avísanos el nombre para que la persona llegue esperada.",
  },
];

const DIALOGOS: Dialogo[] = [
  {
    id: "vender",
    titulo: "Cuando alguien dice que le cuesta vender",
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
    titulo: "Cuando alguien está buscando rumbo",
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
    titulo: "Cuando alguien tiene negocio y su imagen se quedó atrás",
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
    titulo: "Cuando alguien ya vende y está desbordado",
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
    titulo: "Cuando es alguien que conoces poco",
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

const REGLAS = [
  "Pregunta antes de invitar: la persona tiene que ver por sí misma lo que necesita.",
  "La sesión es un regalo, y se ofrece con una pregunta: «¿la agendarías?».",
  "El enlace va después del sí, con la invitación a agendar de una vez.",
  "Los precios los da Holman en la llamada. Tú hablas del valor y de tu experiencia.",
  "Tú abres la puerta y HGG acompaña el resto: diagnóstico, propuesta y cierre.",
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
  const [abierto, setAbierto] = useState<string>(DIALOGOS[0].id);

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
          Tu parte es abrir la conversación y llevar a la persona a una <strong>Sesión de Claridad</strong> con
          Holman: media hora, gratis, por videollamada. De ahí en adelante nos encargamos nosotros, y la comisión
          queda a tu nombre.
        </p>
        <NegocioTabs />
      </header>

      <section className="club-reflink">
        <label htmlFor="agenda-link">Tu enlace de agenda</label>
        <div className="club-reflink-row">
          <input id="agenda-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="club-btn small" onClick={copiar}>
            {copiado ? "Copiado" : "Copiar"}
          </button>
        </div>
        <div className="rec-acciones">
          <a className="club-btn small ghost" href={compartirAgenda(code)} target="_blank" rel="noopener noreferrer">
            Enviar por WhatsApp
          </a>
          <a className="club-btn small ghost" href={avisoEmbajador(member?.name ?? "", code)} target="_blank" rel="noopener noreferrer">
            Avisar a HGG a quién se lo mandé
          </a>
        </div>
        <p className="club-muted">
          Quien agenda por este enlace queda asociado a ti{code ? <> (código <strong>{code}</strong>)</> : null}. Tus
          comisiones las ves en <Link to="comisiones">Comisiones</Link>.
        </p>
      </section>

      <section>
        <div className="club-list-head">
          <h3>Tu trabajo, en cuatro pasos</h3>
        </div>
        <ol className="rec-pasos">
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="rec-paso">
              <span className="rec-paso-num">{i + 1}</span>
              <h4>{p.titulo}</h4>
              <p>{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <Link to="catalogo" className="rec-catalogo">
        <span className="club-eyebrow">Catálogo HGG</span>
        <span className="rec-catalogo-title">Qué ofrecemos y a quién le sirve</span>
        <span className="rec-catalogo-sub">
          El club, Sentido, Marca con Huella, DelegaWork 360 y los adicionales. Descárgalo en PDF con tu enlace.
        </span>
        <span className="rec-catalogo-cta">Ver catálogo →</span>
      </Link>

      <section>
        <div className="club-list-head">
          <h3>Diálogos para empezar</h3>
          <span className="club-muted">Úsalos de guía y dilo con tus palabras.</span>
        </div>
        <div className="rec-dialogos">
          {DIALOGOS.map((d) => {
            const open = abierto === d.id;
            return (
              <article key={d.id} className={`rec-dialogo${open ? " open" : ""}`}>
                <button type="button" className="rec-dialogo-head" aria-expanded={open} onClick={() => setAbierto(open ? "" : d.id)}>
                  <span>
                    <span className="rec-dialogo-title">{d.titulo}</span>
                    <span className="rec-dialogo-lleva">Lleva a: {d.lleva}</span>
                  </span>
                  <span className="rec-dialogo-chev" aria-hidden>{open ? "−" : "+"}</span>
                </button>
                {open && (
                  <div className="rec-wa">
                    <div className="rec-wa-top">
                      <span className="rec-wa-avatar" aria-hidden>
                        <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="9" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" /></svg>
                      </span>
                      <span>
                        <span className="rec-wa-name">Tu contacto</span>
                        <span className="rec-wa-state">en línea</span>
                      </span>
                    </div>
                    <div className="rec-chat">
                      {d.lineas.map((l, i) => {
                        const primera = i === 0 || d.lineas[i - 1].quien !== l.quien;
                        return (
                          <p key={i} className={`rec-burbuja ${l.quien}${primera ? " cola" : ""}`}>
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
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="club-list-head">
          <h3>Si te preguntan…</h3>
        </div>
        <dl className="rec-faq">
          {PREGUNTAS.map((q) => (
            <div key={q.p}>
              <dt>{q.p}</dt>
              <dd>{q.r}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="club-rules">
        <div className="club-rule">
          <h3>Así recomendamos en HGG</h3>
          <ul className="rec-reglas">
            {REGLAS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
