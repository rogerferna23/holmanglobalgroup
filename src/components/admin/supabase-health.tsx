import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// Tarjeta de diagnóstico del panel.
//
// Existe por el incidente de agosto 2026: el panel dejó de dejar entrar y las
// reseñas desaparecieron del sitio a la vez, y no había forma de saber si era
// un problema de rol, de datos o de que el build desplegado apuntaba a OTRO
// proyecto de Supabase. Las tres cosas se ven aquí de un vistazo.

/** `https://abcd.supabase.co` → `abcd`. Es público (va dentro del bundle). */
function projectRef(url: string | undefined): string {
  const m = /^https:\/\/([a-z0-9]+)\.supabase\.co/i.exec(url || "");
  return m ? m[1] : "—";
}

type Counts = { aprobado: number; pendiente: number; rechazado: number };

export function SupabaseHealth() {
  const { profile, user } = useAuth();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const ref = projectRef(url);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sb = getSupabase();
        const { data, error: err } = await sb.from("reviews").select("status");
        if (!alive) return;
        if (err) {
          setError(err.message);
          return;
        }
        const acc: Counts = { aprobado: 0, pendiente: 0, rechazado: 0 };
        for (const r of data || []) {
          const s = (r as { status?: string }).status;
          if (s === "aprobado" || s === "pendiente" || s === "rechazado") acc[s]++;
        }
        setError(null);
        setCounts(acc);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Error desconocido");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const visibles = counts?.aprobado ?? 0;

  return (
    <div className="adm-card adm-health">
      <header className="adm-cfg-list-head">
        <div>
          <h2 className="adm-card-title">Estado de la conexión</h2>
          <p className="adm-card-sub">
            Qué Supabase está usando este sitio y qué ve el público
          </p>
        </div>
      </header>

      <dl className="adm-health-grid">
        <div>
          <dt>Proyecto Supabase</dt>
          <dd>
            <code>{ref}</code>
          </dd>
        </div>
        <div>
          <dt>Tu usuario</dt>
          <dd>{user?.email || "—"}</dd>
        </div>
        <div>
          <dt>Tu rol</dt>
          <dd>{profile?.role ?? "sin perfil"}</dd>
        </div>
        <div>
          <dt>Reseñas visibles en la web</dt>
          <dd>
            {error ? (
              <span className="adm-health-bad">error</span>
            ) : counts === null ? (
              "…"
            ) : (
              <>
                <strong>{visibles}</strong>
                {counts.pendiente > 0 && ` · ${counts.pendiente} ocultas`}
                {counts.rechazado > 0 && ` · ${counts.rechazado} rechazadas`}
              </>
            )}
          </dd>
        </div>
      </dl>

      {error && (
        <p className="adm-health-note adm-health-bad">
          No se pudo leer la tabla <code>reviews</code>: {error}
        </p>
      )}
      {!error && counts !== null && visibles === 0 && (
        <p className="adm-health-note adm-health-bad">
          Ninguna reseña se está mostrando en el sitio.
          {counts.pendiente > 0
            ? " Hay reseñas guardadas pero ocultas: publícalas desde Reseñas."
            : " La tabla no tiene reseñas en este proyecto. Si las subiste y ya no están, comprueba arriba que el proyecto sea el correcto."}
        </p>
      )}
    </div>
  );
}
