"use client";
import { useEffect, useMemo, useState } from "react";
import { Radio, Home, Activity, Shield, Wifi, BarChart3, Brain, ShieldCheck, Layers, Users, Sparkles } from "lucide-react";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "floorplan", label: "Floorplan", icon: Layers },
  { id: "spectrum", label: "CSI Spectrum", icon: BarChart3 },
  { id: "vitals", label: "Vitals", icon: Activity },
  { id: "networks", label: "Networks", icon: Wifi },
  { id: "snn", label: "SNN Engine", icon: Brain },
  { id: "occupants", label: "Occupants Registry", icon: Users },
  { id: "security", label: "Security", icon: Shield },
];

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Request failed: ${res.status}`);
  }
  return res.json();
}

export default function Sidebar({ activeTab, setActiveTab, connected, mode }) {
  const [dbStatus, setDbStatus] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [clearScope, setClearScope] = useState("all"); // all | ruview | wifi

  const summary = useMemo(() => {
    const ru = dbStatus?.ruview;
    const wi = dbStatus?.wifiGuardian;
    return {
      ruEvents: ru?.telemetry ?? 0,
      ruEntities: ru?.entities ?? 0,
      ruVitals: ru?.vitals ?? 0,
      wiEvents: wi?.events ?? 0,
      wiOcc: wi?.occupants ?? 0,
      wiTelemetry: wi?.telemetry ?? 0,
    };
  }, [dbStatus]);

  const refreshDbStatus = async () => {
    try {
      const data = await fetchJson("/api/data/status", { method: "GET" });
      setDbStatus(data);
    } catch (e) {
      // keep silent to avoid spamming UI
      // console.error(e);
    }
  };

  useEffect(() => {
    // Run the initial fetch asynchronously to avoid synchronous setState warnings in effects
    const kickoff = setTimeout(() => {
      refreshDbStatus();
    }, 0);

    const t = setInterval(refreshDbStatus, 10000);
    return () => {
      clearTimeout(kickoff);
      clearInterval(t);
    };
  }, []);

  return (
    <>
      {/* Desktop Left Sidebar */}
      <nav className="hidden md:flex w-[220px] glass m-3 mr-0 p-5 flex-col rounded-2xl">
        <div className="flex items-center gap-3 mb-8">
          <Radio size={24} className="text-[var(--accent)]" />
          <h2 className="text-base font-bold tracking-tight">Home Guardian</h2>
        </div>

        <ul className="flex flex-col gap-1 flex-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <li
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-medium transition-all magnetic-pull
                ${activeTab === id
                  ? "bg-[var(--accent)]/10 text-white border border-[var(--accent)]/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                  : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white border border-transparent"}`}
            >
              <Icon size={18} />
              {label}
            </li>
          ))}
        </ul>

        <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-medium ${connected ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
          <ShieldCheck size={16} />
          {connected ? "Sensing Active" : "Disconnected"}
        </div>

        <div className="mt-4 p-3 rounded-xl bg-white/[0.015] border border-white/5">
          <div className="text-[10px] font-mono text-[var(--text-muted)] mb-2">
            DB Status (rows)
          </div>
          <div className="text-[10px] font-mono text-[var(--text-secondary)] leading-relaxed">
            <div>ruview: {summary.ruEvents} tel</div>
            <div>ruview: {summary.ruVitals} vit</div>
            <div>ruview: {summary.ruEntities} ent</div>
            <div>wifi: {summary.wiEvents} events</div>
            <div>wifi: {summary.wiOcc} occ</div>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <select
            value={clearScope}
            onChange={(e) => setClearScope(e.target.value)}
            className="bg-black/40 border border-[var(--border-glass)] px-3 py-2 rounded-xl text-xs font-mono text-red-300 focus:outline-none cursor-pointer"
          >
            <option value="all">Clear ALL</option>
            <option value="ruview">Clear ruview only</option>
            <option value="wifi">Clear wifi_guardian only</option>
          </select>

          <button
            disabled={clearing}
            onClick={async () => {
              const label = clearScope === "all" ? "ALL databases" : clearScope === "ruview" ? "ruview database" : "wifi_guardian database";
              if (!confirm(`Clear ${label}? This cannot be undone.`)) return;

              try {
                setClearing(true);
                await fetchJson("/api/data/clear", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ scope: clearScope }),
                });
                await refreshDbStatus();
                alert("Local data cleared successfully.");
              } catch (e) {
                console.error(e);
                alert("Clear failed. Check console logs.");
              } finally {
                setClearing(false);
              }
            }}
            className="flex items-center gap-2 p-3 rounded-xl text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 cursor-pointer w-full disabled:opacity-50"
          >
            <Shield size={16} />
            {clearing ? "Clearing..." : "Clear Local Data"}
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-primary)]/85 backdrop-blur-xl border-t border-[var(--border-glass)] px-3 py-1.5 flex justify-around items-center shadow-[0_-5px_25px_rgba(0,0,0,0.5)]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all relative min-h-[44px] min-w-[44px] justify-center focus:outline-none
              ${activeTab === id ? "text-[var(--accent)] font-semibold" : "text-[var(--text-secondary)] hover:text-white"}`}
          >
            <Icon size={18} />
            <span className="text-[8px] tracking-tight font-medium mt-0.5">{label.split(" ")[0]}</span>
            {activeTab === id && (
              <span className="absolute -top-1.5 w-6 h-0.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)]" />
            )}
          </button>
        ))}
      </nav>
    </>
  );
}
