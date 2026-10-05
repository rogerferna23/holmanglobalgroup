import { useEffect, type ReactNode } from "react";
import { CookieBanner } from "@/components/cookie-banner";
import { InstagramIcon, PodcastIcon, SpotifyIcon, WhatsAppIcon, YoutubeIcon } from "@/components/icons";
import { trackEvent } from "@/lib/analytics";
import { CLARIDAD_WA_URL, ECOS_CANAL_WA_URL, SITE } from "@/lib/config";
import { PODCAST_LINKS } from "@/lib/podcast";
import { CLUB } from "@/lib/routes";

/**
 * `/links` — la página del enlace de la bio de Instagram.
 *
 * Tres puertas del mismo camino, de menos a más cercanía: el canal y el podcast
 * (gratis), ECOS (en comunidad) y la Sesión de Claridad (1 a 1). La primera
 * tarjeta es el llamado principal: ECOS mientras dure el lanzamiento (hasta el
 * 1 de noviembre de 2026) y la Sesión de Claridad después.
 *
 * Los enlaces del sitio llevan utm_source=instagram&utm_medium=bio para ver en
 * la analítica cuánta gente llega desde aquí; cada clic se registra además como
 * evento `links_click` (solo con consentimiento, como todo el sitio).
 */

const FIN_LANZAMIENTO_ECOS = Date.UTC(2026, 10, 1, 4); // 1 nov 2026, 00:00 en Nueva York

const UTM = "utm_source=instagram&utm_medium=bio";

type Puerta = {
  id: string;
  titulo: string;
  /** Sello dorado junto al título (p. ej. «De regalo»). */
  sello?: string;
  texto: string;
  href: string;
  icono: ReactNode;
};

const ECOS: Puerta = {
  id: "ecos",
  titulo: "ECOS Business Club",
  texto: "Clases en vivo de ventas, marketing y oratoria, en comunidad. Pruébalo gratis.",
  href: `${CLUB.landing}?${UTM}`,
  icono: <img src="/ecos-placa.png" alt="" width={44} height={44} />,
};

const CLARIDAD: Puerta = {
  id: "claridad",
  titulo: "Sesión de Claridad",
  sello: "De regalo",
  texto: "1 a 1 conmigo o con alguien de mi equipo, para encontrar tu siguiente paso.",
  href: CLARIDAD_WA_URL,
  icono: <img src="/logo-h.png" alt="" width={44} height={44} />,
};

const CANAL: Puerta = {
  id: "canal",
  titulo: "Canal de WhatsApp",
  texto: "Avisos de clases, podcast y masterclass de ECOS.",
  href: ECOS_CANAL_WA_URL,
  icono: <WhatsAppIcon width={24} height={24} />,
};

const PODCAST: Puerta = {
  id: "podcast",
  titulo: "ECOS Podcast",
  texto: "Conversaciones para convertir lo que te apasiona en negocio.",
  href: PODCAST_LINKS.youtube,
  icono: <PodcastIcon width={24} height={24} />,
};

function externo(href: string) {
  return /^https?:\/\//.test(href);
}

export default function Links() {
  const puertas = Date.now() < FIN_LANZAMIENTO_ECOS ? [ECOS, CLARIDAD, CANAL, PODCAST] : [CLARIDAD, ECOS, CANAL, PODCAST];

  useEffect(() => {
    document.title = "Holman Orjuela · Holman Global Group";
  }, []);

  return (
    <main className="links">
      <div className="links-glow" aria-hidden />
      <header className="links-head">
        <img className="links-retrato" src="/links/holman-retrato.webp" alt="Holman Orjuela" width={168} height={224} />
        <p className="links-eyebrow">Holman Global Group</p>
        <h1 className="links-name">Holman Orjuela</h1>
        <p className="links-role">Coach estratégico de marca y negocios</p>
        <p className="links-lema">Creemos que puedes vivir de lo que amas.<br /><span>Nosotros te mostramos el camino.</span></p>
      </header>

      <nav className="links-list" aria-label="Enlaces">
        {puertas.map((p, i) => (
          <a
            key={p.id}
            className={`links-card${i === 0 ? " is-main" : ""}`}
            href={p.href}
            {...(externo(p.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            onClick={() => trackEvent("links_click", { destino: p.id, posicion: i + 1 })}
          >
            <span className="links-card-icon">{p.icono}</span>
            <span className="links-card-text">
              <strong>{p.titulo}{p.sello && <em className="links-card-sello">{p.sello}</em>}</strong>
              <span>{p.texto}</span>
            </span>
            <span className="links-card-arrow" aria-hidden>→</span>
          </a>
        ))}
      </nav>

      <footer className="links-foot">
        <div className="links-social">
          <a href={SITE.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><InstagramIcon width={20} height={20} /></a>
          <a href={PODCAST_LINKS.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube"><YoutubeIcon width={20} height={20} /></a>
          <a href={PODCAST_LINKS.spotify} target="_blank" rel="noopener noreferrer" aria-label="Spotify"><SpotifyIcon width={20} height={20} /></a>
        </div>
        <a className="links-site" href={`/?${UTM}`}>holmanglobalgroup.com</a>
      </footer>
      <CookieBanner />
    </main>
  );
}
