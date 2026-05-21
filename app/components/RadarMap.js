"use client";
import { useState, useEffect } from "react";
import { Wifi, User, Cat, Dog, Fan, ShieldAlert, AlertTriangle, HelpCircle, Activity, Skull } from "lucide-react";

export default function RadarMap({ telemetry, analysis, selectedEntityId, onSelectEntity, occupants, onRegisterEntity }) {
  const isMotion = telemetry?.motion;
  const entities = analysis?.entities || [];
  const security = analysis?.security || {};
  const [trails, setTrails] = useState({});
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleRadarMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: -(y / (rect.height / 2)) * 6, // max 6 degrees pitch
      y: (x / (rect.width / 2)) * 6   // max 6 degrees roll
    });
  };

  const handleRadarMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const handleRadarMouseEnter = () => {
    setIsHovered(true);
  };
  useEffect(() => {
    if (!entities || entities.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrails(prev => {
      const newTrails = { ...prev };
      entities.forEach(e => {
        if (!newTrails[e.id]) newTrails[e.id] = [];
        const lastPos = newTrails[e.id][newTrails[e.id].length - 1];
        if (!lastPos || Math.abs(lastPos.x - e.x) > 0.5 || Math.abs(lastPos.y - e.y) > 0.5) {
          newTrails[e.id] = [...newTrails[e.id], { x: e.x, y: e.y, time: telemetry?.timestamp || 0 }];
          if (newTrails[e.id].length > 20) newTrails[e.id] = newTrails[e.id].slice(1);
        }
      });
      Object.keys(newTrails).forEach(id => {
        if (!entities.find(e => e.id === id)) delete newTrails[id];
      });
      return newTrails;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities]);

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
          base = "bg-[var(--accent)] shadow-[0_0_15px_var(--accent-glow)] border-[var(--accent)]/50";
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

    return `${base} border ${isSelected ? "ring-4 ring-[var(--accent)] scale-110 z-30" : "hover:scale-110"}`;
  };

  return (
    <section 
      onMouseMove={handleRadarMouseMove}
      onMouseEnter={handleRadarMouseEnter}
      onMouseLeave={handleRadarMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(${isHovered ? 15 : 0}px)`,
        boxShadow: isHovered ? "0 25px 60px -15px rgba(0,0,0,0.65), 0 0 35px -5px var(--accent-glow)" : "",
        transition: "transform 0.15s ease-out, box-shadow 0.3s ease",
        transformStyle: "preserve-3d"
      }}
      className="glass p-5 flex-grow flex flex-col min-h-[400px]"
    >
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
          background: conic-gradient(from 0deg, var(--accent) 0deg, var(--accent-glow) 35deg, transparent 110deg);
          border-radius: 50%;
          transform-origin: center center;
          animation: radar-sweep 6s linear infinite;
          pointer-events: none;
          z-index: 1;
          opacity: 0.15;
        }
      `}</style>

      <div className="flex justify-between items-center mb-4 z-10 relative">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Live Spatial Scan Map</h3>
          <p className="text-[10px] text-[var(--text-muted)] font-mono">Simulated CSI stoer-wagner coordinate mapping</p>
        </div>
        <div className="flex gap-2.5 bg-[var(--bg-card)] px-3 py-1 rounded-full text-[9px] sm:text-[10px] border border-[var(--border-glass)] flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--success)] shadow-[0_0_6px_var(--success-glow)]" /> Router</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_6px_var(--accent-glow)]" /> Person</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" /> Animal</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.5)]" /> Sleeping</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--danger)] shadow-[0_0_6px_var(--danger-glow)] animate-pulse" /> Threat / Intruder</span>
        </div>
      </div>

      <div className={`relative flex-1 bg-[var(--bg-secondary)] rounded-xl overflow-hidden border ${isMotion ? "border-[var(--warning)]/50" : "border-[var(--border-glass)]"} shadow-[inset_0_0_60px_rgba(0,0,0,0.95)] min-h-[300px] layer-mid`} style={{ transition: "border-color 0.3s", transformStyle: "preserve-3d" }}>
        {/* Polar degree grids and sweep rings */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
          {/* Radial Lines */}
          <div className="absolute top-1/2 left-0 right-0 h-[0.5px] border-t border-[var(--border-glass)]" />
          <div className="absolute left-1/2 top-0 bottom-0 w-[0.5px] border-l border-[var(--border-glass)]" />
          <div className="absolute top-1/2 left-1/2 w-[200%] h-[1px] border-t border-[var(--border-glass)]/40 -translate-x-1/2 -translate-y-1/2 rotate-30" />
          <div className="absolute top-1/2 left-1/2 w-[200%] h-[1px] border-t border-[var(--border-glass)]/40 -translate-x-1/2 -translate-y-1/2 rotate-60" />
          <div className="absolute top-1/2 left-1/2 w-[200%] h-[1px] border-t border-[var(--border-glass)]/40 -translate-x-1/2 -translate-y-1/2 rotate-120" />
          <div className="absolute top-1/2 left-1/2 w-[200%] h-[1px] border-t border-[var(--border-glass)]/40 -translate-x-1/2 -translate-y-1/2 rotate-150" />

          {/* Polar sweeping distance rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--border-glass)] w-[20%] h-[20%] flex items-start justify-center pt-0.5">
            <span className="text-[8px] font-mono text-[var(--text-muted)]">1.0m</span>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--border-glass)] w-[50%] h-[50%] flex items-start justify-center pt-0.5">
            <span className="text-[8px] font-mono text-[var(--text-muted)]">2.5m</span>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--border-glass)] w-[80%] h-[80%] flex items-start justify-center pt-0.5">
            <span className="text-[8px] font-mono text-[var(--text-muted)]">4.0m</span>
          </div>
        </div>

        {/* Dynamic high tech radar sweeping laser line */}
        <div className="radar-sweep-line" />

        {/* grid overlay */}
        <div className="grid-overlay opacity-30" />

        {/* WiFi Router Center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[5] flex items-center justify-center">
          <div className="radar-wave" style={{ animationDelay: "0s", borderColor: "var(--border-glass)" }} />
          <div className="radar-wave" style={{ animationDelay: "1.5s", borderColor: "var(--border-glass)" }} />
          <div className="radar-wave" style={{ animationDelay: "3s", borderColor: "var(--border-glass)" }} />
          <Wifi size={24} className="text-[var(--success)] relative z-10 drop-shadow-[0_0_12px_var(--success-glow)]" />
        </div>

        {/* Signal strength boundary ring */}
        {telemetry && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[var(--success)]/15 pointer-events-none z-[2] animate-pulse"
            style={{ width: `${Math.min(90, telemetry.signal * 1.1)}%`, height: `${Math.min(90, telemetry.signal * 1.1)}%`, transition: "width 0.5s, height 0.5s" }} />
        )}

        {/* ─── Volumetric ESP32 Receiver Antennas ───────────────────────── */}
        {entities.some(e => e.trilat) && (
          <>
            {[
              { id: "AP-1", x: 10, y: 10, label: "ESP32-A (Master)" },
              { id: "AP-2", x: 90, y: 10, label: "ESP32-B (Node B)" },
              { id: "AP-3", x: 50, y: 90, label: "ESP32-C (Node C)" }
            ].map(ap => (
              <div 
                key={ap.id}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none select-none"
                style={{ left: `${ap.x}%`, top: `${ap.y}%` }}
              >
                <div className="w-5 h-5 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/40 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.15)] animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] shadow-[0_0_6px_var(--success-glow)]" />
                </div>
                <span className="text-[7px] font-mono text-[var(--success)] opacity-70 mt-1 tracking-wider bg-[var(--bg-secondary)]/80 px-1 rounded border border-[var(--border-glass)]">{ap.id}</span>
              </div>
            ))}
          </>
        )}

        {/* ─── Triangulation Circle & Line Overlay for Selected Target ─── */}
        {(() => {
          const selectedEntity = entities.find(e => e.id === selectedEntityId);
          if (!selectedEntity || !selectedEntity.trilat) return null;

          return (
            <>
              {/* Ground-truth baseline target blip */}
              <div 
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none border border-dashed border-red-500/40 rounded-full w-4 h-4 flex items-center justify-center"
                style={{ left: `${selectedEntity.trilat.x_ground}%`, top: `${selectedEntity.trilat.y_ground}%`, transition: "left 1.2s cubic-bezier(0.25, 0.8, 0.25, 1), top 1.2s cubic-bezier(0.25, 0.8, 0.25, 1)" }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500/40" />
                <span className="absolute -top-3 text-[6px] font-mono text-red-400 whitespace-nowrap opacity-65">Ground Truth</span>
              </div>

              {/* Dynamic triangulation vector lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {selectedEntity.trilat.distances.map((dist) => (
                  <line 
                    key={`line-${dist.id}`}
                    x1={`${dist.x}%`} 
                    y1={`${dist.y}%`} 
                    x2={`${selectedEntity.x}%`} 
                    y2={`${selectedEntity.y}%`} 
                    stroke="var(--accent)"
                    strokeWidth="0.75"
                    strokeDasharray="2 3"
                    className="opacity-40 animate-pulse"
                    style={{ transition: "all 1.2s cubic-bezier(0.25, 0.8, 0.25, 1)" }}
                  />
                ))}
              </svg>

              {/* Triangulation search circles */}
              {selectedEntity.trilat.distances.map((dist) => (
                <div 
                  key={`circle-${dist.id}`}
                  className="absolute z-[2] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[var(--accent)]/15 pointer-events-none"
                  style={{
                    left: `${dist.x}%`,
                    top: `${dist.y}%`,
                    width: `${dist.r * 2}%`,
                    height: `${dist.r * 2}%`,
                    transition: "width 0.5s, height 0.5s"
                  }}
                />
              ))}
            </>
          );
        })()}

        {/* Doppler Trajectory Trails */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-[15]">
          {Object.entries(trails).map(([id, path]) => {
            if (path.length < 2) return null;
            const points = path.map(p => `${p.x},${p.y}`).join(' ');
            return (
              <polyline 
                key={`trail-${id}`} 
                points={points} 
                fill="none" 
                stroke="var(--accent)" 
                strokeWidth="0.4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="opacity-40 drop-shadow-[0_0_2px_var(--accent-glow)]" 
                style={{ strokeDasharray: "1 2" }} 
              />
            );
          })}
        </svg>

      {/* Detected Targets */}
        {entities.map((e) => {
          const isSelected = e.id === selectedEntityId;
          const isRegistered = occupants?.some(occ => occ.id === e.id);
          
          return (
            <div 
              key={e.id} 
              onClick={() => onSelectEntity(e.id)}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer group layer-top" 
              style={{ left: `${e.x}%`, top: `${e.y}%`, transition: "left 1.2s cubic-bezier(0.25, 0.8, 0.25, 1), top 1.2s cubic-bezier(0.25, 0.8, 0.25, 1)" }}
            >
              {/* Highlight flashing selection ring */}
              {isSelected && (
                <div className="absolute -inset-2.5 rounded-full border border-[var(--accent)]/50 animate-ping z-0 pointer-events-none" />
              )}

              {/* Pulsing radar blip background */}
              <div className={`blip ${
                e.status === 'critical' || e.type === 'anomalous' ? 'bg-[var(--danger)]' : 
                e.status === 'sleeping' ? 'bg-[var(--purple)]' : 
                e.type === 'pet' ? 'bg-emerald-500' : 'bg-[var(--accent)]'
              }`} />
              
              {/* Micro-Motion Biometrics (Heartbeat Ripples) */}
              {(e.status === 'sleeping' || e.status === 'resting') && e.vitals?.heartRate > 0 && (
                <div 
                  className={`absolute inset-0 rounded-full border-[1.5px] animate-ping z-[1] pointer-events-none ${e.status === 'sleeping' ? 'border-[var(--purple)]' : 'border-[var(--accent)]'}`} 
                  style={{ animationDuration: `${60 / e.vitals.heartRate}s`, opacity: 0.6 }} 
                />
              )}

              <div className={`relative text-white p-1.5 rounded-full w-8 h-8 flex items-center justify-center z-[2] transition-all duration-300 ${getColorClass(e)}`}>
                {getIcon(e.type, e.name)}
              </div>

              {/* High-tech lock target tag HUD */}
              <div className={`absolute left-9 top-1/2 -translate-y-1/2 bg-[var(--bg-secondary)] px-3 py-2 rounded-md text-[10px] whitespace-nowrap transition-all duration-300 border border-[var(--border-glass)] shadow-2xl z-30 ${
                isSelected ? "opacity-100 scale-100 visible" : "opacity-0 scale-90 invisible group-hover:opacity-100 group-hover:scale-100 group-hover:visible"
              }`}>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      e.status === 'critical' ? 'bg-[var(--danger)] animate-pulse' :
                      e.status === 'sleeping' ? 'bg-[var(--purple)] animate-pulse' : 'bg-emerald-400'
                    }`} />
                    <span className="font-semibold text-[var(--text-primary)]">{e.name}</span>
                  </div>
                  {e.type !== 'appliance' && e.vitals.heartRate > 0 && (
                    <span className="text-[9px] text-[var(--cyan)] font-mono">
                      {e.vitals.heartRate} BPM | {e.vitals.breathingRate} RPM
                    </span>
                  )}
                  {e.type === 'appliance' && (
                    <span className="text-[9px] text-[var(--warning)] font-mono">{e.vitals.breathingRate} Hz (Vib)</span>
                  )}
                  {e.biometrics?.ageEst && (
                    <span className="text-[8px] text-[var(--text-muted)] font-mono border-b border-[var(--border-glass)] pb-1">
                      Class: {e.biometrics.classification}
                    </span>
                  )}
                  
                  {/* Register action button for unregistered targets */}
                  {!isRegistered && e.type !== 'appliance' && (
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        if (onRegisterEntity) onRegisterEntity(e);
                      }}
                      className="mt-1 flex items-center justify-center gap-1.5 w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 py-1 rounded text-[9px] font-bold tracking-wider transition-all"
                    >
                      <User size={10} /> QUICK REGISTER
                    </button>
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
