import type { Metadata } from "next";
import { SolicitudesView } from "@/components/admin/solicitudes-view";

export const metadata: Metadata = { title: "Solicitudes" };

export default function SolicitudesPage() {
  return <SolicitudesView />;
}
