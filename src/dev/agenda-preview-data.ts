import type { Ajustes, Anfitrion, Bloqueo, Cita } from "@/lib/agenda";

/** Datos de ejemplo de Torre → Agenda (/ecos/preview/agenda). */
const en = (dias: number, hora: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(hora, 0, 0, 0);
  return d.toISOString();
};
const mas30 = (iso: string) => new Date(Date.parse(iso) + 30 * 60_000).toISOString();

const horario = {
  "1": [["09:00", "12:00"], ["14:00", "18:00"]],
  "2": [["09:00", "12:00"], ["14:00", "18:00"]],
  "3": [["09:00", "12:00"], ["14:00", "18:00"]],
  "4": [["09:00", "12:00"], ["14:00", "18:00"]],
  "5": [["09:00", "12:00"]],
} as Ajustes["horario"];

const ajustes: Ajustes = {
  id: 1,
  zona: "America/Bogota",
  horario,
  aviso_horas: 12,
  dias_adelante: 21,
  tipos: {
    claridad: { nombre: "Sesión de Claridad", duracion: 30, bloque: 60, activo: true },
    sesion: { nombre: "Sesión de coaching", duracion: 60, bloque: 60, activo: true },
    reunion: { nombre: "Reunión con Holman", duracion: 30, bloque: 30, activo: true },
  },
  correo_avisos: "equipo@holmanglobalgroup.com",
};

const anfitriones: Anfitrion[] = [
  { id: "holman", nombre: "Holman", correo: "equipo@holmanglobalgroup.com", tipos: ["claridad", "sesion", "reunion"], horario: null, zoom_fijo: null, orden: 1, activo: true },
  { id: "zack", nombre: "Zack", correo: "zack@ejemplo.com", tipos: ["claridad"], horario: { "1": [["15:00", "19:00"]], "3": [["15:00", "19:00"]], "6": [["09:00", "12:00"]] }, zoom_fijo: null, orden: 2, activo: false },
];

const cita = (id: string, nombre: string, dias: number, hora: number, extra: Partial<Cita> = {}): Cita => {
  const inicio = en(dias, hora);
  return {
    id, tipo: "claridad", inicio, fin: mas30(inicio), nombre, email: `${id}@ejemplo.com`, whatsapp: "+57 300 000 0000",
    zona_cliente: "America/Mexico_City", motivo: "Quiero ordenar mi negocio y vender más.", ref_code: "ECOS12",
    estado: "agendada", etapa: "nuevo", notas: null, zoom_url: "https://zoom.us/j/000000000", anfitrion: "holman",
    created_at: en(-1, 10), ...extra,
  };
};

const citas: Cita[] = [
  cita("camila", "Camila Rojas", 1, 9, { referrer: "u-embajador" }),
  cita("andres", "Andrés Peña", 1, 15, { anfitrion: "zack", motivo: "Quiero lanzar mi marca personal." }),
  cita("lucia", "Lucía Gómez", 2, 10, { motivo: "Tengo una empresa de 8 personas y todo está en Excel." }),
  cita("ingrid", "Ingrid Salas", 2, 15, { tipo: "reunion", motivo: "Próximo episodio del podcast.", ref_code: null }),
];

const bloqueos: Bloqueo[] = [];

export const AGENDA_MOCK = { citas, ajustes, bloqueos, anfitriones };

/** «Mi agenda» de Zack en su panel (/ecos/preview/zack/agenda). */
export const ZACK_MOCK = {
  yo: {
    id: "zack", nombre: "Zack", correo: "zack@ejemplo.com", tipos: ["claridad"] as Anfitrion["tipos"],
    horario: anfitriones[1].horario ?? {}, activo: true, zona: ajustes.zona, tipos_cfg: ajustes.tipos,
  },
  citas: [
    cita("andres", "Andrés Peña", 1, 15, { anfitrion: "zack", motivo: "Quiero lanzar mi marca personal." }),
    cita("sofia", "Sofía Herrera", 3, 16, { anfitrion: "zack", motivo: "Vendo tortas y quiero que mi marca se vea profesional.", ref_code: "ECOS21" }),
    cita("mario", "Mario León", -2, 15, { anfitrion: "zack", estado: "asistio", etapa: "propuesta", notas: "Le interesa Marca Pro. Seguimiento el jueves." }),
  ],
};
