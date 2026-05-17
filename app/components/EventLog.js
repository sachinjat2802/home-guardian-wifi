"use client";
import { Activity, Moon, Shield, AlertTriangle, Info } from "lucide-react";

export default function EventLog({ events }) {
  const icons = { info: Info, sleep: Moon, system: Shield, alert: AlertTriangle };
  const borderColors = { info: "var(--accent)", sleep: "var(--purple)", system: "var(--success)", alert: "var(--warning)" };

  return (
    <section className="glass p-5 rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden">
      <h3 className="text-sm font-semibold mb-3">Event Log</h3>
      <div className="flex flex-col gap-2 overflow-y-auto flex-1">
        {events.length === 0 && <p className="text-xs text-[var(--text-muted)] text-center py-4">No events yet</p>}
        {events.slice(0, 20).map((event) => {
          const Icon = icons[event.type] || Activity;
          return (
            <div key={event.id} className="flex gap-2.5 p-2.5 rounded-lg bg-white/[0.015] border-l-2" style={{ borderLeftColor: borderColors[event.type] || "var(--accent)" }}>
              <Icon size={14} className="mt-0.5 shrink-0 text-[var(--text-secondary)]" />
              <div className="min-w-0">
                <p className="text-xs leading-snug">{event.msg}</p>
                <span className="text-[10px] text-[var(--text-muted)]">{event.time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
