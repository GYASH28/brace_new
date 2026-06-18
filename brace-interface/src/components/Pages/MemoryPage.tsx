import { useBraceStore } from "@/store/useBraceStore";
import { fmtRelative, escapeHtml } from "@/lib/utils";
import { FileText, Check, Shield, Zap, Layers } from "lucide-react";

const MEMORY_ICONS: Record<string, React.ElementType> = {
  fact: Check,
  rule: Shield,
  skill: Zap,
  preference: Layers,
};

const MEMORY_COLORS: Record<string, string> = {
  fact: "var(--accent-cyan)",
  rule: "var(--accent-amber)",
  skill: "var(--accent-emerald)",
  preference: "var(--accent-violet)",
  episodic: "var(--accent-rose)",
  procedural: "var(--text-muted)",
};

const FILE_FRONTMATTER: Record<string, string> = {
  "SOUL.md": `---\nid: soul_v1\ntype: procedural\nworkspace: global\nproject: all\nsource: user\nconfidence: 1.0\nsensitivity: immutable\ntags: [identity, ethics]\n---`,
  "AGENTS.md": `---\nid: agents_v1\ntype: procedural\nworkspace: global\nproject: all\nsource: system\nconfidence: 1.0\nsensitivity: normal\ntags: [coordination, standards]\n---`,
  "USER.md": `---\nid: user_v1\ntype: preference\nworkspace: personal\nproject: all\nsource: user\nconfidence: 1.0\nsensitivity: private\ntags: [preferences, schedule]\n---`,
};

export default function MemoryPage() {
  const { memoryFiles, memoryNodes, selectedMemoryFile, setSelectedMemoryFile } = useBraceStore();

  const files = Object.keys(memoryFiles);
  const content = memoryFiles[selectedMemoryFile] || "";
  const frontmatter = FILE_FRONTMATTER[selectedMemoryFile] || "";

  return (
    <div className="h-full overflow-hidden grid" style={{ gridTemplateColumns: "280px 1fr 320px" }}>
      {/* File List */}
      <div
        className="overflow-y-auto p-3"
        style={{ background: "var(--bg-panel)", borderRight: "1px solid var(--hairline)" }}
      >
        <h3 className="text-[10px] uppercase tracking-widest mx-1 my-2" style={{ color: "var(--text-muted)" }}>
          Memory Files
        </h3>
        {files.map((f) => (
          <button
            key={f}
            className="w-full flex items-center gap-2 text-[11.5px] py-2 px-2.5 rounded transition-all"
            style={{
              color: selectedMemoryFile === f ? "var(--accent-cyan)" : "var(--text-secondary)",
              background: selectedMemoryFile === f ? "var(--bg-elev-2)" : "transparent",
            }}
            onClick={() => setSelectedMemoryFile(f)}
          >
            <FileText size={14} strokeWidth={1.8} style={{ color: selectedMemoryFile === f ? "var(--accent-cyan)" : "var(--text-muted)" }} />
            {f}
          </button>
        ))}

        <h3 className="text-[10px] uppercase tracking-widest mx-1 my-2 mt-3.5" style={{ color: "var(--text-muted)" }}>
          Memory Nodes
        </h3>
        {memoryNodes.map((m) => {
          const Icon = MEMORY_ICONS[m.type] || Layers;
          return (
            <div
              key={m.id}
              className="flex items-center gap-2 text-[11.5px] py-2 px-2.5 rounded cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
              title={m.content.slice(0, 60)}
            >
              <Icon size={14} strokeWidth={1.8} style={{ color: "var(--text-muted)" }} />
              <span className="truncate">{m.type}</span>
            </div>
          );
        })}
      </div>

      {/* Editor */}
      <div className="flex flex-col overflow-hidden" style={{ background: "var(--bg-base)" }}>
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--hairline)" }}
        >
          <h3 className="text-[13px] font-semibold">{selectedMemoryFile}</h3>
          <span className="text-[10.5px]" style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            ./workspace/.os/{selectedMemoryFile}
          </span>
        </div>
        <div
          className="flex-1 overflow-y-auto px-5 py-4 text-xs leading-7"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--text-secondary)",
            whiteSpace: "pre-wrap",
          }}
        >
          {frontmatter && (
            <div
              className="p-2 rounded mb-3 text-[11px]"
              style={{ background: "var(--bg-panel)", color: "var(--text-muted)" }}
            >
              {frontmatter.split("\n").map((line, i) => {
                if (line.includes(":")) {
                  const [k, v] = line.split(":");
                  return (
                    <div key={i}>
                      <span style={{ color: "var(--accent-amber)" }}>{k}:</span>
                      <span>{v}</span>
                    </div>
                  );
                }
                return <div key={i}>{line}</div>;
              })}
            </div>
          )}
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
        </div>
        <div
          className="flex items-center justify-between px-5 py-2 text-[10.5px]"
          style={{ borderTop: "1px solid var(--hairline)", color: "var(--text-muted)" }}
        >
          <span>
            Source:{" "}
            {selectedMemoryFile === "SOUL.md"
              ? "user-authored"
              : selectedMemoryFile === "AGENTS.md"
              ? "system"
              : "agent-curated"}{" "}
            · last updated {fmtRelative(new Date(Date.now() - 3600000).toISOString())}
          </span>
          <span>
            {content.split("\n").length} lines · {content.length} chars
          </span>
        </div>
      </div>

      {/* Memory Graph */}
      <div
        className="flex flex-col overflow-hidden"
        style={{ background: "var(--bg-panel)", borderLeft: "1px solid var(--hairline)" }}
      >
        <h3 className="px-3.5 py-3 text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--hairline)" }}>
          Omniscient Memory Graph
        </h3>
        <div className="flex-1 relative">
          <svg className="w-full h-full" viewBox="0 0 320 320">
            {/* Center node */}
            <circle cx={160} cy={160} r={6} fill="var(--accent-cyan)" opacity={0.6} />

            {/* Memory nodes */}
            {memoryNodes.slice(0, 8).map((node, i) => {
              const angle = (i / Math.min(memoryNodes.length, 8)) * Math.PI * 2;
              const r = 110;
              const x = 160 + Math.cos(angle) * r;
              const y = 160 + Math.sin(angle) * r;
              const color = MEMORY_COLORS[node.type] || "var(--text-muted)";

              return (
                <g key={node.id} className="mem-node cursor-pointer">
                  {/* Connection line */}
                  <line
                    x1={160}
                    y1={160}
                    x2={x}
                    y2={y}
                    stroke="var(--hairline)"
                    strokeWidth={0.5}
                    strokeDasharray="2 3"
                    opacity={0.4}
                  />
                  {/* Node */}
                  <circle
                    cx={x}
                    cy={y}
                    r={10}
                    fill={`${color}33`}
                    stroke={color}
                    strokeWidth={1.5}
                  />
                  <text x={x} y={y + 24} fontSize={9} fill="var(--text-secondary)" textAnchor="middle">
                    {node.type}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div
            className="absolute bottom-2 left-2 flex flex-col gap-0.5"
            style={{
              background: "var(--bg-panel)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--r-sm)",
              padding: "6px 8px",
              fontSize: 9.5,
            }}
          >
            {Object.entries(MEMORY_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                {type}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderMarkdown(md: string): string {
  return md
    .split("\n")
    .map((line) => {
      if (line.startsWith("# ")) return `<h1 style="color:var(--accent-cyan);font-size:16px;margin-bottom:8px;font-family:var(--font-sans);font-weight:600">${escapeHtml(line.slice(2))}</h1>`;
      if (line.startsWith("## ")) return `<h2 style="color:var(--text-primary);font-size:13px;margin:12px 0 6px;font-family:var(--font-sans);font-weight:600">${escapeHtml(line.slice(3))}</h2>`;
      if (line.startsWith("### ")) return `<h2 style="color:var(--text-primary);font-size:12px;font-family:var(--font-sans);font-weight:600">${escapeHtml(line.slice(4))}</h2>`;
      if (/^\d+\.\s/.test(line)) return `<div style="margin:2px 0 2px 18px">${escapeHtml(line)}</div>`;
      if (line.startsWith("- ")) return `<div style="margin:2px 0 2px 18px">• ${escapeHtml(line.slice(2))}</div>`;
      if (line.trim() === "") return "<br>";
      return `<div>${escapeHtml(line)}</div>`;
    })
    .join("");
}
