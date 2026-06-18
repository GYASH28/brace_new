import { useBraceStore, AGENT_COLORS, AGENT_ICONS } from "@/store/useBraceStore";
import type { TaskStatus } from "@/types";
import { motion } from "framer-motion";
import { AlertTriangle, Columns3 } from "lucide-react";

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "pending", label: "Pending", color: "var(--task-pending)" },
  { id: "running", label: "Running", color: "var(--task-running)" },
  { id: "blocked", label: "Blocked", color: "var(--task-blocked)" },
  { id: "review", label: "Review", color: "var(--task-review)" },
  { id: "done", label: "Done", color: "var(--task-done)" },
];

export default function MissionsPage() {
  const { tasks, agents, setPendingApprovalTaskId } = useBraceStore();

  const counts = COLUMNS.reduce(
    (acc, col) => {
      acc[col.id] = tasks.filter((t) => t.status === col.id).length;
      return acc;
    },
    {} as Record<string, number>
  );

  const handleTaskClick = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task?.status === "blocked" && task.approvalPayload) {
      setPendingApprovalTaskId(taskId);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 shrink-0"
        style={{ borderBottom: "1px solid var(--hairline)" }}
      >
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Columns3 size={14} strokeWidth={2} />
          Missions Kanban Matrix
        </h2>
        <div className="flex gap-3.5 text-[10.5px]" style={{ color: "var(--text-muted)" }}>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--task-running)" }} />
            {counts.running} running
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--task-blocked)" }} />
            {counts.blocked} blocked
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--task-review)" }} />
            {counts.review} in review
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--task-done)" }} />
            {counts.done} done
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-5 gap-3 p-4 overflow-x-auto flex-1">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);

          return (
            <div
              key={col.id}
              className="flex flex-col overflow-hidden min-w-[220px]"
              style={{
                background: "var(--bg-panel)",
                border: "1px solid var(--hairline)",
                borderRadius: "var(--r-md)",
              }}
            >
              {/* Column header */}
              <div
                className="flex items-center justify-between px-3 py-2.5"
                style={{
                  borderBottom: "1px solid var(--hairline)",
                  background: col.id === "blocked" ? "rgba(244,63,94,0.06)" : "transparent",
                }}
              >
                <div className="flex items-center text-[10.5px] font-semibold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full mr-1.5" style={{ background: col.color }} />
                  <span style={{ color: col.id === "blocked" ? "var(--accent-rose)" : "var(--text-primary)" }}>
                    {col.label}
                  </span>
                </div>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: "var(--bg-elev-2)", color: "var(--text-secondary)" }}
                >
                  {counts[col.id]}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 overflow-y-auto flex flex-col gap-2 min-h-[100px]">
                {colTasks.length === 0 && (
                  <div className="text-center py-5 text-[10px]" style={{ color: "var(--text-faint)" }}>
                    No tasks
                  </div>
                )}
                {colTasks.map((task) => {
                  const agent = agents.find((a) => a.id === task.assignedAgentId);
                  const color = agent ? AGENT_COLORS[agent.role] : "var(--text-muted)";
                  const icon = agent ? AGENT_ICONS[agent.role] : "?";
                  const isBlocked = task.status === "blocked";

                  return (
                    <motion.div
                      key={task.id}
                      className={`cursor-pointer ${isBlocked ? "blocked-card" : ""}`}
                      style={{
                        background: "var(--bg-elev-1)",
                        border: `1px solid ${isBlocked ? "rgba(244,63,94,0.4)" : "var(--hairline)"}`,
                        borderRadius: "var(--r-sm)",
                        padding: "10px 12px",
                        transition: "all var(--dur-fast) var(--ease)",
                      }}
                      whileHover={{
                        background: "var(--bg-elev-2)",
                        borderColor: isBlocked ? "rgba(244,63,94,0.6)" : "var(--hairline-strong)",
                      }}
                      onClick={() => handleTaskClick(task.id)}
                    >
                      <div className="text-xs font-medium mb-1 flex items-center gap-1.5">
                        {isBlocked && (
                          <AlertTriangle size={12} className="shrink-0" style={{ color: "var(--accent-rose)" }} />
                        )}
                        <span style={{ color: "var(--text-primary)" }}>{task.title}</span>
                      </div>
                      <div className="text-[10.5px] mb-2 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                        {task.description}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[9.5px]" style={{ color: "var(--text-secondary)" }}>
                          <div
                            className="flex items-center justify-center text-[9px] font-bold"
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 4,
                              background: color,
                              color: "var(--bg-base)",
                            }}
                          >
                            {icon}
                          </div>
                          <span>{agent?.name || "unassigned"}</span>
                        </div>
                        <div className={`priority-${task.priority}`}>{task.priority}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
