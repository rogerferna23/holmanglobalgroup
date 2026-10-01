import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { NegocioTabs } from "@/club/NegocioTabs";
import { useClub } from "@/contexts/ClubContext";
import { useClubPromo } from "@/lib/club-store";
import { compartirPromo, descargarPromo, enlaceClub, esDescargable, PROMO_BASE, textoParaPublicar, urlDePromo } from "@/lib/promocion";
import type { EcosPromo } from "@/lib/ecos";

const GRUPOS: { tipo: EcosPromo["tipo"]; titulo: string; vacio: string }[] = [
  { tipo: "flyer", titulo: "Flyers", vacio: "" },
  { tipo: "video", titulo: "Videos promocionales", vacio: "Pronto vas a encontrar aquí videos para tus historias y reels." },
  { tipo: "otro", titulo: "Más piezas", vacio: "" },
];

/**
 * Negocio → Material: todo lo que un embajador necesita para promocionar.
 * El catálogo (con su PDF) y las piezas para redes, cada una con un texto
 * sugerido que ya lleva su enlace: quien entre por esa publicación queda a su
 * nombre.
 */
export default function MaterialPromo() {
  const { member } = useClub();
  const { promo } = useClubPromo();
  const enlace = enlaceClub(member?.referral_code);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const piezas = useMemo(() => [...PROMO_BASE, ...promo], [promo]);

  async function copiar(p: EcosPromo) {
    try {
      await navigator.clipboard.writeText(textoParaPublicar(p.texto, enlace));
      setCopiado(p.id);
      setTimeout(() => setCopiado((c) => (c === p.id ? null : c)), 2000);
    } catch {
      setAviso("No se pudo copiar. Mantén presionado el texto para copiarlo a mano.");
    }
  }

  async function compartir(p: EcosPromo) {
    setAviso(null);
    const texto = textoParaPublicar(p.texto, enlace);
    // El texto queda copiado: Instagram no deja pegarlo desde «compartir».
    try { await navigator.clipboard.writeText(texto); } catch { /* sigue igual */ }
    const r = await compartirPromo(p, texto);
    if (r === "no-soportado") {
      await descargarPromo(p);
      setAviso("Lo descargamos y el texto quedó copiado: súbelo a tus redes y pega el texto.");
    }
  }

  return (
    <div className="club-page promo">
      <header className="club-page-head">
        <p className="club-eyebrow">Negocio</p>
        <h1>Material para compartir</h1>
        <p className="club-page-sub">
          Todo para promocionar en tus redes: el catálogo, flyers y videos. Cada pieza trae un texto listo para
          publicar con tu enlace, así quien entre por ahí queda a tu nombre.
        </p>
        <NegocioTabs />
      </header>

      {aviso && <p className="club-notice">{aviso}</p>}

      <Link to="catalogo" className="promo-catalogo">
        <img src="/hero-elefante-bg.jpg" alt="" />
        <span className="promo-catalogo-velo" aria-hidden />
        <span className="promo-catalogo-body">
          <span className="promo-tipo">Catálogo 2026</span>
          <strong>Del sentido al sistema</strong>
          <span>Lo que ofrece Holman Global Group y a quién le sirve. Descárgalo en PDF con tu enlace.</span>
          <span className="promo-catalogo-cta">Ver el catálogo →</span>
        </span>
      </Link>

      {GRUPOS.map((g) => {
        const items = piezas.filter((p) => p.tipo === g.tipo);
        if (!items.length && !g.vacio) return null;
        return (
          <section key={g.tipo} className="promo-grupo">
            <h2 className="club-section-title">{g.titulo}</h2>
            {!items.length ? (
              <p className="club-muted">{g.vacio}</p>
            ) : (
              <ul className="promo-grid">
                {items.map((p) => {
                  const url = urlDePromo(p);
                  const descargable = esDescargable(p);
                  return (
                    <li key={p.id} className="promo-pieza">
                      <div className="promo-media">
                        {p.tipo === "video" && descargable ? (
                          <video src={url} controls playsInline preload="metadata" />
                        ) : descargable && !/\.pdf($|\?)/i.test(url) ? (
                          <img src={url} alt={p.titulo} loading="lazy" />
                        ) : (
                          <span className="promo-enlace-ext">{p.tipo === "video" ? "Video" : "Pieza"} en un enlace</span>
                        )}
                      </div>
                      <h3>{p.titulo}</h3>
                      <details className="promo-texto">
                        <summary>Texto para publicar</summary>
                        <p>{textoParaPublicar(p.texto, enlace)}</p>
                      </details>
                      <div className="promo-acciones">
                        {descargable ? (
                          <>
                            <button type="button" className="club-btn small" onClick={() => compartir(p)}>Compartir</button>
                            <button type="button" className="club-link-btn" onClick={() => descargarPromo(p)}>Descargar</button>
                          </>
                        ) : (
                          <a className="club-btn small" href={url} target="_blank" rel="noopener noreferrer">Abrir</a>
                        )}
                        <button type="button" className="club-link-btn" onClick={() => copiar(p)}>
                          {copiado === p.id ? "Texto copiado" : "Copiar texto"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
