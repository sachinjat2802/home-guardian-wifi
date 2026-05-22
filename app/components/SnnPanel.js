"use client";
import { useState } from "react";

export default function SnnPanel({ analysis, snnConfig }) {
  const snn = analysis?.snn || {};
  const output = snn.output || {};
  const labels = snnConfig?.labels || ['presence', 'motion', 'breathing', 'heart_rate', 'phase_var', 'persons', 'fall', 'rssi'];
  const maxVal = Math.max(...Object.values(output), 0.001);
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
      <h3 className="text-lg font-semibold mb-1">Spiking Neural Network Engine</h3>
      <p className="text-xs text-[var(--text-muted)] mb-5">Real-time SNN inference on CSI subcarrier amplitude deltas with STDP online learning</p>

      {/* Physical Metrics & Coherence */}
      <div className="glass p-4 rounded-xl mb-4">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">Physical Signal Coherence</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-white/[0.03] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.round((analysis?.coherence?.score || 0) * 100)}%`,
                background: `linear-gradient(90deg, rgba(14,165,233,0.95), rgba(59,130,246,0.95))`,
                boxShadow: `0 0 18px rgba(14,165,233,0.25)`,
              }}
            />
          </div>
          <span className="text-xs font-mono text-[var(--accent)] w-16 text-right">{(analysis?.coherence?.score || 0).toFixed(3)}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          <MiniMetric label="Attenuation" value={analysis?.physicalMetrics?.waveAttenuation?.dropPct ?? 0} suffix="%" />
          <MiniMetric label="Phase Var" value={analysis?.physicalMetrics?.phaseVariance ?? 0} precision={4} />
          <MiniMetric label="Doppler" value={analysis?.physicalMetrics?.dopplerShifts?.velocityProxy ?? 0} precision={4} />
          <MiniMetric label="Delay" value={analysis?.physicalMetrics?.subcarrierDelays?.delaySpread ?? 0} precision={4} />
        </div>
      </div>

      {/* Network Info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <InfoBox label="Architecture" value={snn.network || `${snnConfig?.input || 56}-${snnConfig?.hidden || 32}-${snnConfig?.output || 8}`} />
        <InfoBox label="Total Spikes" value={snn.spikes || 0} />
        <InfoBox label="Frame" value={analysis?.frame || 0} />
        <InfoBox label="Learning" value="STDP ON" />
      </div>

      {/* Output Neurons */}
      <div className="glass p-5 rounded-xl mb-4">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-4">Output Neuron Activity</p>
        <div className="flex flex-col gap-3">
          {labels.map((label) => {
            const val = output[label] || 0;
            const norm = maxVal > 0 ? val / maxVal : 0;
            const colors = {
              presence: '#10b981', motion: '#f59e0b', breathing: '#06b6d4', heart_rate: '#ef4444',
              phase_var: '#a855f7', persons: '#3b82f6', fall: '#f43f5e', rssi: '#6366f1',
            };
            return (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs font-mono w-24 text-[var(--text-secondary)]">{label}</span>
                <div className="flex-1 h-5 bg-white/[0.03] rounded-sm overflow-hidden relative">
                  <div className="h-full rounded-sm transition-all duration-300" style={{ width: `${norm * 100}%`, background: colors[label] || 'var(--accent)', opacity: 0.8 }} />
                  {/* Spike dots */}
                  {val > 0.3 && Array.from({ length: Math.floor(val * 8) }).map((_, i) => (
                    <div key={i} className="absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white/80" style={{ left: `${Math.random() * norm * 100}%` }} />
                  ))}
                </div>
                <span className="text-xs font-mono w-14 text-right" style={{ color: colors[label] }}>{val.toFixed(3)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SNN Explanation */}
      <div className="glass p-4 rounded-xl text-xs text-[var(--text-muted)] leading-relaxed">
        <p className="font-semibold text-[var(--text-secondary)] mb-1">How it works (RuView ADR-074)</p>
        <p>WiFi subcarrier amplitude deltas are rate-encoded as Poisson spikes, fed through a {snnConfig?.input || 56}→{snnConfig?.hidden || 32}→{snnConfig?.output || 8} Leaky Integrate-and-Fire network. STDP (Spike-Timing-Dependent Plasticity) enables online learning — the network adapts to your environment in ~30 seconds without any training data.</p>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, suffix = "", precision = 2 }) {
  const show = typeof value === 'number' ? value : Number(value || 0);
  const formatted = typeof value === 'number'
    ? (suffix ? show.toFixed(precision) + suffix : show.toFixed(precision))
    : show.toFixed(precision) + suffix;

  return (
    <div className="glass p-2 rounded-lg text-center bg-black/[0.15] border border-white/5">
      <p className="text-[9px] text-[var(--text-muted)]">{label}</p>
      <p className="text-[11px] font-mono font-bold text-[var(--text-primary)] mt-0.5">{formatted}</p>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="glass p-3 rounded-lg text-center">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="text-sm font-bold font-mono text-[var(--text-primary)] mt-1">{value}</p>
    </div>
  );
}

