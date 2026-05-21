"use client";
import { useEffect, useRef, useState } from "react";

export default function SpectrumView({ analysis, theme }) {
  const canvasRef = useRef(null);
  const heatmapRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: -(y / (rect.height / 2)) * 5, // max 5 degrees pitch
      y: (x / (rect.width / 2)) * 5   // max 5 degrees roll
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  useEffect(() => {
    if (!analysis?.spectrum) return;
    const spectrum = analysis.spectrum;
    const n = spectrum.length;
    if (n === 0) return;

    // Read colors dynamically
    const bodyStyle = getComputedStyle(document.body);
    const accentColor = bodyStyle.getPropertyValue("--accent").trim() || "#0ea5e9";
    const dangerColor = bodyStyle.getPropertyValue("--danger").trim() || "#ef4444";
    const purpleColor = bodyStyle.getPropertyValue("--purple").trim() || "#a855f7";

    const maxAmp = Math.max(...spectrum.map(s => s.amplitude), 1);

    // --- 1. Draw Amplitude Bars ---
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      const W = rect.width, H = rect.height;
      const barW = W / n;

      ctx.clearRect(0, 0, W, H);

      // Background grid
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 0.5;
      for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Amplitude bars
      for (let i = 0; i < n; i++) {
        const s = spectrum[i];
        const h = (s.amplitude / maxAmp) * (H - 40);
        const variance = s.variance || 0;
        const isDynamic = variance > 0.15;
        const isNull = s.amplitude < 2;

        const grad = ctx.createLinearGradient(0, H - h, 0, H);
        if (isNull) { 
          grad.addColorStop(0, dangerColor + "66"); 
          grad.addColorStop(1, dangerColor + "1a"); 
        }
        else if (isDynamic) { 
          grad.addColorStop(0, accentColor + "cc"); 
          grad.addColorStop(1, accentColor + "33"); 
        }
        else { 
          grad.addColorStop(0, "rgba(148,163,184,0.3)"); 
          grad.addColorStop(1, "rgba(148,163,184,0.06)"); 
        }

        ctx.fillStyle = grad;
        ctx.fillRect(i * barW + 1, H - h, barW - 2, h);

        if (isDynamic) {
          ctx.fillStyle = accentColor;
          ctx.fillRect(i * barW + 1, H - h, barW - 2, 2);
        }
      }

      // Phase line overlay
      ctx.beginPath();
      ctx.strokeStyle = purpleColor + "99";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < n; i++) {
        const x = i * barW + barW / 2;
        const y = H / 2 + (spectrum[i].phase || 0) / Math.PI * (H * 0.3);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = "rgba(148,163,184,0.6)";
      ctx.font = "10px Inter, sans-serif";
      ctx.fillText("Subcarrier Index →", W - 120, H - 5);
      ctx.fillText("Amplitude ↑", 5, 15);
    }

    // --- 2. Draw Waterfall Heatmap ---
    if (heatmapRef.current) {
      const heatCanvas = heatmapRef.current;
      const heatCtx = heatCanvas.getContext("2d", { willReadFrequently: true });
      const w = heatCanvas.width;
      const h = heatCanvas.height;
      const heatBarW = w / n;
      
      // Shift down existing pixels by 2 rows
      const imgData = heatCtx.getImageData(0, 0, w, h - 2);
      heatCtx.putImageData(imgData, 0, 2);
      
      // Draw new top row
      heatCtx.clearRect(0, 0, w, 2);
      for (let i = 0; i < n; i++) {
        const s = spectrum[i];
        const isDynamic = (s.variance || 0) > 0.15;
        const isNull = s.amplitude < 2;
        
        let fill = "#1e293b"; // idle
        if (isNull) fill = dangerColor;
        else if (isDynamic) fill = accentColor;
        else fill = `rgba(148, 163, 184, ${(s.amplitude / maxAmp) * 0.5})`;
        
        heatCtx.fillStyle = fill;
        heatCtx.fillRect(i * heatBarW, 0, heatBarW, 2);
      }
    }
  }, [analysis?.spectrum, theme]);

  const cls = analysis?.classification || {};

  return (
    <div 
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(${isHovered ? 15 : 0}px)`,
        boxShadow: isHovered ? "0 25px 60px -15px rgba(0,0,0,0.65), 0 0 35px -5px var(--accent-glow)" : "",
        transition: "transform 0.15s ease-out, box-shadow 0.3s ease",
        transformStyle: "preserve-3d"
      }}
      className="glass p-6 flex-1 flex flex-col"
    >
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">CSI Spectrum Analyzer</h3>
          <p className="text-xs text-[var(--text-muted)]">Real-time subcarrier amplitude & phase from WiFi Channel State Information</p>
        </div>
        <div className="flex flex-wrap gap-2.5 text-xs md:justify-end">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--accent)]" /> Dynamic</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500" /> Static</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--danger)]" /> Null</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--purple)]" /> Phase</span>
        </div>
      </div>
      
      <div className="flex flex-col flex-1 gap-3">
        {/* Main Amplitude Graph */}
        <div className="flex-1 min-h-[220px] bg-[#050811] rounded-xl border border-[var(--border-glass)] overflow-hidden relative shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
          <canvas ref={canvasRef} className="w-full h-full block" />
          <div className="scan-line-anim z-10" />
        </div>
        
        {/* Waterfall Heatmap */}
        <div className="h-28 bg-[#050811] rounded-xl border border-[var(--border-glass)] overflow-hidden relative shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
          <div className="absolute top-1.5 left-2 text-[9px] text-[var(--text-muted)] z-10 font-mono tracking-widest bg-black/50 px-1.5 rounded">WATERFALL HISTORY</div>
          <canvas ref={heatmapRef} className="w-full h-full block" width={1000} height={112} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <MiniStat label="Dynamic Subs" value={cls.dynamic || 0} color="var(--accent)" />
        <MiniStat label="Static (Walls)" value={cls.walls || 0} color="rgba(148,163,184,0.6)" />
        <MiniStat label="Strong Reflectors" value={cls.reflectors || 0} color="var(--warning)" />
        <MiniStat label="Null Zones" value={cls.nulls || 0} color="var(--danger)" />
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="glass p-3 rounded-lg text-center">
      <p className="text-2xl font-bold font-mono" style={{ color }}>{value}</p>
      <p className="text-[10px] text-[var(--text-muted)] mt-1">{label}</p>
    </div>
  );
}
