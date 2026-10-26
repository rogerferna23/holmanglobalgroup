import Agendar from "@/pages/Agendar";

/**
 * `/reunion` — «Reunión con Holman»: para cuando Holman quiere reunirse con
 * alguien sin que sea Sesión de Claridad ni de coaching. Solo la da él, con su
 * horario y su Zoom. Existe aparte para que al compartirlo salga su tarjeta.
 */
export default function Reunion() {
  return <Agendar tipo="reunion" />;
}
