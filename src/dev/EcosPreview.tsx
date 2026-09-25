import { Link, Route, Routes } from "react-router-dom";
import { ClubContext } from "@/contexts/ClubContext";
import { ClubMockContext } from "@/lib/club-store";
import { AdminEcosMockContext } from "@/lib/ecos-admin-store";
import ClubLayout from "@/club/ClubLayout";
import Inicio from "@/club/pages/Inicio";
import Clases from "@/club/pages/Clases";
import MisClases from "@/club/pages/MisClases";
import Grabaciones from "@/club/pages/Grabaciones";
import Cursos from "@/club/pages/Cursos";
import Comunidad from "@/club/pages/Comunidad";
import Referidos from "@/club/pages/Referidos";
import Cuenta from "@/club/pages/Cuenta";
import { MembresiaInactiva } from "@/club/MembresiaInactiva";
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
 *   /ecos/preview/activar  → lo que ve quien creó su cuenta y no ha activado
 *   /ecos/preview/prueba   → el panel de quien está en su mes gratis (con el aviso)
 *   /ecos/preview/bloqueado → el panel con candados de quien no tiene acceso
 */
// El mismo miembro de ejemplo, pero registrado y sin activar, en su mes gratis.
const CLUB_PRUEBA = CLUB_CTX.member
  ? { ...CLUB_CTX, member: { ...CLUB_CTX.member, status: "pendiente" as const, founder: true, teacher: false, cortesia: false } }
  : CLUB_CTX;

// Registrado después del mes gratis, sin activar: todo con candado.
const CLUB_BLOQUEADO = CLUB_CTX.member
  ? { ...CLUB_CTX, member: { ...CLUB_CTX.member, status: "pendiente" as const, founder: false, teacher: false, cortesia: false } }
  : CLUB_CTX;

export default function EcosPreview() {
  return (
    <>
      <div className="dev-preview-bar" role="status">
        Vista previa con datos de ejemplo ·{" "}
        <Link to="/ecos/preview">Panel del miembro</Link> ·{" "}
        <Link to="/ecos/preview/admin">Admin · ECOS</Link> ·{" "}
        <Link to="/ecos/preview/activar">Sin activar</Link> ·{" "}
        <Link to="/ecos/preview/prueba">Mes gratis</Link> ·{" "}
        <Link to="/ecos/preview/bloqueado">Con candados</Link>
      </div>
      <Routes>
        <Route
          path="activar"
          element={
            <ClubContext.Provider value={CLUB_CTX}>
              <MembresiaInactiva member={null} />
            </ClubContext.Provider>
          }
        />
        <Route
          path="bloqueado/*"
          element={
            <ClubMockContext.Provider value={CLUB_MOCK}>
              <ClubContext.Provider value={CLUB_BLOQUEADO}>
                <ClubLayout base="/ecos/preview/bloqueado" />
              </ClubContext.Provider>
            </ClubMockContext.Provider>
          }
        >
          <Route path="*" element={null} />
        </Route>
        <Route
          path="prueba"
          element={
            <ClubMockContext.Provider value={CLUB_MOCK}>
              <ClubContext.Provider value={CLUB_PRUEBA}>
                <ClubLayout base="/ecos/preview" />
              </ClubContext.Provider>
            </ClubMockContext.Provider>
          }
        >
          <Route index element={<Inicio />} />
        </Route>
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
          <Route path="mis-clases" element={<MisClases />} />
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
