import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/questrial/400.css";
import "@fontsource/josefin-sans/300.css";
import "@fontsource/josefin-sans/400.css";
import "@fontsource/josefin-sans/500.css";
import "@fontsource/josefin-sans/600.css";
// Los contextos se importan por el alias "@/", igual que en los componentes:
// mezclar ruta relativa y alias hace que Vite cree dos módulos distintos del
// mismo archivo, y entonces el proveedor y quien lo consume no se encuentran.
import "./styles/main.css";
// Hojas por zona, para que varias manos no se pisen dentro de main.css.
import "./styles/ecos-landing.css";
import "./styles/ecos-comisiones.css";
import App from "@/App";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClubProvider } from "@/contexts/ClubContext";
import { initConsent } from "@/lib/analytics";
import { CurrencyProvider } from "@/contexts/CurrencyContext";

// Consent Mode v2: fija los defaults (denied) y carga GTM si el usuario ya aceptó.
initConsent();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ClubProvider>
          <CurrencyProvider>
            <App />
          </CurrencyProvider>
        </ClubProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
