import { useParams } from "react-router-dom";
import { Seo } from "@/components/seo";
import { PROGRAMAS, TiendaPrograma as Vista } from "@/components/tienda-vistas";
import { SITE } from "@/lib/config";

/** /tienda/:programa — un programa por página (dic 2026). */
export default function TiendaPrograma() {
  const { programa = "" } = useParams();
  const prog = PROGRAMAS.find((p) => p.slug === programa);
  return (
    <>
      {prog && (
        <Seo
          title={`${prog.nombre} — Tienda | Holman Global Group`}
          description={prog.promesa}
          image={`${SITE.url}${prog.img}`}
        />
      )}
      <Vista slug={programa} />
    </>
  );
}
