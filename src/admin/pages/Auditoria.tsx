import { useEffect } from "react";
import { AuditoriaView } from "@/components/admin/auditoria-view";

export default function Auditoria() {
  useEffect(() => {
    document.title = "Auditoria · HGG Admin";
  }, []);
  return <AuditoriaView />;
}