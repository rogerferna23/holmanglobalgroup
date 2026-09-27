import { Link, useLocation } from "react-router-dom";
import { ADMIN } from "@/lib/routes";
import { useRequests } from "@/lib/admin-store";

/**
 * Pestañas de los grupos del admin. El menú lateral se simplificó a siete
 * secciones (sep 2026) sin borrar ninguna página: cada una conserva su ruta
 * y aquí se agrupan. Cambiar un grupo es tocar solo esta lista (y el `also`
 * del ítem en sidebar.tsx).
 */
type Tab = { href: string; label: string; pendientes?: boolean };

const GRUPOS: Tab[][] = [
  [
    { href: ADMIN.home, label: "Resumen" },
    { href: ADMIN.transacciones, label: "Transacciones" },
    { href: ADMIN.reportes, label: "Reportes" },
  ],
  [
    { href: ADMIN.productos, label: "Productos" },
    { href: ADMIN.vendedores, label: "Vendedores" },
    { href: ADMIN.solicitudes, label: "Solicitudes", pendientes: true },
  ],
  [
    { href: ADMIN.configuracion, label: "Ajustes" },
    { href: ADMIN.auditoria, label: "Auditoría" },
  ],
];

export function AdminTabs() {
  const { pathname } = useLocation();
  const grupo = GRUPOS.find((g) => g.some((t) => t.href === pathname));
  if (!grupo) return null;
  return <Pestanas grupo={grupo} actual={pathname} />;
}

function Pestanas({ grupo, actual }: { grupo: Tab[]; actual: string }) {
  const conPendientes = grupo.some((t) => t.pendientes);
  return (
    <nav className="adm-tabs" aria-label="Secciones">
      {grupo.map((t) => (
        <Link key={t.href} to={t.href} className={`adm-tab${t.href === actual ? " active" : ""}`}>
          {t.label}
          {t.pendientes && conPendientes && <Pendientes />}
        </Link>
      ))}
    </nav>
  );
}

/** Numerito de solicitudes por aprobar. Solo se consulta en el grupo Tienda. */
function Pendientes() {
  const { data } = useRequests();
  const n = data.filter((r) => r.status === "pendiente").length;
  return n > 0 ? <span className="adm-tab-badge">{n}</span> : null;
}
