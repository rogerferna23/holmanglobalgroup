import { SITE, WHATSAPP_URL } from "@/lib/config";
import { AGENDAR } from "@/lib/routes";

/**
 * Catálogo de HGG para los embajadores — sin precios, a propósito: los precios
 * los da Holman en la Sesión de Claridad, según lo que necesite cada persona.
 *
 * El orden es el de la escalera de valor: primero el club, luego Sentido,
 * Marca y Sistema, y al final los productos adicionales. Alimenta la guía del
 * panel (`/ecos/panel/recomendar`) y el PDF que descarga cada embajador.
 */

/**
 * Agenda de la Sesión de Claridad en DelegaWork (tipo «descubrimiento»).
 * `/agendar` lleva aquí. Si algún día se vacía, `/agendar` cae al WhatsApp de
 * HGG con un mensaje que ya dice quién recomendó a la persona.
 */
export const AGENDA_URL = "https://delegawork.com/agendar/g_35047c04c2224499aa2ce9a51eaf2e09?tipo=descubrimiento";

/** Agenda de las sesiones de coaching ya compradas (tipo «cierre»). `/sesion` lleva aquí. */
export const SESION_URL = "https://delegawork.com/agendar/g_35047c04c2224499aa2ce9a51eaf2e09?tipo=cierre";

export type Pieza = {
  id: string;
  /** Emblema del producto en el catálogo: una imagen o un monograma. */
  emblema: { img: string } | { letras: string };
  numero: string;
  /** Pilar al que pertenece, como se nombra en la tienda. */
  pilar: string;
  nombre: string;
  promesa: string;
  paraQuien: string;
  incluye: string[];
  /** Niveles o recorridos, sin precio. */
  caminos?: { nombre: string; detalle: string }[];
  /** Lo que dice alguien que necesita esto. Así lo reconoce el embajador. */
  frases: string[];
};

export const CATALOGO: Pieza[] = [
  {
    id: "ecos",
    emblema: { img: "/ecos-placa.png" },
    numero: "01",
    pilar: "Comunidad",
    nombre: "ECOS Business Club",
    promesa: "Las habilidades necesarias para un negocio, rodeado de las personas correctas.",
    paraQuien:
      "Emprendedores y dueños de negocio que quieren vender mejor, hacerse ver y hablar con seguridad, acompañados de gente que también está construyendo.",
    incluye: [
      // Sin días ni frecuencias: el formato de las sesiones puede cambiar.
      "Clases en vivo: ventas, marketing y oratoria",
      "Masterclass con Holman",
      "Prácticas en vivo con retroalimentación",
      "Retos para aplicar lo aprendido",
      "Grabaciones, cursos y comunidad de miembros",
      "Descuento en todos los programas de HGG",
    ],
    frases: [
      "«Tengo buen producto, pero me cuesta vender.»",
      "«Me pongo nervioso cuando tengo que hablar en público o grabarme.»",
      "«Estoy solo en esto; me gustaría rodearme de gente que empuje.»",
    ],
  },
  {
    id: "sentido",
    emblema: { letras: "S" },
    numero: "02",
    pilar: "Sentido",
    nombre: "Programa Sentido",
    promesa: "Claridad sobre quién eres y hacia dónde vas, para empezar a vivir de aquello que amas.",
    paraQuien:
      "Personas en un momento de cambio, que sienten que tienen más para dar y quieren una dirección clara. Coaching individual con Holman.",
    incluye: [
      "Sesiones 1 a 1 por videollamada",
      "Metodología Corazón de Elefante, Coaching Musical y Coaching Expansivo",
      "Trabajo sobre historia, creencias, valores y fortalezas",
      "Un plan de acción alineado con tu sentido",
    ],
    caminos: [
      { nombre: "Claridad", detalle: "Descubre quién eres." },
      { nombre: "Identidad", detalle: "Conviértete en quien quieres ser." },
      { nombre: "Acción", detalle: "Empieza a vivir de aquello que amas." },
    ],
    frases: [
      "«Siento que lo que hago ya me quedó pequeño.»",
      "«Quiero vivir de lo que me gusta y aún veo difuso por dónde empezar.»",
      "«Estoy en un momento de cambio y quiero tomar la decisión correcta.»",
    ],
  },
  {
    id: "marca",
    emblema: { letras: "M" },
    numero: "03",
    pilar: "Marca",
    nombre: "Marca con Huella",
    promesa: "Una marca que se reconoce, se recuerda y atrae a las personas correctas.",
    paraQuien:
      "Emprendedores que están empezando, o cuya imagen se quedó atrás de lo que hoy ofrecen. La marca se construye desde la historia de quien la dirige.",
    incluye: [
      "Coaching de marca: propósito, mensaje y público",
      "Logo, paleta de colores, tipografías y manual de marca",
      "Sitio web profesional con SEO e integración con WhatsApp",
      "Sistema de captación: contenidos, automatizaciones y campaña publicitaria",
    ],
    caminos: [
      { nombre: "Identidad", detalle: "La base: una marca clara y coherente." },
      { nombre: "Presencia", detalle: "La marca más su casa digital, lista para crecer." },
      { nombre: "Captación", detalle: "Marca, posicionamiento y un sistema que atrae clientes." },
    ],
    frases: [
      "«El logo lo hice yo en Canva.»",
      "«Me da pena pasar mi Instagram.»",
      "«La gente tarda en entender qué es lo que vendo.»",
    ],
  },
  {
    id: "sistema",
    emblema: { letras: "DW" },
    numero: "04",
    pilar: "Sistema",
    nombre: "DelegaWork 360",
    promesa: "Tu negocio funcionando como un sistema: clientes, seguimiento, contenido y campañas en un solo lugar.",
    paraQuien:
      "Negocios que ya venden y quieren crecer sin que todo dependa de su dueño. Un servicio mensual: plataforma y equipo trabajando juntos.",
    incluye: [
      "Plataforma con CRM y Sofía, la asistente con inteligencia artificial",
      "Consultoría estratégica cada mes",
      "Artículos SEO y correos de campaña",
      "Automatizaciones de captación y seguimiento",
      "Campañas publicitarias activas y reporte mensual",
    ],
    caminos: [
      { nombre: "Starter", detalle: "Para ordenar la base del negocio." },
      { nombre: "Pro", detalle: "Para acelerar la captación y el seguimiento." },
      { nombre: "Elite", detalle: "El sistema completo, con redes y soporte prioritario." },
    ],
    frases: [
      "«Los clientes se me pierden en WhatsApp.»",
      "«Hago todo yo y el día se me queda corto.»",
      "«Quiero publicar y hacer seguimiento con constancia.»",
    ],
  },
];

export type Adicional = {
  id: string;
  nombre: string;
  promesa: string;
  detalle: string;
  frase: string;
};

export const ADICIONALES: Adicional[] = [
  {
    id: "web",
    nombre: "Sitios web",
    promesa: "Una página diseñada para convertir visitas en clientes.",
    detalle: "Landing page, sitio con panel de administración o tienda en línea completa.",
    frase: "«Necesito una página» · «Quiero vender en línea.»",
  },
  {
    id: "llc",
    nombre: "LLC en Estados Unidos",
    promesa: "Tu empresa formal en EE.UU., con estrategia desde el primer día.",
    detalle: "Creación de la LLC, estructuración y renovación anual con acompañamiento.",
    frase: "«Quiero formalizar mi negocio» · «Quiero cobrar en dólares.»",
  },
  {
    id: "ia",
    nombre: "Sistemas con IA",
    promesa: "Tu propia inteligencia artificial, entrenada con la voz de tu marca.",
    detalle: "Agente de ventas, soporte al cliente o asistente interno, a la medida de cada negocio.",
    frase: "«Respondo los mismos mensajes todo el día.»",
  },
];

/** El enlace que comparte el embajador: guarda su código y abre la agenda. */
export function enlaceAgenda(code: string | null | undefined): string {
  const c = (code ?? "").trim();
  return `${SITE.url}${AGENDAR}${c ? `?ref=${encodeURIComponent(c)}` : ""}`;
}

/** A dónde lleva `/agendar`: la agenda de DelegaMeet o, si falta, WhatsApp. */
export function destinoAgenda(code: string | null): string {
  if (AGENDA_URL) {
    if (!code) return AGENDA_URL;
    const url = new URL(AGENDA_URL);
    url.searchParams.set("utm_source", "embajador");
    url.searchParams.set("utm_campaign", code);
    return url.toString();
  }
  const texto = code
    ? `Hola, quiero agendar mi Sesión de Claridad con Holman. Me recomendó el código ${code}.`
    : "Hola, quiero agendar mi Sesión de Claridad con Holman.";
  return `${WHATSAPP_URL}?text=${encodeURIComponent(texto)}`;
}

/** Para que el embajador avise a HGG a quién le mandó la agenda. */
export function avisoEmbajador(nombre: string, code: string): string {
  const quien = nombre ? `Soy ${nombre}` : "Soy embajador de ECOS";
  const texto = `Hola, ${quien}${code ? ` (código ${code})` : ""}. Le acabo de enviar la agenda de la Sesión de Claridad a: `;
  return `${WHATSAPP_URL}?text=${encodeURIComponent(texto)}`;
}

/** Mensaje listo para que el embajador lo reenvíe por WhatsApp. */
export function compartirAgenda(code: string): string {
  const texto = `Aquí está tu Sesión de Claridad con Holman, de regalo: 30 minutos por videollamada. Escoge tu horario de una vez: ${enlaceAgenda(code)}`;
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}
