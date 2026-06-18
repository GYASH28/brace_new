import type { ReactNode } from "react";
import { X } from "lucide-react";

export type WorkspaceType = "general" | "coding" | "research" | "client" | "integration";

interface WorkspaceLayoutProps {
  type: WorkspaceType;
  onClose: () => void;
  // Dynamic children to place into panels
  chatPanel: ReactNode;
  primaryPanel?: ReactNode; // E.g., File Explorer, Terminal, Research sources
  secondaryPanel?: ReactNode; // E.g., Diff viewer, approvals list
}

export function WorkspaceLayout({
  type,
  onClose,
  chatPanel,
  primaryPanel,
  secondaryPanel,
}: WorkspaceLayoutProps) {
  if (type === "general") {
    return (
      <div className="w-full max-w-4xl mx-auto h-[calc(100vh-280px)] flex flex-col justify-end">
        {chatPanel}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-16 bottom-0 z-30 bg-black/95 backdrop-blur-2xl flex flex-col">
      {/* Workspace Header */}
      <div className="h-12 border-b border-white/10 px-4 flex items-center justify-between bg-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <h2 className="text-sm font-semibold tracking-wider uppercase text-white/90">
            {type} WORKSPACE
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-md text-white/60 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Grid Layouts depending on workspace panels */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Primary Panel */}
        {primaryPanel && (
          <div className={`col-span-${secondaryPanel ? '3' : '4'} border-r border-white/10 overflow-y-auto bg-black/40 p-4`}>
            {primaryPanel}
          </div>
        )}

        {/* Chat & Assistant Output */}
        <div className={`col-span-${primaryPanel && secondaryPanel ? '5' : primaryPanel ? '8' : '12'} ${secondaryPanel ? 'border-r' : ''} border-white/10 flex flex-col overflow-hidden bg-gray-950/20`}>
          <div className="flex-1 overflow-y-auto">
            {chatPanel}
          </div>
        </div>

        {/* Secondary Panel */}
        {secondaryPanel && (
          <div className="col-span-4 overflow-y-auto bg-black/50 p-4">
            {secondaryPanel}
          </div>
        )}
      </div>
    </div>
  );
}
