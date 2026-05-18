import { useEffect } from "react";
import { ADMIN_PRODUCTS, formatProductPrice } from "@/lib/admin-products";

const CATEGORY_TONE: Record<string, string> = {
  coaching: "tone-blue",
  marca: "tone-purple",
  llc: "tone-green",
  impulso: "tone-amber",
  ia: "tone-gold",
};

export default function Productos() {
  useEffect(() => {
    document.title = "Productos · HGG Admin";
  }, []);
  const totalIncome = 0; // a conectar con DB

  return (
    <div className="adm-page">
      <header className="adm-page-head adm-page-head-row">
        <div>
          <h1>Rendimiento de Productos</h1>
          <p>Analíticas de ventas por servicio y periodo</p>
        </div>
        <div className="adm-period">
          <button className="adm-period-btn active" type="button">
            Este mes
          </button>
          <button className="adm-period-btn" type="button">
            Mes anterior
          </button>
          <button className="adm-period-btn" type="button">
            Todo el año
          </button>
        </div>
      </header>

      <div className="adm-products-toolbar">
        <div className="adm-search adm-search-inline">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="11" cy="11" r="6" />
            <path d="M16 16l5 5" />
          </svg>
          <input type="search" placeholder="Buscar por nombre o categoría..." />
        </div>
        <div className="adm-products-summary">
          <div className="adm-products-summary-label">Total Ingresos Periodo</div>
          <div className="adm-products-summary-value">
            ${totalIncome.toLocaleString("en-US")}
          </div>
        </div>
      </div>

      <div className="adm-products-grid">
        {ADMIN_PRODUCTS.map((p) => (
          <article
            key={p.id}
            className={`adm-product-card${p.highlight ? " highlight" : ""}`}
          >
            <header className="adm-product-card-head">
              <span className={`adm-product-icon ${CATEGORY_TONE[p.category]}`}>
                <ProductIcon category={p.category} />
              </span>
              <div className="adm-product-meta">
                <span className="adm-product-tagline">Sin ventas</span>
                <span className={`adm-product-cat ${CATEGORY_TONE[p.category]}`}>
                  {p.categoryLabel.split(" ")[0].toUpperCase()}
                </span>
              </div>
            </header>
            <div className="adm-product-body">
              <h3 className="adm-product-title">{p.title}</h3>
              <p className="adm-product-price">
                Precio base: <strong>{formatProductPrice(p)}</strong>
                {p.recurring && <span className="adm-product-recurring"> · {p.unit}</span>}
              </p>
            </div>
            <footer className="adm-product-foot">
              <div>
                <div className="adm-product-stat-label">Ventas cerradas</div>
                <div className="adm-product-stat-value">
                  0 <BoxMiniIcon />
                </div>
              </div>
              <div className="adm-product-stat-right">
                <div className="adm-product-stat-label">Ingresos generados</div>
                <div className="adm-product-stat-value">$ 0</div>
              </div>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}

function BoxMiniIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      width="14"
      height="14"
    >
      <path d="M12 2 4 6v12l8 4 8-4V6l-8-4Z" />
      <path d="M4 6l8 4 8-4M12 22V10" />
    </svg>
  );
}

function ProductIcon({ category }: { category: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6 };
  switch (category) {
    case "coaching":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 2 3 7v6c0 5 4 8 9 9 5-1 9-4 9-9V7l-9-5Z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "marca":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "llc":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <rect x="3" y="9" width="18" height="12" rx="2" />
          <path d="M8 9V5a4 4 0 0 1 8 0v4" />
        </svg>
      );
    case "impulso":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M13 3 4 14h7l-1 7 9-11h-7l1-7Z" />
        </svg>
      );
    case "ia":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 2 4 6v12l8 4 8-4V6l-8-4Z" />
        </svg>
      );
  }
}
