import type { Metadata } from "next";
import { ADMIN_PRODUCTS } from "@/lib/admin-products";

export const metadata: Metadata = { title: "Dashboard" };

// Datos simulados — cuando conectes una base de datos, reemplaza estos
// valores por queries reales (Postgres, Vercel KV, Supabase, etc.).
const STATS = {
  totalSales: 0,
  monthlyIncome: 0,
  monthlyDelta: 0,
  activeProducts: ADMIN_PRODUCTS.length,
  vendors: 0,
};

const TOP_PRODUCTS = ADMIN_PRODUCTS.slice(0, 5).map((p) => ({
  id: p.id,
  title: p.title,
  sales: 0,
  amount: p.basePrice,
  delta: 0,
}));

// Placeholder de la curva — cuando haya datos reales se calculan estos puntos
// a partir de las ventas mensuales.
const CHART_POINTS = [0, 0, 0, 0, 0];
const CHART_LABELS = ["Ene", "Feb", "Mar", "Abr", "May"];

export default function DashboardPage() {
  const max = Math.max(...CHART_POINTS, 800);
  const w = 800;
  const h = 220;
  const stepX = w / (CHART_POINTS.length - 1 || 1);
  const path = CHART_POINTS.map((v, i) => {
    const x = i * stepX;
    const y = h - (v / max) * h;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const areaPath = `${path} L${w},${h} L0,${h} Z`;

  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <h1>Panel de Administración</h1>
        <p>Bienvenido de vuelta</p>
      </header>

      <div className="adm-stats">
        <StatCard
          title="Ventas Totales"
          value={`$${STATS.totalSales.toLocaleString("en-US")}`}
          hint="Histórico global"
          icon={<DollarIcon />}
        />
        <StatCard
          title="Ingresos Mensuales"
          value={`$${STATS.monthlyIncome.toLocaleString("en-US")}`}
          hint={`${STATS.monthlyDelta}% vs mes anterior`}
          hintTone={STATS.monthlyDelta >= 0 ? "up" : "down"}
          icon={<TrendIcon />}
        />
        <StatCard
          title="Productos Activos"
          value={String(STATS.activeProducts)}
          hint="En catálogo"
          icon={<BoxIcon />}
        />
        <StatCard
          title="Vendedores"
          value={String(STATS.vendors)}
          hint="Registrados"
          icon={<UsersIcon />}
        />
      </div>

      <div className="adm-grid-2">
        <div className="adm-card adm-card-pad">
          <header className="adm-card-head">
            <div>
              <h2 className="adm-card-title gold">Ventas Totales (Este Año)</h2>
            </div>
          </header>
          <div className="adm-chart">
            <svg
              viewBox={`0 0 ${w} ${h}`}
              preserveAspectRatio="none"
              className="adm-chart-svg"
              aria-label="Curva de ventas anuales"
            >
              <defs>
                <linearGradient id="adm-chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F0B800" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#F0B800" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#adm-chart-fill)" />
              <path d={path} fill="none" stroke="#F0B800" strokeWidth="2" />
            </svg>
            <div className="adm-chart-axis">
              {CHART_LABELS.map((l) => (
                <span key={l}>{l}</span>
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
        </div>

        <div className="adm-card adm-card-pad">
          <header className="adm-card-head">
            <div className="adm-card-titlerow">
              <TrophyIcon />
              <div>
                <h2 className="adm-card-title">Productos Más Vendidos</h2>
                <p className="adm-card-sub">Top 5 Histórico</p>
              </div>
            </div>
          </header>
          <ul className="adm-toplist">
            {TOP_PRODUCTS.map((p, i) => (
              <li key={p.id} className="adm-toplist-item">
                <span className="adm-toplist-rank">{i + 1}</span>
                <div className="adm-toplist-body">
                  <div className="adm-toplist-name">{p.title}</div>
                  <div className="adm-toplist-meta">{p.sales} ventas</div>
                </div>
                <div className="adm-toplist-side">
                  <div className="adm-toplist-amount">
                    {p.amount > 0
                      ? `$${p.amount.toLocaleString("en-US")}`
                      : "—"}
                  </div>
                  <div className="adm-toplist-delta">+{p.delta}%</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
  hintTone,
  icon,
}: {
  title: string;
  value: string;
  hint: string;
  hintTone?: "up" | "down";
  icon: React.ReactNode;
}) {
  return (
    <div className="adm-stat">
      <div className="adm-stat-head">
        <span className="adm-stat-title">{title}</span>
        <span className="adm-stat-icon">{icon}</span>
      </div>
      <div className="adm-stat-value">{value}</div>
      <div className={`adm-stat-hint${hintTone ? ` adm-stat-hint-${hintTone}` : ""}`}>
        {hint}
      </div>
    </div>
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
      <path d="M4 6l8 4 8-4M12 22V10" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="9" cy="8" r="3.2" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M3 20c0-3 2.7-5.5 6-5.5S15 17 15 20" />
      <path d="M14.5 14.5c2.5 0 6 1.6 6 4.5" />
    </svg>
  );
}
function TrophyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#F0B800"
      strokeWidth="1.6"
      width="20"
      height="20"
    >
      <path d="M8 4h8v6a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3M16 6h3a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3" />
      <path d="M10 16h4l-1 4h-2l-1-4Z" />
    </svg>
  );
}
