import { useBraceStore } from "@/store/useBraceStore";
import { Search } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  home: "Mission Control",
  swarm: "Swarm Canvas",
  missions: "Missions",
  memory: "Memory Vault",
  tools: "Tool Registry",
  activity: "Activity",
  settings: "Settings",
};

export default function TopBar() {
  const { currentPage, tasks, memoryNodes } = useBraceStore();
  const blockedTasks = tasks.filter((t) => t.status === "blocked").length;

  return (
    <header
      className="flex items-center gap-3 px-4 shrink-0"
      style={{
        height: 44,
        background: "var(--bg-panel)",
        borderBottom: "1px solid var(--hairline)",
        fontSize: 11,
      }}
    >
      {/* Title */}
      <div className="flex items-center gap-2 font-semibold text-[13px]" style={{ color: "var(--text-primary)" }}>
        <span>{PAGE_TITLES[currentPage] || "Module"}</span>
        <span className="font-normal" style={{ color: "var(--text-muted)" }}></span>
      </div>

      {/* Status tiles */}
      <StatusTile dotColor="var(--accent-emerald)" text="Brain: Gemini 2.5 Flash" />
      <StatusTile
        dotColor={blockedTasks > 0 ? "var(--accent-amber)" : "var(--accent-emerald)"}
        text={`${blockedTasks} approval pending`}
      />
      <StatusTile dotColor="var(--accent-emerald)" text={`Memory: ${memoryNodes.length} nodes`} />
      <StatusTile dotColor="var(--text-faint)" text="Cloud sync: off" />

      <div className="flex-1" />

      {/* Search */}
      <div
        className="flex items-center gap-2"
        style={{
          padding: "5px 10px",
          background: "var(--bg-elev-1)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--r-sm)",
          width: 220,
          color: "var(--text-muted)",
        }}
      >
        <Search size={11} strokeWidth={2} />
        <input
          placeholder="Search memory, tasks, agents..."
          className="flex-1 text-[11px]"
          style={{ color: "var(--text-primary)" }}
          readOnly
        />
        <kbd
          className="text-[9px] px-1 py-0.5 rounded"
          style={{
            fontFamily: "var(--font-mono)",
            background: "var(--bg-elev-3)",
            border: "1px solid var(--hairline-strong)",
            color: "var(--text-muted)",
          }}
        >
          ⌘K
        </kbd>
      </div>

      {/* Profile */}
      <div
        className="flex items-center justify-center font-semibold text-[11px]"
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--accent-amber-dim), var(--accent-amber))",
          color: "var(--bg-base)",
        }}
        title="Operator"
      >
        OP
      </div>
    </header>
  );
}

function StatusTile({ dotColor, text }: { dotColor: string; text: string }) {
  return (
    <div
      className="flex items-center gap-1.5"
      style={{
        padding: "4px 10px",
        background: "var(--bg-elev-1)",
        border: "1px solid var(--hairline)",
        borderRadius: "var(--r-sm)",
        fontSize: 10.5,
        color: "var(--text-secondary)",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
      />
      {text}
    </div>
  );
}
