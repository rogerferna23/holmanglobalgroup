import { useEffect } from "react";
import { TransaccionesView } from "@/components/admin/transacciones-view";

export default function Transacciones() {
  useEffect(() => {
    document.title = "Transacciones · HGG Admin";
  }, []);
  return <TransaccionesView />;
}