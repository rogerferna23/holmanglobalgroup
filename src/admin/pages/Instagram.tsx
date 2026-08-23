import { useEffect } from "react";
import { InstagramView } from "@/components/admin/instagram-view";

export default function Instagram() {
  useEffect(() => {
    document.title = "Instagram · HGG Admin";
  }, []);
  return <InstagramView />;
}
