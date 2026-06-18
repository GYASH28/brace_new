import { useState } from "react";
import { useBraceStore } from "@/store/useBraceStore";
import { AlertTriangle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { escapeHtml } from "@/lib/utils";

export default function ApprovalModal() {
  const { pendingApprovalTaskId, tasks, agents, resolveApproval, setPendingApprovalTaskId } = useBraceStore();
  const [feedback, setFeedback] = useState("");

  const task = pendingApprovalTaskId ? tasks.find((t) => t.id === pendingApprovalTaskId) : null;
  const agent = task ? agents.find((a) => a.id === task.assignedAgentId) : null;
  const payload = task?.approvalPayload;

  const isOpen = !!task && !!payload;

  const handleClose = () => {
    setPendingApprovalTaskId(null);
    setFeedback("");
  };

  const handleApprove = () => {
    if (task) resolveApproval(task.id, "approve");
    handleClose();
  };

  const handleDeny = () => {
    if (task) resolveApproval(task.id, "deny", feedback);
    handleClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="flex flex-col overflow-hidden"
            style={{
              background: "var(--bg-panel)",
              border: "1px solid var(--hairline-amber)",
              borderRadius: "var(--r-lg)",
              width: 600,
              maxWidth: "92vw",
              maxHeight: "85vh",
              boxShadow: "var(--shadow-glow-amber), var(--shadow-md)",
            }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: "1px solid var(--hairline)" }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(245,158,11,0.15)",
                  color: "var(--accent-amber)",
                }}
              >
                <AlertTriangle size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Approval Gate — Critical Action</h3>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {agent?.name || "An agent"} is attempting a {payload?.risk}-risk operation
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-2.5 mb-3.5">
                <MetaItem label="Requesting agent" value={agent?.name || "unknown"} />
                <MetaItem label="Tool" value={payload?.tool || ""} isMono accentColor="var(--accent-cyan)" />
                <MetaItem
                  label="Risk level"
                  value={payload?.risk || ""}
                  riskClass={
                    payload?.risk === "critical"
                      ? "text-[var(--accent-rose)] font-bold uppercase"
                      : payload?.risk === "high"
                      ? "text-[var(--accent-rose)] font-semibold"
                      : payload?.risk === "medium"
                      ? "text-[var(--accent-amber)]"
                      : "text-[var(--accent-emerald)]"
                  }
                />
                <MetaItem
                  label="Reversible"
                  value={payload?.reversible ? "Yes" : "No"}
                  valueColor={payload?.reversible ? "var(--accent-emerald)" : "var(--accent-rose)"}
                />
                <div className="col-span-2">
                  <MetaItem label="Affected accounts / targets" value={payload?.affectedAccounts?.join(", ") || ""} />
                </div>
              </div>

              {/* Payload */}
              <div className="text-[9.5px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                Exact payload the agent intends to execute
              </div>
              <pre
                className="p-3 rounded mb-3.5 overflow-x-auto"
                style={{
                  background: "#04060a",
                  border: "1px solid var(--hairline)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11.5,
                  lineHeight: 1.6,
                  color: "#f5c875",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                <code dangerouslySetInnerHTML={{ __html: syntaxHighlight(JSON.stringify(payload?.args || {}, null, 2)) }} />
              </pre>

              {/* Feedback */}
              <div className="text-[9.5px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                Operator feedback (optional — injected into agent context on deny)
              </div>
              <textarea
                className="w-full p-2 rounded text-[11.5px] resize-y"
                style={{
                  minHeight: 60,
                  background: "var(--bg-elev-1)",
                  border: "1px solid var(--hairline)",
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                }}
                placeholder="e.g. Use a non-destructive path, or scope writes to /workspace only..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>

            {/* Footer */}
            <div className="flex gap-2.5 justify-end px-5 py-3.5" style={{ borderTop: "1px solid var(--hairline)" }}>
              <button
                className="px-4 py-2 text-[11.5px] font-semibold tracking-wide rounded transition-all"
                style={{
                  background: "var(--bg-elev-2)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--hairline)",
                }}
                onClick={handleClose}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-[11.5px] font-semibold tracking-wide rounded transition-all"
                style={{
                  background: "rgba(244,63,94,0.1)",
                  color: "var(--accent-rose)",
                  border: "1px solid rgba(244,63,94,0.3)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(244,63,94,0.2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(244,63,94,0.1)")}
                onClick={handleDeny}
              >
                Deny with feedback
              </button>
              <button
                className="px-4 py-2 text-[11.5px] font-semibold tracking-wide rounded transition-all"
                style={{
                  background: "var(--accent-amber)",
                  color: "var(--bg-base)",
                  border: "1px solid var(--accent-amber)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-amber-dim)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent-amber)")}
                onClick={handleApprove}
              >
                Authorize execution
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MetaItem({
  label,
  value,
  isMono,
  accentColor,
  riskClass,
  valueColor,
}: {
  label: string;
  value: string;
  isMono?: boolean;
  accentColor?: string;
  riskClass?: string;
  valueColor?: string;
}) {
  return (
    <div
      className="p-2 rounded"
      style={{ background: "var(--bg-elev-1)", border: "1px solid var(--hairline)" }}
    >
      <div
        className="text-[9.5px] uppercase tracking-wider mb-0.5"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </div>
      <div
        className={`text-xs ${riskClass || ""}`}
        style={
          isMono
            ? { fontFamily: "var(--font-mono)", color: accentColor || "var(--text-primary)" }
            : valueColor
            ? { color: valueColor }
            : { color: "var(--text-primary)" }
        }
      >
        {value}
      </div>
    </div>
  );
}

function syntaxHighlight(json: string): string {
  return escapeHtml(json)
    .replace(/(&quot;[^&]+?&quot;)(:)/g, '<span style="color:#22d3ee">$1</span>$2')
    .replace(/: (&quot;[^&]*?&quot;)/g, ': <span style="color:#5dd896">$1</span>')
    .replace(/: (\d+)/g, ': <span style="color:#a78bfa">$1</span>')
    .replace(/: (true|false|null)/g, ': <span style="color:#a78bfa">$1</span>');
}
