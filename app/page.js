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
import FloorplanView from "./components/FloorplanView";
import PoseReconstructor from "./components/PoseReconstructor";
import { Shield, ShieldAlert, Play, Square, RefreshCw, Volume2, VolumeX, AlertOctagon, Palette } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [theme, setTheme] = useState("classic");
  const sensing = useWifiSensing();

  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const modRef = useRef(null);

  const security = sensing.analysis?.security || {};
  const isTriggered = security.triggered;

  // Apply active theme class to document body to trigger dynamic variables
  useEffect(() => {
    const classes = ["theme-classic", "theme-space", "theme-cyberpunk", "theme-aurora", "theme-polar"];
    classes.forEach(c => document.body.classList.remove(c));
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

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



  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      
      {/* Visual threat warning boundary flashing overlay */}
      {isTriggered && (
        <div className="fixed inset-0 border-[6px] border-[var(--danger)] animate-pulse pointer-events-none z-50 bg-[var(--danger)]/[0.04]" />
      )}

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} connected={sensing.connected} mode={sensing.mode} />
      
      <main className="flex-1 p-4 pl-2 pb-20 md:pb-4 overflow-y-auto flex flex-col gap-4">
        <Header 
          sensing={sensing} 
          soundEnabled={soundEnabled} 
          setSoundEnabled={setSoundEnabled} 
          theme={theme} 
          setTheme={setTheme} 
        />
        
        {activeTab === "dashboard" && (
          <DashboardView 
            sensing={sensing} 
            selectedEntityId={selectedEntityId} 
            setSelectedEntityId={setSelectedEntityId} 
            theme={theme}
          />
        )}
        {activeTab === "floorplan" && <FloorplanView analysis={sensing.analysis} />}
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

function Header({ sensing, soundEnabled, setSoundEnabled, theme, setTheme }) {
  const security = sensing.analysis?.security || {};
  return (
    <header className="flex flex-col md:flex-row justify-between items-stretch md:items-center bg-[var(--bg-card)] border border-[var(--border-glass)] p-4 md:px-4 md:py-3 rounded-2xl backdrop-blur-md transition-all duration-300 gap-3">
      <div className="text-center md:text-left">
        <h1 className="text-lg md:text-xl font-bold tracking-tight bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">Home Guardian Spatial Analytics</h1>
        <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
          {sensing.connected ? `Live WiFi CSI sensing pipeline • Frame #${sensing.telemetry?.frame || 0}` : "Connecting to sensing server..."}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center md:justify-end gap-2.5">
        {/* Theme Switcher Selector */}
        <div className="flex items-center gap-1.5 border-r border-[var(--border-glass)] pr-3 mr-1">
          <Palette size={13} className="text-[var(--text-secondary)] animate-pulse" />
          <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase hidden xs:inline">THEME:</span>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="bg-black/40 border border-[var(--border-glass)] px-2.5 py-1 rounded-full text-[10px] font-mono text-[var(--accent)] font-bold focus:outline-none cursor-pointer hover:border-[var(--accent)]/50 transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.1)]"
          >
            <option value="classic">🟢 CYBER CLASSIC</option>
            <option value="space">🌌 DEEP OBSIDIAN</option>
            <option value="cyberpunk">🌸 NEON RETRO</option>
            <option value="aurora">🌲 BOREAL AURORA</option>
            <option value="polar">❄️ FROSTED POLAR</option>
          </select>
        </div>

        {/* Siren sound control indicator */}
        {security.triggered && (
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border flex items-center justify-center transition-all ${
              soundEnabled 
                ? "bg-[var(--danger)]/15 border-[var(--danger)]/30 text-[var(--danger)] animate-bounce" 
                : "bg-white/5 border-white/5 text-gray-500"
            }`}
            title={soundEnabled ? "Mute Siren Alarm" : "Unmute Siren Alarm"}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        )}

        {sensing.connected ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-[var(--text-muted)] hidden xs:inline">PIPELINE:</span>
            <select
              value={sensing.mode}
              onChange={(e) => sensing.changeMode(e.target.value)}
              className="bg-black/40 border border-[var(--border-glass)] px-3 py-1.5 rounded-full text-[10px] font-mono text-[var(--cyan)] font-bold focus:outline-none cursor-pointer hover:border-[var(--cyan)]/50 transition-all duration-300"
            >
              <option value="simulation">📡 SIMULATION</option>
              <option value="real">🔌 REAL HARDWARE</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold border border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)] animate-pulse">
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

function DashboardView({ sensing, selectedEntityId, setSelectedEntityId, theme }) {
  const entities = sensing.analysis?.entities || [];
  const selectedEntity = entities.find(e => e.id === selectedEntityId) || entities[0];
  const effectiveSelectedEntityId = selectedEntity?.id || null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[2.5fr_1fr] gap-4 flex-1 min-h-0">
      <div className="flex flex-col gap-4 min-h-0">
        
        {/* Upper radar console and 3D pose fusion panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RadarMap 
            telemetry={sensing.telemetry} 
            analysis={sensing.analysis} 
            selectedEntityId={effectiveSelectedEntityId}
            onSelectEntity={setSelectedEntityId}
            theme={theme}
          />
          <PoseReconstructor entity={selectedEntity} theme={theme} />
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[var(--border-glass)] pb-3">
        <div>
          <h3 className="text-base font-semibold">Armed Perimeter Guard & Intrusion Radar</h3>
          <p className="text-[10px] text-[var(--text-muted)] font-mono">Real-time room perimeter surveillance via multi-path scattering analysis</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Preset switch dropdown */}
          <select 
            value={security.preset || "residential"} 
            onChange={(e) => sensing.changePreset(e.target.value)}
            className="bg-black/60 border border-[var(--border-glass)] px-3 py-1.5 rounded-lg text-xs font-mono text-cyan-400 focus:outline-none min-h-[38px] cursor-pointer"
          >
            <option value="residential">Residential Home</option>
            <option value="livestock">Livestock Farm</option>
            <option value="security">High-Security Room</option>
            <option value="everything">Ultimate Demo (Everything)</option>
          </select>

          {/* Trigger manual alarm */}
          <button
            onClick={() => sensing.triggerAlarm("MANUAL EMERGENCY ACTION: Manual panel panic toggle activated")}
            className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/25 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 min-h-[38px]"
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
              {security.armed ? "ARMED WATCH" : "DISARMED"}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-2">
        {/* Left Column: Threat Log */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider font-mono border-b border-[var(--border-glass)] pb-2 flex items-center gap-1.5">
            <Shield size={14} /> Room Threat & Alert Log
          </h4>
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 flex-1">
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

        {/* Right Column: MQTT gateway */}
        <div className="glass p-4 rounded-xl bg-black/25 border border-[var(--border-glass)] flex flex-col gap-3">
          <MqttIntegratorPanel sensing={sensing} />
        </div>
      </div>
    </div>
  );
}

function MqttIntegratorPanel({ sensing }) {
  const mqtt = sensing.analysis?.mqtt || {
    connected: false,
    host: "mqtt://192.168.1.150:1883",
    topic: "home/guardian",
    rateLimitMs: 1000,
    publishOccupancy: true,
    publishVitals: true,
    publishAlerts: true,
    logs: []
  };

  const [host, setHost] = useState(mqtt.host);
  const [topic, setTopic] = useState(mqtt.topic);
  const [publishOccupancy, setPublishOccupancy] = useState(mqtt.publishOccupancy);
  const [publishVitals, setPublishVitals] = useState(mqtt.publishVitals);
  const [publishAlerts, setPublishAlerts] = useState(mqtt.publishAlerts);
  const [prevMqtt, setPrevMqtt] = useState(sensing.analysis?.mqtt);

  // Keep state variables synchronized when MQTT analysis updates
  if (sensing.analysis?.mqtt && sensing.analysis.mqtt !== prevMqtt) {
    const activeMqtt = sensing.analysis.mqtt;
    setPrevMqtt(activeMqtt);
    setHost(activeMqtt.host || "mqtt://192.168.1.150:1883");
    setTopic(activeMqtt.topic || "home/guardian");
    setPublishOccupancy(activeMqtt.publishOccupancy !== false);
    setPublishVitals(activeMqtt.publishVitals !== false);
    setPublishAlerts(activeMqtt.publishAlerts !== false);
  }

  const handleSave = () => {
    sensing.configureMqtt({
      host,
      topic,
      publishOccupancy,
      publishVitals,
      publishAlerts
    });
  };

  return (
    <div className="flex flex-col gap-3 h-full justify-between">
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${mqtt.connected ? "bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" : "bg-gray-600"}`} />
          <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono">MQTT Smart Home Gateway</h4>
        </div>
        <button
          onClick={() => sensing.toggleMqtt(!mqtt.connected)}
          className={`px-2.5 py-1 rounded text-[9px] font-bold font-mono transition-all border ${
            mqtt.connected
              ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
              : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
          }`}
        >
          {mqtt.connected ? "DISCONNECT" : "CONNECT"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="flex flex-col gap-1">
          <span className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Broker Host</span>
          <input
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            onBlur={handleSave}
            placeholder="mqtt://localhost:1883"
            className="bg-black/40 border border-white/10 px-2 py-1 rounded text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50 font-mono"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Topic Prefix</span>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onBlur={handleSave}
            placeholder="home/guardian"
            className="bg-black/40 border border-white/10 px-2 py-1 rounded text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50 font-mono"
          />
        </div>
      </div>

      {/* Stream filters */}
      <div className="flex flex-wrap gap-2 py-0.5 justify-start">
        <label className="flex items-center gap-1.5 text-[9px] font-mono text-gray-300 cursor-pointer bg-white/5 px-2 py-1 rounded hover:bg-white/10 transition-all select-none border border-white/5">
          <input
            type="checkbox"
            checked={publishOccupancy}
            onChange={(e) => {
              const val = e.target.checked;
              setPublishOccupancy(val);
              sensing.configureMqtt({ publishOccupancy: val });
            }}
            className="accent-cyan-500"
          />
          Occupancy
        </label>
        <label className="flex items-center gap-1.5 text-[9px] font-mono text-gray-300 cursor-pointer bg-white/5 px-2 py-1 rounded hover:bg-white/10 transition-all select-none border border-white/5">
          <input
            type="checkbox"
            checked={publishVitals}
            onChange={(e) => {
              const val = e.target.checked;
              setPublishVitals(val);
              sensing.configureMqtt({ publishVitals: val });
            }}
            className="accent-cyan-500"
          />
          Vitals
        </label>
        <label className="flex items-center gap-1.5 text-[9px] font-mono text-gray-300 cursor-pointer bg-white/5 px-2 py-1 rounded hover:bg-white/10 transition-all select-none border border-white/5">
          <input
            type="checkbox"
            checked={publishAlerts}
            onChange={(e) => {
              const val = e.target.checked;
              setPublishAlerts(val);
              sensing.configureMqtt({ publishAlerts: val });
            }}
            className="accent-cyan-500"
          />
          Security
        </label>
      </div>

      {/* Dispatch console logger */}
      <div className="flex flex-col gap-1.5 flex-1 min-h-[140px]">
        <div className="flex justify-between items-center text-[9px] text-[var(--text-muted)] font-mono font-semibold">
          <span>OUTBOUND MQTT GATEWAY DISPATCH LOGS</span>
          <button
            onClick={() => sensing.testMqtt()}
            className="text-cyan-400 hover:underline font-bold"
          >
            DISPATCH PING
          </button>
        </div>
        <div className="bg-black/40 border border-white/5 rounded-lg p-2 font-mono text-[9px] overflow-y-auto flex flex-col gap-1 flex-1 text-gray-400 max-h-[140px]">
          {mqtt.logs && mqtt.logs.length > 0 ? (
            mqtt.logs.map(log => (
              <div key={log.id} className="border-b border-white/5 pb-1 last:border-0">
                <div className="flex justify-between text-cyan-400">
                  <span>[{log.time}] PUBLISHED</span>
                  <span className="text-[8px] text-[var(--text-muted)]">{log.topic}</span>
                </div>
                <div className="text-gray-300 break-all bg-black/40 p-1 rounded mt-0.5 border border-white/5">{log.payload}</div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-600">
              {mqtt.connected ? "Awaiting outbound telemetry publish tick..." : "Gateway offline. Toggle connect state above to start."}
            </div>
          )}
        </div>
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
