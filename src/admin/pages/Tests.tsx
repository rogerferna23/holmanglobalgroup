import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ADMIN } from "@/lib/routes";

/**
 * «Test» del panel: elige cuál de los dos tests de coach abrir. Cada test se
 * abre a pantalla completa (fuera del panel) para compartirlo en Zoom.
 */
const TESTS = [
  {
    href: ADMIN.testAutodescubrimiento,
    nombre: "Test de autodescubrimiento",
    desc: "Rueda de la Vida y las cinco heridas. Informe de tres hojas.",
    duracion: "30–40 min",
  },
  {
    href: ADMIN.testDinero,
    nombre: "Test del patrón del dinero",
    desc: "Tu raíz, tu patrón y tu mentalidad con el dinero. Informe de cuatro hojas.",
    duracion: "30–35 min",
  },
] as const;

export default function Tests() {
  useEffect(() => {
    document.title = "Tests · HGG Admin";
  }, []);

  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <h1>Tests</h1>
        <p>Herramientas para aplicar en sesión. Al final descargas el informe en PDF para regalarlo.</p>
      </header>
      <div className="adm-tests">
        {TESTS.map((t) => (
          <Link key={t.href} to={t.href} className="adm-card adm-test-card">
            <span className="adm-test-dur">{t.duracion}</span>
            <h2>{t.nombre}</h2>
            <p>{t.desc}</p>
            <span className="adm-test-cta">Abrir test →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
