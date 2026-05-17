"use client";
import { Radio, Home, Activity, Shield, Wifi, BarChart3, Brain, ShieldCheck } from "lucide-react";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "spectrum", label: "CSI Spectrum", icon: BarChart3 },
  { id: "vitals", label: "Vitals", icon: Activity },
  { id: "networks", label: "Networks", icon: Wifi },
  { id: "snn", label: "SNN Engine", icon: Brain },
  { id: "security", label: "Security", icon: Shield },
];

export default function Sidebar({ activeTab, setActiveTab, connected, mode }) {
  return (
    <nav className="w-[220px] glass m-3 mr-0 p-5 flex flex-col rounded-2xl">
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
  );
}
