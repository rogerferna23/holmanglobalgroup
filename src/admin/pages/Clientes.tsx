import { useEffect } from "react";
import { ClientesView } from "@/components/admin/clientes-view";

export default function Clientes() {
  useEffect(() => {
    document.title = "Clientes · HGG Admin";
  }, []);
  return <ClientesView />;
}
