import { SITE, WHATSAPP_URL } from "@/lib/config";
import PolicyLayout from "./PolicyLayout";

export default function Reembolsos() {
  return (
    <PolicyLayout
      title="Política de Reembolsos"
      intro="En Holman Global Group LLC trabajamos con compromiso y transparencia. Esta política describe las condiciones aplicables a las solicitudes de reembolso de nuestros servicios."
    >
      <h2>1. Servicios elegibles</h2>
      <p>
        Esta política aplica a los servicios de coaching, branding, sistemas
        digitales y productos digitales adquiridos directamente a través de
        nuestro sitio web oficial.
      </p>

      <h2>2. Plazo para solicitar reembolso</h2>
      <p>
        Las solicitudes de reembolso deben realizarse dentro de los 7 días
        naturales posteriores a la fecha de compra, siempre que el servicio no
        haya sido ejecutado o entregado en su totalidad.
      </p>

      <h2>3. Condiciones</h2>
      <ul>
        <li>
          No se realizarán reembolsos sobre sesiones de coaching ya tomadas o
          fases del proyecto ya entregadas.
        </li>
        <li>
          Los servicios personalizados o con desarrollo iniciado podrán
          reembolsarse de forma proporcional al trabajo no realizado.
        </li>
        <li>
          Los productos digitales descargables no son reembolsables una vez
          accedidos o descargados.
        </li>
      </ul>

      <h2>4. Cómo solicitar un reembolso</h2>
      <p>
        Para solicitar un reembolso, contáctanos a{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a> o por{" "}
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>{" "}
        con el asunto "Solicitud de reembolso", indicando número de pedido,
        fecha y motivo.
      </p>

      <h2>5. Procesamiento</h2>
      <p>
        Una vez aprobada la solicitud, el reembolso se procesará al método de
        pago original en un plazo de 5 a 10 días hábiles, según los tiempos de
        tu entidad bancaria.
      </p>

      <h2>6. Modificaciones</h2>
      <p>
        Holman Global Group LLC se reserva el derecho de modificar esta
        política en cualquier momento. Los cambios serán publicados en esta
        misma página.
      </p>
    </PolicyLayout>
  );
}
