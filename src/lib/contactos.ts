/**
 * Contactos: el CRM sencillo de Holman en Torre → Clientes (oct 2026).
 *
 * Una lista de personas a contactar por WhatsApp, cada una con su grupo
 * (Programa Fundador o el resto), su etapa, sus etiquetas y la próxima acción.
 * La agenda del celular se importa entera (`contactos-agenda.ts`) y entra en
 * «En mi base». Tabla `hgg_contactos` (20261029_hgg_contactos.sql y
 * 20261103_hgg_contactos_whatsapp.sql), solo admin.
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { newId } from "@/lib/admin-store";
import type { PlanImportacion } from "@/lib/contactos-agenda";

export type GrupoContacto = "fundador" | "general";
export type EtapaContacto = "base" | "por_contactar" | "contactado" | "conversando" | "claridad" | "cerrado" | "no_ahora";

export type Contacto = {
  id: string;
  nombre: string;
  telefono: string | null;
  grupo: GrupoContacto;
  etapa: EtapaContacto;
  proximo: string | null;
  notas: string | null;
  ultimo_contacto: string | null;
  etiquetas: string[];
  /** 'agenda' = importado del celular. */
  origen: "manual" | "agenda";
  created_at: string;
};

export const GRUPOS: Record<GrupoContacto, string> = {
  fundador: "Programa Fundador",
  general: "Claridad y lo demás",
};

/** En el orden del embudo. */
export const ETAPAS: { id: EtapaContacto; label: string }[] = [
  { id: "base", label: "En mi base" },
  { id: "por_contactar", label: "Por contactar" },
  { id: "contactado", label: "Le escribí" },
  { id: "conversando", label: "Conversando" },
  { id: "claridad", label: "Claridad agendada" },
  { id: "cerrado", label: "Compró" },
  { id: "no_ahora", label: "Por ahora no" },
];
export const ETAPA_LABEL = Object.fromEntries(ETAPAS.map((e) => [e.id, e.label])) as Record<EtapaContacto, string>;

/**
 * Etiquetas que se ofrecen en la ficha. Son libres: cualquiera nueva que se
 * escriba queda disponible para los demás contactos.
 */
export const ETIQUETAS_SUGERIDAS = [
  "Familia", "Amigo", "Emprendedor", "Cliente", "Embajador", "Interesado", "Colega", "Masterclass", "ECOS",
];

/**
 * El primer mensaje de cada grupo, en pregunta (método Worre): la persona
 * dice sí antes de recibir enlaces. Se copia y se pega en su chat.
 */
export function primerMensaje(c: Pick<Contacto, "nombre" | "grupo">): string {
  const nombre = c.nombre.trim().split(/\s+/)[0];
  if (c.grupo === "fundador") {
    return `Hola ${nombre}, ¿cómo estás? Estoy abriendo el Programa Fundador: 30 días conmigo para que tengas claro hacia dónde vas y cómo llegar, con dos sesiones 1 a 1 y un plan para tus próximos 90 días. Son solo 7 cupos y pensé en ti. ¿Te cuento cómo funciona?`;
  }
  return `Hola ${nombre}, ¿cómo vas? Estoy regalando algunas Sesiones de Claridad: media hora conmigo o con alguien de mi equipo para ver dónde estás hoy y cuál es tu siguiente paso. Si te regalo una, ¿la agendarías?`;
}

/**
 * Enlace de WhatsApp si hay teléfono (solo dígitos, con indicativo). Lleva el
 * primer mensaje escrito solo a quien está «Por contactar»; a los demás les
 * abre el chat sin texto.
 */
export function enlaceWhatsApp(c: Contacto): string | null {
  const tel = (c.telefono ?? "").replace(/\D/g, "");
  if (tel.length < 8) return null;
  return c.etapa === "por_contactar" ? `https://wa.me/${tel}?text=${encodeURIComponent(primerMensaje(c))}` : `https://wa.me/${tel}`;
}

/** Corta una lista en tandas (la base y la URL tienen límite). */
function tandas<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

/** Datos de ejemplo para /ecos/preview/clientes. Con `null`, se lee la base. */
export const ContactosMockContext = createContext<Contacto[] | null>(null);

export function useContactos() {
  const mock = useContext(ContactosMockContext);
  const [contactos, setContactos] = useState<Contacto[]>(mock ?? []);
  const [loading, setLoading] = useState(!mock);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (mock) return;
    // Supabase entrega máximo 1.000 filas por consulta: la agenda entera se lee por páginas.
    const todos: Contacto[] = [];
    let e: { message: string } | null = null;
    for (let desde = 0; ; desde += 1000) {
      const r = await getSupabase().from("hgg_contactos").select("*").order("created_at", { ascending: true }).order("id").range(desde, desde + 999);
      if (r.error) { e = r.error; break; }
      todos.push(...((r.data ?? []) as Contacto[]).map((c) => ({ ...c, etiquetas: c.etiquetas ?? [], origen: c.origen ?? "manual" })));
      if ((r.data ?? []).length < 1000) break;
    }
    setError(e ? (e.message.includes("hgg_contactos") ? "Falta correr la migración 20261029_hgg_contactos.sql en Supabase." : e.message) : null);
    setContactos(todos);
    setLoading(false);
  }, [mock]);

  useEffect(() => {
    cargar().catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  }, [cargar]);

  /** Cambia una ficha. Se pinta al instante; si la base falla, se recarga. */
  const actualizar = useCallback(async (id: string, cambios: Partial<Contacto>): Promise<string | null> => {
    setContactos((xs) => xs.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
    if (mock) return null;
    const { error: e } = await getSupabase().from("hgg_contactos").update({ ...cambios, updated_at: new Date().toISOString() }).eq("id", id);
    if (e) { await cargar(); return e.message; }
    return null;
  }, [mock, cargar]);

  const agregar = useCallback(async (nombre: string, grupo: GrupoContacto, telefono: string): Promise<string | null> => {
    const c: Contacto = {
      id: newId("cto"), nombre: nombre.trim(), telefono: telefono.trim() || null, grupo, etapa: "por_contactar",
      proximo: null, notas: null, ultimo_contacto: null, etiquetas: [], origen: "manual", created_at: new Date().toISOString(),
    };
    setContactos((xs) => [...xs, c]);
    if (mock) return null;
    const { error: e } = await getSupabase().from("hgg_contactos").insert({ id: c.id, nombre: c.nombre, telefono: c.telefono, grupo });
    if (e) { await cargar(); return e.message; }
    return null;
  }, [mock, cargar]);

  const borrar = useCallback(async (id: string): Promise<string | null> => {
    setContactos((xs) => xs.filter((c) => c.id !== id));
    if (mock) return null;
    const { error: e } = await getSupabase().from("hgg_contactos").delete().eq("id", id);
    if (e) { await cargar(); return e.message; }
    return null;
  }, [mock, cargar]);

  /** El mismo cambio a varias fichas a la vez (etapa, grupo). */
  const actualizarVarios = useCallback(async (ids: string[], cambios: Partial<Contacto>): Promise<string | null> => {
    const sel = new Set(ids);
    setContactos((xs) => xs.map((c) => (sel.has(c.id) ? { ...c, ...cambios } : c)));
    if (mock) return null;
    for (const t of tandas(ids, 100)) {
      const { error: e } = await getSupabase().from("hgg_contactos").update({ ...cambios, updated_at: new Date().toISOString() }).in("id", t);
      if (e) { await cargar(); return e.message; }
    }
    return null;
  }, [mock, cargar]);

  /**
   * Pone (o quita) una etiqueta a varias fichas. Cada ficha tiene su propia
   * lista, así que se agrupan las que quedan con la misma y va un update por grupo.
   */
  const etiquetar = useCallback(async (ids: string[], etiqueta: string, quitar = false): Promise<string | null> => {
    const sel = new Set(ids);
    const nueva = (c: Contacto) => (quitar ? c.etiquetas.filter((x) => x !== etiqueta) : c.etiquetas.includes(etiqueta) ? c.etiquetas : [...c.etiquetas, etiqueta]);
    const grupos = new Map<string, { etiquetas: string[]; ids: string[] }>();
    for (const c of contactos) {
      if (!sel.has(c.id)) continue;
      const et = nueva(c);
      if (et.length === c.etiquetas.length) continue;
      const k = JSON.stringify(et);
      grupos.set(k, { etiquetas: et, ids: [...(grupos.get(k)?.ids ?? []), c.id] });
    }
    setContactos((xs) => xs.map((c) => (sel.has(c.id) ? { ...c, etiquetas: nueva(c) } : c)));
    if (mock) return null;
    for (const g of grupos.values()) {
      for (const t of tandas(g.ids, 100)) {
        const { error: e } = await getSupabase().from("hgg_contactos").update({ etiquetas: g.etiquetas, updated_at: new Date().toISOString() }).in("id", t);
        if (e) { await cargar(); return e.message; }
      }
    }
    return null;
  }, [contactos, mock, cargar]);

  const borrarVarios = useCallback(async (ids: string[]): Promise<string | null> => {
    const sel = new Set(ids);
    setContactos((xs) => xs.filter((c) => !sel.has(c.id)));
    if (mock) return null;
    for (const t of tandas(ids, 100)) {
      const { error: e } = await getSupabase().from("hgg_contactos").delete().in("id", t);
      if (e) { await cargar(); return e.message; }
    }
    return null;
  }, [mock, cargar]);

  /** Guarda lo que se confirmó al importar la agenda: crea los nuevos y completa los números. */
  const importar = useCallback(async (plan: PlanImportacion, etiquetas: string[]): Promise<string | null> => {
    const ahora = Date.now();
    const nuevos: Contacto[] = plan.nuevos.map((a, i) => ({
      id: newId("cto"), nombre: a.nombre, telefono: a.telefono, grupo: "general", etapa: "base",
      proximo: null, notas: null, ultimo_contacto: null, etiquetas, origen: "agenda",
      // Un milisegundo de diferencia para que queden en el orden del archivo.
      created_at: new Date(ahora + i).toISOString(),
    }));
    const completos = new Map(plan.completar.map((x) => [x.id, x.telefono]));
    setContactos((xs) => [...xs.map((c) => (completos.has(c.id) ? { ...c, telefono: completos.get(c.id) ?? c.telefono } : c)), ...nuevos]);
    if (mock) return null;
    const sb = getSupabase();
    for (const t of tandas(nuevos, 500)) {
      const { error: e } = await sb.from("hgg_contactos").insert(t.map(({ id, nombre, telefono, grupo, etapa, etiquetas: et, origen, created_at }) => ({ id, nombre, telefono, grupo, etapa, etiquetas: et, origen, created_at })));
      if (e) { await cargar(); return e.message.includes("etiquetas") || e.message.includes("origen") || e.message.includes("etapa") ? "Falta correr la migración 20261103_hgg_contactos_whatsapp.sql en Supabase." : e.message; }
    }
    for (const t of tandas(plan.completar, 20)) {
      const rs = await Promise.all(t.map((x) => sb.from("hgg_contactos").update({ telefono: x.telefono, updated_at: new Date().toISOString() }).eq("id", x.id)));
      const malo = rs.find((r) => r.error);
      if (malo?.error) { await cargar(); return malo.error.message; }
    }
    return null;
  }, [mock, cargar]);

  return { contactos, loading, error, actualizar, agregar, borrar, actualizarVarios, etiquetar, borrarVarios, importar, preview: !!mock };
}
