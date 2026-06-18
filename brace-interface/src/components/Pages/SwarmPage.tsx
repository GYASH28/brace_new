import { useRef } from "react";
import { useBraceStore, AGENT_COLORS, AGENT_ICONS } from "@/store/useBraceStore";
import { fmtCost, hexToRgba } from "@/lib/utils";
import { Orbit, RefreshCw } from "lucide-react";

export default function SwarmPage() {
  const { agents, tasks, selectedAgentId, setSelectedAgentId } = useBraceStore();
  const svgRef = useRef<SVGSVGElement>(null);

  const activeCount = agents.filter((a) => a.status === "active").length;
  const runningCount = tasks.filter((t) => t.status === "running").length;

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <div className="h-full overflow-hidden grid" style={{ gridTemplateColumns: "1fr 360px" }}>
      {/* Canvas */}
      <div className="relative overflow-hidden" style={{
        background: `
          linear-gradient(rgba(34,211,238,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(34,211,238,0.025) 1px, transparent 1px),
          radial-gradient(ellipse at center, var(--bg-base) 0%, #06080c 100%)`,
        backgroundSize: "40px 40px, 40px 40px, 100% 100%",
      }}>
        {/* Header */}
        <div
          className="absolute top-3.5 left-3.5 z-5 flex items-center gap-2.5"
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--r-md)",
            padding: "8px 12px",
            fontSize: 11,
          }}
        >
          <Orbit size={14} strokeWidth={1.8} />
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            Holographic Swarm Canvas
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
            {agents.length} nodes · {activeCount} active · {runningCount} runs
          </span>
        </div>

        {/* Toolbar */}
        <div
          className="absolute top-3.5 right-3.5 z-5 flex gap-1.5"
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--r-md)",
            padding: 4,
          }}
        >
          {["All", "Active", "Idle"].map((f) => (
            <button
              key={f}
              className="px-2.5 py-1 text-[10.5px] rounded transition-all"
              style={{
                background: f === "All" ? "var(--bg-elev-3)" : "transparent",
                color: f === "All" ? "var(--accent-cyan)" : "var(--text-secondary)",
              }}
            >
              {f}
            </button>
          ))}
          <button className="px-2.5 py-1 text-[10.5px] rounded flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
            <RefreshCw size={11} strokeWidth={2} />
          </button>
        </div>

        {/* SVG Canvas */}
        <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" viewBox="0 0 960 600">
          {/* Edges */}
          <g className="edges">
            {agents.filter((a) => a.role !== "conductor").map((a) => {
              const conductor = agents.find((ag) => ag.role === "conductor");
              if (!conductor) return null;
              const isActive = a.status === "active";
              return (
                <g key={`edge-${a.id}`}>
                  <path
                    className={isActive ? "edge-active" : ""}
                    d={bezierPath(conductor.x, conductor.y, a.x, a.y)}
                    fill="none"
                    stroke={isActive ? "var(--accent-cyan)" : "var(--hairline-strong)"}
                    strokeWidth={1}
                    strokeDasharray={isActive ? "0" : "3 4"}
                    opacity={isActive ? 0.9 : 0.4}
                  />
                  <text
                    x={(conductor.x + a.x) / 2}
                    y={(conductor.y + a.y) / 2 - 8}
                    fontSize={9}
                    fill="var(--text-muted)"
                    textAnchor="middle"
                    fontFamily="var(--font-mono)"
                  >
                    {isActive ? "streaming" : "idle"}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Nodes */}
          {agents.map((a) => {
            const color = AGENT_COLORS[a.role];
            const icon = AGENT_ICONS[a.role];
            const isSelected = a.id === selectedAgentId;

            return (
              <g
                key={a.id}
                className="agent-node"
                transform={`translate(${a.x}, ${a.y})`}
                onClick={() => setSelectedAgentId(a.id)}
                style={{ cursor: "pointer" }}
              >
                {/* Pulse ring for active */}
                {a.status === "active" && (
                  <circle
                    r={22}
                    fill="none"
                    stroke={color}
                    strokeWidth={1}
                    opacity={0.6}
                  >
                    <animate
                      attributeName="r"
                      values="22;40"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.6;0"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Outer ring */}
                <circle
                  r={26}
                  fill="none"
                  stroke={color}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  opacity={isSelected ? 1 : 0.6}
                />

                {/* Body */}
                <circle
                  r={22}
                  fill={hexToRgba(color, 0.12)}
                  stroke={color}
                  strokeWidth={1.5}
                />

                {/* Icon */}
                <text
                  y={2}
                  fontSize={18}
                  fontWeight={700}
                  fill={color}
                  textAnchor="middle"
                  dominantBaseline="central"
                  pointerEvents="none"
                >
                  {icon}
                </text>

                {/* Name */}
                <text y={44} fontSize={11} fontWeight={600} fill="var(--text-primary)" textAnchor="middle" pointerEvents="none">
                  {a.name}
                </text>

                {/* Role */}
                <text
                  y={58}
                  fontSize={9.5}
                  fill="var(--text-muted)"
                  textAnchor="middle"
                  pointerEvents="none"
                  style={{ textTransform: "uppercase" }}
                  letterSpacing={0.5}
                >
                  {a.role.replace(/_/g, " ")}
                </text>

                {/* Status pill */}
                <g transform="translate(0, 70)">
                  <rect
                    x={-30}
                    y={0}
                    width={60}
                    height={14}
                    rx={7}
                    fill={hexToRgba(color, 0.15)}
                    stroke={color}
                    strokeWidth={0.5}
                  />
                  <text
                    y={10}
                    fontSize={8.5}
                    fontWeight={600}
                    fill={color}
                    textAnchor="middle"
                    pointerEvents="none"
                    style={{ textTransform: "uppercase" }}
                    letterSpacing={0.5}
                  >
                    {a.status}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div
          className="absolute bottom-3.5 left-3.5 z-5 flex gap-3.5"
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--r-md)",
            padding: "8px 12px",
            fontSize: 10,
          }}
        >
          {[
            { color: "var(--status-active)", label: "Active" },
            { color: "var(--status-idle)", label: "Idle" },
            { color: "var(--status-suspended)", label: "Suspended" },
            { color: "var(--accent-cyan)", label: "Data flow" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Telemetry Sidebar */}
      <TelemetrySidebar agent={selectedAgent} />
    </div>
  );
}

function TelemetrySidebar({ agent }: { agent: ReturnType<typeof useBraceStore.getState>["agents"][0] | undefined }) {
  const { telemetry, tasks, messages } = useBraceStore();

  if (!agent) {
    return (
      <div
        className="h-full"
        style={{
          background: "var(--bg-panel)",
          borderLeft: "1px solid var(--hairline)",
        }}
      />
    );
  }

  const color = AGENT_COLORS[agent.role];
  const agentMessages = messages.filter((m) => m.agentId === agent.id);
  const agentTelemetry = telemetry.filter((t) => t.agentId === agent.id);
  const totalTokens = agentTelemetry.reduce((s, t) => s + t.tokensProcessed, 0);
  const totalCost = agentTelemetry.reduce((s, t) => s + t.costUsd, 0);
  const assignedTasks = tasks.filter((t) => t.assignedAgentId === agent.id);

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{
        background: "var(--bg-panel)",
        borderLeft: "1px solid var(--hairline)",
      }}
    >
      {/* Header */}
      <div className="px-4 py-3.5" style={{ borderBottom: "1px solid var(--hairline)" }}>
        <div className="flex items-center gap-2.5 text-sm font-semibold">
          <div
            className="flex items-center justify-center text-sm font-bold"
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: `linear-gradient(135deg, ${hexToRgba(color, 0.6)}, ${color})`,
              color: "var(--bg-base)",
            }}
          >
            {AGENT_ICONS[agent.role]}
          </div>
          <span>{agent.name}</span>
        </div>
        <div
          className="mt-1 text-[10.5px] uppercase tracking-wider"
          style={{ color: "var(--text-muted)", marginLeft: 36 }}
        >
          {agent.role.replace(/_/g, " ")} · {agent.modelProvider}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-px" style={{ background: "var(--hairline)" }}>
        <MetricTile label="Status" value={agent.status} valueClass={agent.status === "active" ? "text-[var(--accent-cyan)]" : ""} />
        <MetricTile label="Tokens (24h)" value={totalTokens.toLocaleString()} />
        <MetricTile label="Cost (24h)" value={fmtCost(totalCost)} valueClass="text-[var(--accent-amber)]" />
        <MetricTile
          label="Active tasks"
          value={String(assignedTasks.filter((t) => t.status === "running").length)}
          valueClass="text-[var(--accent-emerald)]"
        />
      </div>

      {/* System Prompt */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--hairline)" }}>
        <h4 className="text-[9.5px] uppercase tracking-wider mb-2 flex items-center justify-between" style={{ color: "var(--text-muted)" }}>
          System prompt summary
          <span className="flex items-center gap-1 text-[9px]" style={{ color: "var(--accent-rose)" }}>
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--accent-rose)", animation: "pulse 1.2s ease infinite" }}
            />
            LIVE
          </span>
        </h4>
        <div className="text-[10.5px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {agent.systemPrompt}
        </div>
      </div>

      {/* Terminal Stream */}
      <div className="flex-1 flex flex-col overflow-hidden px-4 py-3" style={{ borderBottom: "1px solid var(--hairline)" }}>
        <h4 className="text-[9.5px] uppercase tracking-wider mb-2 flex items-center justify-between shrink-0" style={{ color: "var(--text-muted)" }}>
          Live terminal stream
          <span className="flex items-center gap-1 text-[9px]" style={{ color: "var(--accent-rose)" }}>
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--accent-rose)", animation: "pulse 1.2s ease infinite" }}
            />
            tail
          </span>
        </h4>
        <TerminalStream agent={agent} messages={agentMessages} />
      </div>

      {/* Run Config */}
      <div className="px-4 py-3">
        <h4 className="text-[9.5px] uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
          Run config
        </h4>
        <div className="grid grid-cols-2 gap-1.5 text-[10.5px]" style={{ color: "var(--text-secondary)" }}>
          <div>
            max steps: <span style={{ color: "var(--text-primary)" }}>{agent.maxSteps}</span>
          </div>
          <div>
            concurrency: <span style={{ color: "var(--text-primary)" }}>{agent.concurrency}</span>
          </div>
          <div>
            token budget: <span style={{ color: "var(--text-primary)" }}>{agent.tokenBudget.toLocaleString()}</span>
          </div>
          <div>
            cost budget: <span style={{ color: "var(--text-primary)" }}>{fmtCost(agent.costBudgetUsd)}</span>
          </div>
          <div>
            temperature: <span style={{ color: "var(--text-primary)" }}>{agent.temperature}</span>
          </div>
          <div>
            permission: <span style={{ color: "var(--text-primary)" }}>{agent.permissionScope}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="px-3.5 py-2.5" style={{ background: "var(--bg-panel)" }}>
      <div className="text-[9.5px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div
        className={`font-semibold text-sm ${valueClass || ""}`}
        style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}
      >
        {value}
      </div>
    </div>
  );
}

function TerminalStream({ agent, messages }: { agent: ReturnType<typeof useBraceStore.getState>["agents"][0]; messages: ReturnType<typeof useBraceStore.getState>["messages"] }) {
  const lines = generateTerminalLines(agent, messages);

  return (
    <div
      className="flex-1 overflow-y-auto p-2.5 rounded text-[10.5px] leading-relaxed"
      style={{
        background: "#04060a",
        border: "1px solid var(--hairline)",
        fontFamily: "var(--font-mono)",
        color: "#5dd896",
        maxHeight: 260,
      }}
    >
      {lines.map((line, i) => (
        <div key={i} className="block">
          <span style={{ color: "#4a5160" }}>[{line.ts}]</span>{" "}
          <span style={{ color: line.kindColor }}>[{line.kind}]</span>{" "}
          {line.text}
        </div>
      ))}
    </div>
  );
}

function generateTerminalLines(
  agent: ReturnType<typeof useBraceStore.getState>["agents"][0],
  messages: ReturnType<typeof useBraceStore.getState>["messages"]
) {
  const now = new Date();
  const ts = (d: Date) => d.toLocaleTimeString("en-US", { hour12: false });
  const lines: { ts: string; kind: string; kindColor: string; text: string }[] = [];

  lines.push({
    ts: ts(now),
    kind: "system",
    kindColor: "#6b7180",
    text: `▶ agent.run.started agent=${agent.id} model=${agent.modelProvider}`,
  });

  if (agent.status === "active") {
    lines.push({
      ts: ts(now),
      kind: "think",
      kindColor: "#a78bfa",
      text: "Loading SOUL.md + AGENTS.md + USER.md (progressive disclosure)",
    });
    lines.push({
      ts: ts(now),
      kind: "think",
      kindColor: "#a78bfa",
      text: `Context budget: 4,820 / ${agent.tokenBudget.toLocaleString()} tokens`,
    });
    lines.push({
      ts: ts(now),
      kind: "act",
      kindColor: "#f59e0b",
      text: `tool.call web_search args={"q":"OpenClaw Gateway architecture"}`,
    });
    lines.push({
      ts: ts(now),
      kind: "tool",
      kindColor: "#22d3ee",
      text: "web_search → 7 results, 1.18s",
    });
    lines.push({
      ts: ts(now),
      kind: "observe",
      kindColor: "#5dd896",
      text: "7 sources found · extracting key claims...",
    });
  } else {
    lines.push({
      ts: ts(now),
      kind: "idle",
      kindColor: "#6b7180",
      text: "No active run · awaiting task assignment from Conductor",
    });
  }

  messages.slice(0, 3).forEach((m) => {
    lines.push({
      ts: ts(new Date(m.createdAt)),
      kind: "msg",
      kindColor: "#22d3ee",
      text: `${m.sender}: ${m.content.slice(0, 80)}${m.content.length > 80 ? "..." : ""}`,
    });
  });

  return lines;
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}
