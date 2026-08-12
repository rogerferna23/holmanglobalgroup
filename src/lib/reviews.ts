// Reseñas de clientes. Fuente única de lo que se ve en el carrusel del landing
// y en /experiencias (brief "Badges y descripciones", ago 2026).
//
// Flujo: Holman entra al panel privado /admin/resenas (requiere login) y sube
// las reseñas una por una — nombre, cargo · país, estrellas, texto y foto. Lo
// que sube se publica directo: ya no hay formulario público ni cola de
// aprobación.
//
// El estado en base de datos tiene dos valores en uso:
//   'aprobado'  → publicada (la ve todo el mundo)
//   'pendiente' → oculta (queda guardada, pero fuera de la web)
//
// Todo lo público degrada en silencio: si faltan las variables de Supabase o la
// tabla todavía no existe, el sitio simplemente no muestra reseñas.

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { Testimonial } from "@/lib/testimonials";

export type ReviewStatus = "pendiente" | "aprobado" | "rechazado";

export type Review = {
  id: string;
  name: string;
  role: string;
  rating: 1 | 2 | 3 | 4 | 5;
  quote: string;
  /** Ruta dentro del bucket (para poder borrar la foto con la reseña). */
  photoPath: string;
  photoUrl: string;
  status: ReviewStatus;
  createdAt: string;
};

/** Bucket público de Supabase Storage donde se guardan las fotos. */
export const REVIEWS_BUCKET = "resenas";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Cliente Supabase o null (sin env configurado no rompemos el sitio público). */
function safeClient(): SupabaseClient | null {
  try {
    return getSupabase();
  } catch {
    return null;
  }
}

/** Iniciales para el avatar cuando la reseña va sin foto. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Nombre → trozo de nombre de archivo seguro (sin tildes ni espacios). */
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Fondo de marca del avatar, estable para la misma persona. */
function swatchOf(seed: string): 1 | 2 | 3 | 4 | 5 {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 5;
  return ((h + 1) as 1 | 2 | 3 | 4 | 5);
}

function rowToReview(sb: SupabaseClient, r: Record<string, any>): Review {
  const path = (r.photo_path as string | null) || "";
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    role: (r.role as string | null) || "",
    rating: (Number(r.rating) || 5) as 1 | 2 | 3 | 4 | 5,
    quote: String(r.quote ?? ""),
    photoPath: path,
    photoUrl: path
      ? sb.storage.from(REVIEWS_BUCKET).getPublicUrl(path).data.publicUrl
      : "",
    status: (r.status as ReviewStatus) || "aprobado",
    createdAt: String(r.created_at ?? ""),
  };
}

/** Reseña → tarjeta, con el mismo aspecto en el carrusel y en /experiencias. */
export function reviewToTestimonial(r: Review): Testimonial {
  return {
    swatch: swatchOf(r.name || r.id),
    initials: initialsOf(r.name),
    name: r.name,
    role: r.role || undefined,
    quote: r.quote,
    rating: r.rating,
    photo: r.photoUrl || undefined,
  };
}

/**
 * Las reseñas publicadas, en el mismo orden en que Holman las subió (la primera
 * que sube es la primera que se ve). Lo usan el carrusel del landing y la página
 * /experiencias, así ambos muestran exactamente lo mismo.
 */
export function useTestimonials(): { items: Testimonial[]; loading: boolean } {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = safeClient();
    if (!sb) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      const { data, error } = await sb
        .from("reviews")
        .select("id,name,role,rating,quote,photo_path,status,created_at")
        .eq("status", "aprobado")
        .order("created_at", { ascending: true });
      if (!alive) return;
      if (error) {
        // Tabla aún sin crear o RLS: el sitio se queda sin reseñas, sin romperse.
        console.warn("[reviews] no se pudieron cargar las reseñas", error.message);
      } else {
        setItems((data || []).map((r) => reviewToTestimonial(rowToReview(sb, r))));
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { items, loading };
}

export type NewReviewInput = {
  name: string;
  role?: string;
  rating: number;
  quote: string;
  photo?: File | null;
};

/** Valida la foto antes de tocar la red (mismo mensaje en el form y al subir). */
export function photoError(file: File): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return "La foto debe ser JPG, PNG o WebP.";
  if (file.size > MAX_PHOTO_BYTES) return "La foto no puede pesar más de 5 MB.";
  return null;
}

/**
 * Traduce el error crudo de Storage a algo que se pueda arreglar sin abrir la
 * consola del navegador. Antes salía siempre "prueba con otra imagen", que es
 * el consejo equivocado cuando lo que falla son los permisos del bucket: por
 * mucho que cambies de foto va a fallar igual.
 */
function uploadErrorMessage(err: unknown): string {
  const e = err as { message?: string; statusCode?: string | number } | null;
  const raw = (e?.message || "").toLowerCase();
  const code = String(e?.statusCode ?? "");

  if (raw.includes("bucket not found")) {
    return `Falta el bucket «${REVIEWS_BUCKET}» en Supabase. Aplica la migración 20260812_reviews_storage_fix.sql en el SQL Editor.`;
  }
  if (
    code === "403" ||
    raw.includes("row-level security") ||
    raw.includes("unauthorized") ||
    raw.includes("not authorized")
  ) {
    return `Supabase no te deja subir al bucket «${REVIEWS_BUCKET}»: falta la policy de subida o tu usuario no tiene rol admin. Aplica 20260812_reviews_storage_fix.sql y revisa la verificación del final.`;
  }
  if (raw.includes("mime")) {
    return "Supabase rechazó el formato de la imagen. Vuelve a guardarla como JPG, PNG o WebP (ojo con los .heic del móvil, que a veces llegan disfrazados).";
  }
  if (raw.includes("maximum allowed size") || raw.includes("too large") || raw.includes("payload")) {
    return "La foto supera el tamaño que admite el bucket (5 MB). Redúcela y vuelve a intentarlo.";
  }
  if (raw.includes("duplicate") || raw.includes("already exists")) {
    return "Ya hay una foto con ese nombre en el bucket. Vuelve a darle a Publicar.";
  }
  if (raw.includes("failed to fetch") || raw.includes("network")) {
    return "No se pudo conectar con Supabase para subir la foto. Revisa la conexión y reintenta.";
  }
  return `No se pudo subir la foto: ${e?.message || "error desconocido"}. Puedes publicar la reseña sin foto y añadirla más tarde.`;
}

/**
 * Sube una reseña desde el panel privado y la publica. La foto (opcional) va al
 * bucket `resenas`; tanto el insert como la subida exigen sesión de admin (RLS).
 */
export async function createReview(input: NewReviewInput): Promise<void> {
  const sb = safeClient();
  if (!sb) throw new Error("Supabase no está configurado.");

  const name = input.name.trim();
  const quote = input.quote.trim();
  const role = (input.role || "").trim();
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  if (name.length < 2) throw new Error("Escribe el nombre de la persona.");
  if (quote.length < 10) throw new Error("La reseña es demasiado corta.");

  let photoPath: string | null = null;
  if (input.photo) {
    const file = input.photo;
    const bad = photoError(file);
    if (bad) throw new Error(bad);
    const ext = file.name.includes(".")
      ? file.name.split(".").pop()!.toLowerCase()
      : "jpg";
    const slug = slugify(name) || "resena";
    photoPath = `${slug}-${Date.now().toString(36)}.${ext}`;
    const { error: upErr } = await sb.storage
      .from(REVIEWS_BUCKET)
      .upload(photoPath, file, { contentType: file.type, upsert: false });
    if (upErr) {
      console.error("[reviews] upload failed", upErr);
      throw new Error(uploadErrorMessage(upErr));
    }
  }

  const { error } = await sb.from("reviews").insert({
    name,
    role: role || null,
    rating,
    quote,
    photo_path: photoPath,
    status: "aprobado",
  });
  if (error) {
    console.error("[reviews] insert failed", error);
    const rls = (error.message || "").toLowerCase().includes("row-level security");
    throw new Error(
      rls
        ? "Supabase no te deja guardar la reseña: tu usuario no tiene rol admin en la tabla profiles."
        : `No se pudo guardar la reseña: ${error.message}. Revisa que la migración de Supabase esté aplicada.`
    );
  }
}

/** Store del panel privado: listar, publicar/ocultar, editar cargo y borrar. */
export function useReviews() {
  const [data, setData] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const sb = safeClient();
    if (!sb) {
      setError("Supabase no está configurado.");
      setLoading(false);
      return;
    }
    // Mismo orden que la web (la más antigua primero) para que lo que se ve
    // aquí sea lo que se ve en el sitio.
    const { data: rows, error: err } = await sb
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: true });
    if (err) {
      console.error("[reviews] fetch failed", err);
      setError(err.message);
      setLoading(false);
      return;
    }
    setError(null);
    setData((rows || []).map((r) => rowToReview(sb, r)));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: NewReviewInput) => {
      await createReview(input);
      await refresh();
    },
    [refresh]
  );

  const patch = useCallback(
    async (id: string, changes: { status?: ReviewStatus; role?: string }) => {
      const sb = safeClient();
      if (!sb) return;
      const payload: Record<string, unknown> = {};
      if (changes.status) payload.status = changes.status;
      if (changes.role !== undefined) payload.role = changes.role.trim() || null;
      const { error: err } = await sb.from("reviews").update(payload).eq("id", id);
      if (err) {
        setError(err.message);
        return;
      }
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string, photoPath?: string) => {
      const sb = safeClient();
      if (!sb) return;
      const { error: err } = await sb.from("reviews").delete().eq("id", id);
      if (err) {
        setError(err.message);
        return;
      }
      // La foto se va con la reseña; si falla, no bloquea (queda huérfana).
      if (photoPath) {
        const { error: stErr } = await sb.storage
          .from(REVIEWS_BUCKET)
          .remove([photoPath]);
        if (stErr) console.warn("[reviews] no se pudo borrar la foto", stErr.message);
      }
      await refresh();
    },
    [refresh]
  );

  return { data, loading, error, refresh, create, patch, remove };
}
