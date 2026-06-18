import { useState } from "react";
import { Folder, Terminal, Check, ShieldAlert } from "lucide-react";
import { WorkspaceLayout } from "../WorkspaceLayout";

export function CodingWorkspace({ chatPanel, onClose }: { chatPanel: React.ReactNode, onClose: () => void }) {
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "C:\\Users\\Admin\\Desktop\\projects> git status",
    "On branch main",
    "Your branch is up to date with 'origin/main'.",
    "nothing to commit, working tree clean"
  ]);

  const primaryPanel = (
    <div className="space-y-4 font-mono text-xs text-white/80">
      <div className="flex items-center gap-2 text-cyan-400 font-semibold border-b border-white/10 pb-2">
        <Folder size={14} />
        <span>Workspace Files</span>
      </div>
      <div className="space-y-1">
        <div>📁 src</div>
        <div className="pl-4">📁 os</div>
        <div className="pl-8 text-cyan-300">📄 BraceOrb.tsx</div>
        <div className="pl-8 text-cyan-300">📄 WorkspaceLayout.tsx</div>
        <div className="pl-4">📄 App.tsx</div>
        <div>📄 package.json</div>
      </div>
    </div>
  );

  const secondaryPanel = (
    <div className="flex flex-col h-full font-mono text-xs text-white/90">
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
        <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
          <Terminal size={14} />
          Live Terminal & Approvals
        </span>
      </div>
      <div className="flex-1 bg-black/40 border border-white/5 rounded p-3 overflow-y-auto space-y-1 text-[11px] text-green-400 h-40">
        {terminalLogs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
      {/* Human-in-the-loop Gate Card */}
      <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
        <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
          <ShieldAlert size={14} />
          <span>Pending Confirmation</span>
        </div>
        <p className="text-[11px] text-white/70 mb-3">
          FORGE agent has prepared changes for package.json. Commit edits?
        </p>
        <div className="flex gap-2">
          <button 
            onClick={() => setTerminalLogs(prev => [...prev, "✔ Commit created successfully."])}
            className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 rounded text-black font-semibold text-xs transition-colors flex items-center justify-center gap-1"
          >
            <Check size={12} /> Confirm
          </button>
          <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors">
            Reject
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <WorkspaceLayout 
      type="coding" 
      onClose={onClose} 
      chatPanel={chatPanel} 
      primaryPanel={primaryPanel} 
      secondaryPanel={secondaryPanel} 
    />
  );
}
