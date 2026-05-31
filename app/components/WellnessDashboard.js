"use client";
import { useState, useEffect } from "react";
import { Sparkles, Heart, Compass, Flame, AlertCircle, RefreshCw, User } from "lucide-react";

export default function WellnessDashboard({ sensing }) {
  // Extract real live database occupants, or fallback to default profiles
  const occupants = (sensing?.occupants || [
    { id: "target-1", name: "Sachin", relationship: "Family" },
    { id: "target-2", name: "Kavita", relationship: "Family" },
    { id: "target-3", name: "Kirpa", relationship: "Family" },
    { id: "target-4", name: "Rati Ram", relationship: "Relative" },
    { id: "target-5", name: "Visitor", relationship: "Visitor" }
  ]).filter(occ => !occ.id.startsWith("target-visitor-") || occ.id === "target-visitor-2"); // keep family and primary visitor slots clean

  const [selectedUserId, setSelectedUserId] = useState("target-1");
  const [mandala, setMandala] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWellnessData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Mandala Segment overlay
      const resMandala = await fetch(`http://localhost:8080/api/dashboard/mandala/${selectedUserId}`);
      if (!resMandala.ok) throw new Error("Wellness API not responding. Ensure Python server is running.");
      const dataMandala = await resMandala.json();
      setMandala(dataMandala);

      // 2. Fetch Harmony Heatmap
      const resHeatmap = await fetch(`http://localhost:8080/api/dashboard/harmony-heatmap/${selectedUserId}`);
      if (resHeatmap.ok) {
        const dataHeatmap = await resHeatmap.json();
        setHeatmap(dataHeatmap);
      }

      // 3. Fetch Daily Insight prescription
      const resInsight = await fetch(`http://localhost:8080/api/dashboard/daily-insight/${selectedUserId}`);
      if (resInsight.ok) {
        const dataInsight = await resInsight.json();
        setInsight(dataInsight);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load wellness dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWellnessData();
  }, [selectedUserId]);

  if (loading) {
    return (
      <div className="glass p-8 rounded-2xl flex-1 flex flex-col justify-center items-center min-h-[450px] border border-white/5 bg-black/20 animate-pulse">
        <RefreshCw className="animate-spin text-amber-400 mb-4" size={32} />
        <p className="text-sm font-mono text-gray-400">Tuning Ambient Wellness Engine ...</p>
        <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-mono">Querying Personalized Dhatus</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass p-8 rounded-2xl flex-1 flex flex-col justify-center items-center min-h-[450px] border border-red-500/10 bg-red-950/[0.04]">
        <AlertCircle className="text-red-400 mb-4" size={40} />
        <h3 className="text-base font-bold text-red-400 uppercase tracking-wider font-mono">Wellness Server Offline</h3>
        <p className="text-xs text-gray-300 mt-2 text-center max-w-md font-mono">{error}</p>
        <button
          onClick={fetchWellnessData}
          className="mt-5 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 flex-1 min-h-0 animate-fadeIn">
      
      {/* Premium Family Profile Selector */}
      <div className="glass p-4 rounded-2xl border border-white/5 bg-black/10 flex flex-col gap-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-amber-400 font-mono flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-400" /> AI Wellness Member Selector
          </h4>
          <p className="text-[9px] text-gray-400 font-mono mt-0.5">Select a profile to analyze deep circadian Ayurvedic patterns & AI prescriptions</p>
        </div>
        
        <div className="flex flex-wrap gap-2.5 mt-1">
          {occupants.map((occ) => {
            const isSelected = selectedUserId === occ.id;
            return (
              <button
                key={occ.id}
                onClick={() => setSelectedUserId(occ.id)}
                className={`px-4 py-2.5 rounded-xl border transition-all duration-300 flex items-center gap-2.5 font-mono text-xs cursor-pointer ${
                  isSelected
                    ? "bg-amber-500/10 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)] scale-[1.03]"
                    : "bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/[0.05] hover:border-white/10 hover:text-white"
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                  isSelected ? "bg-amber-400/20 text-amber-300" : "bg-white/5 text-gray-500"
                }`}>
                  <User size={12} />
                </div>
                <div className="text-left">
                  <div className="font-bold text-[11px] leading-tight">{occ.name}</div>
                  <div className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">{occ.relationship}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview stats header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-4 rounded-xl border border-white/5 bg-gradient-to-br from-emerald-500/5 to-transparent relative overflow-hidden">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest block font-mono">SATTVA (HARMONY)</span>
          <span className="text-3xl font-extrabold text-emerald-400 font-mono mt-1 block">
            {((insight?.sattva || 0.6) * 100).toFixed(1)}%
          </span>
          <p className="text-[10px] text-gray-400 leading-tight mt-1">Peace, clarity, and homeostatic cellular equilibrium.</p>
          <Compass className="absolute right-4 bottom-4 text-emerald-500/10" size={60} />
        </div>
        
        <div className="glass p-4 rounded-xl border border-white/5 bg-gradient-to-br from-red-500/5 to-transparent relative overflow-hidden">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest block font-mono">RAJAS (AGITATION)</span>
          <span className="text-3xl font-extrabold text-red-400 font-mono mt-1 block">
            {((insight?.rajas || 0.2) * 100).toFixed(1)}%
          </span>
          <p className="text-[10px] text-gray-400 leading-tight mt-1">Metabolic fire, tossing episodes, and cognitive strain.</p>
          <Flame className="absolute right-4 bottom-4 text-red-500/10" size={60} />
        </div>

        <div className="glass p-4 rounded-xl border border-white/5 bg-gradient-to-br from-purple-500/5 to-transparent relative overflow-hidden">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest block font-mono">TAMAS (INERTIA)</span>
          <span className="text-3xl font-extrabold text-purple-400 font-mono mt-1 block">
            {((insight?.tamas || 0.2) * 100).toFixed(1)}%
          </span>
          <p className="text-[10px] text-gray-400 leading-tight mt-1">Sedentary duration, physical sluggishness, and deep rest.</p>
          <Heart className="absolute right-4 bottom-4 text-purple-500/10" size={60} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Left Column: Diurnal Mandala SVG Circular Dial */}
        <div className="glass p-5 rounded-2xl border border-white/5 bg-black/25 flex flex-col justify-between items-center gap-4">
          <div className="w-full">
            <h3 className="text-sm font-bold uppercase tracking-widest text-amber-400 font-mono flex items-center gap-1.5">
              <Compass size={16} /> 24-Hour Diurnal Dosha Mandala
            </h3>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">Circular breakdown of Ayurvedic clock cycles matched with physical state</p>
          </div>

          {/* SVG Mandala Circle */}
          <div className="relative w-[280px] h-[280px] my-3">
            <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
              {/* Outer border rings */}
              <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
              
              {/* Draw 6 sectors representing 4-hour segments */}
              {mandala?.segments?.map((seg, i) => {
                const angle = 360 / 6;
                const startAngle = i * angle;
                const r = 85;
                const x1 = 100 + r * Math.cos((startAngle * Math.PI) / 180);
                const y1 = 100 + r * Math.sin((startAngle * Math.PI) / 180);
                const x2 = 100 + r * Math.cos(((startAngle + angle) * Math.PI) / 180);
                const y2 = 100 + r * Math.sin(((startAngle + angle) * Math.PI) / 180);
                
                // Draw filled colored sectors
                return (
                  <path
                    key={i}
                    d={`M 100 100 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                    fill={seg.color_hex}
                    fillOpacity="0.09"
                    stroke={seg.color_hex}
                    strokeOpacity="0.3"
                    strokeWidth="1.5"
                    className="hover:fill-opacity-20 transition-all duration-300 cursor-pointer"
                  />
                );
              })}
              
              {/* Inner core representing Sattvic harmony */}
              <circle cx="100" cy="100" r="45" fill="#0c0e12" stroke="rgba(217, 119, 6, 0.2)" strokeWidth="1" />
            </svg>
            
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col justify-center items-center text-center pointer-events-none p-4">
              <span className="text-[9px] font-mono text-amber-500/80 uppercase tracking-widest">Active Dosha</span>
              <span className="text-xl font-extrabold text-white tracking-wide mt-0.5 uppercase">
                {insight?.primary_imbalance || "VATA"}
              </span>
              <span className="text-[8px] font-mono text-gray-400 mt-1 uppercase">Sadhana Hour</span>
            </div>
          </div>

          {/* Diurnal details legends */}
          <div className="grid grid-cols-2 gap-3 w-full text-xs font-mono">
            {mandala?.segments?.map((seg, i) => (
              <div key={i} className="flex flex-col p-2.5 rounded-lg bg-white/[0.015] border border-white/5 relative pl-3.5">
                <span className="absolute left-1.5 top-3.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: seg.color_hex }} />
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-gray-200">{seg.governing_dosha} ({seg.time_range})</span>
                </div>
                <span className="text-[9px] text-gray-400 leading-tight mt-0.5 truncate">{seg.cycle_name}</span>
                <span className="text-[8px] text-cyan-400 mt-1 uppercase">{seg.user_state}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Sacred Sadhana LLM Prescriptions */}
        <div className="flex flex-col gap-4">
          
          {/* Actionable Sadhana Card */}
          <div className="glass p-5 rounded-2xl border border-amber-500/10 bg-gradient-to-br from-amber-500/[0.03] to-transparent flex flex-col gap-3 relative overflow-hidden">
            <div className="flex items-center gap-2">
              <Sparkles className="text-amber-400 animate-pulse" size={18} />
              <h3 className="text-sm font-bold uppercase tracking-widest text-amber-400 font-mono">Active Sadhana Morning Prescription</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs font-mono my-1">
              <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest block">YOGIC PRACTICE</span>
                <span className="text-xs font-bold text-white mt-1 block truncate" title={insight?.prescribed_practice}>
                  {insight?.prescribed_practice || "Nadi Shodhana Pranayama"}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest block">BIJA MANTRA</span>
                <span className="text-xs font-bold text-white mt-1 block truncate">
                  {insight?.prescribed_mantra || "Chant 'OM' x 21 times"}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-gray-300 leading-relaxed font-mono bg-black/25 p-3.5 rounded-xl border border-white/5 max-h-[170px] overflow-y-auto whitespace-pre-line">
              {insight?.morning_panchang_insight || "No physical insight compiled. Complete baseline baseline."}
            </p>

            <button
              onClick={async () => {
                try {
                  const res = await fetch(`http://localhost:8080/api/dashboard/vastu-sync/${selectedUserId}`, { method: 'POST' });
                  if (res.ok) {
                    const data = await res.json();
                    alert(`🏠 [Vastu IoT Sync Initiated!]\n\nAligned environment to: ${data.target_dosha}\n\n💡 Light: ${data.actions_executed.lighting_commands}\n💨 HVAC: ${data.actions_executed.hvac_commands}\n🎵 Sound: ${data.actions_executed.acoustics_commands}`);
                  }
                } catch (e) {
                  alert("Failed to connect to IoT gateway.");
                }
              }}
              className="mt-2 w-full py-2.5 bg-gradient-to-r from-amber-500/10 to-amber-600/15 hover:from-amber-500/20 hover:to-amber-600/25 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono rounded-xl cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]"
            >
              <Compass size={14} className="animate-spin" style={{ animationDuration: '6s' }} /> 
              Trigger Ambient Vastu Environmental Alignment
            </button>
          </div>

          {/* GitHub-Style Yearly Harmony Heatmap */}
          <div className="glass p-5 rounded-2xl border border-white/5 bg-black/25 flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-amber-400 font-mono flex items-center gap-1.5">
                <Compass size={16} /> Daily Guna Harmony Heatmap
              </h3>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">Sattvic alignment logs over the last 30 calendar days</p>
            </div>

            {/* Grid display */}
            <div className="flex flex-wrap gap-2 py-2">
              {heatmap.map((item, index) => {
                let colorClass = "bg-gray-600/30 border-gray-600/10";
                if (item.color_zone === "Balanced") {
                  colorClass = "bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.1)]";
                } else if (item.color_zone === "Rajas/Stressed") {
                  colorClass = "bg-red-500/20 border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.1)]";
                } else if (item.color_zone === "Tamas/Lethargic") {
                  colorClass = "bg-purple-500/20 border-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.1)]";
                }
                
                return (
                  <div
                    key={index}
                    className={`w-[22px] h-[22px] rounded border flex justify-center items-center text-[7px] font-mono font-bold cursor-help hover:scale-110 transition-all ${colorClass}`}
                    title={`Date: ${item.date} | Sattva: ${(item.sattva_score*100).toFixed(0)}% | State: ${item.color_zone}`}
                  >
                    {item.dominant_dosha[0]}
                  </div>
                );
              })}
              {heatmap.length === 0 && (
                <p className="text-[var(--text-muted)] text-xs py-4 font-mono">No heatmap logs compiled. Boot API seeder.</p>
              )}
            </div>

            {/* Legends */}
            <div className="flex items-center gap-4 text-[9px] font-mono text-gray-400 border-t border-white/5 pt-2">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/40" /> Sattva (Harmonious)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500/20 border border-red-500/40" /> Rajas (Stressed/Active)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-purple-500/20 border border-purple-500/40" /> Tamas (Lethargic)</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
