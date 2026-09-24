import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { AdminEcosMockContext, useEcosMembers } from "@/lib/ecos-admin-store";
import { fmtDate, usd } from "@/lib/ecos";

/** Las comisiones se pagan de verdad, así que se muestran con centavos. */
const centavos = (n: number) => usd(Number(n) || 0, true);

/**
 * Comisiones de referidos.
 *
 * Dos figuras, y la diferencia es el club:
 *
 *   EMBAJADOR  Miembro activo del club. Gana 10% de todo lo que compre la
 *              gente que trajo, mientras siga activo.
 *   AFILIADO   No es del club. Gana 10% solo de la primera compra de cada
 *              persona que trae. Entra por aprobación manual.
 *
 * La figura no se guarda en `hgg_referrers`: se deduce de si hoy tiene el club
 * activo, igual que hace la función `hgg_referrer_kind()` en la base de datos.
 * Aquí se repite esa misma regla para poder mostrarla sin una consulta por fila.
 */

type Figura = "embajador" | "afiliado";
type Estado = "pendiente" | "pagada" | "anulada";

type ReferrerRow = {
  id: string;
  code: string;
  approved: boolean;
  created_at: string;
};

type CommissionRow = {
  id: number;
  referrer_id: string;
  source: "club" | "producto";
  source_id: string;
  buyer_id: string | null;
  buyer_email: string | null;
  buyer_name: string | null;
  concept: string | null;
  base_amount: number;
  pct: number;
  amount: number;
  referrer_kind: Figura;
  status: Estado;
  paid_at: string | null;
  created_at: string;
};

type ProfileRow = { id: string; email: string | null; name: string | null };

/** Lectura simple de una tabla, con soporte de la vista previa de desarrollo. */
function useHggTable<T>(table: string, orderCol: string) {
  const mock = useContext(AdminEcosMockContext);
  const [data, setData] = useState<T[]>(() => (mock?.[table] as T[] | undefined) ?? []);
  const [loading, setLoading] = useState(!mock);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (mock) return;
    const { data: rows, error: err } = await getSupabase()
      .from(table)
      .select("*")
      .order(orderCol, { ascending: false });
    if (err) {
      console.error(`[ecos-admin] ${table}`, err);
      setError(err.message);
    } else {
      setError(null);
      setData((rows ?? []) as T[]);
    }
    setLoading(false);
  }, [table, orderCol, mock]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { data, loading, error, refresh, mock: !!mock };
}

const FILTROS = [
  { id: "pendiente", label: "Por pagar" },
  { id: "pagada", label: "Pagadas" },
  { id: "anulada", label: "Anuladas" },
  { id: "todas", label: "Todas" },
] as const;

type Filtro = (typeof FILTROS)[number]["id"];

export function EcosComisiones() {
  const { data: members } = useEcosMembers();
  const comisiones = useHggTable<CommissionRow>("hgg_commissions", "created_at");
  const referrers = useHggTable<ReferrerRow>("hgg_referrers", "created_at");
  const enPrevia = comisiones.mock;

  const [perfiles, setPerfiles] = useState<ProfileRow[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("pendiente");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Nombre y correo de quien refiere: viven en `profiles`, no en `hgg_referrers`.
  const idsReferrers = useMemo(
    () => referrers.data.map((r) => r.id).sort().join(","),
    [referrers.data],
  );
  useEffect(() => {
    if (enPrevia || !idsReferrers) { setPerfiles([]); return; }
    let vivo = true;
    void (async () => {
      const { data, error: err } = await getSupabase()
        .from("profiles")
        .select("id, email, name")
        .in("id", idsReferrers.split(","));
      if (!vivo) return;
      if (err) console.error("[ecos-admin] profiles", err);
      else setPerfiles((data ?? []) as ProfileRow[]);
    })();
    return () => { vivo = false; };
  }, [idsReferrers, enPrevia]);

  // Los miembros activos son embajadores por el solo hecho de estarlo.
  const activos = useMemo(
    () => new Set(members.filter((m) => m.status === "activo").map((m) => m.id)),
    [members],
  );

  const quienEs = useCallback(
    (id: string): { nombre: string; correo: string } => {
      const p = perfiles.find((x) => x.id === id);
      const m = members.find((x) => x.id === id);
      // Si no aparece el nombre, el código identifica igual a la persona. Un
      // afiliado no está en ecos_members, así que sin este respaldo saldría
      // «Sin nombre» en una pantalla desde la que se paga.
      const codigo = referrers.data.find((r) => r.id === id)?.code;
      return {
        nombre: p?.name || m?.name || p?.email || m?.email || (codigo ? `Código ${codigo}` : "Sin nombre"),
        correo: p?.email || m?.email || "",
      };
    },
    [perfiles, members, referrers.data],
  );

  const figuraDe = useCallback(
    (r: ReferrerRow): Figura | null =>
      activos.has(r.id) ? "embajador" : r.approved ? "afiliado" : null,
    [activos],
  );

  // --- Totales -----------------------------------------------------------
  const totales = useMemo(() => {
    let porPagar = 0;
    let pagado = 0;
    const conPendiente = new Set<string>();
    for (const c of comisiones.data) {
      const monto = Number(c.amount) || 0;
      if (c.status === "pendiente") { porPagar += monto; conPendiente.add(c.referrer_id); }
      if (c.status === "pagada") pagado += monto;
    }
    return { porPagar, pagado, personas: conPendiente.size };
  }, [comisiones.data]);

  // --- Lo que hay que pagar, por persona ---------------------------------
  const porPersona = useMemo(() => {
    const m = new Map<string, { total: number; n: number }>();
    for (const c of comisiones.data) {
      if (c.status !== "pendiente") continue;
      const cur = m.get(c.referrer_id) ?? { total: 0, n: 0 };
      m.set(c.referrer_id, { total: cur.total + (Number(c.amount) || 0), n: cur.n + 1 });
    }
    return [...m.entries()]
      .map(([id, v]) => ({ id, ...v, ...quienEs(id) }))
      .sort((a, b) => b.total - a.total);
  }, [comisiones.data, quienEs]);

  // --- Movimientos, más recientes primero --------------------------------
  const lista = useMemo(() => {
    const filtradas = filtro === "todas"
      ? comisiones.data
      : comisiones.data.filter((c) => c.status === filtro);
    return [...filtradas].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [comisiones.data, filtro]);

  // --- Acciones ----------------------------------------------------------
  function bloqueadoEnPrevia(): boolean {
    if (!enPrevia) return false;
    setError("Esta es la vista previa con datos de ejemplo: aquí no se guardan cambios.");
    setMsg(null);
    return true;
  }

  async function cambiarEstado(ids: number[], status: Estado, aviso: string) {
    if (!ids.length || bloqueadoEnPrevia()) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    const patch: Record<string, unknown> =
      status === "pagada"
        ? { status, paid_at: new Date().toISOString() }
        : { status, paid_at: null };
    const { error: e } = await getSupabase().from("hgg_commissions").update(patch).in("id", ids);
    if (e) { setError(e.message); setBusy(false); return; }
    await comisiones.refresh();
    setMsg(aviso);
    setBusy(false);
  }

  async function pagarTodoDe(id: string, nombre: string) {
    const ids = comisiones.data.filter((c) => c.referrer_id === id && c.status === "pendiente").map((c) => c.id);
    await cambiarEstado(ids, "pagada", `Quedaron ${ids.length} ${ids.length === 1 ? "comisión marcada" : "comisiones marcadas"} como pagadas a ${nombre}.`);
  }

  async function aprobarAfiliado() {
    const correo = email.trim().toLowerCase();
    if (!correo || bloqueadoEnPrevia()) return;
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

    // Si ya tenía código, se respeta: puede estar repartido por ahí.
    const existente = referrers.data.find((r) => r.id === perfil.id);
    let code = existente?.code ?? null;
    if (!code) {
      // Mismo generador que usan los miembros: su primer nombre (MARIA, MARIA2...).
      const { data: libre } = await sb.rpc("hgg_codigo_amigable", { p_nombre: perfil.name || correo.split("@")[0] });
      code = typeof libre === "string" ? libre : null;
      if (!code) {
        setError("No se pudo generar un código libre. Intenta de nuevo.");
        setBusy(false);
        return;
      }
    }

    const { error: e2 } = await sb
      .from("hgg_referrers")
      .upsert({ id: perfil.id, code, approved: true }, { onConflict: "id" });
    if (e2) { setError(e2.message); setBusy(false); return; }

    await referrers.refresh();
    setEmail("");
    setMsg(`${perfil.name || correo} ya puede referir. Su código es ${code}.`);
    setBusy(false);
  }

  async function quitarAprobacion(id: string, nombre: string) {
    if (bloqueadoEnPrevia()) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    const { error: e } = await getSupabase().from("hgg_referrers").update({ approved: false }).eq("id", id);
    if (e) { setError(e.message); setBusy(false); return; }
    await referrers.refresh();
    setMsg(`${nombre} ya no está aprobado como afiliado.`);
    setBusy(false);
  }

  const habilitados = useMemo(
    () => referrers.data
      .map((r) => ({ row: r, figura: figuraDe(r), ...quienEs(r.id) }))
      .sort((a, b) => {
        if (a.figura === b.figura) return a.nombre.localeCompare(b.nombre);
        const peso = (f: Figura | null) => (f === "embajador" ? 0 : f === "afiliado" ? 1 : 2);
        return peso(a.figura) - peso(b.figura);
      }),
    [referrers.data, figuraDe, quienEs],
  );

  const cargando = comisiones.loading || referrers.loading;

  return (
    <div className="adm-ecos-reports">
      {/* --- Totales ------------------------------------------------------ */}
      <div className="adm-stats adm-com-stats">
        <div className="adm-stat">
          <span className="adm-stat-title">Por pagar</span>
          <span className="adm-stat-value">{centavos(totales.porPagar)}</span>
          <span className="adm-stat-hint">comisiones pendientes</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-title">Ya pagado</span>
          <span className="adm-stat-value">{centavos(totales.pagado)}</span>
          <span className="adm-stat-hint">histórico</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-title">Personas por pagar</span>
          <span className="adm-stat-value">{totales.personas}</span>
          <span className="adm-stat-hint">{totales.personas === 1 ? "espera su pago" : "esperan su pago"}</span>
        </div>
      </div>

      {/* --- A quién le toca ---------------------------------------------- */}
      <div className="adm-card adm-card-pad adm-com-wide">
        <div className="adm-card-head">
          <div className="adm-card-titlerow"><h2 className="adm-card-title">A quién le toca</h2></div>
          <span className="adm-card-sub">{porPersona.length} {porPersona.length === 1 ? "persona" : "personas"}</span>
        </div>
        <p className="adm-ecos-note">
          En la vida real se paga a la persona, no comisión por comisión. Aquí está lo
          pendiente de cada quien junto, y con un botón queda todo marcado como pagado.
          El pago lo haces tú por fuera; el panel solo lleva la cuenta.
        </p>
        <table className="adm-vend-table adm-ecos-breakdown">
          <thead><tr><th>Persona</th><th>Comisiones</th><th>Total</th><th /></tr></thead>
          <tbody>
            {porPersona.length === 0 ? (
              <tr>
                <td colSpan={4} className="adm-tx-empty">
                  {cargando ? "Cargando…" : "No hay nada pendiente de pago."}
                </td>
              </tr>
            ) : porPersona.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.nombre}</strong><br /><span className="adm-ecos-sub">{p.correo}</span></td>
                <td>{p.n}</td>
                <td><strong>{centavos(p.total)}</strong></td>
                <td>
                  <button
                    type="button" className="adm-add-btn" disabled={busy}
                    onClick={() => void pagarTodoDe(p.id, p.nombre)}
                  >
                    Marcar pagado
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="adm-ecos-note adm-ecos-error">{error}</p>}
      {msg && <p className="adm-ecos-note">{msg}</p>}

      {/* --- Movimientos --------------------------------------------------- */}
      <div className="adm-card adm-card-pad adm-com-wide">
        <div className="adm-card-head">
          <div className="adm-card-titlerow"><h2 className="adm-card-title">Movimientos</h2></div>
          <span className="adm-card-sub">{lista.length} {lista.length === 1 ? "comisión" : "comisiones"}</span>
        </div>

        <div className="adm-com-filtros" role="tablist">
          {FILTROS.map((f) => (
            <button
              key={f.id} type="button" role="tab" aria-selected={filtro === f.id}
              className={`adm-ecos-tab${filtro === f.id ? " active" : ""}`}
              onClick={() => setFiltro(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <table className="adm-vend-table adm-ecos-breakdown">
          <thead>
            <tr>
              <th>Fecha</th><th>Para</th><th>Por la compra de</th><th>Concepto</th>
              <th>Base</th><th>Comisión</th><th>Estado</th><th />
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr>
                <td colSpan={8} className="adm-tx-empty">
                  {cargando
                    ? "Cargando…"
                    : filtro === "todas"
                      ? "Todavía no se ha causado ninguna comisión. Aparecen solas con la primera compra de alguien referido."
                      : "No hay comisiones en este estado."}
                </td>
              </tr>
            ) : lista.map((c) => {
              const quien = quienEs(c.referrer_id);
              return (
                <tr key={c.id}>
                  <td className="adm-ecos-sub">{fmtDate(c.created_at)}</td>
                  <td>
                    <strong>{quien.nombre}</strong>
                    <br />
                    <span className={`adm-pill${c.referrer_kind === "embajador" ? " ok" : " off"}`}>
                      {c.referrer_kind === "embajador" ? "Embajador" : "Afiliado"}
                    </span>
                  </td>
                  <td>
                    {c.buyer_name || c.buyer_email || "—"}
                    {c.buyer_name && c.buyer_email && (
                      <><br /><span className="adm-ecos-sub">{c.buyer_email}</span></>
                    )}
                  </td>
                  <td>
                    {c.concept || (c.source === "club" ? "Membresía del club" : "Compra en la tienda")}
                    <br />
                    <span className="adm-ecos-sub">{c.source === "club" ? "club" : "producto"}</span>
                  </td>
                  <td>{centavos(Number(c.base_amount))}</td>
                  <td><strong>{centavos(Number(c.amount))}</strong> <span className="adm-ecos-sub">({Number(c.pct)}%)</span></td>
                  <td>
                    <span className={`adm-pill${c.status === "pagada" ? " ok" : c.status === "anulada" ? "" : " off"}`}>
                      {c.status === "pagada" ? "Pagada" : c.status === "anulada" ? "Anulada" : "Pendiente"}
                    </span>
                    {c.paid_at && <><br /><span className="adm-ecos-sub">{fmtDate(c.paid_at)}</span></>}
                  </td>
                  <td>
                    <div className="adm-com-acciones">
                      {c.status !== "pagada" && (
                        <button
                          type="button" className="adm-add-btn" disabled={busy}
                          onClick={() => void cambiarEstado([c.id], "pagada", "Comisión marcada como pagada.")}
                        >
                          Pagar
                        </button>
                      )}
                      {c.status !== "anulada" && (
                        <button
                          type="button" className="adm-icon-btn-sm" disabled={busy}
                          aria-label="Anular esta comisión"
                          title="Anular"
                          onClick={() => void cambiarEstado([c.id], "anulada", "Comisión anulada.")}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* --- Aprobar afiliados --------------------------------------------- */}
      <div className="adm-card adm-card-pad">
        <div className="adm-card-head">
          <div className="adm-card-titlerow"><h2 className="adm-card-title">Aprobar un afiliado</h2></div>
        </div>
        <p className="adm-ecos-note">
          El afiliado no es del club: gana el 10% de la primera compra de cada persona que
          trae. Se aprueba uno por uno, según el perfil. Los miembros activos del club no
          necesitan pasar por aquí: son embajadores desde el día que entran, y ganan el 10%
          de todo lo que compre su gente mientras sigan activos.
        </p>
        <div className="adm-field">
          <label htmlFor="com-email">Correo de la cuenta (ya registrada)</label>
          <div className="adm-ecos-setting-row">
            <input
              id="com-email" type="email" value={email} placeholder="correo con el que se registró"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void aprobarAfiliado(); }}
              disabled={busy}
            />
            <button
              type="button" className="adm-add-btn"
              onClick={() => void aprobarAfiliado()} disabled={busy || !email.trim()}
            >
              {busy ? "…" : "Aprobar"}
            </button>
          </div>
          <span className="adm-ecos-sub">
            Si la persona todavía no tiene cuenta, pídele que se registre en /ecos/entrar y
            vuelve aquí. El código se genera solo; si ya tenía uno, se conserva.
          </span>
        </div>
      </div>

      {/* --- Quién puede referir -------------------------------------------- */}
      <div className="adm-card adm-card-pad">
        <div className="adm-card-head">
          <div className="adm-card-titlerow"><h2 className="adm-card-title">Quién puede referir</h2></div>
          <span className="adm-card-sub">{habilitados.length} {habilitados.length === 1 ? "código" : "códigos"}</span>
        </div>
        <table className="adm-vend-table adm-ecos-breakdown">
          <thead><tr><th>Persona</th><th>Figura</th><th>Código</th><th /></tr></thead>
          <tbody>
            {habilitados.length === 0 ? (
              <tr>
                <td colSpan={4} className="adm-tx-empty">
                  {cargando ? "Cargando…" : "Todavía no hay nadie con código. Los miembros del club lo reciben al entrar; a los afiliados los apruebas aquí arriba."}
                </td>
              </tr>
            ) : habilitados.map((h) => (
              <tr key={h.row.id}>
                <td><strong>{h.nombre}</strong><br /><span className="adm-ecos-sub">{h.correo}</span></td>
                <td>
                  {h.figura === null
                    ? <span className="adm-pill">Sin figura</span>
                    : <span className={`adm-pill${h.figura === "embajador" ? " ok" : " off"}`}>
                        {h.figura === "embajador" ? "Embajador" : "Afiliado"}
                      </span>}
                </td>
                <td><code className="adm-com-code">{h.row.code}</code></td>
                <td>
                  {h.row.approved && (
                    <button
                      type="button" className="adm-icon-btn-sm" disabled={busy}
                      aria-label={`Quitar la aprobación de afiliado a ${h.nombre}`}
                      title="Quitar la aprobación"
                      onClick={() => void quitarAprobacion(h.row.id, h.nombre)}
                    >
                      −
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="adm-ecos-note">
          La figura no se guarda: se deduce del club. Quien entra al club sube a embajador
          solo, y quien lo deja vuelve a afiliado si sigue aprobado. Quitar la aprobación
          solo afecta a quien no es miembro activo; lo ya ganado no se toca.
        </p>
      </div>
    </div>
  );
}
