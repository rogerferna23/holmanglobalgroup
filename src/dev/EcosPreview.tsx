import { Link, Route, Routes } from "react-router-dom";
import { ClubContext } from "@/contexts/ClubContext";
import { ClubMockContext } from "@/lib/club-store";
import { AdminEcosMockContext } from "@/lib/ecos-admin-store";
import ClubLayout from "@/club/ClubLayout";
import Inicio from "@/club/pages/Inicio";
import Clases from "@/club/pages/Clases";
import Grabaciones from "@/club/pages/Grabaciones";
import Cursos from "@/club/pages/Cursos";
import Comunidad from "@/club/pages/Comunidad";
import Referidos from "@/club/pages/Referidos";
import Cuenta from "@/club/pages/Cuenta";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";
import { EcosAdminView } from "@/components/admin/ecos";
import { ADMIN_MOCK, CLUB_CTX, CLUB_MOCK } from "./ecos-preview-data";

/**
 * Vista previa de desarrollo: las pantallas REALES del club y de la sección
 * ECOS del admin, alimentadas con datos de ejemplo. Solo se monta con
 * `import.meta.env.DEV`; el build de producción no la incluye.
 *
 *   /ecos/preview          → panel del miembro (Holman, fundador, 3 meses)
 *   /ecos/preview/admin    → sección ECOS del panel de administración
 */
export default function EcosPreview() {
  return (
    <>
      <div className="dev-preview-bar" role="status">
        Vista previa con datos de ejemplo ·{" "}
        <Link to="/ecos/preview">Panel del miembro</Link> ·{" "}
        <Link to="/ecos/preview/admin">Admin · ECOS</Link>
      </div>
      <Routes>
        <Route
          path="admin"
          element={
            <AdminEcosMockContext.Provider value={ADMIN_MOCK}>
              <div className="adm-shell">
                <AdminSidebar />
                <div className="adm-main">
                  <AdminTopbar />
                  <div className="adm-content">
                    <EcosAdminView />
                  </div>
                </div>
              </div>
            </AdminEcosMockContext.Provider>
          }
        />
        <Route
          element={
            <ClubMockContext.Provider value={CLUB_MOCK}>
              <ClubContext.Provider value={CLUB_CTX}>
                <ClubLayout base="/ecos/preview" />
              </ClubContext.Provider>
            </ClubMockContext.Provider>
          }
        >
          <Route index element={<Inicio />} />
          <Route path="clases" element={<Clases />} />
          <Route path="grabaciones" element={<Grabaciones />} />
          <Route path="cursos" element={<Cursos />} />
          <Route path="comunidad" element={<Comunidad />} />
          <Route path="referidos" element={<Referidos />} />
          <Route path="cuenta" element={<Cuenta />} />
        </Route>
      </Routes>
    </>
  );
}
