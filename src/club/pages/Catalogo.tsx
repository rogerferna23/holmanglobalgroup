import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { NegocioTabs } from "@/club/NegocioTabs";
import { useClub } from "@/contexts/ClubContext";
import { ADICIONALES, CATALOGO, enlaceAgenda, type Pieza } from "@/lib/catalogo";
import { SITE } from "@/lib/config";

/**
 * Catálogo de HGG, sin precios. En pantalla es la referencia del embajador; al
 * descargarlo (window.print → «Guardar como PDF») sale en hojas A4 con el
 * enlace de agenda de quien lo descarga, listo para mandar por WhatsApp.
 */
type Emblema = Pieza["emblema"];
const EMBLEMA_ADICIONALES: Emblema = { letras: "+" };

/**
 * Emblema dorado de cada producto: la placa de ECOS o un monograma en aro,
 * al estilo del logo H de HGG. Todo en dorado: el catálogo va en un solo color.
 */
function EmblemaHGG({ e, size }: { e: Emblema; size: number }) {
  const oro = useId();
  if ("img" in e) return <img src={e.img} alt="" width={size} height={size} className="cat-emblema-img" />;
  const largo = e.letras.length > 1;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="cat-emblema" aria-hidden>
      <defs>
        <linearGradient id={oro} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7A5A1E" />
          <stop offset="0.45" stopColor="#F5D46A" />
          <stop offset="0.7" stopColor="#F0B800" />
          <stop offset="1" stopColor="#6B4A16" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="44" fill="none" stroke={`url(#${oro})`} strokeWidth="7" />
      <text
        x="50"
        y="51"
        textAnchor="middle"
        dominantBaseline="central"
        fill={`url(#${oro})`}
        fontFamily="Questrial, sans-serif"
        fontSize={largo ? 36 : 48}
        letterSpacing={largo ? -1 : 0}
      >
        {e.letras}
      </text>
    </svg>
  );
}

const sinComillas = (f: string) => f.replace(/[«»]/g, "");

export default function Catalogo() {
  const { member } = useClub();
  const code = member?.referral_code ?? "";
  const nombre = member?.name ?? "";
  const link = enlaceAgenda(code);
  const ids = [...CATALOGO.map((p) => p.id), "adicionales"];
  const [sel, setSel] = useState(ids[0]);
  const idx = ids.indexOf(sel);
  const pieza = CATALOGO.find((p) => p.id === sel);
  const siguiente = ids[(idx + 1) % ids.length];
  const emblemaDe = (id: string): Emblema => CATALOGO.find((p) => p.id === id)?.emblema ?? EMBLEMA_ADICIONALES;
  const nombreDe = (id: string) => CATALOGO.find((p) => p.id === id)?.nombre ?? "Productos adicionales";

  return (
    <div className="club-page cat">
      <header className="club-page-head">
        <p className="club-eyebrow">Negocio</p>
        <h1>Catálogo</h1>
        <p className="club-page-sub">Qué ofrecemos y a quién le sirve. Los precios los da Holman en la llamada.</p>
        <button type="button" className="club-btn small cat-descargar" onClick={() => window.print()}>
          Descargar PDF con mi enlace
        </button>
        <NegocioTabs />
      </header>

      <div className="cat-selector" role="tablist" aria-label="Productos">
        {ids.map((id, i) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={id === sel}
            className={`cat-tile${id === sel ? " active" : ""}`}
            onClick={() => setSel(id)}
          >
            <span className="cat-tile-top">
              <EmblemaHGG e={emblemaDe(id)} size={40} />
              <span className="cat-tile-num">{String(i + 1).padStart(2, "0")}</span>
            </span>
            <span className="cat-tile-name">{nombreDe(id)}</span>
          </button>
        ))}
      </div>

      <section key={sel} className="cat-panel">
        <span className="cat-panel-emblema" aria-hidden>
          <EmblemaHGG e={emblemaDe(sel)} size={96} />
        </span>
        {pieza ? <PiezaPanel p={pieza} /> : <AdicionalesPanel />}
        <button type="button" className="cat-next" onClick={() => setSel(siguiente)}>
          Siguiente: {nombreDe(siguiente)} →
        </button>
      </section>

      {createPortal(
        <div className="cat-print-root">
          <HojaPortada nombre={nombre} />
          {CATALOGO.map((p) => (
            <HojaPieza key={p.id} p={p} />
          ))}
          <HojaAdicionales />
          <HojaCierre link={link} nombre={nombre} />
        </div>,
        document.body,
      )}
    </div>
  );
}

function Frases({ frases }: { frases: string[] }) {
  return (
    <div className="cat-frases">
      <p className="cat-label">Lo reconoces cuando dice</p>
      <div className="rec-chat cat-chat">
        {frases.map((f) => (
          <p key={f} className="rec-burbuja ellos cola">{sinComillas(f)}</p>
        ))}
      </div>
    </div>
  );
}

function PiezaPanel({ p }: { p: Pieza }) {
  return (
    <>
      <p className="cat-pilar">{p.pilar}</p>
      <h2 className="cat-nombre">{p.nombre}</h2>
      <p className="cat-promesa">{p.promesa}</p>
      <p className="cat-para">{p.paraQuien}</p>

      {p.caminos && (
        <ol className="cat-ruta">
          {p.caminos.map((c) => (
            <li key={c.nombre}>
              <strong>{c.nombre}</strong>
              <span>{c.detalle}</span>
            </li>
          ))}
        </ol>
      )}

      <p className="cat-label">Qué incluye</p>
      <ul className="cat-incluye">
        {p.incluye.map((i) => (
          <li key={i}>
            <svg viewBox="0 0 24 24" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {i}
          </li>
        ))}
      </ul>

      <Frases frases={p.frases} />
    </>
  );
}

function AdicionalesPanel() {
  return (
    <>
      <p className="cat-pilar">Adicionales</p>
      <h2 className="cat-nombre">Productos adicionales</h2>
      <p className="cat-promesa">Piezas puntuales para completar el negocio, cuando se necesiten.</p>
      <div className="cat-adicionales">
        {ADICIONALES.map((a) => (
          <div key={a.id} className="cat-adicional">
            <h3>{a.nombre}</h3>
            <p className="cat-adicional-promesa">{a.promesa}</p>
            <p className="cat-adicional-detalle">{a.detalle}</p>
            <p className="rec-burbuja ellos cola cat-adicional-frase">{sinComillas(a.frase)}</p>
          </div>
        ))}
      </div>
    </>
  );
}

/* --- Hojas A4 del PDF ----------------------------------------------------- */

function Pie({ n }: { n?: string }) {
  return (
    <footer className="cath-pie">
      <span>Holman Global Group · Corazón de Elefante</span>
      <span>{n ?? "holmanglobalgroup.com"}</span>
    </footer>
  );
}

function HojaPortada({ nombre }: { nombre: string }) {
  return (
    <section className="cath-hoja cath-portada">
      <img src="/logo-elefante.png" alt="" className="cath-logo" />
      <p className="cath-eyebrow">Catálogo 2026</p>
      <h1>
        Del sentido
        <br />
        al sistema.
      </h1>
      <p className="cath-lead">
        Acompañamos a personas y negocios en cada etapa: descubrir quiénes son, construir una marca con huella y
        hacer que el negocio funcione como un sistema.
      </p>
      <ol className="cath-indice">
        {CATALOGO.map((p) => (
          <li key={p.id}>
            <span>{p.numero}</span> {p.nombre}
          </li>
        ))}
        <li>
          <span>05</span> Productos adicionales
        </li>
      </ol>
      {nombre && <p className="cath-recomienda">Te lo recomienda {nombre}</p>}
      <Pie />
    </section>
  );
}

function HojaPieza({ p }: { p: Pieza }) {
  return (
    <section className="cath-hoja">
      <p className="cath-eyebrow">
        {p.numero} · {p.pilar}
      </p>
      <h2>{p.nombre}</h2>
      <p className="cath-promesa">{p.promesa}</p>
      <div className="cath-bloque">
        <h4>Para quién es</h4>
        <p>{p.paraQuien}</p>
      </div>
      <div className="cath-bloque">
        <h4>Qué incluye</h4>
        <ul className="cath-lista">
          {p.incluye.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </div>
      {p.caminos && (
        <div className="cath-bloque">
          <h4>Caminos</h4>
          <div className="cath-caminos">
            {p.caminos.map((c) => (
              <div key={c.nombre}>
                <strong>{c.nombre}</strong>
                <span>{c.detalle}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="cath-frases">
        <h4>Es para ti si alguna vez dijiste</h4>
        {p.frases.map((f) => (
          <p key={f}>{f}</p>
        ))}
      </div>
      <Pie n={p.numero} />
    </section>
  );
}

function HojaAdicionales() {
  return (
    <section className="cath-hoja">
      <p className="cath-eyebrow">05 · Adicionales</p>
      <h2>Productos adicionales</h2>
      <p className="cath-promesa">Piezas puntuales para completar tu negocio, cuando las necesites.</p>
      {ADICIONALES.map((a) => (
        <div key={a.id} className="cath-adicional">
          <h3>{a.nombre}</h3>
          <p className="cath-adicional-promesa">{a.promesa}</p>
          <p>{a.detalle}</p>
          <p className="cath-adicional-frase">{a.frase}</p>
        </div>
      ))}
      <Pie n="05" />
    </section>
  );
}

function HojaCierre({ link, nombre }: { link: string; nombre: string }) {
  return (
    <section className="cath-hoja cath-cierre">
      <img src="/logo-elefante.png" alt="" className="cath-logo" />
      <p className="cath-eyebrow">El primer paso</p>
      <h2>Empieza con una conversación.</h2>
      <p className="cath-lead">
        Una Sesión de Claridad con Holman: media hora, gratis, por videollamada. Nos cuentas dónde estás y hacia
        dónde vas, y salimos con claridad sobre tu siguiente paso.
      </p>
      <p className="cath-link-label">Agenda tu sesión aquí</p>
      <p className="cath-link">{link}</p>
      {nombre && <p className="cath-recomienda">Te lo recomienda {nombre}</p>}
      <p className="cath-contacto">
        {SITE.url.replace("https://", "")} · WhatsApp {SITE.whatsapp.display}
      </p>
      <Pie />
    </section>
  );
}
