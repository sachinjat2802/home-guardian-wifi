"use client";
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
  { id: "ai-copilot", label: "AI Copilot", icon: Sparkles },
];

export default function Sidebar({ activeTab, setActiveTab, connected, mode }) {
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-medium transition-all
                ${activeTab === id
                  ? "bg-[var(--accent)]/10 text-white border border-[var(--accent)]/30"
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
