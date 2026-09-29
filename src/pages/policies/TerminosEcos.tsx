import { Link } from "react-router-dom";
import PolicyLayout from "./PolicyLayout";
import { SITE } from "@/lib/config";
import { ECOS } from "@/lib/ecos";

/**
 * Términos de la membresía de ECOS Business Club. Se aceptan con una casilla al
 * crear la cuenta (EcosEntrar) y se enlazan en la pantalla de activar.
 * Cuando cambien, subir TERMINOS_ECOS_VERSION: queda en la cuenta de quien los
 * aceptó.
 */
export const TERMINOS_ECOS_VERSION = "2026-09-29";

export default function TerminosEcos() {
  return (
    <PolicyLayout
      title="Términos de ECOS Business Club"
      intro="Estas son las condiciones de la membresía de ECOS Business Club, el club de Holman Global Group LLC. Al crear tu cuenta y aceptarlas, quedan acordadas entre tú y nosotros. Complementan los Términos y Condiciones generales del sitio."
      description="Condiciones de la membresía de ECOS Business Club: precio, mes gratis, renovación automática, cancelación, grabaciones y comunidad."
    >
      <h2>1. Qué es ECOS</h2>
      <p>
        ECOS Business Club es una membresía de formación en ventas, marketing y
        oratoria de Holman Global Group LLC («HGG», «nosotros»). Incluye clases en
        vivo por Zoom, grabaciones, material de estudio, una comunidad de miembros
        y los beneficios que se describen en la página del club. El calendario y los
        profesores pueden ajustarse de un mes a otro; siempre lo verás actualizado en
        tu panel.
      </p>

      <h2>2. Precio</h2>
      <p>
        La membresía cuesta ${ECOS.priceUsd} dólares al mes o ${ECOS.priceAnualUsd}{" "}
        dólares al año. Los pagos se procesan con Stripe; los datos de tu tarjeta no
        pasan por nuestros servidores. Si el precio cambia, te avisamos por correo
        con al menos 30 días de anticipación, y el cambio aplica desde tu siguiente
        período.
      </p>

      <h2>3. Mes gratis de los miembros fundadores</h2>
      <p>
        Mientras haya lugares de fundador, quien crea su cuenta usa el club sin costo
        y sin tarjeta hasta el {ECOS.primerCobroTexto} de 2026. Durante ese mes tienes
        acceso al contenido del club; el descuento y la comisión de embajador se
        activan cuando activas tu membresía. Si decides quedarte, activas tu
        membresía desde tu panel antes de esa fecha. Si no la activas, no se te cobra
        nada: desde esa fecha tu panel queda con candado hasta que la actives.
      </p>

      <h2>4. Renovación automática</h2>
      <p>
        Al activar tu membresía autorizas a HGG a cobrar el precio de tu plan a tu
        método de pago de forma recurrente: cada mes, en la misma fecha, en el plan
        mensual; y cada año en el plan anual. Si activas durante el mes gratis, el
        primer cobro es al terminar la prueba. Antes de ese primer cobro te enviamos
        un recordatorio por correo. La membresía se renueva sola hasta que la
        canceles.
      </p>

      <h2>5. Cancelación y reembolsos</h2>
      <p>
        Puedes cancelar cuando quieras desde <strong>Mi cuenta</strong> en tu panel,
        sin llamar ni escribir a nadie. Al cancelar no se hacen más cobros y conservas
        el acceso hasta el final del período que ya pagaste. Si cancelas durante el
        mes gratis, no se te cobra nada.
      </p>
      <p>
        Puedes pedir el reembolso de un cobro dentro de los 7 días siguientes, como
        indica nuestra <Link to="/reembolsos">Política de reembolsos</Link>. Pasado
        ese plazo, los períodos ya cobrados no se reembolsan, salvo lo que disponga la
        ley aplicable.
      </p>
      <p>
        Si un pago no entra (por ejemplo, una tarjeta vencida), te avisamos y tu
        acceso se pausa hasta que actualices tu método de pago. Tu avance (niveles,
        racha e insignias) se conserva 14 días.
      </p>

      <h2>6. Grabaciones y tu imagen</h2>
      <p>
        Las clases se graban completas, incluida la práctica, para que los miembros
        puedan repasarlas. Al participar en una clase aceptas aparecer en la grabación
        con tu imagen, tu voz y tu nombre visible en Zoom. Las grabaciones quedan
        solo dentro del panel del club, para los miembros con acceso.
      </p>
      <p>
        Si prefieres no aparecer, puedes apagar tu cámara, cambiar tu nombre en Zoom o
        avisarle al profesor antes de practicar. HGG no publica fuera del club
        fragmentos donde aparezcas sin pedirte autorización por separado.
      </p>

      <h2>7. La comunidad</h2>
      <ul>
        <li>Tratamos a cada persona con respeto: en clase, en el grupo de WhatsApp y en el directorio.</li>
        <li>Lo que otros miembros comparten sobre su vida o su negocio se queda en el club.</li>
        <li>Las clases, grabaciones y materiales son para tu uso personal: no los grabes por tu cuenta, no los descargues para redistribuirlos ni compartas tu acceso con otras personas.</li>
        <li>Podemos suspender la cuenta de quien no respete estas reglas; en ese caso no se hacen más cobros.</li>
      </ul>

      <h2>8. Propiedad intelectual</h2>
      <p>
        Las clases, grabaciones, materiales y métodos de ECOS son de HGG y de sus
        profesores. La membresía te da acceso para aprender y aplicarlos en tu propio
        negocio, no para reproducirlos ni venderlos.
      </p>

      <h2>9. Beneficios de miembro</h2>
      <p>
        Con la membresía activa tienes un {ECOS.descuentoMiembroPct}% de descuento en
        los productos de HGG y participas como embajador: recibes un{" "}
        {ECOS.comisionReferidoPct}% de comisión por las compras de las personas que
        entren con tu enlace. Las comisiones se pagan de forma manual después de
        confirmado el pago, y se anulan si esa compra se reembolsa o se disputa. Nadie
        recibe comisión por sus propias compras. Podemos ajustar el programa de
        beneficios avisando con anticipación.
      </p>

      <h2>10. Resultados</h2>
      <p>
        ECOS te da formación, práctica y comunidad. Lo que logres depende de lo que
        apliques: no garantizamos ingresos ni resultados específicos.
      </p>

      <h2>11. Cambios a estos términos</h2>
      <p>
        Si actualizamos estos términos, te avisamos por correo antes de que empiecen a
        regir. Seguir usando el club después de esa fecha significa que los aceptas.
      </p>

      <h2>12. Contacto</h2>
      <p>
        Para cualquier duda sobre tu membresía, escríbenos a{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>
      <p><small>Versión del {TERMINOS_ECOS_VERSION}.</small></p>
    </PolicyLayout>
  );
}
