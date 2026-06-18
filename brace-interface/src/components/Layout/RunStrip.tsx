import { useBraceStore } from "@/store/useBraceStore";
import { motion, AnimatePresence } from "framer-motion";

export default function RunStrip() {
  const { tasks, agents } = useBraceStore();
  const runningTasks = tasks.filter((t) => t.status === "running");
  const isRunning = runningTasks.length > 0;
  const activeAgentCount = agents.filter((a) => a.status === "active").length;

  return (
    <AnimatePresence>
      {isRunning && (
        <motion.footer
          className="flex items-center gap-3 px-4 shrink-0"
          style={{
            height: 36,
            background: "var(--bg-panel)",
            borderTop: "1px solid var(--hairline-cyan)",
            fontSize: 11,
            overflow: "hidden",
          }}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 36, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: "var(--accent-cyan)",
              boxShadow: "0 0 8px var(--accent-cyan)",
            }}
          />
          <span
            className="uppercase tracking-wider text-[9.5px]"
            style={{ color: "var(--text-muted)" }}
          >
            Running
          </span>
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>
            {runningTasks[0]?.title || "--"}
          </span>
          <span style={{ color: "var(--text-faint)" }}>·</span>
          <span className="uppercase tracking-wider text-[9.5px]" style={{ color: "var(--text-muted)" }}>
            Stage
          </span>
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>
            executing
          </span>
          <span style={{ color: "var(--text-faint)" }}>·</span>
          <span className="uppercase tracking-wider text-[9.5px]" style={{ color: "var(--text-muted)" }}>
            Agents
          </span>
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>
            {activeAgentCount}
          </span>

          <div className="flex-1" />

          <button
            className="px-2.5 py-1 text-[10.5px] rounded"
            style={{
              background: "var(--bg-elev-2)",
              border: "1px solid var(--hairline)",
              color: "var(--text-secondary)",
            }}
          >
            Pause
          </button>
          <button
            className="px-2.5 py-1 text-[10.5px] rounded"
            style={{
              background: "var(--bg-elev-2)",
              border: "1px solid var(--hairline)",
              color: "var(--text-secondary)",
            }}
          >
            Resume
          </button>
          <button
            className="px-2.5 py-1 text-[10.5px] rounded"
            style={{
              background: "var(--bg-elev-2)",
              border: "1px solid rgba(244,63,94,0.3)",
              color: "var(--accent-rose)",
            }}
          >
            Cancel run
          </button>
        </motion.footer>
      )}
    </AnimatePresence>
  );
}
