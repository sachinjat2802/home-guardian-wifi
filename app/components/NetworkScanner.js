"use client";
import { Wifi, RefreshCw, Lock, Signal } from "lucide-react";

export default function NetworkScanner({ networks, requestScan, connectedNetwork }) {
  return (
    <div className="glass p-6 flex-1 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Real WiFi Network Scanner</h3>
          <p className="text-xs text-[var(--text-muted)]">Live scan of all nearby access points — each AP acts as a free radar illuminator</p>
        </div>
        <button onClick={requestScan} className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)]/20 text-[var(--accent)] rounded-lg text-sm font-medium hover:bg-[var(--accent)]/30 transition border border-[var(--accent)]/30">
          <RefreshCw size={14} /> Rescan
        </button>
      </div>
      {connectedNetwork && (
        <div className="glass p-4 rounded-xl mb-4 border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <Wifi size={20} className="text-emerald-400" />
            <div className="flex-1">
              <p className="font-semibold text-sm">{connectedNetwork.ssid}</p>
              <p className="text-xs text-[var(--text-muted)]">{connectedNetwork.bssid} • Ch {connectedNetwork.channel} • {connectedNetwork.band}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-emerald-400">{connectedNetwork.signal}%</p>
              <p className="text-[10px] text-[var(--text-muted)]">Connected</p>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {/* Desktop Table View */}
        <table className="hidden md:table w-full text-sm">
          <thead>
            <tr className="text-[var(--text-muted)] text-xs uppercase tracking-wider border-b border-[var(--border-glass)]">
              <th className="text-left py-2 px-3">Network</th>
              <th className="text-left py-2 px-3">BSSID</th>
              <th className="text-center py-2 px-3">Ch</th>
              <th className="text-center py-2 px-3">Signal</th>
              <th className="text-center py-2 px-3">RSSI</th>
              <th className="text-left py-2 px-3">Security</th>
            </tr>
          </thead>
          <tbody>
            {networks.map((net, i) => (
              <tr key={`${net.bssid}-${i}`} className={`border-b border-[var(--border-glass)]/50 hover:bg-white/[0.02] transition ${net.isConnected ? "bg-emerald-500/5" : ""}`}>
                <td className="py-2.5 px-3 flex items-center gap-2">
                  <SignalBars signal={net.signal} />
                  <span className={net.isConnected ? "text-emerald-400 font-medium" : ""}>{net.ssid}</span>
                  {net.isConnected && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">Connected</span>}
                </td>
                <td className="py-2.5 px-3 font-mono text-xs text-[var(--text-muted)]">{net.bssid}</td>
                <td className="py-2.5 px-3 text-center font-mono">{net.channel}</td>
                <td className="py-2.5 px-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${net.signal}%`, background: net.signal > 70 ? "var(--success)" : net.signal > 40 ? "var(--warning)" : "var(--danger)" }} />
                    </div>
                    <span className="text-xs font-mono">{net.signal}%</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-xs">{net.rssi} dBm</td>
                <td className="py-2.5 px-3 text-xs flex items-center gap-1 text-[var(--text-muted)]">
                  <Lock size={10} /> {net.auth}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile Responsive Cards View */}
        <div className="flex flex-col gap-2.5 md:hidden">
          {networks.map((net, i) => (
            <div 
              key={`${net.bssid}-${i}`} 
              className={`p-3.5 rounded-xl border border-[var(--border-glass)] bg-black/20 flex items-center justify-between transition-all ${
                net.isConnected ? "border-emerald-500/30 bg-emerald-500/[0.02]" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <SignalBars signal={net.signal} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-semibold ${net.isConnected ? "text-emerald-400" : "text-gray-200"}`}>{net.ssid}</span>
                    {net.isConnected && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Connected</span>}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5 flex flex-wrap gap-1.5">
                    <span>Ch {net.channel}</span>
                    <span>•</span>
                    <span>{net.bssid}</span>
                  </div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-xs font-mono font-bold" style={{ color: net.signal > 70 ? "var(--success)" : net.signal > 40 ? "var(--warning)" : "var(--danger)" }}>
                  {net.rssi} dBm
                </span>
                <span className="text-[9px] text-[var(--text-muted)] font-mono mt-0.5 flex items-center gap-1">
                  <Lock size={9} /> {net.auth.split(" ")[0]}
                </span>
              </div>
            </div>
          ))}
        </div>

        {networks.length === 0 && (
          <p className="text-center text-[var(--text-muted)] py-12">Scanning for networks...</p>
        )}
      </div>
      <p className="text-[10px] text-[var(--text-muted)] mt-3">{networks.length} access points detected • Each AP provides additional multipath diversity for sensing</p>
    </div>
  );
}

function SignalBars({ signal }) {
  const bars = [signal > 20, signal > 40, signal > 60, signal > 80];
  const color = signal > 70 ? "var(--success)" : signal > 40 ? "var(--warning)" : "var(--danger)";
  return (
    <div className="flex items-end gap-[1px] h-3">
      {bars.map((active, i) => (
        <div key={i} className="w-[3px] rounded-sm transition-all" style={{ height: `${40 + i * 20}%`, background: active ? color : "rgba(255,255,255,0.1)" }} />
      ))}
    </div>
  );
}
