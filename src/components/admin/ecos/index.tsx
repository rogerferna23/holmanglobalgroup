import { useState } from "react";
import { EcosMiembros } from "./miembros";
import { EcosReparto } from "./reparto";
import { EcosClases } from "./clases";
import { EcosBiblioteca } from "./biblioteca";
import { EcosAjustes } from "./ajustes";
import { EcosRetos } from "./retos";
import { EcosReportes } from "./reportes";
import { EcosProfesores } from "./profesores";
import { EcosComisiones } from "./comisiones";

const TABS = [
  { id: "miembros", label: "Miembros" },
  { id: "reparto", label: "Reparto" },
  { id: "clases", label: "Clases" },
  { id: "profesores", label: "Profesores" },
  { id: "biblioteca", label: "Biblioteca" },
  { id: "retos", label: "Retos y XP" },
  { id: "comisiones", label: "Comisiones" },
  { id: "reportes", label: "Reportes" },
  { id: "ajustes", label: "Ajustes" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function EcosAdminView() {
  const [tab, setTab] = useState<Tab>("miembros");

  return (
    <div className="adm-page">
      <header className="adm-page-head adm-page-head-row">
        <div>
          <h1>ECOS Business Club</h1>
          <p>Miembros, reparto, calendario, profesores, biblioteca, retos y XP, comisiones, reportes y ajustes del club.</p>
        </div>
      </header>

      <div className="adm-ecos-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`adm-ecos-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "miembros" && <EcosMiembros />}
      {tab === "reparto" && <EcosReparto />}
      {tab === "clases" && <EcosClases />}
      {tab === "profesores" && <EcosProfesores />}
      {tab === "biblioteca" && <EcosBiblioteca />}
      {tab === "retos" && <EcosRetos />}
      {tab === "comisiones" && <EcosComisiones />}
      {tab === "reportes" && <EcosReportes />}
      {tab === "ajustes" && <EcosAjustes />}
    </div>
  );
}
