import type { Metadata } from "next";
import { VendedoresView } from "@/components/admin/vendedores-view";

export const metadata: Metadata = { title: "Vendedores" };

export default function VendedoresPage() {
  return <VendedoresView />;
}
