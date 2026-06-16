import { useEffect, useRef } from "react";

const CONFIG = {
  layers: [
    { count: 40, minR: 0.6, maxR: 1.8, minA: 0.08, maxA: 0.23, speed: 0.04, color: "201,168,76" },
    { count: 25, minR: 1.2, maxR: 3.2, minA: 0.06, maxA: 0.16, speed: 0.10, color: "201,168,76" },
    { count: 12, minR: 2.0, maxR: 5.5, minA: 0.04, maxA: 0.11, speed: 0.20, color: "201,168,76" },
  ],
  drift: 0.12,
  mouseLerp: 0.05,
  pulseSpeed: 0.008,
};

interface Particle {
  x: number;
  y: number;
  r: number;
  a: number;
  speed: number;
  phase: number;
  pulseSpeed: number;
  color: string;
}

export default function ParallaxBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let mx = 0;
    let my = 0;
    let tmx = 0;
    let tmy = 0;

    const particles: (Particle & { layerSpeed: number })[] = [];

    const buildParticles = (w: number, h: number) => {
      particles.length = 0;
      CONFIG.layers.forEach((layer) => {
        for (let i = 0; i < layer.count; i++) {
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: layer.minR + Math.random() * (layer.maxR - layer.minR),
            a: layer.minA + Math.random() * (layer.maxA - layer.minA),
            speed: CONFIG.drift,
            layerSpeed: layer.speed,
            phase: Math.random() * Math.PI * 2,
            pulseSpeed: CONFIG.pulseSpeed + Math.random() * CONFIG.pulseSpeed,
            color: layer.color,
          });
        }
      });
    }

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      mx = canvas.width / 2;
      my = canvas.height / 2;
      tmx = mx;
      tmy = my;
      buildParticles(canvas.width, canvas.height);
    }

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      tmx = (e.clientX - rect.left) * (canvas.width / rect.width);
      tmy = (e.clientY - rect.top) * (canvas.height / rect.height);
    }

    const onMouseLeave = () => {
      tmx = canvas.width / 2;
      tmy = canvas.height / 2;
    }

    let t = 0;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;

      mx += (tmx - mx) * CONFIG.mouseLerp;
      my += (tmy - my) * CONFIG.mouseLerp;
      t += 0.016;

      ctx.clearRect(0, 0, W, H);

      particles.forEach((p) => {
        p.y -= p.speed;
        if (p.y < -p.r * 2) {
          p.y = H + p.r * 2;
          p.x = Math.random() * W;
        }

        const ox = (mx - cx) * p.layerSpeed;
        const oy = (my - cy) * p.layerSpeed;
        const pulse = 0.6 + Math.sin(t * p.pulseSpeed * 60 + p.phase) * 0.4;

        ctx.beginPath();
        ctx.arc(p.x + ox, p.y + oy, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.a * pulse})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener("mousemove", onMouseMove);
      parent.addEventListener("mouseleave", onMouseLeave);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      if (parent) {
        parent.removeEventListener("mousemove", onMouseMove);
        parent.removeEventListener("mouseleave", onMouseLeave);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="parallax-bg"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}
