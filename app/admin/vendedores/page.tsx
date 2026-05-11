import type { Metadata } from "next";

export const metadata: Metadata = { title: "Vendedores" };

const STATS = { total: 0, sales: 0, top: "—" };
const ROWS: Vendor[] = [];

type Vendor = {
  id: string;
  name: string;
  initials: string;
  specialty: string;
  phone: string;
  sales: number;
  income: number;
  rating: number;
  active: boolean;
};

export default function VendedoresPage() {
  return (
    <div className="adm-page">
      <header className="adm-page-head adm-page-head-row">
        <div>
          <h1>Vendedores</h1>
          <p>{STATS.total} vendedores registrados</p>
        </div>
        <button type="button" className="adm-cta-btn">
          + Nuevo Vendedor
        </button>
      </header>

      <div className="adm-tx-stats">
        <VendStat
          tone="blue"
          title="Total Vendedores"
          value={String(STATS.total)}
          icon={<UsersIcon />}
        />
        <VendStat
          tone="green"
          title="Ventas Combinadas"
          value={String(STATS.sales)}
          icon={<TrendIcon />}
        />
        <VendStat
          tone="gold"
          title="Mejor Vendedor"
          value={STATS.top}
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
            {ROWS.length === 0 ? (
              <tr>
                <td colSpan={7} className="adm-tx-empty">
                  No hay vendedores. Agrega uno con el botón de arriba.
                </td>
              </tr>
            ) : (
              ROWS.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div className="adm-vend-cell">
                      <span className="adm-vend-avatar">{v.initials}</span>
                      <span>{v.name}</span>
                    </div>
                  </td>
                  <td>{v.specialty}</td>
                  <td>{v.phone}</td>
                  <td>{v.sales}</td>
                  <td>${v.income.toLocaleString("en-US")}</td>
                  <td>★ {v.rating.toFixed(1)}</td>
                  <td>
                    <span className={`adm-pill ${v.active ? "ok" : "off"}`}>
                      {v.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VendStat({
  tone,
  title,
  value,
  icon,
}: {
  tone: "blue" | "green" | "gold";
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`adm-tx-stat tone-${tone === "blue" ? "net" : tone === "green" ? "up" : "down"}`}>
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
