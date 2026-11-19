import { AdminPortada } from "@/components/admin/portada";
import { TableroNumeros } from "@/components/admin/tablero-numeros";

/**
 * Portada de la Torre: el saludo, los accesos y el Tablero de números. Las
 * tarjetas viejas (solo tienda) se quitaron en nov 2026: todo el dinero se ve
 * en el Tablero.
 */
export function DashboardView() {
  return (
    <div className="adm-page">
      <AdminPortada>
        <TableroNumeros />
      </AdminPortada>
    </div>
  );
}
