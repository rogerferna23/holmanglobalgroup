import { useEffect } from "react";
import { AgendaView } from "@/components/admin/agenda-view";

export default function Agenda() {
  useEffect(() => {
    document.title = "Agenda · HGG Admin";
  }, []);
  return <AgendaView />;
}
