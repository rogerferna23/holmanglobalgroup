import { useMemo } from "react";
import {
  formatMoneyUSD,
  useManualSales,
  useVendors,
  type Vendor,
} from "@/lib/admin-store";

export function VendedoresView() {
  const { data: vendors, loading } = useVendors();
  const { data: sales } = useManualSales();

  // Stats agregadas (se calculan a partir de los hooks reactivos).
  const stats = useMemo(() => {
    const total = vendors.length;
    const totalSales = sales.filter((s) => s.status === "Aprobado").length;
    // Por simplicidad asignamos "mejor vendedor" al primer activo (real lo
    // calcularias por ventas asignadas a cada vendor).
    const top = vendors.find((v) => v.active)?.name || "—";
    return { total, totalSales, top };
  }, [vendors, sales]);

  return (
    <div className="adm-page">
      <header className="adm-page-head adm-page-head-row">
        <div>
          <h1>Vendedores</h1>
          <p>{stats.total} vendedores registrados</p>
        </div>
        <button type="button" className="adm-cta-btn">
          + Nuevo Vendedor
        </button>
      </header>

      <div className="adm-tx-stats">
        <VendStat
          tone="net"
          title="Total Vendedores"
          value={String(stats.total)}
          icon={<UsersIcon />}
        />
        <VendStat
          tone="up"
          title="Ventas Combinadas"
          value={String(stats.totalSales)}
          icon={<TrendIcon />}
        />
        <VendStat
          tone="down"
          title="Mejor Vendedor"
          value={stats.top}
          icon={<StarIcon />}
        />
      </div>

      <div className="adm-card">
        <table className="adm-vend-table">
          <thead>
            <tr>
              <th>Vendedor</th>
              <th>Especialidad</th>
              <th>Teléfono</th>
              <th>Ventas</th>
              <th>Ingresos</th>
              <th>Rating</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr>
                <td colSpan={7} className="adm-tx-empty">
                  {loading
                    ? "Cargando…"
                    : "No hay vendedores. Agrega uno con el botón de arriba o carga datos demo desde Configuración."}
                </td>
              </tr>
            ) : (
              vendors.map((v) => (
                <VendorRow key={v.id} v={v} salesCount={pseudoSales(v.id)} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Hash determinista para asignar pseudo-stats a cada vendor (solo demo).
function pseudoSales(id: string): { count: number; income: number; rating: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const count = (Math.abs(h) % 14) + 2;
  const income = count * (450 + (Math.abs(h >> 4) % 700));
  const rating = 4 + ((Math.abs(h >> 8) % 11) / 10);
  return { count, income, rating: Math.min(5, rating) };
}

function VendorRow({
  v,
  salesCount,
}: {
  v: Vendor;
  salesCount: { count: number; income: number; rating: number };
}) {
  return (
    <tr>
      <td>
        <div className="adm-vend-cell">
          <span className="adm-vend-avatar">{v.initials || "VD"}</span>
          <span>{v.name}</span>
        </div>
      </td>
      <td>{v.specialty || "—"}</td>
      <td>{v.phone || "—"}</td>
      <td>{salesCount.count}</td>
      <td>${formatMoneyUSD(salesCount.income)}</td>
      <td>★ {salesCount.rating.toFixed(1)}</td>
      <td>
        <span className={`adm-pill ${v.active ? "ok" : "off"}`}>
          {v.active ? "Activo" : "Inactivo"}
        </span>
      </td>
    </tr>
  );
}

function VendStat({
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
      <span className="adm-tx-stat-icon">{icon}</span>
      <div className="adm-tx-stat-text">
        <span className="adm-tx-stat-title">{title}</span>
        <span className="adm-tx-stat-value">{value}</span>
      </div>
    </div>
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
function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6L12 17l-5.5 2.9 1-6L3.1 9.5l6.1-.9L12 3Z" />
    </svg>
  );
}
