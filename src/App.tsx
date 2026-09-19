import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import SiteLayout from "@/components/SiteLayout";
import { ADMIN, CLUB } from "@/lib/routes";

// Páginas públicas (cargadas al inicio)
import Home from "@/pages/Home";
import Historia from "@/pages/Historia";
import Experiencias from "@/pages/Experiencias";
import Tienda from "@/pages/Tienda";
import Blog from "@/pages/Blog";
import Privacidad from "@/pages/policies/Privacidad";
import Cookies from "@/pages/policies/Cookies";
import Descargos from "@/pages/policies/Descargos";
import Terminos from "@/pages/policies/Terminos";
import Trabaja from "@/pages/policies/Trabaja";
import Copyright from "@/pages/policies/Copyright";
import Reembolsos from "@/pages/policies/Reembolsos";
import Ecos from "@/pages/Ecos";

// ECOS Business Club — zona de miembros (lazy: no pesa en el sitio público)
const EcosEntrar = lazy(() => import("@/pages/EcosEntrar"));
const EcosClave = lazy(() => import("@/pages/EcosClave"));
const ClubRoute = lazy(() => import("@/components/ClubRoute"));
const ClubLayout = lazy(() => import("@/club/ClubLayout"));
const ClubInicio = lazy(() => import("@/club/pages/Inicio"));
const ClubClases = lazy(() => import("@/club/pages/Clases"));
const ClubMisClases = lazy(() => import("@/club/pages/MisClases"));
const ClubGrabaciones = lazy(() => import("@/club/pages/Grabaciones"));
const ClubCursos = lazy(() => import("@/club/pages/Cursos"));
const ClubComunidad = lazy(() => import("@/club/pages/Comunidad"));
const EcosInvitado = lazy(() => import("@/pages/EcosInvitado"));
const ClubReferidos = lazy(() => import("@/club/pages/Referidos"));
const ClubCuenta = lazy(() => import("@/club/pages/Cuenta"));

// Solo en desarrollo: el panel y el admin de ECOS con datos de ejemplo.
// En producción `import.meta.env.DEV` es false y el chunk no se genera.
const EcosPreview = import.meta.env.DEV ? lazy(() => import("@/dev/EcosPreview")) : null;

// Páginas admin (lazy-loaded — el bundle del admin no se carga si no entras)
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const AdminLayout = lazy(() => import("@/admin/AdminLayout"));
const Dashboard = lazy(() => import("@/admin/pages/Dashboard"));
const Transacciones = lazy(() => import("@/admin/pages/Transacciones"));
const Productos = lazy(() => import("@/admin/pages/Productos"));
const Vendedores = lazy(() => import("@/admin/pages/Vendedores"));
const Reportes = lazy(() => import("@/admin/pages/Reportes"));
const Solicitudes = lazy(() => import("@/admin/pages/Solicitudes"));
const Auditoria = lazy(() => import("@/admin/pages/Auditoria"));
const Resenas = lazy(() => import("@/admin/pages/Resenas"));
const Instagram = lazy(() => import("@/admin/pages/Instagram"));
const Configuracion = lazy(() => import("@/admin/pages/Configuracion"));
const AdminEcos = lazy(() => import("@/admin/pages/Ecos"));
const ProtectedRoute = lazy(() => import("@/components/ProtectedRoute"));

function LoadingFallback() {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        color: "var(--gold)",
        fontSize: 14,
        letterSpacing: "0.1em",
      }}
    >
      Cargando…
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Sitio público */}
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/historia" element={<Historia />} />
          <Route path="/experiencias" element={<Experiencias />} />
          <Route path="/tienda" element={<Tienda />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="/descargos" element={<Descargos />} />
          <Route path="/terminos" element={<Terminos />} />
          <Route path="/trabaja" element={<Trabaja />} />
          <Route path="/copyright" element={<Copyright />} />
          <Route path="/reembolsos" element={<Reembolsos />} />
          <Route path={CLUB.landing} element={<Ecos />} />
        </Route>

        {/*
          ECOS — mundo aparte del admin: otra puerta, otro aspecto, otra guarda.
          ClubRoute exige membresía ACTIVA (la escribe el webhook de Stripe).
        */}
        <Route path={CLUB.entrar} element={<EcosEntrar />} />
        <Route path={CLUB.clave} element={<EcosClave />} />
        <Route path="/ecos/invitado" element={<EcosInvitado />} />
        {EcosPreview && <Route path="/ecos/preview/*" element={<EcosPreview />} />}
        <Route
          path={CLUB.panel}
          element={
            <ClubRoute>
              <ClubLayout />
            </ClubRoute>
          }
        >
          <Route index element={<ClubInicio />} />
          <Route path="clases" element={<ClubClases />} />
          <Route path="mis-clases" element={<ClubMisClases />} />
          <Route path="grabaciones" element={<ClubGrabaciones />} />
          <Route path="cursos" element={<ClubCursos />} />
          <Route path="comunidad" element={<ClubComunidad />} />
          <Route path="referidos" element={<ClubReferidos />} />
          <Route path="cuenta" element={<ClubCuenta />} />
        </Route>

        {/*
          Las reseñas ya no se envían desde el sitio público (brief "Badges y
          descripciones", ago 2026): las sube Holman una por una desde
          /admin/resenas, que va detrás del login.
        */}

        {/*
          Administración — solo Roger y Holman. Vive en una ruta propia (ver
          src/lib/routes.ts) sin enlace en el sitio; /login y /admin ya no existen.
        */}
        <Route path={ADMIN.login} element={<AdminLogin />} />
        <Route
          path={ADMIN.base}
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="transacciones" element={<Transacciones />} />
          <Route path="productos" element={<Productos />} />
          <Route path="vendedores" element={<Vendedores />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="solicitudes" element={<Solicitudes />} />
          <Route path="resenas" element={<Resenas />} />
          <Route path="instagram" element={<Instagram />} />
          <Route path="auditoria" element={<Auditoria />} />
          <Route path="configuracion" element={<Configuracion />} />
          <Route path="ecos" element={<AdminEcos />} />
        </Route>

        <Route
          path="*"
          element={
            <div style={{ padding: "120px 24px", textAlign: "center" }}>
              <h1 style={{ color: "var(--gold)" }}>404</h1>
              <p style={{ color: "var(--muted)" }}>Página no encontrada</p>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
}
