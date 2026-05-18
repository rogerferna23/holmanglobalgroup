import { useEffect } from "react";
import { ConfiguracionView } from "@/components/admin/configuracion-view";

export default function Configuracion() {
  useEffect(() => {
    document.title = "Configuracion · HGG Admin";
  }, []);
  return <ConfiguracionView />;
}