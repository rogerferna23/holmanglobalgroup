// La zona horaria de cada miembro según el país y la ciudad que escribió.
// La usan los avisos de clase y los anuncios para mostrar la hora de cada quien.

export const MIAMI = "America/New_York";

/** Sin tildes ni mayúsculas, para comparar lo que escribió cada persona. */
export const norm = (s: string | null) =>
  String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const POR_PAIS: Record<string, string> = {
  colombia: "America/Bogota", ecuador: "America/Guayaquil", peru: "America/Lima", panama: "America/Panama",
  venezuela: "America/Caracas", bolivia: "America/La_Paz", paraguay: "America/Asuncion", chile: "America/Santiago",
  argentina: "America/Argentina/Buenos_Aires", uruguay: "America/Montevideo", brasil: "America/Sao_Paulo",
  brazil: "America/Sao_Paulo", mexico: "America/Mexico_City", espana: "Europe/Madrid", spain: "Europe/Madrid",
  "republica dominicana": "America/Santo_Domingo", "puerto rico": "America/Puerto_Rico",
  "costa rica": "America/Costa_Rica", guatemala: "America/Guatemala", honduras: "America/Tegucigalpa",
  "el salvador": "America/El_Salvador", nicaragua: "America/Managua", cuba: "America/Havana",
  canada: "America/Toronto", italia: "Europe/Rome", francia: "Europe/Paris", alemania: "Europe/Berlin",
  "reino unido": "Europe/London", portugal: "Europe/Lisbon",
};
/** Ciudades de EE. UU. fuera de la hora del Este (la de Miami, que es la de por defecto). */
const EEUU: [string[], string][] = [
  [["chicago", "houston", "dallas", "austin", "san antonio", "saint paul", "st paul", "st. paul", "minneapolis",
    "nashville", "new orleans", "kansas", "oklahoma", "memphis", "milwaukee", "fort worth", "omaha"], "America/Chicago"],
  [["denver", "salt lake", "albuquerque", "el paso", "boise"], "America/Denver"],
  [["phoenix", "tucson", "scottsdale"], "America/Phoenix"],
  [["los angeles", "san francisco", "san diego", "seattle", "portland", "las vegas", "sacramento", "san jose", "oakland"], "America/Los_Angeles"],
];

/** La zona horaria de cada persona según su país y ciudad, o null si no se sabe. */
export function zonaDe(pais: string | null, ciudad: string | null): string | null {
  const p = norm(pais), c = norm(ciudad);
  if (["estados unidos", "usa", "eeuu", "ee.uu.", "ee. uu.", "united states", "us"].includes(p)) {
    return EEUU.find(([lista]) => lista.some((x) => c.includes(x)))?.[1] ?? MIAMI;
  }
  if (p === "mexico" && /cancun|playa del carmen|tulum|quintana|cozumel/.test(c)) return "America/Cancun";
  if (p === "mexico" && /tijuana|mexicali|ensenada/.test(c)) return "America/Tijuana";
  if ((p === "espana" || p === "spain") && /canaria|tenerife|las palmas/.test(c)) return "Atlantic/Canary";
  return POR_PAIS[p] ?? null;
}

/** «8:00 p. m.» en la zona que se pida. */
export function hora(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString("es-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
}

/** La hora de una clase para una persona: la suya primero y Miami de referencia. */
export function horaPara(iso: string, pais: string | null, ciudad: string | null): string {
  const tz = zonaDe(pais, ciudad);
  const lugar = String(ciudad || pais || "").trim();
  if (!tz) return `${hora(iso, MIAMI)} Miami · ${hora(iso, "America/Bogota")} Colombia`;
  if (tz === MIAMI) return `${hora(iso, MIAMI)} hora de Miami`;
  return `${hora(iso, tz)} en ${lugar} (${hora(iso, MIAMI)} en Miami)`;
}
