import { useState } from "react";
import { RefreshCw } from "lucide-react";

export default function AgentWorkspace({
  icon: Icon,
  title,
  themeColor = "blue",
  stats = [],
  visualFlair,
  buttonText,
  reportTitle,
  reportSubtitle,
  emptyStateText,
  prompt,
}) {
  const [report, setReport] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const runDiagnostics = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setReport("");

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) throw new Error("Analysis failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let reply = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          reply += decoder.decode(value);
          setReport(reply);
        }
      }
    } catch (err) {
      setReport("❌ AI computation failed. Check connection or API key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const colorMap = {
    blue: { text: "text-blue-400", bg: "bg-blue-600 hover:bg-blue-500 text-white", shadow: "shadow-[0_0_10px_rgba(59,130,246,0.3)]", titleText: "text-blue-300", iconEmpty: "text-blue-500/40" },
    cyan: { text: "text-cyan-400", bg: "bg-cyan-500 hover:bg-cyan-400 text-black", shadow: "shadow-[0_0_10px_rgba(6,182,212,0.3)]", titleText: "text-cyan-300", iconEmpty: "text-cyan-500/40" },
    rose: { text: "text-rose-400", bg: "bg-rose-600 hover:bg-rose-500 text-white", shadow: "shadow-[0_0_10px_rgba(244,63,94,0.3)]", titleText: "text-rose-300", iconEmpty: "text-rose-500/40" },
    violet: { text: "text-violet-400", bg: "bg-violet-600 hover:bg-violet-500 text-white", shadow: "shadow-[0_0_10px_rgba(139,92,246,0.3)]", titleText: "text-violet-300", iconEmpty: "text-violet-500/40" },
    emerald: { text: "text-emerald-400", bg: "bg-emerald-500 hover:bg-emerald-400 text-black", shadow: "shadow-[0_0_10px_rgba(16,185,129,0.3)]", titleText: "text-emerald-300", iconEmpty: "text-emerald-500/40" },
    fuchsia: { text: "text-fuchsia-400", bg: "bg-fuchsia-600 hover:bg-fuchsia-500 text-white", shadow: "shadow-[0_0_10px_rgba(217,70,239,0.3)]", titleText: "text-fuchsia-300", iconEmpty: "text-fuchsia-500/40" },
    amber: { text: "text-amber-500", bg: "bg-amber-500 hover:bg-amber-400 text-black", shadow: "shadow-[0_0_10px_rgba(245,158,11,0.3)]", titleText: "text-amber-400", iconEmpty: "text-amber-500/40" },
    indigo: { text: "text-indigo-400", bg: "bg-indigo-600 hover:bg-indigo-500 text-white", shadow: "shadow-[0_0_10px_rgba(99,102,241,0.3)]", titleText: "text-indigo-300", iconEmpty: "text-indigo-500/40" },
    teal: { text: "text-teal-400", bg: "bg-teal-600 hover:bg-teal-500 text-white", shadow: "shadow-[0_0_10px_rgba(20,184,166,0.3)]", titleText: "text-teal-300", iconEmpty: "text-teal-500/40" },
    red: { text: "text-red-400", bg: "bg-red-600 hover:bg-red-500 text-white", shadow: "shadow-[0_0_10px_rgba(239,68,68,0.3)]", titleText: "text-red-300", iconEmpty: "text-red-500/40" },
    purple: { text: "text-purple-400", bg: "bg-purple-600 hover:bg-purple-500 text-white", shadow: "shadow-[0_0_10px_rgba(168,85,247,0.3)]", titleText: "text-purple-300", iconEmpty: "text-purple-500/40" },
    orange: { text: "text-orange-400", bg: "bg-orange-500 hover:bg-orange-400 text-black", shadow: "shadow-[0_0_10px_rgba(249,115,22,0.3)]", titleText: "text-orange-300", iconEmpty: "text-orange-500/40" },
  };

  const theme = colorMap[themeColor] || colorMap.blue;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-full min-h-0 overflow-hidden">
      
      {/* Left tactical inspector */}
      <div className="glass p-4 rounded-xl border border-[var(--border-glass)] bg-black/25 flex flex-col gap-4 overflow-y-auto">
        <h4 className={`text-[10px] font-mono ${theme.text} tracking-wider uppercase font-bold flex items-center gap-1.5`}>
          <Icon size={13} /> {title}
        </h4>

        <div className="flex flex-col gap-2 font-mono text-[9px] text-gray-400">
          {stats.map((stat, i) => (
            <div key={i} className="flex justify-between border-b border-white/5 pb-1">
              <span>{stat.label}:</span>
              <span className={`${stat.color || theme.text} font-bold`}>{stat.value}</span>
            </div>
          ))}
        </div>

        {visualFlair}

        <button
          onClick={runDiagnostics}
          disabled={isAnalyzing}
          className={`w-full py-2 ${theme.bg} rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none disabled:opacity-50 ${theme.shadow}`}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw size={12} className="animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <Icon size={12} /> {buttonText}
            </>
          )}
        </button>
      </div>

      {/* Right Report output */}
      <div className="glass p-5 rounded-2xl flex flex-col justify-between bg-black/40 h-full min-h-0 overflow-hidden border border-[var(--border-glass)]">
        <div className="border-b border-white/5 pb-2.5 flex-shrink-0">
          <h3 className={`text-xs font-bold ${theme.titleText} font-mono uppercase tracking-wider`}>{reportTitle}</h3>
          <p className="text-[9px] text-[var(--text-muted)] font-mono">{reportSubtitle}</p>
        </div>

        <div className="flex-1 overflow-y-auto my-4 pr-1 scrollbar-thin">
          {report ? (
            <div className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
              {report}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 p-8">
              <Icon size={36} className={`${theme.iconEmpty} animate-pulse`} />
              <p className="text-[10px] font-mono text-[var(--text-muted)] max-w-sm leading-normal">
                {emptyStateText}
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
