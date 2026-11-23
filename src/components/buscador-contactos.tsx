/**
 * Barra para encontrar a alguien rápido en una lista de contactos (Torre →
 * Prospección y ECOS → Mis contactos). Mientras hay texto, la búsqueda mira
 * toda la lista, sin importar los filtros marcados.
 */
export function BuscadorContactos({ valor, cambiar, placeholder, resultados }: {
  valor: string;
  cambiar: (v: string) => void;
  placeholder: string;
  /** Cuántos encontró; solo se muestra mientras hay búsqueda. */
  resultados: number;
}) {
  const buscando = valor.trim() !== "";
  return (
    <div className="bct">
      <div className={`bct-campo${buscando ? " is-on" : ""}`}>
        <svg className="bct-lupa" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M20 20l-4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={valor}
          placeholder={placeholder}
          aria-label="Buscar contacto"
          onChange={(e) => cambiar(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") cambiar(""); }}
        />
        {buscando && (
          <button type="button" className="bct-borrar" onClick={() => cambiar("")} aria-label="Borrar búsqueda">×</button>
        )}
      </div>
      {buscando && (
        <p className="bct-nota">
          {resultados === 0 ? "Nadie con ese nombre." : `${resultados} ${resultados === 1 ? "contacto" : "contactos"}`} · buscando en toda tu lista
        </p>
      )}
    </div>
  );
}
