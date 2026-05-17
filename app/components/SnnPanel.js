"use client";

export default function SnnPanel({ analysis, snnConfig }) {
  const snn = analysis?.snn || {};
  const output = snn.output || {};
  const labels = snnConfig?.labels || ['presence', 'motion', 'breathing', 'heart_rate', 'phase_var', 'persons', 'fall', 'rssi'];
  const maxVal = Math.max(...Object.values(output), 0.001);

  return (
    <div className="glass p-6 flex-1 flex flex-col">
      <h3 className="text-lg font-semibold mb-1">Spiking Neural Network Engine</h3>
      <p className="text-xs text-[var(--text-muted)] mb-5">Real-time SNN inference on CSI subcarrier amplitude deltas with STDP online learning</p>

      {/* Network Info */}
      <div className="grid grid-cols-4 gap-3 mb-6">
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

function InfoBox({ label, value }) {
  return (
    <div className="glass p-3 rounded-lg text-center">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="text-sm font-bold font-mono text-[var(--text-primary)] mt-1">{value}</p>
    </div>
  );
}
