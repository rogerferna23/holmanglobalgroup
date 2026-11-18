import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

/**
 * Marca con Huella por fases (nov 2026): los primeros clientes entran a precio
 * de lanzamiento y, al llenarse cada fase de 10 marcas, el precio sube solo.
 * La base cuenta las marcas vendidas y cambia lo que cobra `products`
 * (supabase/migrations/20261117_marca_cupos_fases.sql); estos son los mismos
 * precios para que la tienda muestre lo que se va a cobrar.
 */
export type NivelMarca = "starter" | "pro" | "elite";
type Precio = { contado: number; cuota: number };

export const FASES_MARCA: Record<NivelMarca, Precio>[] = [
  { starter: { contado: 1097, cuota: 400 }, pro: { contado: 1497, cuota: 550 }, elite: { contado: 2197, cuota: 800 } },
  { starter: { contado: 1497, cuota: 550 }, pro: { contado: 1997, cuota: 750 }, elite: { contado: 2997, cuota: 1100 } },
  { starter: { contado: 1997, cuota: 700 }, pro: { contado: 2797, cuota: 1000 }, elite: { contado: 3997, cuota: 1400 } },
];

/** Lo que vale cada paquete si se contrata pieza por pieza (docs/marca/valor-de-mercado.md), redondeado hacia abajo. */
export const VALOR_MARCA: Record<NivelMarca, number> = { starter: 4400, pro: 7100, elite: 10300 };

export const NIVEL_DE: Record<string, NivelMarca> = {
  "marca-esencial": "starter",
  "marca-pro": "pro",
  "marca-360": "elite",
};

export type CuposMarca = { vendidas: number; cupos: number; fase: number; quedan: number };

/** Fase y cupos en vivo. null mientras carga o si la base aún no tiene la función: se queda la fase 1. */
export function useCuposMarca(): CuposMarca | null {
  const [cupos, setCupos] = useState<CuposMarca | null>(null);
  useEffect(() => {
    // Solo en `pnpm dev`: ?cupos=N simula N marcas vendidas.
    const demo = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("cupos") : null;
    if (demo !== null) {
      const n = Number(demo) || 0;
      setCupos({ vendidas: n, cupos: 10, fase: Math.min(3, Math.floor(n / 10) + 1), quedan: n >= 20 ? 0 : 10 - (n % 10) });
      return;
    }
    let vivo = true;
    try {
      getSupabase()
        .rpc("hgg_marca_cupos")
        .then(({ data, error }) => {
          if (vivo && !error && data) setCupos(data as CuposMarca);
        }, () => undefined);
    } catch {
      // Sin Supabase configurado (vista previa): se queda la fase 1, sin contador.
    }
    return () => {
      vivo = false;
    };
  }, []);
  return cupos;
}
