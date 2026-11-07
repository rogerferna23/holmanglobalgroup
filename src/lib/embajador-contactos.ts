/**
 * Mis contactos: el CRM de cada embajador en ECOS → Negocio (nov 2026).
 *
 * El embajador sube la agenda de su celular (CSV o vCard, mismo lector que la
 * Torre: `contactos-agenda.ts`) y trabaja su lista: persona o empresa, qué le
 * va a regalar (beneficio, texto libre), en qué estado va y si el número sigue
 * activo. Tabla `ecos_contactos` (20261111_ecos_contactos_embajador.sql): cada
 * fila es de su dueño y solo él la ve.
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { PlanImportacion } from "@/lib/contactos-agenda";

export type TipoContacto = "persona" | "empresa";
export type EstadoContacto = "sin_contactar" | "escrito" | "interesado" | "dudas" | "no_entendio" | "no_ahora" | "compro";

export type ContactoEmbajador = {
  id: string;
  nombre: string;
  telefono: string | null;
  tipo: TipoContacto | null;
  beneficio: string | null;
  estado: EstadoContacto;
  /** false = cambió de número o ya no tiene WhatsApp. Se ve en gris. */
  activo: boolean;
  notas: string | null;
  ultimo_contacto: string | null;
  origen: "manual" | "agenda";
  created_at: string;
};

export const TIPOS: Record<TipoContacto, string> = { persona: "Persona", empresa: "Empresa" };

/** En el orden en que suele avanzar una conversación. */
export const ESTADOS: { id: EstadoContacto; label: string }[] = [
  { id: "sin_contactar", label: "Sin contactar" },
  { id: "escrito", label: "Le escribí" },
  { id: "interesado", label: "Interesado" },
  { id: "dudas", label: "Tiene dudas" },
  { id: "no_entendio", label: "No entendió" },
  { id: "no_ahora", label: "Por ahora no" },
  { id: "compro", label: "Ya compró" },
];
export const ESTADO_LABEL = Object.fromEntries(ESTADOS.map((e) => [e.id, e.label])) as Record<EstadoContacto, string>;

/** Lo que se le puede regalar para abrir la conversación. Es libre: se escribe lo que sea. */
export const BENEFICIOS_SUGERIDOS = [
  "Una semana en el club",
  "Sesión de Claridad",
  "Episodio del podcast",
  "Masterclass",
  "Catálogo",
];

/** Enlace de WhatsApp si hay número y el contacto está activo. */
export function enlaceWhatsApp(c: ContactoEmbajador): string | null {
  const tel = (c.telefono ?? "").replace(/\D/g, "");
  if (!c.activo || tel.length < 8) return null;
  return `https://wa.me/${tel}`;
}

function tandas<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

const nuevoId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `ec-${Date.now()}-${Math.random().toString(36).slice(2)}`);

const FALTA_MIGRACION = "Falta correr la migración 20261111_ecos_contactos_embajador.sql en Supabase.";
const mensaje = (e: { message: string }) => (e.message.includes("ecos_contactos") ? FALTA_MIGRACION : e.message);

/** Datos de ejemplo para /ecos/preview/negocio/contactos. Con `null`, se lee la base. */
export const ContactosEmbajadorMockContext = createContext<ContactoEmbajador[] | null>(null);

export function useContactosEmbajador() {
  const mock = useContext(ContactosEmbajadorMockContext);
  const [contactos, setContactos] = useState<ContactoEmbajador[]>(mock ?? []);
  const [loading, setLoading] = useState(!mock);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (mock) return;
    // La política deja ver solo los propios; se leen por páginas de 1.000.
    const todos: ContactoEmbajador[] = [];
    let e: { message: string } | null = null;
    for (let desde = 0; ; desde += 1000) {
      const r = await getSupabase().from("ecos_contactos").select("*").order("created_at", { ascending: true }).order("id").range(desde, desde + 999);
      if (r.error) { e = r.error; break; }
      todos.push(...((r.data ?? []) as ContactoEmbajador[]));
      if ((r.data ?? []).length < 1000) break;
    }
    setError(e ? mensaje(e) : null);
    setContactos(todos);
    setLoading(false);
  }, [mock]);

  useEffect(() => {
    cargar().catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  }, [cargar]);

  const actualizar = useCallback(async (id: string, cambios: Partial<ContactoEmbajador>): Promise<string | null> => {
    setContactos((xs) => xs.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
    if (mock) return null;
    const { error: e } = await getSupabase().from("ecos_contactos").update({ ...cambios, updated_at: new Date().toISOString() }).eq("id", id);
    if (e) { await cargar(); return mensaje(e); }
    return null;
  }, [mock, cargar]);

  const actualizarVarios = useCallback(async (ids: string[], cambios: Partial<ContactoEmbajador>): Promise<string | null> => {
    const sel = new Set(ids);
    setContactos((xs) => xs.map((c) => (sel.has(c.id) ? { ...c, ...cambios } : c)));
    if (mock) return null;
    for (const t of tandas(ids, 100)) {
      const { error: e } = await getSupabase().from("ecos_contactos").update({ ...cambios, updated_at: new Date().toISOString() }).in("id", t);
      if (e) { await cargar(); return mensaje(e); }
    }
    return null;
  }, [mock, cargar]);

  const agregar = useCallback(async (nombre: string, telefono: string, tipo: TipoContacto | null): Promise<string | null> => {
    const c: ContactoEmbajador = {
      id: nuevoId(), nombre: nombre.trim(), telefono: telefono.trim() || null, tipo, beneficio: null, estado: "sin_contactar",
      activo: true, notas: null, ultimo_contacto: null, origen: "manual", created_at: new Date().toISOString(),
    };
    setContactos((xs) => [...xs, c]);
    if (mock) return null;
    const { error: e } = await getSupabase().from("ecos_contactos").insert({ id: c.id, nombre: c.nombre, telefono: c.telefono, tipo });
    if (e) { await cargar(); return mensaje(e); }
    return null;
  }, [mock, cargar]);

  const borrarVarios = useCallback(async (ids: string[]): Promise<string | null> => {
    const sel = new Set(ids);
    setContactos((xs) => xs.filter((c) => !sel.has(c.id)));
    if (mock) return null;
    for (const t of tandas(ids, 100)) {
      const { error: e } = await getSupabase().from("ecos_contactos").delete().in("id", t);
      if (e) { await cargar(); return mensaje(e); }
    }
    return null;
  }, [mock, cargar]);

  /** Guarda lo confirmado al importar: crea los nuevos y completa números. */
  const importar = useCallback(async (plan: PlanImportacion, tipo: TipoContacto | null): Promise<string | null> => {
    const ahora = Date.now();
    const nuevos: ContactoEmbajador[] = plan.nuevos.map((a, i) => ({
      id: nuevoId(), nombre: a.nombre, telefono: a.telefono, tipo, beneficio: null, estado: "sin_contactar",
      activo: true, notas: null, ultimo_contacto: null, origen: "agenda",
      created_at: new Date(ahora + i).toISOString(),
    }));
    const completos = new Map(plan.completar.map((x) => [x.id, x.telefono]));
    setContactos((xs) => [...xs.map((c) => (completos.has(c.id) ? { ...c, telefono: completos.get(c.id) ?? c.telefono } : c)), ...nuevos]);
    if (mock) return null;
    const sb = getSupabase();
    for (const t of tandas(nuevos, 500)) {
      const { error: e } = await sb.from("ecos_contactos").insert(t.map(({ id, nombre, telefono, tipo: tp, origen, created_at }) => ({ id, nombre, telefono, tipo: tp, origen, created_at })));
      if (e) { await cargar(); return mensaje(e); }
    }
    for (const t of tandas(plan.completar, 20)) {
      const rs = await Promise.all(t.map((x) => sb.from("ecos_contactos").update({ telefono: x.telefono, updated_at: new Date().toISOString() }).eq("id", x.id)));
      const malo = rs.find((r) => r.error);
      if (malo?.error) { await cargar(); return mensaje(malo.error); }
    }
    return null;
  }, [mock, cargar]);

  return { contactos, loading, error, actualizar, actualizarVarios, agregar, borrarVarios, importar, preview: !!mock };
}
