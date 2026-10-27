/**
 * Leer la agenda del celular para el CRM de Contactos (Torre → Clientes).
 *
 * WhatsApp no exporta su lista: usa la agenda del teléfono. Así que se importa
 * esa agenda, como vCard (.vcf, desde iCloud o la app Contactos del Mac) o como
 * CSV (Google Contactos, Outlook, Excel). Todo se lee en el navegador; a la
 * base solo llega lo que Holman confirma.
 */
import type { Contacto } from "@/lib/contactos";

export type ContactoAgenda = { nombre: string; telefono: string };

export type Lectura = { contactos: ContactoAgenda[]; sinTelefono: number };

export type PlanImportacion = {
  /** Personas que no están: se crean en «En mi base». */
  nuevos: ContactoAgenda[];
  /** Ya estaban por nombre pero sin número: se les pone. */
  completar: { id: string; nombre: string; telefono: string }[];
  /** Mismo número que alguien que ya está (o repetido en el archivo). */
  repetidos: number;
  sinTelefono: number;
  /** Números que no parecen teléfono (menos de 7 dígitos). */
  invalidos: number;
};

/** Lee un .vcf o un .csv según el contenido. */
export function leerAgenda(texto: string): Lectura {
  return /BEGIN:VCARD/i.test(texto) ? leerVcard(texto) : leerCsv(texto);
}

/**
 * Pone el número en formato internacional (+57300…). Los que no traen «+» ni
 * «00» se toman como del país del indicativo; si ya traen el indicativo sin
 * «+» (573001234567), se respeta.
 */
export function normalizarTelefono(crudo: string, indicativo: string): string | null {
  let s = crudo.trim();
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  const digitos = s.replace(/\D/g, "");
  if (digitos.length < 7) return null;
  if (s.startsWith("+")) return `+${digitos}`;
  const ind = indicativo.replace(/\D/g, "");
  if (!ind || (digitos.startsWith(ind) && digitos.length > 10)) return `+${digitos}`;
  return `+${ind}${digitos.replace(/^0+/, "")}`;
}

/** Para comparar nombres: sin tildes, sin mayúsculas, sin espacios de más. */
export function claveNombre(nombre: string): string {
  return nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

const digitos = (tel: string | null) => (tel ?? "").replace(/\D/g, "");

/** Qué pasaría al importar: nuevos, a completar y repetidos. No toca la base. */
export function planearImportacion(lectura: Lectura, existentes: Contacto[], indicativo: string): PlanImportacion {
  const numeros = new Set(existentes.map((c) => digitos(c.telefono)).filter(Boolean));
  const sinNumero = new Map<string, Contacto>();
  for (const c of existentes) if (!digitos(c.telefono)) sinNumero.set(claveNombre(c.nombre), c);

  const plan: PlanImportacion = { nuevos: [], completar: [], repetidos: 0, sinTelefono: lectura.sinTelefono, invalidos: 0 };
  for (const a of lectura.contactos) {
    const tel = normalizarTelefono(a.telefono, indicativo);
    if (!tel) { plan.invalidos++; continue; }
    if (numeros.has(digitos(tel))) { plan.repetidos++; continue; }
    numeros.add(digitos(tel));
    const yaEsta = sinNumero.get(claveNombre(a.nombre));
    if (yaEsta) {
      sinNumero.delete(claveNombre(a.nombre));
      plan.completar.push({ id: yaEsta.id, nombre: yaEsta.nombre, telefono: tel });
    } else {
      plan.nuevos.push({ nombre: a.nombre, telefono: tel });
    }
  }
  return plan;
}

// ---- vCard ----

function leerVcard(texto: string): Lectura {
  const lineas = unirLineas(texto);
  const contactos: ContactoAgenda[] = [];
  let sinTelefono = 0;
  let fn = "";
  let n = "";
  let org = "";
  let tels: { valor: string; tipos: string }[] = [];

  for (const linea of lineas) {
    const dos = linea.indexOf(":");
    if (dos < 0) continue;
    const cabeza = linea.slice(0, dos);
    const [propCruda, ...params] = cabeza.split(";");
    const prop = propCruda.slice(propCruda.lastIndexOf(".") + 1).toUpperCase();
    const valor = decodificar(linea.slice(dos + 1), params);

    if (prop === "BEGIN") { fn = ""; n = ""; org = ""; tels = []; }
    else if (prop === "FN") fn = valor;
    else if (prop === "N") n = valor;
    else if (prop === "ORG") org = valor.replace(/;+$/, "").replace(/;/g, " ");
    else if (prop === "TEL") tels.push({ valor: valor.replace(/^tel:/i, ""), tipos: params.join(";").toUpperCase() });
    else if (prop === "END") {
      const nombre = (fn || nombreDeN(n) || org).trim();
      const tel = tels.find((t) => /CELL|IPHONE|MOBILE|WHATSAPP/.test(t.tipos)) ?? tels.find((t) => /PREF/.test(t.tipos)) ?? tels[0];
      if (!tel) sinTelefono++;
      else contactos.push({ nombre: nombre || tel.valor, telefono: tel.valor });
    }
  }
  return { contactos, sinTelefono };
}

/** Deshace los cortes de línea del vCard (espacio al inicio, o «=» al final en quoted-printable). */
function unirLineas(texto: string): string[] {
  const crudas = texto.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  for (const l of crudas) {
    const previa = out[out.length - 1];
    if (previa !== undefined && /^[ \t]/.test(l)) out[out.length - 1] = previa + l.slice(1);
    else if (previa !== undefined && /QUOTED-PRINTABLE/i.test(previa) && previa.endsWith("=")) out[out.length - 1] = previa.slice(0, -1) + l;
    else out.push(l);
  }
  return out;
}

function decodificar(valor: string, params: string[]): string {
  let v = valor;
  if (params.some((p) => /QUOTED-PRINTABLE/i.test(p))) {
    const bytes: number[] = [];
    for (let i = 0; i < v.length; i++) {
      if (v[i] === "=" && /^[0-9A-F]{2}$/i.test(v.slice(i + 1, i + 3))) { bytes.push(parseInt(v.slice(i + 1, i + 3), 16)); i += 2; }
      else bytes.push(v.charCodeAt(i));
    }
    v = new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  }
  return v.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
}

/** N: Apellido;Nombre;Segundo;Prefijo;Sufijo → «Nombre Segundo Apellido». */
function nombreDeN(n: string): string {
  const [apellido = "", nombre = "", segundo = ""] = n.split(";");
  return [nombre, segundo, apellido].filter(Boolean).join(" ");
}

// ---- CSV ----

function leerCsv(texto: string): Lectura {
  const primera = texto.split(/\r?\n/, 1)[0] ?? "";
  const sep = (primera.match(/;/g)?.length ?? 0) > (primera.match(/,/g)?.length ?? 0) ? ";" : ",";
  const filas = filasCsv(texto.replace(/^﻿/, ""), sep);
  const [cab = [], ...datos] = filas;
  const h = cab.map((x) => claveNombre(x));
  const col = (re: RegExp, no?: RegExp) => h.findIndex((x) => re.test(x) && !(no && no.test(x)));

  const iNombre = col(/^(name|nombre|display name|full name|nombre completo)$/);
  const iPila = col(/^(first name|given name|nombre|nombres)$/);
  const iMedio = col(/^(middle name|additional name|segundo nombre)$/);
  const iApellido = col(/^(last name|family name|apellido|apellidos)$/);
  const iOrg = col(/(organization|company|empresa)/, /(title|department|cargo|type|tipo)/);
  const tels = h
    .map((x, i) => ({ x, i }))
    .filter(({ x }) => /(phone|tel|movil|celular|whatsapp|numero)/.test(x) && !/(type|label|tipo|etiqueta)/.test(x))
    // El móvil primero, si hay columnas con ese nombre.
    .sort((a, b) => Number(/(mobile|movil|celular|whatsapp)/.test(b.x)) - Number(/(mobile|movil|celular|whatsapp)/.test(a.x)))
    .map(({ i }) => i);

  const contactos: ContactoAgenda[] = [];
  let sinTelefono = 0;
  for (const f of datos) {
    if (f.every((x) => !x.trim())) continue;
    // Con columna de apellido, «Nombre» es el de pila y se juntan; si no, es el nombre completo.
    const partes = [iPila, iMedio, iApellido].filter((i) => i >= 0).map((i) => f[i]?.trim()).filter(Boolean).join(" ");
    const completo = iNombre >= 0 ? f[iNombre]?.trim() ?? "" : "";
    const nombre = (iApellido >= 0 && partes) || completo || partes || (iOrg >= 0 ? f[iOrg]?.trim() ?? "" : "");
    const tel = tels.map((i) => (f[i] ?? "").split(":::")[0].trim()).find(Boolean);
    if (!tel) { sinTelefono++; continue; }
    contactos.push({ nombre: nombre || tel, telefono: tel });
  }
  return { contactos, sinTelefono };
}

function filasCsv(texto: string, sep: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (comillas) {
      if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') comillas = false;
      else campo += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) { fila.push(campo); campo = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo); filas.push(fila); fila = []; campo = "";
    } else campo += ch;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}
