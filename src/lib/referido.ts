import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

/**
 * Quién trajo a esta persona.
 *
 * El enlace de un embajador es `holmanglobalgroup.com/ecos?ref=CODIGO` (o
 * `/tienda?ref=`, `/agendar?ref=`) y el código vale para todo: el club y la
 * tienda. Por eso se captura en cualquier página, no solo en la del club.
 *
 * Se guarda en localStorage y no en la sesión: entre que alguien ve el enlace y
 * decide comprar pueden pasar días, y si se pierde al cerrar el navegador, el
 * embajador pierde una comisión que sí se ganó. Caduca a los 60 días para que
 * un enlace viejo no se lleve el crédito de una venta que ya no trajo.
 */
const CLAVE = "hgg_ref";
const DIAS = 60;

type Guardado = { code: string; ts: number };

export function guardarReferido(code: string | null | undefined): void {
  const limpio = (code ?? "").trim().toUpperCase().slice(0, 32);
  if (!limpio) return;
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ code: limpio, ts: Date.now() } satisfies Guardado));
    // El flujo del club lee esta otra clave desde antes.
    sessionStorage.setItem("ecos_ref", limpio);
    sessionStorage.setItem(CLAVE, limpio);
  } catch {
    /* navegación privada o almacenamiento bloqueado: se sigue sin atribución */
  }
}

export function leerReferido(): string | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const g = JSON.parse(crudo) as Guardado;
      if (g?.code && Date.now() - g.ts < DIAS * 86_400_000) return g.code;
      localStorage.removeItem(CLAVE);
    }
    return sessionStorage.getItem(CLAVE) || sessionStorage.getItem("ecos_ref");
  } catch {
    return null;
  }
}

/**
 * El nombre de pila de quien invitó, para «Te invitó Andrés». Sale de la base
 * (hgg_quien_invita) y solo si el código es válido; si no hay código, la
 * función no existe aún o no hay conexión, devuelve null y no se muestra nada.
 */
export function useQuienInvita(): string | null {
  const [nombre, setNombre] = useState<string | null>(null);
  useEffect(() => {
    const code = leerReferido();
    if (!code) return;
    let vivo = true;
    (async () => {
      try {
        const { data, error } = await getSupabase().rpc("hgg_quien_invita", { p_code: code });
        if (vivo && !error && typeof data === "string" && data.trim()) setNombre(data.trim());
      } catch {
        /* sin conexión o sin Supabase (vista previa): sin nombre */
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);
  return nombre;
}

/**
 * Cuenta una apertura de la agenda a nombre del embajador (/agendar?ref=…).
 * Sin nombres: solo un id al azar del navegador para no contar dos veces a la
 * misma persona el mismo día. Si falla (sin conexión, función aún sin crear),
 * no pasa nada: la agenda se abre igual.
 */
export function registrarAperturaAgenda(code: string | null): void {
  if (!code) return;
  let visita = "";
  try {
    visita = localStorage.getItem("hgg_visita") ?? "";
    if (!visita) {
      visita = crypto.randomUUID();
      localStorage.setItem("hgg_visita", visita);
    }
  } catch {
    /* almacenamiento bloqueado: se cuenta sin id */
  }
  try {
    void getSupabase()
      .rpc("hgg_registrar_apertura_agenda", { p_code: code, p_visita: visita })
      .then(() => undefined, () => undefined);
  } catch {
    /* Supabase sin configurar */
  }
}
