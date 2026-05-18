import { useEffect } from "react";
import { VendedoresView } from "@/components/admin/vendedores-view";

export default function Vendedores() {
  useEffect(() => {
    document.title = "Vendedores · HGG Admin";
  }, []);
  return <VendedoresView />;
}