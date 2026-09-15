import { useEffect } from "react";
import { EcosAdminView } from "@/components/admin/ecos";

export default function Ecos() {
  useEffect(() => {
    document.title = "ECOS · HGG Admin";
  }, []);
  return <EcosAdminView />;
}
