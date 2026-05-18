import { useMemo, useState } from "react";
import {
  formatMoneyUSD,
  monthIndex,
  newId,
  todayISO,
  useExpenses,
  useManualSales,
  yearOf,
  type Expense,
  type ManualSale,
} from "@/lib/admin-store";
import { ADMIN_PRODUCTS } from "@/lib/admin-products";
import { downloadExcel } from "@/lib/excel-export";

const MONTHS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const ORIGINS = ["Directo", "Instagram", "WhatsApp", "Recomendación", "Web", "Otro"];

export function ReportesView() {
  const salesHook = useManualSales();
  const expensesHook = useExpenses();
  const sales = salesHook.data;
  const expenses = expensesHook.data;
  const [period, setPeriod] = useState<number>(new Date().getMonth() + 1); // 1..12
  const year = new Date().getFullYear();

  // Sumas por mes
  const monthly = useMemo(() => {
    const incomes = Array(12).fill(0);
    const exps = Array(12).fill(0);
    for (const s of sales) {
      if (s.status !== "Aprobado") continue;
      if (yearOf(s.date) !== year) continue;
      incomes[monthIndex(s.date)] += s.amount;
    }
    for (const e of expenses) {
      if (yearOf(e.date) !== year) continue;
      exps[monthIndex(e.date)] += e.amount;
    }
    return { incomes, exps };
  }, [sales, expenses, year]);

  // Ingresos por categoria/especialidad
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sales) {
      if (s.status !== "Aprobado") continue;
      const product = ADMIN_PRODUCTS.find((p) => p.id === s.serviceId);
      const cat = product?.categoryLabel || "Otros";
      map.set(cat, (map.get(cat) || 0) + s.amount);
    }
    return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
  }, [sales]);

  const totalIncome = monthly.incomes.reduce((a, b) => a + b, 0);
  const totalExpenses = monthly.exps.reduce((a, b) => a + b, 0);
  const net = totalIncome - totalExpenses;

  // Periodo seleccionado (mes actual o todo el ano)
  const filteredSales = sales.filter(
    (s) => yearOf(s.date) === year && monthIndex(s.date) === period - 1
  );
  const periodIncome = filteredSales
    .filter((s) => s.status === "Aprobado")
    .reduce((a, b) => a + b.amount, 0);

  function exportExcel() {
    const sheets = [
      {
        name: "Resumen",
        columns: ["Concepto", "Total USD"],
        rows: [
          ["Ingresos totales (Aprobados)", totalIncome],
          ["Gastos totales", totalExpenses],
          ["Beneficio neto", net],
        ] as (string | number)[][],
      },
      {
        name: "Ventas",
        columns: [
          "Fecha", "Servicio", "Cliente", "Email", "Teléfono", "Origen",
          "Notas", "Importe USD", "Estado",
        ],
        rows: sales.map((s) => [
          s.date,
          s.serviceTitle,
          s.clientName,
          s.clientEmail,
          s.clientPhone || "",
          s.origin,
          s.notes || "",
          s.amount,
          s.status,
        ]) as (string | number)[][],
      },
      {
        name: "Gastos",
        columns: ["Fecha", "Descripción", "Categoría", "Importe USD"],
        rows: expenses.map((e) => [
          e.date,
          e.description,
          e.category || "",
          e.amount,
        ]) as (string | number)[][],
      },
    ];
    downloadExcel(`reporte-HGG-${year}`, sheets);
  }

  return (
    <div className="adm-page">
      <header className="adm-page-head adm-page-head-row">
        <div>
          <h1>Reportes</h1>
          <p>Ingresos automáticos · Gastos por partida</p>
        </div>
        <div className="adm-rep-actions">
          <PeriodSelector value={period} onChange={setPeriod} />
          <button type="button" className="adm-export-btn" onClick={exportExcel}>
            <ExcelIcon /> Exportar Excel
          </button>
        </div>
      </header>

      <div className="adm-grid-2">
        <div className="adm-card adm-card-pad">
          <h2 className="adm-card-title" style={{ marginBottom: 14 }}>
            Ingresos vs Gastos
          </h2>
          <DualLineChart incomes={monthly.incomes} expenses={monthly.exps} />
          <div className="adm-chart-legend">
            <span className="adm-chart-legend-item">
              <span className="dot down" /> Gastos
            </span>
            <span className="adm-chart-legend-item">
              <span className="dot up" /> Ingresos
            </span>
          </div>
        </div>

        <div className="adm-card adm-card-pad">
          <h2 className="adm-card-title" style={{ marginBottom: 14 }}>
            Ingresos por Especialidad
          </h2>
          <BarChart items={byCategory} />
        </div>
      </div>

      <VentasManualesPanel
        sales={sales}
        createSale={salesHook.create}
        removeSale={salesHook.remove}
        totalIncome={totalIncome}
        periodIncome={periodIncome}
      />

      <RegistroGastos
        expenses={expenses}
        createExpense={expensesHook.create}
        removeExpense={expensesHook.remove}
      />

      <div className="adm-tx-stats" style={{ marginTop: 24 }}>
        <div className="adm-tx-stat tone-up">
          <div className="adm-tx-stat-text">
            <span className="adm-tx-stat-title">INGRESOS TOTALES</span>
            <span className="adm-tx-stat-value">${formatMoneyUSD(totalIncome)}</span>
            <span className="adm-tx-stat-hint">Ventas pagadas</span>
          </div>
          <span className="adm-tx-stat-icon">
            <DollarIcon />
          </span>
        </div>
        <div className="adm-tx-stat tone-down">
          <div className="adm-tx-stat-text">
            <span className="adm-tx-stat-title">GASTOS TOTALES</span>
            <span className="adm-tx-stat-value">${formatMoneyUSD(totalExpenses)}</span>
            <span className="adm-tx-stat-hint">{expenses.length} registros</span>
          </div>
          <span className="adm-tx-stat-icon">
            <TrendIcon />
          </span>
        </div>
        <div className="adm-tx-stat tone-net">
          <div className="adm-tx-stat-text">
            <span className="adm-tx-stat-title">BENEFICIO NETO</span>
            <span className="adm-tx-stat-value">${formatMoneyUSD(net)}</span>
            <span className="adm-tx-stat-hint">
              {totalIncome > 0
                ? `Margen del ${Math.round((net / totalIncome) * 100)}%`
                : "—"}
            </span>
          </div>
          <span className="adm-tx-stat-icon">
            <BoxIcon />
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------- Period selector (1/12 con bullets)
function PeriodSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="adm-period-bullets">
      {Array.from({ length: 12 }, (_, i) => (
        <button
          type="button"
          key={i}
          className={`adm-period-bullet${value === i + 1 ? " active" : ""}`}
          onClick={() => onChange(i + 1)}
          aria-label={`Mes ${i + 1}`}
        />
      ))}
      <span className="adm-period-count">{value}/12</span>
    </div>
  );
}

// ---------- Dual line chart (Ingresos vs Gastos)
function DualLineChart({
  incomes,
  expenses,
}: {
  incomes: number[];
  expenses: number[];
}) {
  const w = 600;
  const h = 220;
  const max = Math.max(...incomes, ...expenses, 800);
  const stepX = w / (incomes.length - 1 || 1);

  const toPath = (data: number[]) =>
    data
      .map((v, i) => {
        const x = i * stepX;
        const y = h - (v / max) * h;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <div className="adm-chart adm-chart-large">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="adm-chart-svg"
      >
        <path d={toPath(expenses)} fill="none" stroke="#ff5a5a" strokeWidth="2" />
        <path d={toPath(incomes)} fill="none" stroke="#F0B800" strokeWidth="2" />
      </svg>
      <div className="adm-chart-axis">
        {MONTHS.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <div className="adm-chart-y">
        <span>$800</span>
        <span>$600</span>
        <span>$400</span>
        <span>$200</span>
        <span>$0</span>
      </div>
    </div>
  );
}

// ---------- Bar chart (categorias)
function BarChart({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(...items.map((i) => i.value), 800);
  const safe = items.length > 0 ? items : [{ label: "—", value: 0 }];
  return (
    <div className="adm-bar-chart">
      <div className="adm-chart-y">
        <span>$800</span>
        <span>$600</span>
        <span>$400</span>
        <span>$200</span>
        <span>$0</span>
      </div>
      <div className="adm-bar-chart-bars">
        {safe.map((item) => (
          <div key={item.label} className="adm-bar-col">
            <div
              className="adm-bar"
              style={{ height: `${Math.max(2, (item.value / max) * 100)}%` }}
              title={`$${formatMoneyUSD(item.value)}`}
            />
            <span className="adm-bar-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Ventas manuales
function VentasManualesPanel({
  sales,
  createSale,
  removeSale,
  totalIncome,
}: {
  sales: ManualSale[];
  createSale: (item: ManualSale) => Promise<{ error: string | null }>;
  removeSale: (id: string) => Promise<{ error: string | null }>;
  totalIncome: number;
  periodIncome: number;
}) {
  const [serviceId, setServiceId] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [origin, setOrigin] = useState<string>(ORIGINS[0]);
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>(todayISO());

  function reset() {
    setServiceId("");
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setOrigin(ORIGINS[0]);
    setNotes("");
    setAmount("");
    setDate(todayISO());
  }

  async function add() {
    const product = ADMIN_PRODUCTS.find((p) => p.id === serviceId);
    if (!product || !clientName || !clientEmail) return;
    const amt = Number(amount) || product.basePrice || 0;
    const ok = await createSale({
      id: newId("sale"),
      date,
      serviceId: product.id,
      serviceTitle: product.title,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      clientPhone: clientPhone.trim(),
      origin,
      notes: notes.trim(),
      amount: amt,
      status: "Aprobado",
    });
    if (ok) reset();
  }

  function remove(id: string) {
    void removeSale(id);
  }

  return (
    <div className="adm-card adm-vm-panel">
      <header className="adm-vm-head">
        <div>
          <h2 className="adm-card-title">Ventas Manuales</h2>
          <p className="adm-card-sub">Registra ventas realizadas fuera del sitio web</p>
        </div>
        <span className="adm-vm-total">
          ${formatMoneyUSD(totalIncome)} <span>USD total</span>
        </span>
      </header>

      <div className="adm-vm-form">
        <div className="adm-vm-form-section">
          <span className="adm-vm-section-label">NUEVA VENTA</span>
          <div className="adm-field">
            <label>Servicio</label>
            <select
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value);
                const prod = ADMIN_PRODUCTS.find((p) => p.id === e.target.value);
                if (prod && prod.basePrice > 0 && !amount) {
                  setAmount(String(prod.basePrice));
                }
              }}
            >
              <option value="">+ Agregar servicio</option>
              {ADMIN_PRODUCTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                  {p.basePrice > 0 ? ` — $${p.basePrice}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="adm-form-row">
            <div className="adm-field">
              <label>Nombre cliente *</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Juan García"
              />
            </div>
            <div className="adm-field">
              <label>Email cliente *</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="juan@email.com"
              />
            </div>
          </div>
          <div className="adm-form-row">
            <div className="adm-field">
              <label>Teléfono (WhatsApp)</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+52 123 456 7890"
              />
            </div>
            <div className="adm-field">
              <label>Origen *</label>
              <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
                {ORIGINS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="adm-field">
            <label>Notas cortas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexto del cliente o de la venta..."
              rows={2}
            />
          </div>
          <div className="adm-form-row">
            <div className="adm-field">
              <label>Importe total (USD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="adm-field">
              <label>Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <button type="button" className="adm-vm-submit" onClick={add}>
            + Registrar venta
          </button>
        </div>
      </div>

      <table className="adm-vm-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Servicio</th>
            <th>Cliente</th>
            <th className="ta-right">Importe</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sales.length === 0 ? (
            <tr>
              <td colSpan={6} className="adm-tx-empty">
                Aún no hay ventas registradas. Usa el formulario para añadir la primera.
              </td>
            </tr>
          ) : (
            sales.map((s) => (
              <tr key={s.id}>
                <td>{s.date}</td>
                <td>{s.serviceTitle}</td>
                <td>
                  <div>
                    <div style={{ color: "var(--white)" }}>{s.clientName}</div>
                    <div style={{ fontSize: 10, color: "var(--muted-2)" }}>
                      {s.clientEmail}
                    </div>
                  </div>
                </td>
                <td className="ta-right" style={{ color: "var(--white)" }}>
                  ${formatMoneyUSD(s.amount)} USD
                </td>
                <td>
                  <span className="adm-pill ok">✓ {s.status}</span>
                </td>
                <td className="ta-right">
                  <button
                    type="button"
                    className="adm-icon-btn-sm"
                    onClick={() => remove(s.id)}
                    aria-label="Eliminar"
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Registro de gastos
function RegistroGastos({
  expenses,
  createExpense,
  removeExpense,
}: {
  expenses: Expense[];
  createExpense: (item: Expense) => Promise<{ error: string | null }>;
  removeExpense: (id: string) => Promise<{ error: string | null }>;
}) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>(todayISO());

  async function add() {
    const amt = Number(amount);
    if (!desc.trim() || !Number.isFinite(amt) || amt <= 0) return;
    const ok = await createExpense({
      id: newId("exp"),
      description: desc.trim(),
      amount: amt,
      date,
    });
    if (ok) {
      setDesc("");
      setAmount("");
    }
  }

  function remove(id: string) {
    void removeExpense(id);
  }

  const total = expenses.reduce((a, b) => a + b.amount, 0);

  return (
    <div className="adm-card adm-vm-panel">
      <header className="adm-vm-head">
        <div>
          <h2 className="adm-card-title">Registro de Gastos</h2>
          <p className="adm-card-sub">
            {expenses.length} partidas · Total: ${formatMoneyUSD(total)}
          </p>
        </div>
      </header>

      <div className="adm-form-row" style={{ padding: "0 18px 14px" }}>
        <div className="adm-field" style={{ flex: 2 }}>
          <label>Descripción *</label>
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Ej: Hosting, Publicidad, Nómina..."
          />
        </div>
        <div className="adm-field">
          <label>Importe ($) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="adm-field">
          <label>Fecha de pago *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <button type="button" className="adm-add-btn" onClick={add}>
          + Agregar
        </button>
      </div>

      <table className="adm-vm-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Descripción</th>
            <th className="ta-right">Importe</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {expenses.length === 0 ? (
            <tr>
              <td colSpan={4} className="adm-tx-empty">
                No hay gastos registrados. Agrega el primero arriba.
              </td>
            </tr>
          ) : (
            expenses.map((e) => (
              <tr key={e.id}>
                <td>{e.date}</td>
                <td>{e.description}</td>
                <td className="ta-right down">-${formatMoneyUSD(e.amount)}</td>
                <td className="ta-right">
                  <button
                    type="button"
                    className="adm-icon-btn-sm"
                    onClick={() => remove(e.id)}
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Iconos
function ExcelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" />
      <path d="M14 3v6h6M9 13l3 3 3-3M12 16V9" />
    </svg>
  );
}
function DollarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3v18M16 7c-1-1.5-2.5-2-4-2-2.2 0-4 1.3-4 3 0 4 8 2 8 6 0 1.7-1.8 3-4 3-1.5 0-3-.5-4-2" />
    </svg>
  );
}
function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 2 4 6v12l8 4 8-4V6l-8-4Z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  );
}
