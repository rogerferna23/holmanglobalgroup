/**
 * Rutas de las dos zonas privadas del sitio. Viven aquí, y solo aquí, para que
 * cambiar la dirección del panel de administración sea tocar UNA línea.
 *
 * Administración: ruta propia, sin enlace en ninguna parte del sitio público.
 * Reduce accidentes — que nadie llegue por casualidad — pero la cerradura
 * real es el rol + RLS. (Brief ECOS, sep 2026.)
 *
 * PROVISIONAL: "torre" es un nombre de trabajo hasta que Holman elija el suyo.
 * Al cambiarlo hay que avisar a Roger y actualizar el marcador en el sitemap
 * si algún día se añade uno (hoy no se lista, y va con noindex).
 */
export const ADMIN_BASE = "/torre";

export const ADMIN = {
  base: ADMIN_BASE,
  login: `${ADMIN_BASE}/entrar`,
  home: ADMIN_BASE,
  transacciones: `${ADMIN_BASE}/transacciones`,
  productos: `${ADMIN_BASE}/productos`,
  vendedores: `${ADMIN_BASE}/vendedores`,
  reportes: `${ADMIN_BASE}/reportes`,
  solicitudes: `${ADMIN_BASE}/solicitudes`,
  resenas: `${ADMIN_BASE}/resenas`,
  instagram: `${ADMIN_BASE}/instagram`,
  auditoria: `${ADMIN_BASE}/auditoria`,
  configuracion: `${ADMIN_BASE}/configuracion`,
  ecos: `${ADMIN_BASE}/ecos`,
} as const;

/** ECOS Business Club — zona de miembros. Se entra por "Ingreso al club". */
export const CLUB = {
  landing: "/ecos",
  entrar: "/ecos/entrar",
  invitado: "/ecos/invitado",
  panel: "/ecos/panel",
  clases: "/ecos/panel/clases",
  grabaciones: "/ecos/panel/grabaciones",
  cursos: "/ecos/panel/cursos",
  comunidad: "/ecos/panel/comunidad",
  referidos: "/ecos/panel/referidos",
  misclases: "/ecos/panel/mis-clases",
  cuenta: "/ecos/panel/cuenta",
  /** Pedir el correo para restablecer la contraseña, y ponerla. */
  clave: "/ecos/clave",
  /** Vuelta de Stripe tras el checkout. */
  bienvenida: "/ecos/panel?bienvenida=1",
} as const;
