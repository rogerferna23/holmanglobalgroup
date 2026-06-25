import { useEffect, useRef } from "react";

// Notas musicales flotando como fondo del sitio. Port fiel del HTML que envió
// Holman (notas_azul_gris.html): mismos símbolos, color azul-gris #8899AA,
// tamaños, velocidades, wobble y lógica de fundido (entrada abajo, salida al
// pasar la mitad hacia arriba). Adaptado a un canvas fijo a pantalla completa,
// detrás del contenido (z-index -1). Respeta prefers-reduced-motion.
const NOTES = ["♩", "♪", "♫", "♬"];
const COLOR = "136,153,170"; // #8899AA en RGB

type Note = {
  x: number;
  y: number;
  size: number;
  speed: number;
  a: number;
  targetA: number;
  wobble: number;
  wobblePhase: number;
  sym: string;
  life: number;
  maxLife: number;
};

export function MusicalNotes() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let raf = 0;
    let t = 0;
    let notes: Note[] = [];

    const mkNote = (): Note => ({
      x: Math.random() * W,
      y: H + 20 + Math.random() * 80,
      size: 12 + Math.random() * 20,
      speed: 0.2 + Math.random() * 0.45,
      a: 0,
      targetA: 0.2 + Math.random() * 0.3,
      wobble: (0.5 - Math.random()) * 0.5,
      wobblePhase: Math.random() * Math.PI * 2,
      sym: NOTES[Math.floor(Math.random() * NOTES.length)],
      life: 0,
      maxLife: 320 + Math.random() * 200,
    });

    const seed = () => {
      // Densidad proporcional al área para conservar el look del original
      // (22 notas en una caja pequeña) a pantalla completa, sin recargar.
      const count = Math.max(16, Math.min(40, Math.round((W * H) / 52000)));
      notes = Array.from({ length: count }, () => {
        const n = mkNote();
        n.y = Math.random() * H;
        n.life = Math.random() * n.maxLife;
        n.a = n.targetA;
        return n;
      });
    };

    const resize = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
      if (!notes.length) seed();
    };

    const drawFrame = () => {
      t += 0.016;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < notes.length; i++) {
        const n = notes[i];
        n.life++;
        if (n.life > n.maxLife) {
          notes[i] = mkNote();
          continue;
        }
        // Fundido de entrada rápido abajo; de salida largo desde la mitad arriba.
        const fadeIn = n.life < 50 ? n.life / 50 : 1;
        const fadeOut = n.y < H * 0.5 ? Math.max(0, n.y / (H * 0.5)) : 1;
        n.a = n.targetA * fadeIn * fadeOut;
        n.y -= n.speed;
        const wx = Math.sin(t * 1.2 + n.wobblePhase) * n.wobble;
        ctx.globalAlpha = n.a;
        ctx.font = `${n.size}px serif`;
        ctx.fillStyle = `rgb(${COLOR})`;
        ctx.fillText(n.sym, n.x + wx, n.y);
      }
      ctx.globalAlpha = 1;
    };

    const loop = () => {
      drawFrame();
      raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const reduce =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      drawFrame(); // un fotograma estático, sin animación
    } else {
      loop();
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="musical-notes" aria-hidden="true" />;
}
