import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ClubContext } from "@/contexts/ClubContext";
import { ClubMockContext } from "@/lib/club-store";
import { AdminEcosMockContext } from "@/lib/ecos-admin-store";
import ClubLayout from "@/club/ClubLayout";
import Inicio from "@/club/pages/Inicio";
import Clases from "@/club/pages/Clases";
import MisClases from "@/club/pages/MisClases";
import Grabaciones from "@/club/pages/Grabaciones";
import Material from "@/club/pages/Material";
import MaterialPromo from "@/club/pages/MaterialPromo";
import Cursos from "@/club/pages/Cursos";
import Comunidad from "@/club/pages/Comunidad";
import Referidos from "@/club/pages/Referidos";
import Recomendar from "@/club/pages/Recomendar";
import Catalogo from "@/club/pages/Catalogo";
import Cuenta from "@/club/pages/Cuenta";
import { MembresiaInactiva } from "@/club/MembresiaInactiva";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";
import { EcosAdminView } from "@/components/admin/ecos";
import { ADMIN_MOCK, CLUB_CTX, CLUB_MOCK, PROCESO_MOCK, PROCESO_VACIO } from "./ecos-preview-data";
import { ProcesoMockContext } from "@/lib/proceso";
import Proceso from "@/club/pages/Proceso";
import { ClientesView } from "@/components/admin/clientes-view";

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
 *   /ecos/preview/proceso   → «Mi proceso» de un cliente de Sentido
 *   /ecos/preview/sin-proceso/proceso → «Mi proceso» con candado (miembro sin programa)
 *   /ecos/preview/clientes  → Torre → Clientes
 */
// El mismo miembro de ejemplo, pero registrado y sin activar, en su mes gratis.
const CLUB_PRUEBA = CLUB_CTX.member
  ? { ...CLUB_CTX, member: { ...CLUB_CTX.member, status: "pendiente" as const, founder: true, teacher: false, cortesia: false } }
  : CLUB_CTX;

// Prueba de 14 días (sin cupo de fundador o pasado octubre): le quedan 9.
const CLUB_PRUEBA_14 = CLUB_CTX.member
  ? { ...CLUB_CTX, member: { ...CLUB_CTX.member, status: "pendiente" as const, founder: false, teacher: false, cortesia: false, prueba_hasta: new Date(Date.now() + 9 * 86400000).toISOString() } }
  : CLUB_CTX;

// Su prueba ya terminó y no activó: todo con candado.
const CLUB_BLOQUEADO = CLUB_CTX.member
  ? { ...CLUB_CTX, member: { ...CLUB_CTX.member, status: "pendiente" as const, founder: false, teacher: false, cortesia: false, prueba_hasta: "2026-09-20T12:00:00Z" } }
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
        <Link to="/ecos/preview/prueba-14">Prueba 14 días</Link> ·{" "}
        <Link to="/ecos/preview/bloqueado">Con candados</Link> ·{" "}
        <Link to="/ecos/preview/proceso">Mi proceso</Link> ·{" "}
        <Link to="/ecos/preview/sin-proceso/proceso">Mi proceso (candado)</Link> ·{" "}
        <Link to="/ecos/preview/clientes">Admin · Clientes</Link>
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
          path="prueba-14"
          element={
            <ClubMockContext.Provider value={CLUB_MOCK}>
              <ClubContext.Provider value={CLUB_PRUEBA_14}>
                <ClubLayout base="/ecos/preview" />
              </ClubContext.Provider>
            </ClubMockContext.Provider>
          }
        >
          <Route index element={<Inicio />} />
        </Route>
        <Route
          path="clientes"
          element={
            <ProcesoMockContext.Provider value={PROCESO_MOCK}>
              <div className="adm-shell">
                <AdminSidebar />
                <div className="adm-main">
                  <AdminTopbar />
                  <div className="adm-content">
                    <ClientesView />
                  </div>
                </div>
              </div>
            </ProcesoMockContext.Provider>
          }
        />
        <Route
          path="sin-proceso"
          element={
            <ProcesoMockContext.Provider value={PROCESO_VACIO}>
              <ClubMockContext.Provider value={CLUB_MOCK}>
                <ClubContext.Provider value={CLUB_CTX}>
                  <ClubLayout base="/ecos/preview/sin-proceso" />
                </ClubContext.Provider>
              </ClubMockContext.Provider>
            </ProcesoMockContext.Provider>
          }
        >
          <Route path="proceso" element={<Proceso />} />
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
            <ProcesoMockContext.Provider value={PROCESO_MOCK}>
              <ClubMockContext.Provider value={CLUB_MOCK}>
                <ClubContext.Provider value={CLUB_CTX}>
                  <ClubLayout base="/ecos/preview" />
                </ClubContext.Provider>
              </ClubMockContext.Provider>
            </ProcesoMockContext.Provider>
          }
        >
          <Route path="proceso" element={<Proceso />} />
          <Route index element={<Inicio />} />
          <Route path="clases" element={<Clases />} />
          <Route path="mis-clases" element={<MisClases />} />
          <Route path="grabaciones" element={<Grabaciones />} />
          <Route path="material" element={<Material />} />
          <Route path="cursos" element={<Cursos />} />
          <Route path="comunidad" element={<Comunidad />} />
          <Route path="negocio" element={<Referidos />} />
          <Route path="negocio/empieza" element={<Navigate to="../recomendar" relative="path" replace />} />
          <Route path="negocio/recomendar" element={<Recomendar />} />
          <Route path="negocio/material" element={<MaterialPromo />} />
          <Route path="negocio/material/catalogo" element={<Catalogo />} />
          <Route path="cuenta" element={<Cuenta />} />
        </Route>
      </Routes>
    </>
  );
}
