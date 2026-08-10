// Reseñas enviadas por los clientes desde el formulario privado
// (/tu-experiencia, brief "Ajustes Adicionales" ago 2026).
//
// Flujo: el cliente envía → la reseña entra como "pendiente" → Holman la aprueba
// en /admin/resenas → aparece publicada junto a las 9 experiencias curadas de
// lib/testimonials.ts, sin que nadie tenga que subirla a mano.
//
// Todo lo público degrada en silencio: si faltan las variables de Supabase o la
// tabla todavía no existe, el sitio sigue mostrando solo las curadas.

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { TESTIMONIALS, type Testimonial } from "@/lib/testimonials";

export type ReviewStatus = "pendiente" | "aprobado" | "rechazado";

export type Review = {
  id: string;
  name: string;
  role: string;
  rating: 1 | 2 | 3 | 4 | 5;
  quote: string;
  photoUrl: string;
  status: ReviewStatus;
  createdAt: string;
};

/** Bucket público de Supabase Storage donde se guardan las fotos enviadas. */
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

/** Iniciales para el avatar cuando la reseña llega sin foto. */
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
    photoUrl: path
      ? sb.storage.from(REVIEWS_BUCKET).getPublicUrl(path).data.publicUrl
      : "",
    status: (r.status as ReviewStatus) || "pendiente",
    createdAt: String(r.created_at ?? ""),
  };
}

/** Reseña aprobada → tarjeta con la misma forma que las experiencias curadas. */
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
 * Las 9 experiencias curadas + las reseñas ya aprobadas. Lo usan el carrusel
 * del landing y la página /experiencias, así ambos muestran lo mismo.
 */
export function useTestimonials(): { items: Testimonial[]; loading: boolean } {
  const [approved, setApproved] = useState<Testimonial[]>([]);
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
        .order("created_at", { ascending: false });
      if (!alive) return;
      if (error) {
        // Tabla aún sin crear o RLS: el sitio sigue con las curadas.
        console.warn("[reviews] no se pudieron cargar las reseñas", error.message);
      } else {
        setApproved(
          (data || []).map((r) => reviewToTestimonial(rowToReview(sb, r)))
        );
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { items: [...TESTIMONIALS, ...approved], loading };
}

export type SubmitReviewInput = {
  name: string;
  rating: number;
  quote: string;
  photo?: File | null;
};

/**
 * Envía una reseña desde el formulario privado. La foto (opcional) se sube al
 * bucket público `resenas`; la fila entra siempre como "pendiente" — la RLS de
 * Supabase no permite que el visitante elija otro estado.
 */
export async function submitReview(input: SubmitReviewInput): Promise<void> {
  const sb = safeClient();
  if (!sb) throw new Error("El formulario no está configurado. Avisa a HGG.");

  const name = input.name.trim();
  const quote = input.quote.trim();
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  if (!name) throw new Error("Escribe tu nombre.");
  if (!quote) throw new Error("Escribe tu reseña.");

  let photoPath: string | null = null;
  if (input.photo) {
    const file = input.photo;
    if (!PHOTO_TYPES.includes(file.type)) {
      throw new Error("La foto debe ser JPG, PNG o WebP.");
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new Error("La foto no puede pesar más de 5 MB.");
    }
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
      throw new Error(
        "No se pudo subir la foto. Prueba con otra imagen o envía la reseña sin foto."
      );
    }
  }

  const { error } = await sb
    .from("reviews")
    .insert({ name, rating, quote, photo_path: photoPath, status: "pendiente" });
  if (error) {
    // El detalle técnico va a consola; al cliente le damos algo accionable.
    console.error("[reviews] insert failed", error);
    throw new Error(
      "No pudimos guardar tu reseña ahora mismo. Inténtalo en unos minutos o escríbenos por WhatsApp."
    );
  }
}

/** Store del panel admin: todas las reseñas + aprobar / rechazar / editar cargo. */
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
    const { data: rows, error: err } = await sb
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });
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
    async (id: string) => {
      const sb = safeClient();
      if (!sb) return;
      const { error: err } = await sb.from("reviews").delete().eq("id", id);
      if (err) {
        setError(err.message);
        return;
      }
      await refresh();
    },
    [refresh]
  );

  return { data, loading, error, refresh, patch, remove };
}
