import { useState } from "react";
import { useClub } from "@/contexts/ClubContext";
import { RedesPanel } from "@/components/redes-panel";
import { ESTADO_LABEL, fechaCorta } from "@/lib/proceso";
import { useMisClientesEquipo } from "@/lib/redes-cliente";

/**
 * «Mis clientes»: para quien lleva las redes de clientes de HGG (nov 2026: Sol).
 * Ve solo los clientes que Holman le asigna, con su programa y su etapa, y
 * anota avances, publicaciones y números del mes. No ve la meta, las
 * creencias, la rueda ni las actas: eso es del cliente y de Holman.
 */
export default function MisClientes() {
  const clientes = useMisClientesEquipo();
  const { member } = useClub();
  const [sel, setSel] = useState<string | null>(null);

  if (clientes === null) return <div className="club-page"><p className="club-muted">Cargando tus clientes…</p></div>;

  const actual = clientes.find((c) => c.id === sel) ?? (clientes.length === 1 ? clientes[0] : null);
  const autor = member?.name?.split(" ")[0] || undefined;

  return (
    <div className="club-page">
      <header className="club-page-head">
        <p className="club-eyebrow">Equipo HGG</p>
        <h1>Mis clientes</h1>
        <p className="club-page-sub">
          Los clientes cuyas redes llevas. Lo que anotes aquí lo ve Holman y lo ve el cliente en su panel, en «Mi proceso».
        </p>
      </header>

      {clientes.length === 0 ? (
        <p className="club-muted">Todavía no tienes clientes asignados. Holman te los asigna desde su panel.</p>
      ) : (
        <div className="eq-lista">
          {clientes.map((c) => {
            const pct = c.sesiones_total ? Math.min(100, Math.round((c.sesiones_hechas / c.sesiones_total) * 100)) : null;
            return (
              <button key={c.id} type="button" className={`eq-cliente${actual?.id === c.id ? " is-sel" : ""}`} onClick={() => setSel(c.id)}>
                <strong>{c.nombre}</strong>
                <small>{c.titulo} · {ESTADO_LABEL[c.estado]} · desde el {fechaCorta(c.inicio)}</small>
                <small>Etapa: {c.etapas[c.etapa_actual] ?? "—"} ({c.etapa_actual + 1} de {c.etapas.length})</small>
                <div className="pg-etapas" aria-hidden="true">
                  {c.etapas.map((e, i) => <span key={e} className={i < c.etapa_actual ? "is-hecha" : i === c.etapa_actual ? "is-actual" : ""} />)}
                </div>
                {pct != null && <small>Sesiones con Holman: {c.sesiones_hechas} de {c.sesiones_total}</small>}
              </button>
            );
          })}
        </div>
      )}

      {actual && (
        <section className="eq-detalle">
          <div className="eq-detalle-head">
            <div>
              <p className="club-eyebrow">Redes</p>
              <h2>{actual.nombre}</h2>
            </div>
            <span className="club-muted">{actual.email}</span>
          </div>
          <RedesPanel key={actual.id} programaId={actual.id} modo="equipo" autor={autor} />
        </section>
      )}
      {!actual && clientes.length > 1 && <p className="club-muted" style={{ marginTop: 18 }}>Elige un cliente para ver y anotar sus redes.</p>}
    </div>
  );
}
