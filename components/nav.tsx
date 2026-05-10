"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { WHATSAPP_URL } from "@/lib/config";
import { WhatsAppIcon } from "./icons";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/#proceso", label: "Proceso" },
  { href: "/historia", label: "Historia" },
  { href: "/#corazon", label: "Corazón" },
  { href: "/#servicios", label: "Servicios" },
  { href: "/tienda", label: "Tienda" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled((window.scrollY || 0) > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav id="nav" className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="shell nav-row">
        <a href="/" className="logo" aria-label="Holman Global Group LLC">
          <Image
            src="/logo-h.png"
            alt=""
            width={42}
            height={42}
            priority
            className="logo-mark"
          />
          <span className="logo-text">
            <span className="logo-name">Holman Global Group LLC</span>
            <span className="logo-tag">Eco, Fuego y Huella</span>
          </span>
        </a>
        <div className="nav-links">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </div>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="nav-cta"
        >
          <WhatsAppIcon width={14} height={14} />
          WhatsApp
        </a>
      </div>
    </nav>
  );
}
