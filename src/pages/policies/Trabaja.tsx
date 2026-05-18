import { SITE, WHATSAPP_URL } from "@/lib/config";
import PolicyLayout from "./PolicyLayout";

export default function Trabaja() {
  return (
    <PolicyLayout
      title="Trabaja con nosotros"
      intro="¿Te identificas con la metodología Corazón de Elefante y quieres formar parte del equipo Holman Global Group LLC?"
    >
      <h2>Lo que buscamos</h2>
      <p>
        Personas con propósito, autenticidad y compromiso con la
        transformación. Profesionales que entiendan que las marcas más
        poderosas nacen desde el ser, no desde la competencia.
      </p>

      <h2>Perfiles abiertos</h2>
      <ul>
        <li>Coaches expansivos y musicales</li>
        <li>Diseñadores de marca con sensibilidad y propósito</li>
        <li>Especialistas en sistemas digitales y automatización</li>
        <li>Estrategas de marketing y publicidad</li>
        <li>Closers de ventas con enfoque humano</li>
      </ul>

      <h2>Cómo aplicar</h2>
      <p>
        Si quieres formar parte del equipo, escríbenos directamente con tu
        propuesta y portafolio. Valoramos más la alineación con los valores
        que el currículum.
      </p>

      <p>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="policy-cta"
        >
          Escribirnos por WhatsApp →
        </a>
      </p>

      <p>
        O envíanos un email a{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a> con el asunto
        "Trabaja con nosotros" y cuéntanos sobre ti.
      </p>
    </PolicyLayout>
  );
}
