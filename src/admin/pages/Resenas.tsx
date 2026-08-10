import { useEffect } from "react";
import { ResenasView } from "@/components/admin/resenas-view";

export default function Resenas() {
  useEffect(() => {
    document.title = "Reseñas · HGG Admin";
  }, []);
  return <ResenasView />;
}
