// admin-correos — Torre → Correos. Email marketing con Resend desde el panel.
//
// Los contactos, los segmentos (General, ECOS) y los envíos (broadcasts) viven
// en Resend; esta función es el puente para que la clave nunca toque el
// navegador. La lista de bloqueados vive en la base (hgg_correos_bloqueados) y
// manda sobre todo lo demás: no se agrega un bloqueado como contacto y, antes
// de cada envío, cada bloqueado queda dado de baja en Resend.
//
// Los correos del club (bienvenida, avisos de clase, recordatorios) NO pasan
// por aquí: son transaccionales y los mandan sus propias funciones.
//
// Variables: RESEND_MARKETING_KEY (Full access; si falta se usa RESEND_API_KEY,
//            que solo sirve si también es Full access), ALLOWED_ORIGINS
// Body: { accion: string, ...datos }

import { adminClient, callerFrom, env, json, preflight } from "../_shared/ecos.ts";

const ROLES_ADMIN = ["super", "admin"];
const REMITENTE = "Holman Orjuela <holman@mkt.holmanglobalgroup.com>";
const RESPONDER_A = "soporte@holmanglobalgroup.com";
const SEGMENTO_ECOS = "ECOS";

type Contacto = { id: string; email: string; first_name: string | null; last_name: string | null; created_at: string; unsubscribed: boolean };
type Segmento = { id: string; name: string; created_at: string };

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

class ResendError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Llamada a Resend con un reintento si pega el límite (10 por segundo). */
async function resend<T = unknown>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const clave = Deno.env.get("RESEND_MARKETING_KEY") || env("RESEND_API_KEY");
  for (let intento = 0; ; intento++) {
    const res = await fetch(`https://api.resend.com${ruta}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json", "User-Agent": "hgg-torre/1.0" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    if (res.status === 429 && intento < 3) { await pausa(1100); continue; }
    const texto = await res.text();
    // deno-lint-ignore no-explicit-any
    let data: any = null;
    try { data = texto ? JSON.parse(texto) : null; } catch { data = texto; }
    if (!res.ok) {
      const msg = data?.message || data?.error || texto || `Resend respondió ${res.status}`;
      if (res.status === 401 || (res.status === 403 && /restricted|permission|access/i.test(msg))) {
        throw new ResendError(res.status, "La clave de Resend no tiene permiso para contactos y envíos. Crea una con «Full access» y guárdala en Supabase como RESEND_MARKETING_KEY.");
      }
      throw new ResendError(res.status, msg);
    }
    return data as T;
  }
}

/** Recorre todas las páginas de un listado de Resend. */
async function todo<T extends { id: string }>(ruta: string): Promise<T[]> {
  const out: T[] = [];
  let after: string | null = null;
  for (let i = 0; i < 50; i++) {
    const sep = ruta.includes("?") ? "&" : "?";
    const r: { data: T[]; has_more?: boolean } = await resend("GET", `${ruta}${sep}limit=100${after ? `&after=${after}` : ""}`);
    out.push(...r.data);
    if (!r.has_more || r.data.length === 0) break;
    after = r.data[r.data.length - 1].id;
    await pausa(120);
  }
  return out;
}

const limpiar = (e: unknown) => String(e ?? "").trim().toLowerCase();
const esCorreo = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

async function bloqueados(): Promise<Map<string, string | null>> {
  const { data, error } = await adminClient().from("hgg_correos_bloqueados").select("email, motivo");
  if (error) throw new Error(`No se pudo leer la lista de bloqueados: ${error.message}`);
  return new Map((data ?? []).map((b: { email: string; motivo: string | null }) => [b.email, b.motivo]));
}

/** Busca un segmento por nombre; si no existe y se pide, lo crea. */
async function segmentoPorNombre(nombre: string, crear: boolean): Promise<Segmento | null> {
  const lista = await todo<Segmento>("/segments");
  const s = lista.find((x) => x.name.trim().toLowerCase() === nombre.toLowerCase());
  if (s || !crear) return s ?? null;
  const nuevo = await resend<{ id: string; name: string }>("POST", "/segments", { name: nombre });
  return { id: nuevo.id, name: nuevo.name ?? nombre, created_at: new Date().toISOString() };
}

/** Crea el contacto en esos segmentos; si ya existía, lo agrega a ellos. */
async function agregarContacto(email: string, nombre: string, segmentos: string[]) {
  const first = nombre.trim().split(/\s+/)[0] || undefined;
  try {
    await resend("POST", "/contacts", {
      email, first_name: first, unsubscribed: false, segments: segmentos.map((id) => ({ id })),
    });
    return "creado" as const;
  } catch (e) {
    if (!(e instanceof ResendError) || ![400, 409, 422].includes(e.status)) throw e;
  }
  // Ya existía: se suma a cada segmento (si ya estaba, Resend lo ignora o avisa).
  for (const id of segmentos) {
    try { await resend("POST", `/contacts/${encodeURIComponent(email)}/segments/${id}`); } catch (e) {
      if (!(e instanceof ResendError) || ![400, 409, 422].includes(e.status)) throw e;
    }
    await pausa(120);
  }
  if (first) await resend("PATCH", `/contacts/${encodeURIComponent(email)}`, { first_name: first }).catch(() => undefined);
  return "existia" as const;
}

/** Da de baja en Resend a todos los bloqueados que estén como contacto. */
async function aplicarBloqueos(lista: Map<string, string | null>) {
  let n = 0;
  for (const email of lista.keys()) {
    try {
      await resend("PATCH", `/contacts/${encodeURIComponent(email)}`, { unsubscribed: true });
      n++;
    } catch (e) {
      if (!(e instanceof ResendError) || e.status !== 404) throw e;
    }
    await pausa(120);
  }
  return n;
}

/** Para la prueba: la persona de ejemplo se llama Holman y la baja no lleva a ninguna parte. */
function paraPrueba(html: string) {
  return html
    .replace(/\{\{\{\s*(?:FIRST_NAME|contact\.first_name)\s*\|[^}]*\}\}\}/g, "Holman")
    .replace(/\{\{\{\s*(?:FIRST_NAME|contact\.first_name)\s*\}\}\}/g, "Holman")
    .replace(/\{\{\{\s*RESEND_UNSUBSCRIBE_URL\s*\}\}\}/g, "https://holmanglobalgroup.com");
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { error: "Método no permitido" }, 405);

  const user = await callerFrom(req);
  if (!user) return json(req, { error: "Inicia sesión para continuar." }, 401);
  const db = adminClient();
  const { data: perfil } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!perfil || !ROLES_ADMIN.includes(perfil.role)) {
    return json(req, { error: "Solo un administrador puede hacer esto." }, 403);
  }

  // deno-lint-ignore no-explicit-any
  const b = (await req.json().catch(() => ({}))) as Record<string, any>;

  try {
    switch (b.accion) {
      // ── Contactos ────────────────────────────────────────────────────────
      case "contactos": {
        const [segmentos, contactos, bloq] = await Promise.all([
          todo<Segmento>("/segments"), todo<Contacto>("/contacts"), bloqueados(),
        ]);
        const miembros: Record<string, string[]> = {};
        for (const s of segmentos) {
          await pausa(120);
          for (const c of await todo<Contacto>(`/segments/${s.id}/contacts`)) {
            (miembros[c.email.toLowerCase()] ??= []).push(s.id);
          }
        }
        return json(req, {
          segmentos,
          contactos: contactos.map((c) => ({
            ...c,
            email: c.email.toLowerCase(),
            segmentos: miembros[c.email.toLowerCase()] ?? [],
            bloqueado: bloq.has(c.email.toLowerCase()),
          })),
        });
      }

      case "agregar": {
        const email = limpiar(b.email);
        if (!esCorreo(email)) return json(req, { error: "Ese correo no es válido." }, 400);
        const bloq = await bloqueados();
        if (bloq.has(email)) return json(req, { error: "Ese correo está en la lista de bloqueados: no recibe marketing." }, 400);
        const segs: string[] = Array.isArray(b.segmentos) ? b.segmentos.filter((s: unknown) => typeof s === "string") : [];
        if (segs.length === 0) return json(req, { error: "Elige al menos una lista." }, 400);
        const r = await agregarContacto(email, String(b.nombre ?? ""), segs);
        return json(req, { ok: true, resultado: r });
      }

      case "suscripcion": {
        const email = limpiar(b.email);
        const baja = b.baja === true;
        if (!baja && (await bloqueados()).has(email)) {
          return json(req, { error: "Está en la lista de bloqueados: no se puede volver a suscribir." }, 400);
        }
        await resend("PATCH", `/contacts/${encodeURIComponent(email)}`, { unsubscribed: baja });
        return json(req, { ok: true });
      }

      case "segmento": {
        const email = limpiar(b.email);
        const id = String(b.segment_id ?? "");
        if (!email || !id) return json(req, { error: "Faltan datos." }, 400);
        if (b.quitar === true) {
          await resend("DELETE", `/contacts/${encodeURIComponent(email)}/segments/${id}`);
        } else {
          if ((await bloqueados()).has(email)) return json(req, { error: "Está en la lista de bloqueados." }, 400);
          await resend("POST", `/contacts/${encodeURIComponent(email)}/segments/${id}`);
        }
        return json(req, { ok: true });
      }

      /** Lleva a los miembros del club (los que no cancelaron) a la lista ECOS. */
      case "sincronizar_ecos": {
        const seg = await segmentoPorNombre(SEGMENTO_ECOS, true);
        if (!seg) throw new Error("No se pudo crear la lista ECOS.");
        const [{ data: fichas, error }, bloq, ya] = await Promise.all([
          db.from("ecos_members").select("email, name, status"),
          bloqueados(),
          todo<Contacto>(`/segments/${seg.id}/contacts`),
        ]);
        if (error) throw new Error(error.message);
        const dentro = new Set(ya.map((c) => c.email.toLowerCase()));
        let agregados = 0, saltados = 0;
        for (const f of (fichas ?? []) as { email: string | null; name: string | null; status: string }[]) {
          const email = limpiar(f.email);
          if (!esCorreo(email) || f.status === "cancelado" || dentro.has(email)) continue;
          if (bloq.has(email)) { saltados++; continue; }
          await agregarContacto(email, f.name ?? "", [seg.id]);
          dentro.add(email);
          agregados++;
          await pausa(150);
        }
        return json(req, { ok: true, segmento: seg, agregados, saltados, total: dentro.size });
      }

      // ── Bloqueados ───────────────────────────────────────────────────────
      case "bloqueados": {
        const { data, error } = await db.from("hgg_correos_bloqueados").select("email, motivo, created_at").order("created_at");
        if (error) throw new Error(error.message);
        return json(req, { bloqueados: data ?? [] });
      }

      case "bloquear": {
        const correos: string[] = (Array.isArray(b.emails) ? b.emails : [b.email]).map(limpiar).filter(esCorreo);
        if (correos.length === 0) return json(req, { error: "No hay correos válidos." }, 400);
        const motivo = String(b.motivo ?? "").trim() || null;
        const { error } = await db.from("hgg_correos_bloqueados").upsert(correos.map((email) => ({ email, motivo })), { onConflict: "email" });
        if (error) throw new Error(error.message);
        await aplicarBloqueos(new Map(correos.map((e) => [e, motivo])));
        return json(req, { ok: true, n: correos.length });
      }

      case "desbloquear": {
        const email = limpiar(b.email);
        const { error } = await db.from("hgg_correos_bloqueados").delete().eq("email", email);
        if (error) throw new Error(error.message);
        // Sigue de baja en Resend: volver a suscribir es una decisión aparte.
        return json(req, { ok: true });
      }

      // ── Envíos ───────────────────────────────────────────────────────────
      case "prueba": {
        const para: string[] = (Array.isArray(b.para) ? b.para : [b.para]).map(limpiar).filter(esCorreo).slice(0, 5);
        const asunto = String(b.asunto ?? "").trim();
        const html = String(b.html ?? "");
        if (para.length === 0 || !asunto || !html) return json(req, { error: "Faltan el asunto, el contenido o a quién mandar la prueba." }, 400);
        await resend("POST", "/emails", {
          from: REMITENTE, reply_to: RESPONDER_A, to: para, subject: `[Prueba] ${asunto}`, html: paraPrueba(html),
        });
        return json(req, { ok: true });
      }

      case "enviar": {
        const segmentId = String(b.segment_id ?? "");
        const asunto = String(b.asunto ?? "").trim();
        const html = String(b.html ?? "");
        if (!segmentId || !asunto || !html) return json(req, { error: "Faltan la lista, el asunto o el contenido." }, 400);
        if (!/RESEND_UNSUBSCRIBE_URL/.test(html)) {
          return json(req, { error: "El correo necesita el enlace para darse de baja ({{{RESEND_UNSUBSCRIBE_URL}}})." }, 400);
        }
        // Primero, los bloqueados quedan de baja. Si esto falla, no se envía.
        await aplicarBloqueos(await bloqueados());
        const cuerpo: Record<string, unknown> = {
          segment_id: segmentId, from: REMITENTE, reply_to: RESPONDER_A,
          subject: asunto, name: String(b.nombre ?? asunto).slice(0, 120), html, send: true,
        };
        if (typeof b.programar === "string" && b.programar) cuerpo.scheduled_at = b.programar;
        const r = await resend<{ id: string }>("POST", "/broadcasts", cuerpo);
        return json(req, { ok: true, id: r.id });
      }

      case "historial": {
        const lista = await todo<{ id: string; name: string; segment_id: string; status: string; created_at: string; scheduled_at: string | null; sent_at: string | null }>("/broadcasts");
        const segmentos = await todo<Segmento>("/segments");
        return json(req, { envios: lista, segmentos });
      }

      case "envio": {
        const id = String(b.id ?? "");
        if (!id) return json(req, { error: "Falta el envío." }, 400);
        return json(req, { envio: await resend("GET", `/broadcasts/${id}`) });
      }

      case "cancelar": {
        const id = String(b.id ?? "");
        if (!id) return json(req, { error: "Falta el envío." }, 400);
        await resend("POST", `/broadcasts/${id}/cancel`);
        return json(req, { ok: true });
      }

      default:
        return json(req, { error: "Acción desconocida." }, 400);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(req, { error: msg }, e instanceof ResendError ? 502 : 500);
  }
});
