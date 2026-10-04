import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useClub } from "@/contexts/ClubContext";
import { CLUB } from "@/lib/routes";
import { ECOS, tieneBeneficios } from "@/lib/ecos";
import { avisoEmbajador, compartirAgenda, enlaceAgenda } from "@/lib/catalogo";

/**
 * El plan del embajador, de su enlace a su primera comisión. Va arriba de
 * «Cómo recomendar»: primero el orden (a quién escribirle, a qué ritmo y qué
 * hacer después del sí) y debajo los diálogos para la conversación.
 *
 * Las casillas son una ayuda personal: viven en el navegador (localStorage)
 * y nada va al servidor.
 */

type Paso = { id: string; titulo: string; texto: string; puntos?: string[] };

const PASOS: Paso[] = [
  {
    id: "enlace",
    titulo: "Ten tu enlace a mano",
    texto:
      "Es el enlace de tu Sesión de Claridad. Quien agenda por ahí queda a tu nombre, así que guárdalo donde lo encuentres rápido: tus notas, un mensaje fijado o tus respuestas rápidas de WhatsApp.",
  },
  {
    id: "lista",
    titulo: "Haz tu lista de 20 nombres",
    texto: "Escríbelos sin filtrar. Tú abres la conversación; la persona decide si le sirve.",
    puntos: [
      "Clientes y proveedores con los que ya hablas.",
      "Colegas de tu sector y de tus grupos.",
      "Amigos y familiares que están emprendiendo.",
      "Quien está cambiando de trabajo o buscando rumbo.",
      "Quien publica sobre su negocio en redes.",
    ],
  },
  {
    id: "metodo",
    titulo: "Aprende el método",
    texto:
      "Escucha, pregunta, regala y envía. Lee los diálogos de abajo y elige el que más se parece a tu primer contacto.",
  },
  {
    id: "ritmo",
    titulo: "Conversa con 3 personas al día",
    texto:
      "Con 3 al día son 15 a la semana. Escribe primero para saber cómo está y qué está construyendo; la invitación llega sola cuando aparece lo que necesita.",
  },
  {
    id: "si",
    titulo: "Después del «sí», en el mismo momento",
    texto: "El mejor momento para agendar es ahora, mientras la persona lo tiene presente.",
    puntos: [
      "Envía tu enlace en ese mismo mensaje.",
      "Pídele que escoja su horario ya y te cuente qué día le quedó.",
      "Avísale a HGG con el botón «Avisar a HGG», con su nombre.",
    ],
  },
  {
    id: "acompana",
    titulo: "Acompáñala hasta la sesión",
    texto:
      "Un día antes, escríbele: «¿Todo listo para mañana? Te va a encantar». Así llega con ganas. En la sesión, Holman escucha y le propone lo que le sirva: tú no vendes ni das precios.",
  },
  {
    id: "resultados",
    titulo: "Mira tus resultados",
    texto: `Si la persona compra, ves tu ${ECOS.comisionReferidoPct}% en «Comisiones»: primero por pagar y luego pagada. Como embajador, ganas sobre todo lo que compre mientras tu membresía siga activa.`,
  },
];

function leer(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function PlanEmbajador() {
  const { member } = useClub();
  const code = member?.referral_code ?? "";
  const link = enlaceAgenda(code);
  const key = `ecos-primeros-pasos:${member?.id ?? "anon"}`;
  const [hechos, setHechos] = useState<string[]>([]);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => setHechos(leer(key)), [key]);

  function marcar(id: string) {
    const nuevos = hechos.includes(id) ? hechos.filter((x) => x !== id) : [...hechos, id];
    setHechos(nuevos);
    try {
      localStorage.setItem(key, JSON.stringify(nuevos));
    } catch {
      /* sin almacenamiento, la casilla vale mientras la página esté abierta */
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* el enlace está a la vista para tomarlo a mano */
    }
  }

  const listos = PASOS.filter((p) => hechos.includes(p.id)).length;
  const conBeneficios = tieneBeneficios(member);

  /** Lo que va debajo de cada paso, si lleva algo más que texto. */
  function extra(id: string) {
    switch (id) {
      case "enlace":
        return (
          <div className="club-reflink-row">
            <input readOnly value={link} aria-label="Tu enlace de agenda" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className="club-btn small" onClick={copiar}>
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
        );
      case "metodo":
        return (
          <a href="#dialogos" className="club-btn small ghost pp-accion">
            Ver los diálogos
          </a>
        );
      case "si":
        return (
          <div className="rec-acciones">
            <a className="club-btn small ghost" href={compartirAgenda(code)} target="_blank" rel="noopener noreferrer">
              Enviar por WhatsApp
            </a>
            <a className="club-btn small ghost" href={avisoEmbajador(member?.name ?? "", code)} target="_blank" rel="noopener noreferrer">
              Avisar a HGG
            </a>
          </div>
        );
      case "resultados":
        return (
          <Link to=".." relative="path" className="club-btn small ghost pp-accion">
            Ver mis comisiones
          </Link>
        );
      default:
        return null;
    }
  }

  return (
    <div className="pp">
      {!conBeneficios && (
        <section className="pp-aviso">
          <p>
            Estás en tu prueba gratis: ya puedes hacer tu lista, practicar y conversar. Tus comisiones se abren al activar
            tu membresía.
          </p>
          <Link to={CLUB.activar} className="club-btn small">
            Activar mi membresía
          </Link>
        </section>
      )}

      <div className="pp-progreso" aria-live="polite">
        <span>
          {listos === PASOS.length ? "¡Listo! Ya tienes tu sistema andando." : `${listos} de ${PASOS.length} pasos`}
        </span>
        <span className="pp-barra" aria-hidden>
          <span style={{ width: `${(listos / PASOS.length) * 100}%` }} />
        </span>
      </div>

      <ol className="pp-pasos">
        {PASOS.map((p, i) => {
          const hecho = hechos.includes(p.id);
          return (
            <li key={p.id} className={`pp-paso${hecho ? " hecho" : ""}`}>
              <button
                type="button"
                className="pp-check"
                aria-pressed={hecho}
                aria-label={hecho ? `Desmarcar: ${p.titulo}` : `Marcar como hecho: ${p.titulo}`}
                onClick={() => marcar(p.id)}
              >
                {hecho ? "✓" : i + 1}
              </button>
              <div className="pp-cuerpo">
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
                {p.puntos && (
                  <ul>
                    {p.puntos.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                )}
                {extra(p.id)}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
