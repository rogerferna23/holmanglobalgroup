import type { Metadata } from "next";
import { TransaccionesView } from "@/components/admin/transacciones-view";

export const metadata: Metadata = { title: "Transacciones" };

export default function TransaccionesPage() {
  return <TransaccionesView />;
}
