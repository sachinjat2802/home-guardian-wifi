"use client";
import { useEffect, useRef } from "react";

export default function SpectrumView({ analysis, theme }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!analysis?.spectrum || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    ctx.clearRect(0, 0, W, H);
    const spectrum = analysis.spectrum;
    const n = spectrum.length;
    if (n === 0) return;

    // Read colors dynamically from active CSS theme variables
    const bodyStyle = getComputedStyle(document.body);
    const accentColor = bodyStyle.getPropertyValue("--accent").trim() || "#0ea5e9";
    const dangerColor = bodyStyle.getPropertyValue("--danger").trim() || "#ef4444";
    const purpleColor = bodyStyle.getPropertyValue("--purple").trim() || "#a855f7";

    const maxAmp = Math.max(...spectrum.map(s => s.amplitude), 1);
    const barW = W / n;

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

      // Top glow for dynamic
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

    // Labels
    ctx.fillStyle = "rgba(148,163,184,0.6)";
    ctx.font = "10px Inter, sans-serif";
    ctx.fillText("Subcarrier Index →", W - 120, H - 5);
    ctx.fillText("Amplitude ↑", 5, 15);
  }, [analysis?.spectrum, theme]);

  const cls = analysis?.classification || {};

  return (
    <div className="glass p-6 flex-1 flex flex-col">
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
      <div className="flex-1 min-h-[300px] bg-[#050811] rounded-xl border border-[var(--border-glass)] overflow-hidden relative">
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />
        <div className="scan-line-anim z-10" />
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
