import { useState } from "react";
import { useBraceStore } from "@/store/useBraceStore";
import { Cpu, Play } from "lucide-react";
import { motion } from "framer-motion";

const RISK_BADGES: Record<string, string> = {
  low: "badge-done",
  medium: "badge-review",
  high: "badge-blocked",
  critical: "badge-blocked",
};

const DEFAULT_ARGS: Record<string, string> = {
  fs_read: JSON.stringify({ path: "./workspace/README.md" }, null, 2),
  fs_write: JSON.stringify({ path: "./workspace/notes.md", content: "# New note\n\nCreated via B.R.A.C.E ToolRegistry." }, null, 2),
  memory_append: JSON.stringify({ target: "USER", content: "Prefers concise responses without preamble." }, null, 2),
  terminal_execute: JSON.stringify({ command: "ls -la ./workspace/", cwd: "/workspace" }, null, 2),
};

export default function ToolsPage() {
  const { tools, selectedTool, setSelectedTool } = useBraceStore();
  const tool = tools.find((t) => t.id === selectedTool) || tools[0];

  const [args, setArgs] = useState(DEFAULT_ARGS[tool?.id] || "{}");
  const [result, setResult] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
    setArgs(DEFAULT_ARGS[toolId] || "{}");
    setResult(null);
  };

  const handleRun = () => {
    let parsedArgs: Record<string, unknown>;
    try {
      parsedArgs = JSON.parse(args);
    } catch (e) {
      setResult(`JSON parse error: ${e instanceof Error ? e.message : "Invalid JSON"}`);
      setIsError(true);
      return;
    }

    // Simulate tool execution
    setTimeout(() => {
      const mockResults: Record<string, { ok: boolean; result?: Record<string, unknown>; error?: string }> = {
        fs_read: {
          ok: true,
          result: {
            path: parsedArgs.path as string,
            size: 1247,
            content: `# ${String(parsedArgs.path).split("/").pop()}\n\nMock file content for ${parsedArgs.path}.\nIn a real deployment this would be the actual file content.`,
          },
        },
        fs_write: {
          ok: true,
          result: {
            written: (parsedArgs.content as string)?.length || 0,
            path: parsedArgs.path as string,
          },
        },
        memory_append: {
          ok: true,
          result: {
            appended: true,
            target: `${parsedArgs.target}.md`,
          },
        },
        terminal_execute: {
          ok: true,
          result: {
            exitCode: 0,
            stdout: `[mock] executed: ${parsedArgs.command}\n[cwd: ${parsedArgs.cwd || "/workspace"}]`,
            stderr: "",
            durationMs: 184,
          },
        },
      };

      const res = mockResults[tool.id] || { ok: false, error: "Unknown tool" };
      setResult(JSON.stringify(res, null, 2));
      setIsError(!res.ok);
    }, 300);
  };

  return (
    <div className="h-full overflow-hidden grid" style={{ gridTemplateColumns: "1fr 360px" }}>
      {/* Tool List */}
      <div className="p-4 overflow-y-auto">
        <h2 className="text-sm font-semibold mb-1">Tool Registry</h2>
        <p className="text-[11px] mb-3.5" style={{ color: "var(--text-muted)" }}>
          {tools.length} tools registered · {tools.filter((t) => t.enabled).length} enabled · 0 MCP servers connected
        </p>
        {tools.map((t) => (
          <motion.div
            key={t.id}
            className="flex items-center gap-3 mb-2 cursor-pointer"
            style={{
              background: selectedTool === t.id ? "var(--bg-elev-1)" : "var(--bg-panel)",
              border: `1px solid ${selectedTool === t.id ? "var(--hairline-strong)" : "var(--hairline)"}`,
              borderRadius: "var(--r-md)",
              padding: "12px 14px",
            }}
            whileHover={{ background: "var(--bg-elev-2)" }}
            onClick={() => handleToolSelect(t.id)}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: 7,
                background: "var(--bg-elev-2)",
                color: "var(--accent-cyan)",
              }}
            >
              <Cpu size={14} strokeWidth={1.8} />
            </div>
            <div className="flex-1">
              <div className="text-[12.5px] font-semibold" style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                {t.name}
              </div>
              <div className="text-[10.5px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                {t.description}
              </div>
              <div className="text-[9.5px] mt-1" style={{ fontFamily: "var(--font-mono)", color: "var(--text-faint)" }}>
                schema: {t.schema}
              </div>
            </div>
            <div className={RISK_BADGES[t.riskLevel] || "priority-low"} style={{ fontFamily: "var(--font-mono)" }}>
              {t.riskLevel}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tool Tester */}
      <div
        className="h-full flex flex-col overflow-hidden"
        style={{ background: "var(--bg-panel)", borderLeft: "1px solid var(--hairline)" }}
      >
        <h3
          className="px-3.5 py-3 text-[11px] uppercase tracking-widest"
          style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--hairline)" }}
        >
          Tool Tester — dry run
        </h3>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-2.5">
            <label className="block text-[9.5px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
              Tool
            </label>
            <input
              className="w-full px-2.5 py-1.5 rounded text-[11.5px]"
              style={{
                background: "var(--bg-elev-1)",
                border: "1px solid var(--hairline)",
                fontFamily: "var(--font-mono)",
                color: "var(--text-primary)",
              }}
              value={tool?.id || ""}
              readOnly
            />
          </div>
          <div className="mb-2.5">
            <label className="block text-[9.5px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
              Arguments (JSON)
            </label>
            <textarea
              className="w-full px-2.5 py-1.5 rounded text-[11.5px] resize-y"
              style={{
                background: "var(--bg-elev-1)",
                border: "1px solid var(--hairline)",
                fontFamily: "var(--font-mono)",
                color: "var(--text-primary)",
                minHeight: 120,
              }}
              rows={6}
              value={args}
              onChange={(e) => setArgs(e.target.value)}
            />
          </div>
          <div className="text-[9.5px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
            Result
          </div>
          <pre
            className="p-2.5 rounded overflow-x-auto text-[10.5px]"
            style={{
              background: "#04060a",
              border: "1px solid var(--hairline)",
              fontFamily: "var(--font-mono)",
              color: isError ? "var(--accent-rose)" : "#5dd896",
              minHeight: 100,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {result || "// Click \"Run tool\" to execute"}
          </pre>
        </div>
        <div className="px-3.5 py-2.5" style={{ borderTop: "1px solid var(--hairline)" }}>
          <motion.button
            className="w-full flex items-center justify-center gap-2 py-2 text-[11.5px] font-semibold rounded"
            style={{ background: "var(--accent-cyan)", color: "var(--bg-base)" }}
            whileHover={{ background: "var(--accent-cyan-dim)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRun}
          >
            <Play size={12} strokeWidth={2} />
            Run tool (dry-run)
          </motion.button>
        </div>
      </div>
    </div>
  );
}
