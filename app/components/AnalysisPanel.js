"use client";
import { Heart, Wind, Activity, Thermometer, Users, ShieldAlert } from "lucide-react";

export default function AnalysisPanel({ analysis }) {
  if (!analysis) return <div className="glass p-5 rounded-xl flex-1"><p className="text-[var(--text-muted)] text-sm">Waiting for analysis data...</p></div>;

  const v = analysis.vitals || {};
  const cls = analysis.classification || {};

  return (
    <div className="glass p-5 rounded-xl flex-1 flex flex-col min-h-0 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold">Real-Time Analysis</h3>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400"><span className="status-dot live" /> Live</span>
      </div>
      {/* Vitals Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <VitalBox icon={Heart} color="var(--danger)" label="Heart Rate" value={`${v.heartRate || 0}`} unit="BPM" />
        <VitalBox icon={Wind} color="var(--cyan)" label="Breathing" value={`${v.breathingRate || 0}`} unit="RPM" />
        <VitalBox icon={Users} color="var(--accent)" label="Persons" value={analysis.personCount || 0} unit="" />
        <VitalBox icon={Activity} color="var(--purple)" label="Motion" value={`${(v.motionEnergy * 100 || 0).toFixed(0)}`} unit="%" />
      </div>
      {/* CSI Classification */}
      <div className="mb-3">
        <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">Subcarrier Classification</p>
        <div className="flex gap-1 h-5">
          {cls.walls > 0 && <div className="bg-slate-600 rounded-sm flex-grow" style={{ flex: cls.walls }} title={`${cls.walls} static`} />}
          {cls.dynamic > 0 && <div className="bg-[var(--accent)] rounded-sm" style={{ flex: cls.dynamic }} title={`${cls.dynamic} dynamic`} />}
          {cls.reflectors > 0 && <div className="bg-[var(--warning)] rounded-sm" style={{ flex: cls.reflectors }} title={`${cls.reflectors} reflectors`} />}
          {cls.nulls > 0 && <div className="bg-[var(--danger)] rounded-sm" style={{ flex: cls.nulls }} title={`${cls.nulls} null`} />}
        </div>
        <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
          <span>{cls.walls} static</span>
          <span>{cls.dynamic} dynamic</span>
          <span>{cls.reflectors} reflect</span>
          <span>{cls.nulls} null</span>
        </div>
      </div>
      {/* Presence */}
      <div className="glass p-3 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-xs text-[var(--text-muted)]">Presence Score</span>
          <span className="text-sm font-mono font-bold text-[var(--cyan)]">{(v.presenceScore || 0).toFixed(2)}</span>
        </div>
        <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[var(--cyan)] to-[var(--accent)] rounded-full transition-all duration-500" style={{ width: `${(v.presenceScore || 0) * 100}%` }} />
        </div>
      </div>
      {v.fall && (
        <div className="mt-3 flex items-center gap-2 bg-[var(--danger)]/20 p-3 rounded-lg border border-[var(--danger)]/30 text-[var(--danger)] text-sm font-semibold animate-pulse">
          <ShieldAlert size={18} /> FALL DETECTED
        </div>
      )}
    </div>
  );
}

function VitalBox({ icon: Icon, color, label, value, unit }) {
  return (
    <div className="bg-white/[0.03] p-3 rounded-lg">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={13} style={{ color }} />
        <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
      </div>
      <span className="text-lg font-bold" style={{ color }}>{value}</span>
      {unit && <span className="text-[10px] text-[var(--text-muted)] ml-1">{unit}</span>}
    </div>
  );
}
