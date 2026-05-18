import { useEffect } from "react";
import { ReportesView } from "@/components/admin/reportes-view";

export default function Reportes() {
  useEffect(() => {
    document.title = "Reportes · HGG Admin";
  }, []);
  return <ReportesView />;
}