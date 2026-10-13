// Datos de ejemplo para ver Torre → Correos sin Resend. Solo en desarrollo.
import type { Bloqueado, Contacto, Envio, LlamarCorreos, Segmento } from "@/lib/correos";

const SEGMENTOS: Segmento[] = [
  { id: "seg-general", name: "General", created_at: "2026-10-12 22:00:00+00" },
  { id: "seg-ecos", name: "ECOS", created_at: "2026-10-12 22:05:00+00" },
];

const nombres = ["Ana", "Carlos", "Lucía", "Andrés", "Mariana", "Felipe", "Sofía", "Julián", "Valentina", "Diego", "Camila", "Tomás"];
let contactos: Contacto[] = nombres.map((n, i) => ({
  id: `c${i}`,
  email: `${n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}@ejemplo.com`,
  first_name: n, last_name: null,
  created_at: `2026-10-${String(12 - (i % 5)).padStart(2, "0")} 1${i % 10}:00:00+00`,
  unsubscribed: i === 7,
  segmentos: i % 3 === 0 ? ["seg-general", "seg-ecos"] : ["seg-general"],
  bloqueado: false,
}));

let bloqueados: Bloqueado[] = [{ email: "bloqueo@ejemplo.com", motivo: "Pidió no recibir", created_at: "2026-10-08T12:00:00Z" }];

let envios: Envio[] = [
  { id: "b2", name: "Un recordatorio sobre ECOS", segment_id: "seg-general", status: "sent", created_at: "2026-10-10 20:00:00+00", scheduled_at: "2026-10-11 14:00:00+00", sent_at: "2026-10-11 14:00:00+00" },
  { id: "b1", name: "Te guardé un lugar en ECOS", segment_id: "seg-general", status: "sent", created_at: "2026-10-09 00:20:00+00", scheduled_at: null, sent_at: "2026-10-09 00:30:00+00" },
];

const espera = () => new Promise((r) => setTimeout(r, 250));

export const correosMock: LlamarCorreos = async (accion, d = {}) => {
  await espera();
  const email = String(d.email ?? "").toLowerCase();
  switch (accion) {
    case "contactos": return { segmentos: SEGMENTOS, contactos } as never;
    case "agregar": {
      if (bloqueados.some((b) => b.email === email)) throw new Error("Ese correo está en la lista de bloqueados: no recibe marketing.");
      const ya = contactos.find((c) => c.email === email);
      const segs = d.segmentos as string[];
      if (ya) { ya.segmentos = [...new Set([...ya.segmentos, ...segs])]; return { ok: true, resultado: "existia" } as never; }
      contactos = [{ id: `c${Date.now()}`, email, first_name: String(d.nombre || "") || null, last_name: null, created_at: new Date().toISOString(), unsubscribed: false, segmentos: segs, bloqueado: false }, ...contactos];
      return { ok: true, resultado: "creado" } as never;
    }
    case "suscripcion": contactos = contactos.map((c) => c.email === email ? { ...c, unsubscribed: d.baja === true } : c); return { ok: true } as never;
    case "segmento": contactos = contactos.map((c) => c.email !== email ? c : { ...c, segmentos: d.quitar ? c.segmentos.filter((s) => s !== d.segment_id) : [...c.segmentos, String(d.segment_id)] }); return { ok: true } as never;
    case "sincronizar_ecos": return { ok: true, agregados: 2, saltados: 0, total: contactos.filter((c) => c.segmentos.includes("seg-ecos")).length + 2 } as never;
    case "bloqueados": return { bloqueados } as never;
    case "bloquear": {
      const nuevos = (d.emails as string[]).map((e) => ({ email: e.toLowerCase(), motivo: String(d.motivo || "") || null, created_at: new Date().toISOString() }));
      bloqueados = [...bloqueados.filter((b) => !nuevos.some((n) => n.email === b.email)), ...nuevos];
      contactos = contactos.map((c) => nuevos.some((n) => n.email === c.email) ? { ...c, bloqueado: true, unsubscribed: true } : c);
      return { ok: true, n: nuevos.length } as never;
    }
    case "desbloquear": bloqueados = bloqueados.filter((b) => b.email !== email); contactos = contactos.map((c) => c.email === email ? { ...c, bloqueado: false } : c); return { ok: true } as never;
    case "prueba": return { ok: true } as never;
    case "enviar": {
      const prog = d.programar as string | undefined;
      envios = [{ id: `b${Date.now()}`, name: String(d.nombre), segment_id: String(d.segment_id), status: prog ? "scheduled" : "sent", created_at: new Date().toISOString(), scheduled_at: prog ?? null, sent_at: prog ? null : new Date().toISOString() }, ...envios];
      return { ok: true } as never;
    }
    case "historial": return { envios, segmentos: SEGMENTOS } as never;
    case "envio": {
      const e = envios.find((x) => x.id === d.id);
      return { envio: { subject: e?.name ?? "", html: `<p style="font-family:Arial;padding:24px">Hola, {{{FIRST_NAME|}}}:<br><br>(Ejemplo de «${e?.name}»)<br><br><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Darme de baja</a></p>` } } as never;
    }
    case "cancelar": envios = envios.map((e) => e.id === d.id ? { ...e, status: "canceled" } : e); return { ok: true } as never;
    default: throw new Error("Acción desconocida.");
  }
};
