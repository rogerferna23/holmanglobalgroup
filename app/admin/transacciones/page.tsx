import type { Metadata } from "next";

export const metadata: Metadata = { title: "Transacciones" };

// Placeholder — cuando conectes una base de datos / Stripe / PayPal,
// reemplaza estos arrays por queries reales.
const STATS = {
  income: 0,
  expenses: 0,
  net: 0,
};

const GROUPS: { period: string; income: number; expenses: number; balance: number; rows: Row[] }[] = [
  {
    period: "Mayo 2026",
    income: 0,
    expenses: 0,
    balance: 0,
    rows: [],
  },
];

type Row = {
  type: "in" | "out";
  date: string;
  description: string;
  status: "Completado" | "Pendiente" | "Cancelado";
  amount: number;
};

export default function TransaccionesPage() {
  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <h1>Transacciones</h1>
        <p>Registro cronológico unificado de ingresos y gastos</p>
      </header>

      <div className="adm-tx-stats">
        <TxStat
          tone="up"
          title="Ingresos Totales (Completados)"
          value={`$${STATS.income.toLocaleString("en-US")} USD`}
          icon={<ArrowUpRight />}
        />
        <TxStat
          tone="down"
          title="Gastos Totales"
          value={`$${STATS.expenses.toLocaleString("en-US")} USD`}
          icon={<ArrowDownLeft />}
        />
        <TxStat
          tone="net"
          title="Beneficio Neto Global"
          value={`$${STATS.net.toLocaleString("en-US")} USD`}
          icon={<DocIcon />}
        />
      </div>

      {GROUPS.map((g) => (
        <section key={g.period} className="adm-card adm-tx-group">
          <header className="adm-tx-group-head">
            <div className="adm-tx-group-title">
              <FolderIcon />
              <strong>{g.period}</strong>
            </div>
            <div className="adm-tx-group-meta">
              <span>
                Ingresos: <strong className="up">${g.income}</strong>
              </span>
              <span>
                Gastos: <strong className="down">${g.expenses}</strong>
              </span>
              <span>
                Balance: <strong>${g.balance}</strong>
              </span>
            </div>
          </header>
          {g.rows.length === 0 ? (
            <div className="adm-tx-empty">
              No hay transacciones en este periodo.
            </div>
          ) : (
            <table className="adm-tx-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th className="ta-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <span className={`adm-tx-type ${r.type}`}>
                        {r.type === "in" ? <ArrowDownLeft /> : <ArrowUpRight />}
                      </span>
                    </td>
                    <td>{r.date}</td>
                    <td>{r.description}</td>
                    <td>
                      <span className="adm-tx-status">{r.status}</span>
                    </td>
                    <td className={`ta-right ${r.type === "in" ? "up" : "down"}`}>
                      {r.type === "in" ? "+" : "-"}${r.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  );
}

function TxStat({
  tone,
  title,
  value,
  icon,
}: {
  tone: "up" | "down" | "net";
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`adm-tx-stat tone-${tone}`}>
      <div className="adm-tx-stat-text">
        <span className="adm-tx-stat-title">{title}</span>
        <span className="adm-tx-stat-value">{value}</span>
      </div>
      <span className="adm-tx-stat-icon">{icon}</span>
    </div>
  );
}

function ArrowUpRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}
function ArrowDownLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17 7 7 17M15 17H7V9" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" />
      <path d="M14 3v6h6M9 13h6M9 17h6" />
    </svg>
  );
}
function FolderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#F0B800"
      strokeWidth="1.6"
      width="18"
      height="18"
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}
