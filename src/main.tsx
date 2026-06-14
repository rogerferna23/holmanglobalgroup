import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/questrial/400.css";
import "@fontsource/josefin-sans/300.css";
import "@fontsource/josefin-sans/400.css";
import "@fontsource/josefin-sans/500.css";
import "@fontsource/josefin-sans/600.css";
import "./styles/main.css";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { initConsent } from "./lib/analytics";
import { CurrencyProvider } from "./contexts/CurrencyContext";

// Consent Mode v2: fija los defaults (denied) y carga GTM si el usuario ya aceptó.
initConsent();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CurrencyProvider>
          <App />
        </CurrencyProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
