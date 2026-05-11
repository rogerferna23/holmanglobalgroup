"use client";

import { useMemo, useState } from "react";
import {
  formatMoneyUSD,
  monthIndex,
  useExpenses,
  useManualSales,
  yearOf,
} from "@/lib/admin-store";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type Row = {
  type: "in" | "out";
  date: string;
  description: string;
  status: string;
  amount: number;
};

export function TransaccionesView() {
  const { data: sales, loading } = useManualSales();
  const { data: expenses } = useExpenses();

  const totals = useMemo(() => {
    const income = sales
      .filter((s) => s.status === "Aprobado")
      .reduce((a, b) => a + b.amount, 0);
    const exp = expenses.reduce((a, b) => a + b.amount, 0);
    return { income, expenses: exp, net: income - exp };
  }, [sales, expenses]);

  // Agrupar por (año, mes)
  const groups = useMemo(() => {
    const map = new Map<string, { period: string; rows: Row[]; income: number; expenses: number }>();
    const push = (date: string, key: string, row: Row) => {
      const g = map.get(key) || {
        period: `${MONTHS[monthIndex(date)]} ${yearOf(date)}`,
        rows: [],
        income: 0,
        expenses: 0,
      };
      g.rows.push(row);
      if (row.type === "in") g.income += row.amount;
      else g.expenses += row.amount;
      map.set(key, g);
    };
    for (const s of sales) {
      const key = `${yearOf(s.date)}-${String(monthIndex(s.date) + 1).padStart(2, "0")}`;
      push(s.date, key, {
        type: "in",
        date: s.date,
        description: `Venta: ${s.serviceTitle} (${s.clientName})`,
        status: s.status,
        amount: s.amount,
      });
    }
    for (const e of expenses) {
      const key = `${yearOf(e.date)}-${String(monthIndex(e.date) + 1).padStart(2, "0")}`;
      push(e.date, key, {
        type: "out",
        date: e.date,
        description: e.description,
        status: "Completado",
        amount: e.amount,
      });
    }
    // Ordenar grupos por fecha desc, y rows dentro de cada grupo por fecha desc
    const arr = Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([, v]) => ({
        ...v,
        rows: v.rows.sort((a, b) => (a.date < b.date ? 1 : -1)),
        balance: v.income - v.expenses,
      }));
    return arr;
  }, [sales, expenses]);

  // Estado de grupos abiertos. Por defecto todos cerrados — el usuario los
  // expande con click. Memoria solo en sesion (se resetea al recargar).
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const toggle = (period: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(period)) next.delete(period);
      else next.add(period);
      return next;
    });
  const expandAll = () => setOpenGroups(new Set(groups.map((g) => g.period)));
  const collapseAll = () => setOpenGroups(new Set());
  const allOpen = groups.length > 0 && openGroups.size === groups.length;

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
          value={`$${formatMoneyUSD(totals.income)} USD`}
          icon={<ArrowUpRight />}
        />
        <TxStat
          tone="down"
          title="Gastos Totales"
          value={`$${formatMoneyUSD(totals.expenses)} USD`}
          icon={<ArrowDownLeft />}
        />
        <TxStat
          tone="net"
          title="Beneficio Neto Global"
          value={`$${formatMoneyUSD(totals.net)} USD`}
          icon={<DocIcon />}
        />
      </div>

      {groups.length === 0 ? (
        <div className="adm-card adm-empty-card">
          <h2 className="adm-empty-title">{loading ? "Cargando…" : "Sin transacciones"}</h2>
          {!loading && (
            <p className="adm-empty-desc">
              Carga datos demo desde Configuración para ver cómo se ve esta vista
              con información real.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="adm-tx-toolbar">
            <span className="adm-tx-toolbar-info">
              {groups.length} {groups.length === 1 ? "mes" : "meses"} con movimientos
            </span>
            <button
              type="button"
              className="adm-tx-toolbar-btn"
              onClick={allOpen ? collapseAll : expandAll}
            >
              {allOpen ? "Contraer todos" : "Expandir todos"}
            </button>
          </div>
          {groups.map((g) => {
            const isOpen = openGroups.has(g.period);
            return (
          <section
            key={g.period}
            className={`adm-card adm-tx-group${isOpen ? " open" : ""}`}
          >
            <button
              type="button"
              className="adm-tx-group-head"
              onClick={() => toggle(g.period)}
              aria-expanded={isOpen}
            >
              <div className="adm-tx-group-title">
                <span className={`adm-tx-chevron${isOpen ? " open" : ""}`} aria-hidden="true">
                  <ChevronIcon />
                </span>
                <FolderIcon />
                <strong>{g.period}</strong>
                <span className="adm-tx-group-count">{g.rows.length}</span>
              </div>
              <div className="adm-tx-group-meta">
                <span>
                  Ingresos: <strong className="up">${formatMoneyUSD(g.income)}</strong>
                </span>
                <span>
                  Gastos: <strong className="down">${formatMoneyUSD(g.expenses)}</strong>
                </span>
                <span>
                  Balance: <strong>${formatMoneyUSD(g.balance)}</strong>
                </span>
              </div>
            </button>
            {isOpen && (
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
                      <span className={`adm-tx-type ${r.type === "out" ? "out" : ""}`}>
                        {r.type === "in" ? <ArrowDownLeft /> : <ArrowUpRight />}
                      </span>
                    </td>
                    <td>{r.date}</td>
                    <td>{r.description}</td>
                    <td>
                      <span className="adm-tx-status">✓ {r.status}</span>
                    </td>
                    <td className={`ta-right ${r.type === "in" ? "up" : "down"}`}>
                      {r.type === "in" ? "+" : "-"}${formatMoneyUSD(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </section>
            );
          })}
        </>
      )}
    </div>
  );
}

function TxStat({
  tone, title, value, icon,
}: {
  tone: "up" | "down" | "net"; title: string; value: string; icon: React.ReactNode;
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
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 17 17 7M9 7h8v8"/></svg>);
}
function ArrowDownLeft() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 7 7 17M15 17H7V9"/></svg>);
}
function DocIcon() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M9 13h6M9 17h6"/></svg>);
}
function FolderIcon() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="#F0B800" strokeWidth="1.6" width="18" height="18"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>);
}
function ChevronIcon() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6"/></svg>);
}
