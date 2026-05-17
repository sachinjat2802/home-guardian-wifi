"use client";
import { useState, useEffect } from "react";
import { Wifi, User, Cat, Dog, Fan, ShieldAlert, AlertTriangle, HelpCircle, Activity, Skull } from "lucide-react";

export default function RadarMap({ telemetry, analysis, selectedEntityId, onSelectEntity }) {
  const isMotion = telemetry?.motion;
  const entities = analysis?.entities || [];
  const security = analysis?.security || {};

  // Helper to choose the right icon
  const getIcon = (type, name = "") => {
    const lowerName = name.toLowerCase();
    if (type === "person") return <User size={13} />;
    if (lowerName.includes("cat")) return <Cat size={13} />;
    if (lowerName.includes("dog")) return <Dog size={13} />;
    if (lowerName.includes("ghost")) return <Skull size={13} className="animate-pulse text-red-300" />;
    if (type === "anomalous" || lowerName.includes("intruder")) {
      return <ShieldAlert size={13} className="animate-pulse" />;
    }
    if (type === "appliance") return <Fan size={13} className="animate-spin-slow" />;
    return <Activity size={13} />;
  };

  // Helper to choose the color class
  const getColorClass = (entity) => {
    const isSelected = entity.id === selectedEntityId;
    let base = "";
    
    if (entity.status === "critical") {
      base = "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.85)] border-red-400";
    } else if (entity.status === "sleeping") {
      base = "bg-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.85)] border-purple-400";
    } else if (entity.type === "anomalous") {
      base = "bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.85)] border-red-500 animate-pulse";
    } else {
      switch (entity.type) {
        case "person":
          base = "bg-[var(--accent)] shadow-[0_0_15px_var(--accent-glow)] border-cyan-400";
          break;
        case "pet":
        case "dog":
        case "cat":
        case "cow":
        case "buffalo":
        case "reptile":
          base = "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.85)] border-emerald-400";
          break;
        case "appliance":
          base = "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.85)] border-amber-400";
          break;
        default:
          base = "bg-gray-500 shadow-[0_0_15px_rgba(107,114,128,0.85)] border-gray-400";
      }
    }

    return `${base} border ${isSelected ? "ring-4 ring-cyan-400 scale-110 z-30" : "hover:scale-110"}`;
  };

  return (
    <section className="glass p-5 flex-grow flex flex-col min-h-[400px]">
      <style jsx global>{`
        @keyframes radar-sweep {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .radar-sweep-line {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(from 0deg, rgba(6, 182, 212, 0.12) 0deg, rgba(6, 182, 212, 0.04) 30deg, transparent 90deg);
          border-radius: 50%;
          transform-origin: center center;
          animation: radar-sweep 5s linear infinite;
          pointer-events: none;
          z-index: 1;
        }
      `}</style>

      <div className="flex justify-between items-center mb-4 z-10 relative">
        <div>
          <h3 className="text-base font-semibold text-gray-100">Live Spatial Scan Map</h3>
          <p className="text-[10px] text-[var(--text-muted)] font-mono">Simulated CSI stoer-wagner coordinate mapping</p>
        </div>
        <div className="flex gap-2.5 bg-black/40 px-3 py-1 rounded-full text-[9px] sm:text-[10px] border border-[var(--border-glass)] flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--success)] shadow-[0_0_6px_var(--success-glow)]" /> Router</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_6px_var(--accent-glow)]" /> Person</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" /> Animal</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.5)]" /> Sleeping</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)] animate-pulse" /> Threat / Intruder</span>
        </div>
      </div>

      <div className={`relative flex-1 bg-[#03060d] rounded-xl overflow-hidden border ${isMotion ? "border-[var(--warning)]/50" : "border-[var(--border-glass)]"} shadow-[inset_0_0_60px_rgba(0,0,0,0.95)] min-h-[300px]`} style={{ transition: "border-color 0.3s" }}>
        {/* Polar degree grids and sweep rings */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
          {/* Radial Lines */}
          <div className="absolute top-1/2 left-0 right-0 h-[0.5px] border-t border-cyan-500/10" />
          <div className="absolute left-1/2 top-0 bottom-0 w-[0.5px] border-l border-cyan-500/10" />
          <div className="absolute top-1/2 left-1/2 w-[200%] h-[1px] border-t border-cyan-500/5 -translate-x-1/2 -translate-y-1/2 rotate-30" />
          <div className="absolute top-1/2 left-1/2 w-[200%] h-[1px] border-t border-cyan-500/5 -translate-x-1/2 -translate-y-1/2 rotate-60" />
          <div className="absolute top-1/2 left-1/2 w-[200%] h-[1px] border-t border-cyan-500/5 -translate-x-1/2 -translate-y-1/2 rotate-120" />
          <div className="absolute top-1/2 left-1/2 w-[200%] h-[1px] border-t border-cyan-500/5 -translate-x-1/2 -translate-y-1/2 rotate-150" />

          {/* Polar sweeping distance rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-500/15 w-[20%] h-[20%] flex items-start justify-center pt-0.5">
            <span className="text-[8px] font-mono text-cyan-500/40">1.0m</span>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-500/10 w-[50%] h-[50%] flex items-start justify-center pt-0.5">
            <span className="text-[8px] font-mono text-cyan-500/40">2.5m</span>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-500/5 w-[80%] h-[80%] flex items-start justify-center pt-0.5">
            <span className="text-[8px] font-mono text-cyan-500/40">4.0m</span>
          </div>
        </div>

        {/* Dynamic high tech radar sweeping laser line */}
        <div className="radar-sweep-line" />

        {/* grid overlay */}
        <div className="grid-overlay opacity-30" />

        {/* WiFi Router Center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[5] flex items-center justify-center">
          <div className="radar-wave" style={{ animationDelay: "0s" }} />
          <div className="radar-wave" style={{ animationDelay: "1.5s" }} />
          <div className="radar-wave" style={{ animationDelay: "3s" }} />
          <Wifi size={24} className="text-[var(--success)] relative z-10 drop-shadow-[0_0_12px_var(--success-glow)]" />
        </div>

        {/* Signal strength boundary ring */}
        {telemetry && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[var(--success)]/15 pointer-events-none z-[2] animate-pulse"
            style={{ width: `${Math.min(90, telemetry.signal * 1.1)}%`, height: `${Math.min(90, telemetry.signal * 1.1)}%`, transition: "width 0.5s, height 0.5s" }} />
        )}

        {/* Detected Targets */}
        {entities.map((e) => {
          const isSelected = e.id === selectedEntityId;
          return (
            <div 
              key={e.id} 
              onClick={() => onSelectEntity(e.id)}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer group" 
              style={{ left: `${e.x}%`, top: `${e.y}%`, transition: "left 1.2s cubic-bezier(0.25, 0.8, 0.25, 1), top 1.2s cubic-bezier(0.25, 0.8, 0.25, 1)" }}
            >
              {/* Highlight flashing selection ring */}
              {isSelected && (
                <div className="absolute -inset-2.5 rounded-full border border-cyan-400/50 animate-ping z-0 pointer-events-none" />
              )}

              {/* Pulsing radar blip background */}
              <div className={`blip ${
                e.status === 'critical' || e.type === 'anomalous' ? 'bg-red-500' : 
                e.status === 'sleeping' ? 'bg-purple-500' : 
                e.type === 'pet' ? 'bg-emerald-500' : 'bg-[var(--accent)]'
              }`} />
              
              <div className={`relative text-white p-1.5 rounded-full w-8 h-8 flex items-center justify-center z-[2] transition-all duration-300 ${getColorClass(e)}`}>
                {getIcon(e.type, e.name)}
              </div>

              {/* High-tech lock target tag HUD */}
              <div className={`absolute left-9 top-1/2 -translate-y-1/2 bg-black/90 px-3 py-1.5 rounded-md text-[10px] whitespace-nowrap transition-all duration-300 border border-[var(--border-glass)] shadow-2xl z-30 ${
                isSelected ? "opacity-100 scale-100 visible" : "opacity-0 scale-90 invisible group-hover:opacity-100 group-hover:scale-100 group-hover:visible"
              }`}>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      e.status === 'critical' ? 'bg-red-500 animate-pulse' :
                      e.status === 'sleeping' ? 'bg-purple-400 animate-pulse' : 'bg-emerald-400'
                    }`} />
                    <span className="font-semibold text-gray-200">{e.name}</span>
                  </div>
                  {e.type !== 'appliance' && e.vitals.heartRate > 0 && (
                    <span className="text-[9px] text-cyan-400 font-mono">
                      {e.vitals.heartRate} BPM | {e.vitals.breathingRate} RPM
                    </span>
                  )}
                  {e.type === 'appliance' && (
                    <span className="text-[9px] text-amber-400 font-mono">{e.vitals.breathingRate} Hz (Vib)</span>
                  )}
                  {e.biometrics?.ageEst && (
                    <span className="text-[8px] text-gray-400 font-mono">Class: {e.biometrics.classification}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Warning Indicator overlays */}
        {isMotion && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-[var(--warning)]/20 px-3 py-1.5 rounded-full text-[10px] sm:text-xs text-[var(--warning)] font-semibold border border-[var(--warning)]/30 z-10 animate-pulse">
            <AlertTriangle size={14} /> DYNAMIC SPATIAL ANOMALY DETECTED
          </div>
        )}
        
        {security.armed && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-red-950/40 border border-red-500/30 text-red-400 px-3 py-1 rounded text-[9px] font-mono tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Armed Perimeter Watch
          </div>
        )}

        <div className="absolute bottom-3 right-3 text-[9px] text-[var(--success)]/40 uppercase tracking-widest font-bold font-mono z-[3]">
          Scanning field: 56 subcarriers
        </div>
      </div>
    </section>
  );
}
