"use client";
import { Heart, Wind, Users, Gauge, User, Cat, Dog, Fan, ShieldAlert, Activity, Sparkles } from "lucide-react";

export default function VitalsPanel({ analysis, signalHistory, selectedEntityId, onSelectEntity }) {
  const v = analysis?.vitals || {};
  const entities = analysis?.entities || [];

  // Find currently selected entity, or fall back to primary human/first entity
  const selectedEntity = entities.find(e => e.id === selectedEntityId) || entities[0];
  const ev = selectedEntity?.vitals || {};

  // Helper to choose the right icon
  const getIcon = (type, name = "") => {
    const lowerName = name.toLowerCase();
    if (type === "person") return <User size={15} className="text-[var(--accent)]" />;
    if (lowerName.includes("cat")) return <Cat size={15} className="text-emerald-400" />;
    if (lowerName.includes("dog")) return <Dog size={15} className="text-emerald-400" />;
    if (type === "anomalous" || lowerName.includes("ghost") || lowerName.includes("intruder")) {
      return <ShieldAlert size={15} className="text-red-400 animate-pulse" />;
    }
    if (type === "appliance") return <Fan size={15} className="text-amber-400 animate-spin-slow" />;
    return <Activity size={15} className="text-gray-400" />;
  };

  // Helper to get status badge colors
  const getStatusBadge = (status) => {
    switch (status) {
      case "critical":
        return "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse";
      case "active":
        return "bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/30";
      case "sleeping":
        return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
      default:
        return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
    }
  };

  return (
    <div className="glass p-5 flex-grow flex flex-col min-h-[400px]">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-100">Biometric Vital Profiler</h3>
          <p className="text-[10px] text-[var(--text-muted)] font-mono">Stoer-Wagner multi-target subcarrier partition</p>
        </div>
        {selectedEntity && (
          <span className="text-[10px] font-mono text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2 py-0.5 rounded">
            Profiling: {selectedEntity.name}
          </span>
        )}
      </div>

      {/* Comprehensive 5-Vitals Visual HUD */}
      {selectedEntity && selectedEntity.type !== 'appliance' ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          <BigVital 
            icon={Heart} 
            color="var(--danger)" 
            bg="bg-[var(--danger)]/5"
            border="border-[var(--danger)]/10"
            label="Pulse Rate" 
            value={ev.heartRate || 0} 
            unit="BPM" 
            desc="CSI phase micro-drift" 
          />
          <BigVital 
            icon={Wind} 
            color="var(--cyan)" 
            bg="bg-[var(--cyan)]/5"
            border="border-[var(--cyan)]/10"
            label="Respiration" 
            value={ev.breathingRate || 0} 
            unit="RPM" 
            desc="Fresnel zone amplitude" 
          />
          <BigVital 
            icon={Activity} 
            color="var(--purple)" 
            bg="bg-[var(--purple)]/5"
            border="border-[var(--purple)]/10"
            label="Heart Var (HRV)" 
            value={ev.hrv ? `${ev.hrv} ms` : "N/A"} 
            unit="" 
            desc="R-R interval scattering" 
          />
          <BigVital 
            icon={Users} 
            color="rgba(16, 185, 129, 0.95)" 
            bg="bg-emerald-500/5"
            border="border-emerald-500/10"
            label="Oxygen SpO2" 
            value={ev.spo2 ? `${ev.spo2} %` : "N/A"} 
            unit="" 
            desc="Red/IR path absorption" 
          />
          <BigVital 
            icon={Sparkles} 
            color="rgba(245, 158, 11, 0.95)" 
            bg="bg-amber-500/5"
            border="border-amber-500/10"
            label="Body Temp" 
            value={ev.temp ? `${ev.temp.toFixed(1)} °C` : "N/A"} 
            unit={ev.temp ? `${((ev.temp * 9/5) + 32).toFixed(1)} °F` : ""} 
            desc="CSI thermal gradient" 
          />
        </div>
      ) : selectedEntity && selectedEntity.type === 'appliance' ? (
        <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-xl text-center mb-5">
          <Fan size={32} className="text-amber-400 animate-spin-slow mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-gray-200">{selectedEntity.name} Active Resonance</h4>
          <p className="text-2xl font-mono font-bold text-amber-400 mt-1">{ev.breathingRate || 0} Hz</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[320px] mx-auto">This appliance generates physical macro-vibrations which are recorded by the WiFi CSI subcarriers as a constant Doppler frequency peak.</p>
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-[var(--border-glass)] p-6 rounded-xl text-center mb-5 text-[var(--text-muted)]">
          No entity selected. Lock on a radar blip to inspect live vitals telemetry.
        </div>
      )}

      {/* Active Entities Table / Selection Roster */}
      <div className="glass p-4 rounded-xl mb-4 bg-black/25">
        <div className="flex justify-between items-center mb-2.5">
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">CSI Tracked Room Roster</p>
          <span className="text-[9px] font-mono text-[var(--text-muted)]">Click on row to target-lock</span>
        </div>
        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
          {entities.map((e) => {
            const isSelected = e.id === selectedEntityId;
            return (
              <div 
                key={e.id} 
                onClick={() => onSelectEntity(e.id)}
                className={`flex justify-between items-center p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected 
                    ? "bg-[var(--accent)]/10 border-[var(--accent)]/30 shadow-[0_0_10px_var(--accent-glow)]" 
                    : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-black/40 rounded-lg border border-[var(--border-glass)]">
                    {getIcon(e.type, e.name)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold flex items-center gap-1.5 text-gray-200">
                      {e.name}
                      <span className="text-[9px] text-gray-500">({Math.round(e.confidence * 100)}% Match)</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-1.5 py-0.2 rounded text-[8px] uppercase font-mono ${getStatusBadge(e.status)}`}>{e.status}</span>
                      {e.biometrics?.ageEst && (
                        <span className="text-[8px] font-mono text-gray-500">{e.biometrics.ageEst} Yrs / {e.biometrics.classification}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {e.type !== 'appliance' && e.vitals.heartRate > 0 ? (
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-mono font-bold text-[var(--danger)] flex items-center gap-1"><Heart size={8} /> {e.vitals.heartRate}</span>
                        <span className="text-[9px] font-mono text-[var(--cyan)] flex items-center gap-1 mt-0.5"><Wind size={8} /> {e.vitals.breathingRate}</span>
                      </div>
                    </div>
                  ) : e.type === 'appliance' ? (
                    <span className="text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1"><Activity size={8} /> {e.vitals.breathingRate} Hz</span>
                  ) : (
                    <span className="text-[9px] font-mono text-gray-500">Stationary</span>
                  )}
                </div>
              </div>
            );
          })}
          {entities.length === 0 && (
            <p className="text-[var(--text-muted)] text-[10px] text-center py-4">No active presence in wifi sensing field.</p>
          )}
        </div>
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-2 gap-3.5 mb-4">
        <GaugeCard label="Presence Stability Index" value={v.presenceScore || 0} max={1} color="var(--cyan)" />
        <GaugeCard label="WiFi Spatial Doppler Energy" value={v.motionEnergy || 0} max={1} color="var(--warning)" />
      </div>

      {/* Signal History Bar Chart */}
      <div className="glass p-4 rounded-xl flex-1 bg-black/15">
        <p className="text-[10px] text-[var(--text-muted)] mb-2.5 uppercase tracking-wider font-semibold">CSI Signal History Timeline (last 30s)</p>
        <div className="h-14 flex items-end gap-[1.5px]">
          {(signalHistory || []).slice(-60).map((h, i) => (
            <div key={i} className="flex-1 rounded-t-sm transition-all duration-100" style={{
              height: `${h.s || h.signal}%`,
              background: (h.s || h.signal) > 70 ? "var(--success)" : (h.s || h.signal) > 40 ? "var(--warning)" : "var(--danger)",
              opacity: 0.25 + (i / 60) * 0.75,
            }} />
          ))}
          {(!signalHistory || signalHistory.length === 0) && (
            <p className="text-[var(--text-muted)] text-[10px] w-full text-center py-5">Connecting to subcarrier stream...</p>
          )}
        </div>
      </div>
    </div>
  );
}

function BigVital({ icon: Icon, color, bg, border, label, value, unit, desc }) {
  return (
    <div className={`p-3 rounded-lg text-center flex flex-col justify-between border ${bg} ${border}`}>
      <Icon size={16} style={{ color }} className="mx-auto mb-1 animate-pulse" />
      <div>
        <p className="text-lg font-bold font-mono text-gray-200" style={{ textShadow: `0 0 10px ${color}20` }}>{value}</p>
        {unit && <p className="text-[9px] font-semibold text-gray-400 mt-0.5">{unit}</p>}
      </div>
      <p className="text-[8px] text-[var(--text-muted)] mt-1 leading-tight font-mono">{desc}</p>
    </div>
  );
}

function GaugeCard({ label, value, max, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="glass p-3 rounded-xl bg-black/20">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] text-[var(--text-muted)] font-semibold">{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>{value.toFixed(3)}</span>
      </div>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, var(--accent))` }} />
      </div>
    </div>
  );
}
