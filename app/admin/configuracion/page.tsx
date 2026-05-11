import type { Metadata } from "next";
import { ConfiguracionView } from "@/components/admin/configuracion-view";

export const metadata: Metadata = { title: "Configuración" };

export default function ConfiguracionPage() {
  return <ConfiguracionView />;
}
