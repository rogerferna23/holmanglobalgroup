import { useEffect, useState } from "react";
import { WHATSAPP_URL } from "@/lib/config";
import { WhatsAppIcon } from "./icons";

export function Fab() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow((window.scrollY || 0) > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <a
      id="fab"
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`fab${show ? " show" : ""}`}
      aria-label="Hablar con Sofía por WhatsApp"
    >
      <WhatsAppIcon className="wa-icon" />
      <span className="label-long">Hablar con Sofía</span>
    </a>
  );
}
