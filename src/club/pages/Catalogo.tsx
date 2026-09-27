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
export default function Catalogo() {
  const { member } = useClub();
  const code = member?.referral_code ?? "";
  const nombre = member?.name ?? "";
  const link = enlaceAgenda(code);

  return (
    <div className="club-page cat">
      <header className="club-page-head">
        <p className="club-eyebrow">Negocio · Catálogo HGG</p>
        <h1>Qué ofrecemos y a quién le sirve</h1>
        <p className="club-page-sub">
          Cinco caminos, del primer paso al sistema completo. Los precios los da Holman en la Sesión de Claridad,
          según lo que necesite cada persona. Tú fíjate en las frases: te dicen a quién le sirve cada uno.
        </p>
        <button type="button" className="club-btn small cat-descargar" onClick={() => window.print()}>
          Descargar PDF con mi enlace
        </button>
        <NegocioTabs />
      </header>

      {CATALOGO.map((p) => (
        <PiezaCard key={p.id} p={p} />
      ))}

      <section className="cat-pieza">
        <div className="cat-pieza-head">
          <span className="cat-num">05</span>
          <div>
            <p className="club-eyebrow">Adicionales</p>
            <h2>Productos adicionales</h2>
          </div>
        </div>
        <div className="cat-adicionales">
          {ADICIONALES.map((a) => (
            <div key={a.id} className="cat-adicional">
              <h3>{a.nombre}</h3>
              <p className="cat-promesa-sm">{a.promesa}</p>
              <p className="club-muted">{a.detalle}</p>
              <p className="cat-frase-sm">{a.frase}</p>
            </div>
          ))}
        </div>
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

function PiezaCard({ p }: { p: Pieza }) {
  return (
    <section className="cat-pieza">
      <div className="cat-pieza-head">
        <span className="cat-num">{p.numero}</span>
        <div>
          <p className="club-eyebrow">{p.pilar}</p>
          <h2>{p.nombre}</h2>
        </div>
      </div>
      <p className="cat-promesa">{p.promesa}</p>
      <div className="cat-cols">
        <div>
          <h4>Para quién</h4>
          <p className="club-muted">{p.paraQuien}</p>
          {p.caminos && (
            <>
              <h4>Caminos</h4>
              <ul className="cat-caminos">
                {p.caminos.map((c) => (
                  <li key={c.nombre}>
                    <strong>{c.nombre}</strong> {c.detalle}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div>
          <h4>Qué incluye</h4>
          <ul className="cat-incluye">
            {p.incluye.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="cat-frases">
        <h4>Lo reconoces cuando dice</h4>
        {p.frases.map((f) => (
          <p key={f}>{f}</p>
        ))}
      </div>
    </section>
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
