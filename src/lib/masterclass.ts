import { getSupabase } from "@/lib/supabase";
import type { Campana } from "@/lib/campana";

/**
 * La masterclass abierta: el lead magnet del sitio. La página pública
 * `/masterclass` (y el enlace de invitado de los miembros, `/ecos/invitado`)
 * registran por la función `ecos-invitado`, que manda la confirmación. Los
 * avisos de después los manda `ecos-clases`.
 */

export type Masterclass = {
  id: string;
  title: string;
  starts_at: string;
  teacher: string | null;
  description: string | null;
};

/** Lo que se lleva quien asiste. Va igual en la página y en el correo de confirmación. */
export const APRENDES = [
  "Convierte lo que sabes en una oferta por la que te paguen.",
  "Consigue tus primeros clientes sin pagar publicidad.",
  "Vende con naturalidad, sin sentirte vendedor.",
];

async function llamar<T>(accion: string, datos: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke("ecos-invitado", { body: { accion, ...datos } });
  if (error) {
    let msg = "No pudimos conectar. Intenta de nuevo en un momento.";
    try {
      const ctx = (error as { context?: Response }).context;
      const body = ctx ? await ctx.json() : null;
      if (body?.error) msg = body.error;
    } catch { /* sin cuerpo */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

/** La masterclass pedida o, sin id, la próxima abierta a invitados. null si no hay. */
export async function proximaMasterclass(sessionId = ""): Promise<Masterclass | null> {
  const r = await llamar<{ clase: Masterclass | null }>("proxima", { session_id: sessionId });
  return r.clase;
}

export async function registrarMasterclass(datos: {
  session_id: string; nombre: string; email: string; whatsapp: string; by: string; zona: string;
  campana?: Campana | null;
}): Promise<{ ya_estaba: boolean }> {
  return await llamar("registrar", datos);
}
