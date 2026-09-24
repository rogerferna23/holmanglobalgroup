import { useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { darCortesia, useEcosMembers, type CuentaSinMembresia } from "@/lib/ecos-admin-store";
import { CuentasSinMembresia } from "./sin-membresia";

/**
 * Quién da clase. Un profesor entra al club sin pagar, es miembro fundador y
 * prepara sus propias sesiones. No cuenta en los ingresos.
 *
 * Nombrar y quitar pasan por la función del servidor, no por la base directo:
 * si la persona había pagado, su suscripción se cancela al nombrarla, para que
 * no le siga cobrando.
 *
 * Se nombra por correo, y la persona tiene que haber creado su cuenta antes —
 * así el acceso queda atado a un usuario real y no a un correo suelto.
 */
const INVITACION = `${typeof window !== "undefined" ? window.location.origin : "https://holmanglobalgroup.com"}/ecos/entrar?profesor=1`;

export function EcosProfesores() {
  const { data: members, refresh } = useEcosMembers();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(INVITACION);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* si el navegador no deja, queda seleccionable a mano */ }
  }

  const profesores = useMemo(() => members.filter((m) => m.teacher), [members]);

  async function nombrar() {
    const correo = email.trim().toLowerCase();
    if (!correo) return;
    setBusy(true);
    setError(null);
    setMsg(null);

    const sb = getSupabase();
    // La cuenta tiene que existir: el perfil lo crea el registro.
    const { data: perfil, error: e1 } = await sb
      .from("profiles").select("id, email, name").ilike("email", correo).maybeSingle();

    if (e1) { setError(e1.message); setBusy(false); return; }
    if (!perfil) {
      setError(`No hay ninguna cuenta con ${correo}. Pídele que se registre primero en /ecos/entrar y vuelve aquí.`);
      setBusy(false);
      return;
    }

    const r = await darCortesia(perfil.id, true, "profesor");
    if (r.error) { setError(r.error); setBusy(false); return; }

    await refresh();
    setEmail("");
    setMsg(`${perfil.name || correo} ya puede entrar al club como profesor.${r.cancelada ? " Su suscripción en Stripe quedó cancelada." : ""}`);
    setBusy(false);
  }

  async function nombrarCuenta(c: CuentaSinMembresia): Promise<string | null> {
    const r = await darCortesia(c.id, true, "profesor");
    if (r.error) return r.error;
    await refresh();
    return null;
  }

  async function cortesiaCuenta(c: CuentaSinMembresia): Promise<string | null> {
    const r = await darCortesia(c.id, true, "cortesia");
    if (r.error) return r.error;
    await refresh();
    return null;
  }

  async function quitar(id: string, nombre: string) {
    setBusy(true);
    setError(null);
    setMsg(null);
    const r = await darCortesia(id, false, "profesor");
    if (r.error) { setError(r.error); setBusy(false); return; }
    await refresh();
    setMsg(`${nombre} ya no es profesor.`);
    setBusy(false);
  }

  return (
    <>
    <CuentasSinMembresia
      titulo="Cuentas por nombrar"
      explicacion="Quien entró por el enlace de profesor —o se registró y todavía no tiene acceso— aparece aquí. Nombra profesor a quien corresponda y entra al club sin pagar."
      acciones={[
        { etiqueta: "Nombrar profesor", hacer: nombrarCuenta },
        { etiqueta: "Dar cortesía", hacer: cortesiaCuenta },
      ]}
    />
    <div className="adm-card adm-card-pad">
      <div className="adm-card-head">
        <div className="adm-card-titlerow"><h2 className="adm-card-title">Profesores</h2></div>
        <span className="adm-card-sub">{profesores.length} {profesores.length === 1 ? "persona" : "personas"}</span>
      </div>

      <p className="adm-ecos-note">
        Entran al club sin pagar y preparan sus propias clases. No cuentan como miembros
        de pago ni ocupan cupo de fundador.
      </p>

      <div className="adm-field">
        <label htmlFor="prof-link">Enlace para invitarlos</label>
        <div className="adm-ecos-setting-row">
          <input id="prof-link" type="text" readOnly value={INVITACION} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="adm-add-btn" onClick={copiar}>{copiado ? "Copiado" : "Copiar"}</button>
        </div>
        <span className="adm-ecos-sub">
          Mándaselo por WhatsApp. Crea su cuenta sin pasar por el pago, y al terminar le
          dice que te avise. El enlace por sí solo no da acceso a nada: el acceso lo abres
          tú aquí abajo, así que no importa si se comparte.
        </span>
      </div>

      <div className="adm-field">
        <label htmlFor="prof-email">Nombrar profesor (ya registrado)</label>
        <div className="adm-ecos-setting-row">
          <input
            id="prof-email" type="email" value={email} placeholder="correo con el que se registró"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void nombrar(); }}
            disabled={busy}
          />
          <button type="button" className="adm-add-btn" onClick={nombrar} disabled={busy || !email.trim()}>
            {busy ? "…" : "Nombrar"}
          </button>
        </div>
      </div>

      {error && <p className="adm-ecos-note adm-ecos-error">{error}</p>}
      {msg && <p className="adm-ecos-note">{msg}</p>}

      {profesores.length > 0 && (
        <table className="adm-vend-table adm-ecos-breakdown">
          <thead><tr><th>Profesor</th><th>Correo</th><th /></tr></thead>
          <tbody>
            {profesores.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.name || "—"}</strong></td>
                <td className="adm-ecos-sub">{p.email}</td>
                <td>
                  <button
                    type="button" className="adm-icon-btn-sm" disabled={busy}
                    aria-label={`Quitar a ${p.name || p.email} como profesor`}
                    onClick={() => quitar(p.id, p.name || p.email)}
                  >−</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
    </>
  );
}
