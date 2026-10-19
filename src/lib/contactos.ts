/**
 * Contactos: el CRM sencillo de Holman en Torre → Clientes (oct 2026).
 *
 * Una lista de personas a contactar por WhatsApp, cada una con su grupo
 * (Programa Fundador o el resto), su etapa y la próxima acción. Tabla
 * `hgg_contactos` (20261029_hgg_contactos.sql), solo admin.
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { newId } from "@/lib/admin-store";

export type GrupoContacto = "fundador" | "general";
export type EtapaContacto = "por_contactar" | "contactado" | "conversando" | "claridad" | "cerrado" | "no_ahora";

export type Contacto = {
  id: string;
  nombre: string;
  telefono: string | null;
  grupo: GrupoContacto;
  etapa: EtapaContacto;
  proximo: string | null;
  notas: string | null;
  ultimo_contacto: string | null;
  created_at: string;
};

export const GRUPOS: Record<GrupoContacto, string> = {
  fundador: "Programa Fundador",
  general: "Claridad y lo demás",
};

/** En el orden del embudo. */
export const ETAPAS: { id: EtapaContacto; label: string }[] = [
  { id: "por_contactar", label: "Por contactar" },
  { id: "contactado", label: "Le escribí" },
  { id: "conversando", label: "Conversando" },
  { id: "claridad", label: "Claridad agendada" },
  { id: "cerrado", label: "Compró" },
  { id: "no_ahora", label: "Por ahora no" },
];
export const ETAPA_LABEL = Object.fromEntries(ETAPAS.map((e) => [e.id, e.label])) as Record<EtapaContacto, string>;

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

/** Enlace de WhatsApp si hay teléfono (solo dígitos, con indicativo). */
export function enlaceWhatsApp(c: Contacto): string | null {
  const tel = (c.telefono ?? "").replace(/\D/g, "");
  return tel.length >= 8 ? `https://wa.me/${tel}?text=${encodeURIComponent(primerMensaje(c))}` : null;
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
    const { data, error: e } = await getSupabase().from("hgg_contactos").select("*").order("created_at", { ascending: true });
    setError(e ? (e.message.includes("hgg_contactos") ? "Falta correr la migración 20261029_hgg_contactos.sql en Supabase." : e.message) : null);
    setContactos((data ?? []) as Contacto[]);
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
      proximo: null, notas: null, ultimo_contacto: null, created_at: new Date().toISOString(),
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

  return { contactos, loading, error, actualizar, agregar, borrar, preview: !!mock };
}
