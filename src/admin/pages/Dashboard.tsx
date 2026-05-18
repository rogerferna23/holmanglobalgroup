import { useEffect } from "react";
import { DashboardView } from "@/components/admin/dashboard-view";

export default function Dashboard() {
  useEffect(() => {
    document.title = "Dashboard · HGG Admin";
  }, []);
  return <DashboardView />;
}