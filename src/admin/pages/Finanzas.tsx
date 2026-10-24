import { useEffect } from "react";
import { FinanzasView } from "@/components/admin/finanzas-view";

export default function Finanzas() {
  useEffect(() => {
    document.title = "Finanzas · HGG Admin";
  }, []);
  return <FinanzasView />;
}
