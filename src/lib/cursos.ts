/**
 * Cursos, talleres y ebooks de HGG (oct 2026). Se venden en Hotmart; aquí solo
 * se muestran. Fuente única de la página /cursos (marca clara, con portadas).
 * Para sumar uno: su portada en public/cursos/ (800 × 800, la plantilla está en
 * docs/hotmart/portadas-claras/) y una entrada aquí.
 */
export type Curso = {
  id: string;
  /** Línea pequeña dorada: «Curso en video», «Taller grabado»… */
  tipo: string;
  titulo: string;
  subtitulo: string;
  incluye: string[];
  precioUsd: number;
  portada: string;
  /** Página de venta propia (interna) o el pago de Hotmart (externo). */
  href: string;
  externo?: boolean;
};

export const CURSOS: Curso[] = [
  {
    id: "emociones",
    tipo: "Curso en video",
    titulo: "Gestión de las emociones",
    subtitulo: "Entiende cómo funciona tu mente, ponle nombre a lo que sientes y elige cómo responder.",
    incluye: ["13 clases", "Workbook", "Garantía de 7 días"],
    precioUsd: 57,
    portada: "/cursos/emociones.webp",
    href: "/emociones?desde=cursos",
  },
  {
    id: "filtros",
    tipo: "Taller grabado",
    titulo: "Filtros de la realidad",
    subtitulo: "Descubre las creencias heredadas que guían tus decisiones.",
    incluye: ["Taller en video", "A tu ritmo", "Garantía de 7 días"],
    precioUsd: 39.99,
    portada: "/cursos/filtros.webp",
    href: "https://pay.hotmart.com/S95364617D?src=cursos",
    externo: true,
  },
  {
    id: "fronteras",
    tipo: "Clase grabada",
    titulo: "Más allá de las fronteras",
    subtitulo: "De la idea a un negocio digital con sentido.",
    incluye: ["Clase en video", "A tu ritmo", "Garantía de 7 días"],
    precioUsd: 37,
    portada: "/cursos/fronteras.webp",
    href: "https://pay.hotmart.com/E94519340M?src=cursos",
    externo: true,
  },
];
