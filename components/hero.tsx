"use client";

import { useEffect, useRef, useState } from "react";
import { WHATSAPP_URL } from "@/lib/config";
import { ArrowRightIcon } from "./icons";
import { Reveal } from "./reveal";

function useCounter(target: number, suffix = "+", duration = 1600) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [text, setText] = useState("0");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setText(target >= 100 ? `${target}${suffix}` : `${target}`);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          const v = Math.round(target * eased);
          setText(target >= 100 ? `${v}${suffix}` : `${v}`);
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.unobserve(el);
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, suffix, duration]);

  return [ref, text] as const;
}

export function Hero() {
  const glowRef = useRef<HTMLDivElement | null>(null);
  const sparkRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        if (y < 1200) {
          if (glowRef.current) {
            glowRef.current.style.transform = `translateX(-50%) translateY(${y * 0.25}px)`;
          }
          if (sparkRef.current) {
            sparkRef.current.style.transform = `translateY(${y * 0.18}px)`;
          }
        }
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [marcasRef, marcasText] = useCounter(120);
  const [pilaresRef, pilaresText] = useCounter(3);

  return (
    <header className="hero">
      <div ref={glowRef} className="hero-glow" aria-hidden="true" />
      <div className="hero-vignette" aria-hidden="true" />

      <div ref={sparkRef} className="hero-spark" aria-hidden="true">
        <svg viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="80" stroke="#F0B800" strokeOpacity="0.15" strokeWidth="0.5" />
          <circle cx="100" cy="100" r="60" stroke="#F0B800" strokeOpacity="0.25" strokeWidth="0.5" />
          <circle cx="100" cy="100" r="40" stroke="#F0B800" strokeOpacity="0.4" strokeWidth="0.6" />
          <path
            d="M100 60 C108 80 118 88 110 110 C105 124 90 124 88 110 C86 96 96 92 100 80 Z"
            fill="#F0B800"
            fillOpacity="0.35"
          />
          <path
            d="M100 70 C105 84 110 90 105 105 C102 113 95 113 94 105 C93 97 98 95 100 88 Z"
            fill="#F0B800"
            fillOpacity="0.7"
          />
        </svg>
      </div>

      <div className="shell hero-content">
        <Reveal className="hero-eyebrow">
          <span className="heart" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21s-7.5-4.6-9.6-9.1C1 8.5 3.4 5 6.8 5c2 0 3.5 1 5.2 3 1.7-2 3.2-3 5.2-3 3.4 0 5.8 3.5 4.4 6.9C19.5 16.4 12 21 12 21z" />
            </svg>
          </span>
          <span className="eyebrow">Corazón de Elefante · Est. 2024</span>
        </Reveal>

        <Reveal as="h1" className="display hero-title">
          Propósito.
          <br />
          <span className="gold">Marca.</span>
          <br />
          <span className="thin">Sistema.</span>
        </Reveal>

        <Reveal as="p" className="hero-sub">
          Ayudamos a las personas a descubrir su propósito, construir una marca alineada con
          ello y crear un sistema digital para vivir de lo que aman.
        </Reveal>

        <Reveal className="hero-actions">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Agenda tu sesión estratégica
            <ArrowRightIcon className="arrow" />
          </a>
          <a href="#proceso" className="btn btn-ghost">
            Cómo lo hacemos
          </a>
        </Reveal>

        <Reveal className="hero-stats">
          <div className="hero-stat">
            <div ref={marcasRef} className="num">
              {marcasText}
            </div>
            <div className="lbl">Marcas creadas con alma</div>
          </div>
          <div className="hero-stat">
            <div ref={pilaresRef} className="num">
              {pilaresText}
            </div>
            <div className="lbl">Pilares — Claridad · Marca · Sistema</div>
          </div>
          <div className="hero-stat">
            <div className="num">∞</div>
            <div className="lbl">Posibilidades cuando hay propósito</div>
          </div>
        </Reveal>
      </div>

      <div className="scroll-cue" aria-hidden="true">
        <span>Scroll</span>
        <div className="line" />
      </div>
    </header>
  );
}
