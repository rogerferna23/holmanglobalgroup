import Agendar from "@/pages/Agendar";

/**
 * `/sesion` — el enlace que Holman le manda a quien ya compró sesiones de
 * coaching. Es la misma agenda propia de `/agendar`, con la sesión de una hora.
 * Existe aparte para que al pegarlo en WhatsApp salga su propia tarjeta
 * («Sesión de coaching»).
 */
export default function Sesion() {
  return <Agendar tipo="sesion" />;
}
