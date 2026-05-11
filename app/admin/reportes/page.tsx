import type { Metadata } from "next";
import { ReportesView } from "@/components/admin/reportes-view";

export const metadata: Metadata = { title: "Reportes" };

export default function ReportesPage() {
  return <ReportesView />;
}
