"use client";
import { useEffect, useRef } from "react";

export default function SpatialBackground({ theme = "classic" }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, rx: 0, ry: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Dynamic color selection based on active theme
    const getThemeColors = () => {
      switch (theme) {
        case "space":
          return { primary: "rgba(99, 102, 241, 0.25)", secondary: "rgba(192, 132, 252, 0.1)" };
        case "cyberpunk":
          return { primary: "rgba(236, 72, 153, 0.25)", secondary: "rgba(6, 182, 212, 0.15)" };
        case "aurora":
          return { primary: "rgba(16, 185, 129, 0.25)", secondary: "rgba(45, 212, 191, 0.15)" };
        case "polar":
          return { primary: "rgba(59, 130, 246, 0.18)", secondary: "rgba(124, 58, 237, 0.08)" };
        default: // classic
          return { primary: "rgba(59, 130, 246, 0.25)", secondary: "rgba(6, 182, 212, 0.15)" };
      }
    };

    // 3D Grid Wave Settings
    const gridRows = 35;
    const gridCols = 45;
    const particles = [];

    // Initialize particles
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        particles.push({
          r,
          c,
          xRatio: c / (gridCols - 1) - 0.5,
          zRatio: r / (gridRows - 1) - 0.5,
        });
      }
    }

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const colors = getThemeColors();

      // Smooth mouse follow interpolation
      const mouse = mouseRef.current;
      mouse.rx += (mouse.x - mouse.rx) * 0.05;
      mouse.ry += (mouse.y - mouse.ry) * 0.05;

      time += 0.008;

      // First pass: calculate coordinates
      particles.forEach((p) => {
        const distanceToMouse = Math.hypot(
          p.xRatio * width + width / 2 - mouse.rx,
          p.zRatio * height + height / 2 - mouse.ry
        );
        const hoverWave = Math.exp(-distanceToMouse / 280) * 45;

        const waveHeight =
          Math.sin(p.xRatio * 7 + time * 2) * 12 +
          Math.cos(p.zRatio * 5 + time * 1.5) * 8 +
          Math.sin((p.xRatio + p.zRatio) * 4 + time * 3) * 6 +
          hoverWave;

        const pitch = 0.55; 
        const yaw = 0.2; 

        const rx = p.xRatio * width * Math.cos(yaw) - p.zRatio * height * Math.sin(yaw);
        const rz = p.xRatio * width * Math.sin(yaw) + p.zRatio * height * Math.cos(yaw);

        const scaleFactor = 380 / (380 + rz); 
        p.px = rx * scaleFactor + width / 2;
        p.py = (waveHeight - rz * pitch) * scaleFactor + height * 0.6;
        p.scaleFactor = scaleFactor;
        p.waveHeight = waveHeight;
      });

      // Second pass: Draw wireframe lines between adjacent nodes to form real 3D mesh waves
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = 0.38;
      
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          const idx = r * gridCols + c;
          const p1 = particles[idx];

          if (p1.px >= 0 && p1.px <= width && p1.py >= 0 && p1.py <= height) {
            // Draw horizontal connector
            if (c < gridCols - 1) {
              const p2 = particles[idx + 1];
              if (p2.px >= 0 && p2.px <= width && p2.py >= 0 && p2.py <= height) {
                ctx.beginPath();
                ctx.moveTo(p1.px, p1.py);
                ctx.lineTo(p2.px, p2.py);
                ctx.stroke();
              }
            }
            // Draw vertical connector
            if (r < gridRows - 1) {
              const p2 = particles[idx + gridCols];
              if (p2.px >= 0 && p2.px <= width && p2.py >= 0 && p2.py <= height) {
                ctx.beginPath();
                ctx.moveTo(p1.px, p1.py);
                ctx.lineTo(p2.px, p2.py);
                ctx.stroke();
              }
            }
          }
        }
      }

      // Third pass: Draw particle nodes
      particles.forEach((p) => {
        if (p.px >= 0 && p.px <= width && p.py >= 0 && p.py <= height) {
          ctx.beginPath();
          const dotRadius = (1.2 + (1 - p.scaleFactor) * 2.2) * Math.max(0.2, (p.waveHeight + 26) / 50);
          ctx.arc(p.px, p.py, Math.max(0.5, dotRadius), 0, Math.PI * 2);
          ctx.fillStyle = colors.primary;
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-85 transition-opacity duration-1000"
    />
  );
}
