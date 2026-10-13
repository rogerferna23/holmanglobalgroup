import { useEffect } from "react";
import { CorreosView } from "@/components/admin/correos-view";

export default function Correos() {
  useEffect(() => {
    document.title = "Correos · HGG Admin";
  }, []);
  return <CorreosView />;
}
