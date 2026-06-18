import { useState } from "react";
import { useBraceStore } from "@/store/useBraceStore";
import { fmtTime, escapeHtml } from "@/lib/utils";
import { Activity } from "lucide-react";

const TABS = ["All events", "Tool calls", "Agent runs", "Approvals"];

export default function ActivityPage() {
  const { auditEvents } = useBraceStore();
  const [activeTab, setActiveTab] = useState(0);

  const filteredEvents = auditEvents.filter((e) => {
    if (activeTab === 0) return true;
    if (activeTab === 1) return e.type.startsWith("tool.");
    if (activeTab === 2) return e.type.startsWith("agent.run.");
    if (activeTab === 3) return e.type.includes("approval") || e.type === "tool.approved" || e.type === "tool.denied";
    return true;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 shrink-0"
        style={{ borderBottom: "1px solid var(--hairline)" }}
      >
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Activity size={14} strokeWidth={2} />
          Audit Timeline
        </h2>
        <div className="flex gap-1">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              className="px-3 py-1.5 text-[11px] rounded transition-all"
              style={{
                background: activeTab === i ? "var(--bg-elev-2)" : "transparent",
                color: activeTab === i ? "var(--accent-cyan)" : "var(--text-secondary)",
              }}
              onClick={() => setActiveTab(i)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        {filteredEvents.map((e) => (
          <div
            key={e.id}
            className="grid items-center gap-3 py-2"
            style={{
              gridTemplateColumns: "90px 140px 1fr 100px",
              borderBottom: "1px solid var(--hairline)",
              fontSize: 11,
            }}
          >
            <span className="font-mono text-[10.5px]" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              {fmtTime(e.timestamp)}
            </span>
            <span
              className="text-[10.5px]"
              style={{ fontFamily: "var(--font-mono)", color: "var(--accent-cyan)" }}
            >
              {e.type}
            </span>
            <span className="truncate" style={{ color: "var(--text-primary)" }}>
              {escapeHtml(JSON.stringify(e.payload))}
            </span>
            <span className="text-right text-[10.5px]" style={{ color: "var(--text-muted)" }}>
              {e.actor || "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
