type Props = {
  title: string;
  description: string;
  status?: "ready" | "soon" | "new";
};

export function AdminPlaceholder({ title, description, status }: Props) {
  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <div className="adm-card adm-empty-card">
        <div className="adm-empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v6M12 16h.01" />
          </svg>
        </div>
        <h2 className="adm-empty-title">
          {status === "soon"
            ? "Próximamente"
            : status === "new"
            ? "Recién lanzado"
            : "En construcción"}
        </h2>
        <p className="adm-empty-desc">
          Esta sección aún no está activa. Estamos trabajando para tenerla
          disponible muy pronto.
        </p>
      </div>
    </div>
  );
}
