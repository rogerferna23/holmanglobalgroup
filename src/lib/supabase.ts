import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente Supabase para uso en el CLIENTE (browser).
// Usa la publishable/anon key (segura para exponer).
// Auth: persistSession + localStorage para mantener sesion entre reloads.
//
// Las operaciones admin se hacen via RLS policies en Supabase, NO con service_role.
// El service_role solo se usa en las Edge Functions (que viven en Supabase, no aqui).

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY en variables de entorno."
    );
  }
  cached = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      storageKey: "hgg-auth",
    },
  });
  return cached;
}

// Re-export con nombre conveniente
export const supabase = getSupabase;
