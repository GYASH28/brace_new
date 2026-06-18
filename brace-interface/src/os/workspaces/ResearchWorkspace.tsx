import { WorkspaceLayout } from "../WorkspaceLayout";

export function ResearchWorkspace({ chatPanel, onClose }: { chatPanel: React.ReactNode, onClose: () => void }) {
  const primaryPanel = (
    <div className="space-y-4">
      <div className="text-cyan-400 text-sm font-semibold border-b border-white/10 pb-2">
        Web Research Sources
      </div>
      <div className="space-y-2 text-xs text-white/70">
        <div className="p-2 bg-white/5 rounded border border-white/10">
          <div className="font-semibold text-white">Google Search Results</div>
          <div className="text-white/40 mt-1">Found 4 relevant documents...</div>
        </div>
      </div>
    </div>
  );

  return (
    <WorkspaceLayout 
      type="research" 
      onClose={onClose} 
      chatPanel={chatPanel} 
      primaryPanel={primaryPanel} 
    />
  );
}
