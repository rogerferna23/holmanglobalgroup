import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Acceso · Panel HGG",
  description: "Acceso al panel de administracion de Holman Global Group.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-brand-mark">H</span>
          <span className="login-brand-name">
            HGG <span>Admin</span>
          </span>
        </div>
        <h1 className="login-title">Bienvenido de vuelta</h1>
        <p className="login-sub">
          Ingresa tus credenciales para acceder al panel.
        </p>
        <Suspense fallback={<div className="login-form" />}>
          <LoginForm />
        </Suspense>
        <p className="login-foot">
          Acceso restringido. Si no eres parte del equipo, vuelve al{" "}
          <a href="/">sitio principal</a>.
        </p>
      </div>
    </div>
  );
}
