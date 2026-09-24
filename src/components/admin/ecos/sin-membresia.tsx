import { useState } from "react";
import { fmtDate } from "@/lib/ecos";
import { useCuentasSinMembresia, type CuentaSinMembresia } from "@/lib/ecos-admin-store";

/**
 * Quien creó su cuenta y todavía no tiene acceso al club: entró por el enlace
 * de profesor, o se registró y no pagó. Antes no aparecía en ningún lado, y
 * para nombrar a un profesor había que saberse su correo de memoria.
 *
 * Cada pestaña decide qué se puede hacer con esas cuentas.
 */
export function CuentasSinMembresia({
  titulo,
  explicacion,
  accion,
  onAccion,
}: {
  titulo: string;
  explicacion: string;
  accion: string;
  onAccion: (c: CuentaSinMembresia) => Promise<string | null>;
}) {
  const { data: cuentas, loading, refresh } = useCuentasSinMembresia();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function hacer(c: CuentaSinMembresia) {
    setBusy(c.id);
    setMsg(null);
    setError(null);
    const err = await onAccion(c);
    setBusy(null);
    if (err) { setError(err); return; }
    setMsg(`Listo: ${c.name || c.email}.`);
    await refresh();
  }

  return (
    <div className="adm-card adm-card-pad">
      <div className="adm-card-head">
        <div className="adm-card-titlerow"><h2 className="adm-card-title">{titulo}</h2></div>
        <span className="adm-card-sub">{loading ? "Cargando…" : `${cuentas.length} ${cuentas.length === 1 ? "cuenta" : "cuentas"}`}</span>
      </div>
      <p className="adm-ecos-note">{explicacion}</p>
      {error && <p className="adm-ecos-note adm-ecos-error">{error}</p>}
      {msg && <p className="adm-ecos-note">{msg}</p>}

      {!loading && cuentas.length === 0 ? (
        <p className="adm-tx-empty">No hay cuentas esperando. Cuando alguien se registre, aparece aquí.</p>
      ) : (
        <table className="adm-vend-table adm-ecos-breakdown">
          <thead><tr><th>Persona</th><th>Se registró</th><th /></tr></thead>
          <tbody>
            {cuentas.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.name || "Sin nombre"}</strong><br /><small className="adm-ecos-sub">{c.email}</small></td>
                <td className="adm-ecos-sub">{fmtDate(c.created_at)}</td>
                <td>
                  <button type="button" className="adm-add-btn" disabled={busy === c.id} onClick={() => hacer(c)}>
                    {busy === c.id ? "…" : accion}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
