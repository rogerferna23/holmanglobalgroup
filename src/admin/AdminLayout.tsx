import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default function AdminLayout() {
  useEffect(() => {
    document.title = "Panel · HGG Admin";
  }, []);

  return (
    <div className="adm-shell">
      <AdminSidebar />
      <div className="adm-main">
        <AdminTopbar />
        <div className="adm-content">
          <AdminTabs />
          <Outlet />
        </div>
      </div>
    </div>
  );
}
