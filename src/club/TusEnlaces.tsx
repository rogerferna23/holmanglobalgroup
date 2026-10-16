import { useState } from "react";
import { compartirAgenda, enlaceAgenda } from "@/lib/catalogo";
import { compartirClub, compartirTienda, enlaceClub, enlaceTienda } from "@/lib/promocion";

/**
 * Los tres enlaces del embajador, juntos y en orden de uso. Los tres llevan el
 * mismo código: cualquiera que use, la persona queda a su nombre. Cambia solo
 * a dónde llega. La Sesión de Claridad va primero porque es el camino del
 * método (Cómo recomendar); el club y la tienda, para quien ya sabe qué quiere.
 */

type Enlace = {
  id: "claridad" | "club" | "tienda";
  titulo: string;
  cuando: string;
  url: string;
  whatsapp: string;
};

/** La dirección sin «https://», que se lee mejor en la tarjeta. */
function corta(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "");
}

export function TusEnlaces({ code, cargando }: { code: string; cargando: boolean }) {
  const [copiado, setCopiado] = useState<Enlace["id"] | null>(null);

  if (!code) {
    return (
      <section className="enl">
        <h3 className="enl-head">Tus enlaces</h3>
        <p className="club-muted">
          {cargando
            ? "Estamos buscando tus enlaces."
            : "Tus enlaces aparecen aquí en cuanto tu código esté listo. Si quieres apurarlo, escríbenos y lo vemos."}
        </p>
      </section>
    );
  }

  const enlaces: Enlace[] = [
    {
      id: "claridad",
      titulo: "Sesión de Claridad",
      cuando: "Para casi todos: 30 minutos gratis con Holman. Él escucha y le dice qué le sirve.",
      url: enlaceAgenda(code),
      whatsapp: compartirAgenda(code),
    },
    {
      id: "club",
      titulo: "ECOS Business Club",
      cuando: "Para quien quiere vender y comunicar mejor. Entra con su prueba gratis.",
      url: enlaceClub(code),
      whatsapp: compartirClub(code),
    },
    {
      id: "tienda",
      titulo: "Productos de HGG",
      cuando: "Para quien ya sabe lo que quiere: coaching, marca, web o sistemas.",
      url: enlaceTienda(code),
      whatsapp: compartirTienda(code),
    },
  ];

  async function copiar(e: Enlace) {
    try {
      await navigator.clipboard.writeText(e.url);
      setCopiado(e.id);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      /* el enlace está a la vista para tomarlo a mano */
    }
  }

  return (
    <section className="enl">
      <div className="club-list-head">
        <h3>Tus 3 enlaces</h3>
        <span className="club-muted">
          Código <strong className="enl-code">{code}</strong>
        </span>
      </div>
      <p className="club-muted enl-sub">
        Elige según la persona. Los tres llevan tu código: entre por donde entre, queda a tu nombre.
      </p>
      <ol className="enl-lista">
        {enlaces.map((e, i) => (
          <li key={e.id} className={`enl-card ${e.id}${i === 0 ? " principal" : ""}`}>
            <div className="enl-top">
              <span className="enl-num" aria-hidden>{i + 1}</span>
              <div className="enl-txt">
                <p className="enl-titulo">
                  {e.titulo}
                  {i === 0 && <span className="enl-tag">El principal</span>}
                </p>
                <p className="enl-cuando">{e.cuando}</p>
              </div>
            </div>
            <p className="enl-url" title={e.url}>{corta(e.url)}</p>
            <div className="enl-acciones">
              <button type="button" className={`club-btn small${copiado === e.id ? " ok" : ""}`} onClick={() => copiar(e)}>
                {copiado === e.id ? "¡Copiado!" : "Copiar"}
              </button>
              <a className="club-btn small ghost" href={e.whatsapp} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
