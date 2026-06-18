import { useState, useEffect } from "react";
import { useBraceStore, AGENT_COLORS, AGENT_ICONS } from "@/store/useBraceStore";
import { fmtRelative, fmtCost, hexToRgba } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Shield, Zap, Layers, Send } from "lucide-react";

const MEMORY_ICONS: Record<string, React.ElementType> = {
  fact: Check,
  rule: Shield,
  skill: Zap,
  preference: Layers,
};

export default function HomePage() {
  const { agents, tasks, memoryNodes, telemetry, dispatchTask, addToast, setPage } = useBraceStore();
  const [clock, setClock] = useState(new Date());
  const [nlInput, setNlInput] = useState("");

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hour = clock.getHours();
  const greeting =
    hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : hour < 22 ? "Good evening" : "Working late";

  const timeStr = clock.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
  const dateStr = clock.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const activeAgents = agents.filter((a) => a.status === "active").length;
  const runningTasks = tasks.filter((t) => t.status === "running").length;
  const blockedTasks = tasks.filter((t) => t.status === "blocked").length;
  const totalCost = telemetry.reduce((s, t) => s + t.costUsd, 0);
  const totalTokens = telemetry.reduce((s, t) => s + t.tokensProcessed, 0);

  const recentTasks = tasks.slice(0, 4);
  const agentRoster = agents.slice(0, 5);
  const memoryHighlights = memoryNodes.slice(0, 4);

  const handleDispatch = () => {
    if (!nlInput.trim()) return;
    const result = dispatchTask(nlInput.trim());
    addToast({
      kind: "success",
      title: "Task dispatched",
      message: `Routed to ${result.agent.name} (${result.intent.domain}) — ${result.task.id}`,
    });
    setNlInput("");
    setTimeout(() => setPage("missions"), 800);
  };

  const quickCommands = [
    "Research MCP server architecture",
    "Audit memory usage in agent runtime",
    "Schedule daily heartbeat job",
    "Curate yesterday's session memory",
  ];

  return (
    <div className="p-6 overflow-y-auto h-full">
      {/* Hero */}
      <div className="grid grid-cols-[1.6fr_1fr] gap-4 mb-5">
        {/* Greeting */}
        <motion.div
          className="relative overflow-hidden"
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--r-lg)",
            padding: "20px 22px",
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className="absolute pointer-events-none"
            style={{
              top: "-50%",
              right: "-20%",
              width: "60%",
              height: "200%",
              background: "radial-gradient(ellipse, rgba(34,211,238,0.08) 0%, transparent 70%)",
            }}
          />
          <h1 className="text-[22px] font-semibold mb-1 tracking-tight">
            {greeting}, Operator
          </h1>
          <p className="text-[12.5px] mb-4" style={{ color: "var(--text-muted)" }}>
            B.R.A.C.E Agent OS is online. {activeAgents} agents active, {runningTasks} runs in progress.
          </p>
          <div
            className="font-light tracking-wide mb-1"
            style={{ fontFamily: "var(--font-mono)", fontSize: 32, color: "var(--accent-cyan)" }}
          >
            {timeStr}{" "}
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              IST
            </span>
          </div>
          <div className="text-[11.5px]" style={{ color: "var(--text-secondary)" }}>
            {dateStr}
          </div>
        </motion.div>

        {/* System Status */}
        <motion.div
          className="flex flex-col gap-2.5"
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--r-lg)",
            padding: "16px 18px",
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <h3
            className="text-[10px] uppercase tracking-widest mb-1.5"
            style={{ color: "var(--text-muted)" }}
          >
            System Status
          </h3>
          <StatusRow label="Brain" value="Gemini 2.5 Flash · online" dotColor="var(--accent-emerald)" />
          <StatusRow label="Memory index" value={`${memoryNodes.length} nodes · healthy`} />
          <StatusRow label="Active agents" value={`${activeAgents} / ${agents.length}`} />
          <StatusRow label="Running tasks" value={`${runningTasks}`} valueColor="var(--accent-cyan)" />
          <StatusRow label="Pending approvals" value={`${blockedTasks}`} valueColor="var(--accent-rose)" />
          <StatusRow label="Today's cost" value={fmtCost(totalCost)} />
          <StatusRow label="Today's tokens" value={totalTokens.toLocaleString()} />
        </motion.div>
      </div>

      {/* Three-column grid */}
      <div className="grid grid-cols-3 gap-3.5 mb-4">
        {/* Today's Focus */}
        <motion.div
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--r-lg)",
            padding: "14px 16px",
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h3 className="text-[10px] uppercase tracking-widest mb-2.5 flex items-center justify-between" style={{ color: "var(--text-muted)" }}>
            Today's Focus
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "var(--bg-elev-2)", color: "var(--text-secondary)" }}
            >
              {tasks.filter((t) => t.status === "running" || t.status === "blocked").length} active
            </span>
          </h3>
          {recentTasks.map((t) => {
            const agent = agents.find((a) => a.id === t.assignedAgentId);
            return (
              <div
                key={t.id}
                className="flex items-center gap-2 py-1.5"
                style={{ borderBottom: "1px solid var(--hairline)", cursor: "pointer" }}
                onClick={() => t.status === "blocked" && setPage("missions")}
              >
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 5,
                    background: agent ? hexToRgba(AGENT_COLORS[agent.role], 0.15) : "var(--bg-elev-2)",
                    color: agent ? AGENT_COLORS[agent.role] : "var(--text-muted)",
                    fontSize: 10,
                  }}
                >
                  {agent ? AGENT_ICONS[agent.role] : "·"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11.5px] truncate" style={{ color: "var(--text-primary)" }}>
                    {t.title}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {agent?.name || "unassigned"} · {fmtRelative(t.createdAt)}
                  </div>
                </div>
                <div className={`badge-${t.status}`}>{t.status}</div>
              </div>
            );
          })}
        </motion.div>

        {/* Agent Roster */}
        <motion.div
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--r-lg)",
            padding: "14px 16px",
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <h3 className="text-[10px] uppercase tracking-widest mb-2.5 flex items-center justify-between" style={{ color: "var(--text-muted)" }}>
            Agent Roster
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "var(--bg-elev-2)", color: "var(--text-secondary)" }}
            >
              {agents.length} agents
            </span>
          </h3>
          {agentRoster.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 py-1.5"
              style={{ borderBottom: "1px solid var(--hairline)" }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  background: hexToRgba(AGENT_COLORS[a.role], 0.15),
                  color: AGENT_COLORS[a.role],
                  fontSize: 10,
                }}
              >
                {AGENT_ICONS[a.role]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11.5px]" style={{ color: "var(--text-primary)" }}>
                  {a.name}
                </div>
                <div className="text-[10px] capitalize" style={{ color: "var(--text-muted)" }}>
                  {a.role.replace(/_/g, " ")}
                </div>
              </div>
              <div className={a.status === "active" ? "badge-active" : "badge-idle"}>{a.status}</div>
            </div>
          ))}
        </motion.div>

        {/* Memory Highlights */}
        <motion.div
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--r-lg)",
            padding: "14px 16px",
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <h3 className="text-[10px] uppercase tracking-widest mb-2.5 flex items-center justify-between" style={{ color: "var(--text-muted)" }}>
            Memory Highlights
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "var(--bg-elev-2)", color: "var(--text-secondary)" }}
            >
              {memoryNodes.length} nodes
            </span>
          </h3>
          {memoryHighlights.map((m) => {
            const Icon = MEMORY_ICONS[m.type] || Layers;
            return (
              <div key={m.id} className="flex items-center gap-2 py-1.5" style={{ borderBottom: "1px solid var(--hairline)" }}>
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 5,
                    background: "var(--bg-elev-2)",
                    color: "var(--text-muted)",
                  }}
                >
                  <Icon size={12} strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11.5px] truncate" style={{ color: "var(--text-primary)" }}>
                    {m.content.length > 50 ? m.content.slice(0, 47) + "..." : m.content}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {m.type} · confidence {m.confidence}
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Natural Language Command */}
      <motion.div
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--r-lg)",
          padding: "14px 18px",
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <h3 className="text-[10px] uppercase tracking-widest mb-2.5" style={{ color: "var(--text-muted)" }}>
          Natural-language command — what would you like to delegate?
        </h3>
        <div
          className="flex gap-2"
          style={{
            background: "var(--bg-elev-1)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--r-md)",
            padding: "8px 10px",
          }}
        >
          <input
            className="flex-1 text-[12.5px] px-1.5 py-1"
            style={{ color: "var(--text-primary)" }}
            placeholder="Describe a task... (e.g., Research MCP server integrations)"
            value={nlInput}
            onChange={(e) => setNlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleDispatch()}
          />
          <motion.button
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-semibold rounded"
            style={{
              background: "var(--accent-cyan)",
              color: "var(--bg-base)",
            }}
            whileHover={{ background: "var(--accent-cyan-dim)" }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDispatch}
          >
            <Send size={12} strokeWidth={2} />
            Dispatch
          </motion.button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {quickCommands.map((cmd) => (
            <button
              key={cmd}
              className="text-[10.5px] px-2.5 py-1 rounded-full transition-all"
              style={{
                background: "var(--bg-elev-1)",
                border: "1px solid var(--hairline)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--hairline-cyan)";
                e.currentTarget.style.color = "var(--accent-cyan)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--hairline)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
              onClick={() => {
                setNlInput(cmd);
              }}
            >
              {cmd}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  dotColor,
  valueColor,
}: {
  label: string;
  value: string;
  dotColor?: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid var(--hairline)" }}>
      <span className="text-[11.5px]" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span className="text-[11.5px] font-medium flex items-center gap-1.5" style={{ color: valueColor || "var(--text-primary)" }}>
        {dotColor && (
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
          />
        )}
        {value}
      </span>
    </div>
  );
}
