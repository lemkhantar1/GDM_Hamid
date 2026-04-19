import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * Quiet, monochrome backdrop — deep black, paper grain, a single drifting pale glow.
 * No saturated color; serious and restrained.
 */
export function VFXBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const motes = Array.from({ length: 28 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 0.4 + Math.random() * 1.2,
      dx: (Math.random() - 0.5) * 0.08,
      dy: (Math.random() - 0.5) * 0.08,
      phase: Math.random() * Math.PI * 2,
    }));

    function resize() {
      canvas!.width = window.innerWidth * DPR;
      canvas!.height = window.innerHeight * DPR;
      canvas!.style.width = window.innerWidth + "px";
      canvas!.style.height = window.innerHeight + "px";
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.scale(DPR, DPR);
    }
    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    function tick() {
      t += 0.012;
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of motes) {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > window.innerWidth) p.dx *= -1;
        if (p.y < 0 || p.y > window.innerHeight) p.dy *= -1;
        const twinkle = 0.4 + 0.35 * Math.sin(t + p.phase);
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(244,241,232,${twinkle * 0.35})`;
        ctx!.shadowColor = `rgba(244,241,232,${twinkle * 0.6})`;
        ctx!.shadowBlur = 10;
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      raf = requestAnimationFrame(tick);
    }
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Base — near-black */}
      <div className="absolute inset-0" style={{ background: "#0a0a0c" }} />

      {/* One pale, slow-drifting glow — very subtle */}
      <motion.div
        className="absolute w-[50rem] h-[50rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(217,201,143,0.07), transparent 65%)" }}
        animate={{ x: [0, 80, -40, 0], y: [0, 40, -50, 0] }}
        transition={{ repeat: Infinity, duration: 40, ease: "easeInOut" }}
      />

      {/* Faint grid — editorial rule, not tech grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(244,241,232,0.6) 1px, transparent 1px)",
          backgroundSize: "1px 96px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />

      {/* Paper grain (SVG fractal) */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.05] mix-blend-overlay" xmlns="http://www.w3.org/2000/svg">
        <filter id="paper">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0.96  0 0 0 0 0.94  0 0 0 0 0.9  0 0 0 1 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#paper)" />
      </svg>

      {/* Motes */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.75) 100%)",
        }}
      />
    </div>
  );
}
