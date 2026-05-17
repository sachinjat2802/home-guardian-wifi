"use client";
import { useState, useEffect, useRef } from "react";
import { useWifiSensing } from "./hooks/useWifiSensing";
import Sidebar from "./components/Sidebar";
import RadarMap from "./components/RadarMap";
import AnalysisPanel from "./components/AnalysisPanel";
import SpectrumView from "./components/SpectrumView";
import NetworkScanner from "./components/NetworkScanner";
import VitalsPanel from "./components/VitalsPanel";
import EventLog from "./components/EventLog";
import SnnPanel from "./components/SnnPanel";
import PoseReconstructor from "./components/PoseReconstructor";
import { Shield, ShieldAlert, Play, Square, RefreshCw, Volume2, VolumeX, AlertOctagon } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const sensing = useWifiSensing();

  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const modRef = useRef(null);

  const security = sensing.analysis?.security || {};
  const isTriggered = security.triggered;

  // Initialize and modulate Siren Alarm synthesizer using Web Audio API
  useEffect(() => {
    if (isTriggered && soundEnabled) {
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
            audioCtxRef.current = new AudioContextClass();
          }
        }
        
        const ctx = audioCtxRef.current;
        if (ctx) {
          if (ctx.state === "suspended") {
            ctx.resume();
          }

          if (!oscRef.current) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const mod = ctx.createOscillator();
            const modGain = ctx.createGain();

            // Set main alert frequency
            osc.type = "sine";
            osc.frequency.setValueAtTime(750, ctx.currentTime);

            // Modulate gain for warbling volume
            gain.gain.setValueAtTime(0.08, ctx.currentTime);

            // Frequency modulator (Siren sweep: 600Hz to 900Hz at 2Hz warble speed)
            mod.frequency.setValueAtTime(2.2, ctx.currentTime);
            modGain.gain.setValueAtTime(150, ctx.currentTime);

            mod.connect(modGain);
            modGain.connect(osc.frequency);
            osc.connect(gain);
            gain.connect(ctx.destination);

            mod.start();
            osc.start();

            oscRef.current = osc;
            modRef.current = mod;
          }
        }
      } catch (e) {
        console.error("Failed to start browser Web Audio siren:", e);
      }
    } else {
      // Stop the alarm
      if (oscRef.current) {
        try {
          oscRef.current.stop();
          modRef.current.stop();
        } catch (e) {}
        oscRef.current = null;
        modRef.current = null;
      }
    }

    return () => {
      if (oscRef.current) {
        try {
          oscRef.current.stop();
          modRef.current.stop();
        } catch (e) {}
        oscRef.current = null;
        modRef.current = null;
      }
    };
  }, [isTriggered, soundEnabled]);

  // Set default selected entity if none is selected
  useEffect(() => {
    const entities = sensing.analysis?.entities || [];
    if (entities.length > 0 && !selectedEntityId) {
      setSelectedEntityId(entities[0].id);
    }
  }, [sensing.analysis?.entities, selectedEntityId]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#020408] text-gray-200">
      
      {/* Visual threat warning boundary flashing overlay */}
      {isTriggered && (
        <div className="fixed inset-0 border-[6px] border-red-500 animate-pulse pointer-events-none z-50 bg-red-500/[0.04]" />
      )}

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} connected={sensing.connected} mode={sensing.mode} />
      
      <main className="flex-1 p-4 pl-2 overflow-y-auto flex flex-col gap-4">
        <Header sensing={sensing} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} />
        
        {activeTab === "dashboard" && (
          <DashboardView 
            sensing={sensing} 
            selectedEntityId={selectedEntityId} 
            setSelectedEntityId={setSelectedEntityId} 
          />
        )}
        {activeTab === "spectrum" && <SpectrumView analysis={sensing.analysis} />}
        {activeTab === "networks" && (
          <NetworkScanner 
            networks={sensing.networks} 
            requestScan={sensing.requestScan} 
            connectedNetwork={sensing.connectedNetwork} 
          />
        )}
        {activeTab === "vitals" && (
          <VitalsPanel 
            analysis={sensing.analysis} 
            signalHistory={sensing.signalHistory} 
            selectedEntityId={selectedEntityId}
            onSelectEntity={setSelectedEntityId}
          />
        )}
        {activeTab === "snn" && <SnnPanel analysis={sensing.analysis} snnConfig={sensing.snnConfig} />}
        {activeTab === "security" && <SecurityView sensing={sensing} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} />}
      </main>
    </div>
  );
}

function Header({ sensing, soundEnabled, setSoundEnabled }) {
  const security = sensing.analysis?.security || {};
  return (
    <header className="flex justify-between items-center bg-white/[0.01] border border-[var(--border-glass)] px-4 py-3 rounded-2xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-gray-100 to-gray-400 bg-clip-text text-transparent">Home Guardian Spatial Analytics</h1>
        <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
          {sensing.connected ? `Live WiFi CSI sensing pipeline • Frame #${sensing.telemetry?.frame || 0}` : "Connecting to sensing server..."}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {/* Siren sound control indicator */}
        {security.triggered && (
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border flex items-center justify-center transition-all ${
              soundEnabled 
                ? "bg-red-500/15 border-red-500/30 text-red-400 animate-bounce" 
                : "bg-white/5 border-white/5 text-gray-500"
            }`}
            title={soundEnabled ? "Mute Siren Alarm" : "Unmute Siren Alarm"}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        )}

        {sensing.connected ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-[var(--text-muted)]">PIPELINE:</span>
            <select
              value={sensing.mode}
              onChange={(e) => sensing.changeMode(e.target.value)}
              className="bg-black/60 border border-[var(--border-glass)] px-3 py-1.5 rounded-full text-[10px] font-mono text-cyan-400 font-bold focus:outline-none cursor-pointer hover:border-cyan-500/50 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
            >
              <option value="simulation">📡 SIMULATION</option>
              <option value="real">🔌 REAL HARDWARE</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold border border-red-500/30 bg-red-500/10 text-red-400 animate-pulse">
            <span className="status-dot danger" />
            OFFLINE
          </div>
        )}
        
        {sensing.connectedNetwork && (
          <div className="text-[10px] font-mono text-[var(--text-secondary)] glass px-3 py-1.5 rounded-full border border-[var(--border-glass)]">
            {sensing.connectedNetwork.ssid} • Ch {sensing.connectedNetwork.channel} • {sensing.telemetry?.signal}%
          </div>
        )}
      </div>
    </header>
  );
}

function DashboardView({ sensing, selectedEntityId, setSelectedEntityId }) {
  const entities = sensing.analysis?.entities || [];
  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[2.5fr_1fr] gap-4 flex-1 min-h-0">
      <div className="flex flex-col gap-4 min-h-0">
        
        {/* Upper radar console and 3D pose fusion panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RadarMap 
            telemetry={sensing.telemetry} 
            analysis={sensing.analysis} 
            selectedEntityId={selectedEntityId}
            onSelectEntity={setSelectedEntityId}
          />
          <PoseReconstructor entity={selectedEntity} />
        </div>

        {/* Dynamic biometric stats display */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="CSI Frame Rate" value={`${(sensing.analysis?.snn?.spikes / 100 || 0).toFixed(1)} Hz`} sub="SNN activity frequency" color="var(--accent)" />
          <StatCard label="Presence Blips" value={entities.length || 0} sub={`${sensing.analysis?.classification?.dynamic || 0} Doppler cells`} color="var(--cyan)" />
          <StatCard label="Motion Index" value={sensing.analysis?.totalMotionEvents || 0} sub={sensing.telemetry?.severity === "none" ? "Zero Energy" : `${sensing.telemetry?.severity?.toUpperCase()} ENERGY`} color="var(--warning)" />
          <StatCard label="Phase Respiration" value={selectedEntity?.type !== 'appliance' ? `${selectedEntity?.vitals?.breathingRate || 0} RPM` : "N/A"} sub={selectedEntity ? `Lock: ${selectedEntity.name}` : "Global average"} color="var(--purple)" />
        </div>
      </div>
      
      {/* Right side analytics column */}
      <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
        <AnalysisPanel analysis={sensing.analysis} />
        <EventLog events={sensing.events} />
      </div>
    </div>
  );
}

function SecurityView({ sensing, soundEnabled, setSoundEnabled }) {
  const security = sensing.analysis?.security || {};
  const entities = sensing.analysis?.entities || [];
  
  return (
    <div className="glass p-5 rounded-2xl flex-1 flex flex-col gap-5 bg-white/[0.01]">
      <div className="flex justify-between items-center border-b border-[var(--border-glass)] pb-3">
        <div>
          <h3 className="text-base font-semibold">Armed Perimeter Guard & Intrusion Radar</h3>
          <p className="text-[10px] text-[var(--text-muted)] font-mono">Real-time room perimeter surveillance via multi-path scattering analysis</p>
        </div>
        <div className="flex gap-2">
          {/* Preset switch dropdown */}
          <select 
            value={security.preset || "residential"} 
            onChange={(e) => sensing.changePreset(e.target.value)}
            className="bg-black/60 border border-[var(--border-glass)] px-3 py-1.5 rounded-lg text-xs font-mono text-cyan-400 focus:outline-none"
          >
            <option value="residential">Residential Home</option>
            <option value="livestock">Livestock Farm</option>
            <option value="security">High-Security Room</option>
            <option value="everything">Ultimate Demo (Everything)</option>
          </select>

          {/* Trigger manual alarm */}
          <button
            onClick={() => sensing.triggerAlarm("MANUAL EMERGENCY ACTION: Manual panel panic toggle activated")}
            className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/25 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <AlertOctagon size={13} /> Trigger Panic
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Guard armed toggle card */}
        <div className="glass p-4 rounded-xl flex flex-col justify-between min-h-[120px] bg-black/20">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-mono">Guard Arm State</span>
            <span className={`text-xl font-bold font-mono tracking-wide ${security.armed ? "text-cyan-400 animate-pulse" : "text-gray-500"}`}>
              {security.armed ? "ARMCORD WATCH" : "DISARMED"}
            </span>
          </div>
          <button 
            onClick={security.armed ? sensing.disarmSecurity : sensing.armSecurity}
            className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all border ${
              security.armed 
                ? "bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25" 
                : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
            }`}
          >
            {security.armed ? "Disarm Perimeter" : "Arm Perimeter"}
          </button>
        </div>

        {/* Alarm status card */}
        <div className={`glass p-4 rounded-xl flex flex-col justify-between min-h-[120px] transition-all border ${
          security.triggered 
            ? "bg-red-500/10 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse" 
            : "bg-black/20"
        }`}>
          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-mono">Intrusion Alarm</span>
            <span className={`text-xl font-bold font-mono tracking-wide ${security.triggered ? "text-red-400" : "text-emerald-400"}`}>
              {security.triggered ? "🚨 BREACHED" : "✅ SECURE"}
            </span>
          </div>
          {security.triggered && (
            <button 
              onClick={sensing.disarmSecurity}
              className="w-full py-1.5 bg-red-950/40 border border-red-500/30 hover:bg-red-950/60 text-red-400 rounded-lg text-xs font-mono"
            >
              Reset / Mute Siren
            </button>
          )}
        </div>

        {/* Sound toggle card */}
        <div className="glass p-4 rounded-xl flex flex-col justify-between min-h-[120px] bg-black/20">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-mono">Audible Browser Alarm</span>
            <span className="text-xl font-bold font-mono tracking-wide text-gray-300">
              {soundEnabled ? "Siren Alert Enabled" : "Silent Alert"}
            </span>
          </div>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-full py-1.5 bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-semibold transition-all"
          >
            {soundEnabled ? "Disable Siren" : "Enable Siren"}
          </button>
        </div>
      </div>

      {security.triggered && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3">
          <ShieldAlert size={24} className="text-red-400 animate-bounce flex-shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider font-mono">Breach Event Analysis</h4>
            <p className="text-sm font-semibold text-gray-200 mt-0.5">{security.reason || "Unknown perimeter movement"}</p>
          </div>
        </div>
      )}

      <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider font-mono mt-1 border-b border-[var(--border-glass)] pb-2 flex items-center gap-1.5">
        <Shield size={14} /> Room Threat & Alert Log
      </h4>
      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
        {sensing.events.filter(e => e.type === "alert").map(e => (
          <div key={e.id} className="glass p-3 rounded-lg flex items-center justify-between border-l-2 border-red-500/60 bg-red-950/[0.04]">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-cyan-400">{e.time}</span>
              <span className="text-xs font-semibold text-gray-200">{e.msg}</span>
            </div>
            <span className="text-[9px] font-mono text-red-400/70 bg-red-500/5 px-2 py-0.5 rounded border border-red-500/10 uppercase font-bold">
              Warning
            </span>
          </div>
        ))}
        {sensing.events.filter(e => e.type === "alert").length === 0 && (
          <p className="text-[var(--text-muted)] text-xs text-center py-8">No armed intrusion alerts recorded in current session.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="glass p-4 rounded-xl bg-black/25 flex flex-col justify-between">
      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold block">{label}</span>
      <span className="text-xl font-bold font-mono mt-1 block" style={{ color }}>{value}</span>
      <span className="text-[10px] text-[var(--text-secondary)] mt-0.5 block leading-tight">{sub}</span>
    </div>
  );
}
