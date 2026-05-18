import { useEffect } from "react";
import { SolicitudesView } from "@/components/admin/solicitudes-view";

export default function Solicitudes() {
  useEffect(() => {
    document.title = "Solicitudes · HGG Admin";
  }, []);
  return <SolicitudesView />;
}