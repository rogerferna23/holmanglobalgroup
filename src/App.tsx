import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import SiteLayout from "@/components/SiteLayout";

// Páginas públicas (cargadas al inicio)
import Home from "@/pages/Home";
import Historia from "@/pages/Historia";
import Tienda from "@/pages/Tienda";

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
const Configuracion = lazy(() => import("@/admin/pages/Configuracion"));
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
          <Route path="/tienda" element={<Tienda />} />
        </Route>

        {/* Login */}
        <Route path="/login" element={<AdminLogin />} />

        {/* Admin protegido */}
        <Route
          path="/admin"
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
          <Route path="auditoria" element={<Auditoria />} />
          <Route path="configuracion" element={<Configuracion />} />
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
