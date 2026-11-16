import { Link } from "react-router-dom";
import PolicyLayout from "./policies/PolicyLayout";
import { SITE, WHATSAPP_URL } from "@/lib/config";
import { CLUB } from "@/lib/routes";
import { ECOS } from "@/lib/ecos";

/**
 * /ecos/ayuda — cómo entrar y usar el club, en preguntas cortas. Es pública
 * (se llega sin sesión, justo cuando alguien no puede entrar). Si cambia cómo
 * se entra o cómo se cancela, actualizar aquí también.
 */
export default function EcosAyuda() {
  return (
    <PolicyLayout
      eyebrow="Ayuda"
      title="Ayuda de ECOS Business Club"
      intro="Todo lo que necesitas para entrar a tu panel, llegar a tus clases y aprovechar el club. Si algo no te funciona, al final tienes cómo escribirnos."
      description="Cómo entrar a tu panel de ECOS Business Club sin contraseña, instalar la app en el celular, entrar a las clases y manejar tu membresía."
    >
      <h2>1. ¿Cómo entro a mi panel?</h2>
      <p>
        Entra a <strong>holmanglobalgroup.com/panel</strong> o a{" "}
        <Link to={`${CLUB.entrar}?entrar`}>Ingreso al club</Link> y elige{" "}
        <strong>Ya soy miembro</strong>. Escribe tu correo y tu contraseña, y listo.
      </p>

      <h2>2. No recuerdo mi contraseña</h2>
      <p>No hace falta. Tienes dos caminos:</p>
      <ul>
        <li>
          <strong>Entrar sin contraseña (el más fácil):</strong> en{" "}
          <Link to={`${CLUB.entrar}?entrar`}>Ingreso al club</Link> toca{" "}
          <strong>Entrar sin contraseña</strong>, escribe el correo con el que te
          registraste y te llega un botón para entrar de un toque. Ábrelo en el mismo
          celular o computador donde quieres usar el club.
        </li>
        <li>
          <strong>Crear una contraseña nueva:</strong> en{" "}
          <Link to={CLUB.clave}>Olvidé mi contraseña</Link> te enviamos un correo para
          ponerla.
        </li>
      </ul>
      <p>
        ¿No ves el correo? Revisa Promociones o Spam y búscalo por «ECOS». Llega en uno
        o dos minutos.
      </p>

      <h2>3. Tener ECOS como app en el celular</h2>
      <p>Así lo abres con un toque, como cualquier otra app:</p>
      <ul>
        <li>
          <strong>iPhone:</strong> abre tu panel en Safari, toca <strong>Compartir</strong>{" "}
          (el cuadro con la flecha hacia arriba) y elige <strong>Agregar a inicio</strong>.
        </li>
        <li>
          <strong>Android:</strong> abre tu panel en Chrome, toca el menú{" "}
          <strong>⋮</strong> y elige <strong>Instalar app</strong> o{" "}
          <strong>Agregar a la pantalla de inicio</strong>. En el Inicio de tu panel
          también aparece el botón <strong>Instalar ECOS</strong>.
        </li>
      </ul>

      <h2>4. ¿Cómo entro a una clase?</h2>
      <ul>
        <li>
          <strong>Desde el correo:</strong> a la hora de la clase te llega un correo con
          el botón <strong>Entrar a la clase</strong>. Es tu enlace personal: te lleva
          directo a la sala.
        </li>
        <li>
          <strong>Desde tu panel:</strong> en <Link to={CLUB.panel}>Inicio</Link> o en{" "}
          <Link to={CLUB.clases}>Clases</Link> toca <strong>Entrar por Zoom</strong>. La
          sala se abre 15 minutos antes.
        </li>
      </ul>
      <p>
        Te recomendamos tener Zoom instalado y entrar con tu nombre: así te llamamos por
        él en la clase.
      </p>

      <h2>5. Me perdí una clase</h2>
      <p>
        Queda en <Link to={CLUB.grabaciones}>Grabaciones</Link>. Ahí también tienes los
        cursos y el material de cada materia.
      </p>

      <h2>6. Mi prueba gratis y activar la membresía</h2>
      <p>
        Al crear tu cuenta usas todo el club {ECOS.pruebaDias} días gratis, sin tarjeta.
        En la parte de arriba de tu panel ves cuántos días te quedan. Para seguir sin
        cortes, toca <Link to={CLUB.activar}>Activar</Link> antes de que termine: el
        primer cobro (${ECOS.priceUsd} al mes) es el día en que termina tu prueba.
      </p>

      <h2>7. Recomendar el club y ganar comisión</h2>
      <p>
        Con la membresía activa tienes tu enlace de embajador en{" "}
        <Link to={CLUB.negocio}>Negocio</Link>, con la guía para recomendar, el catálogo
        y tus contactos. Recibes un {ECOS.comisionReferidoPct}% de comisión por lo que
        compren las personas que entren con tu enlace.
      </p>

      <h2>8. Cambiar mi tarjeta, ver recibos o cancelar</h2>
      <p>
        En <Link to={CLUB.cuenta}>Mi cuenta</Link> toca{" "}
        <strong>Cambiar tarjeta o ver recibos</strong>. Desde ahí también puedes
        cancelar cuando quieras: tu acceso sigue hasta el final del período pagado.
        Las condiciones completas están en los{" "}
        <Link to={CLUB.terminos}>términos de ECOS</Link>.
      </p>

      <h2>9. ¿Sigues con dudas?</h2>
      <p>
        Escríbenos por{" "}
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp</a> o a{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Cuéntanos el correo de tu
        cuenta y qué ves en la pantalla, y te ayudamos a entrar.
      </p>
    </PolicyLayout>
  );
}
