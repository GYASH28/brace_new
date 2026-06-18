import type { ReactNode } from "react";
import { useState } from "react";
import { WorkspaceLayout } from "./WorkspaceLayout";
import { AgentCanvas } from "../components/AgentCanvas";
import { MissionsBoard } from "../components/MissionsBoard";
import { TelemetrySidebar } from "../components/TelemetrySidebar";
import { ApprovalModal } from "../components/ApprovalModal";
import type { ApprovalLike } from "../components/ApprovalModal";
import { AgentBuilder } from "../components/AgentBuilder";
import { RunTrace } from "../components/RunTrace";
import { GoalsView } from "../components/GoalsView";
import { LibraryView } from "../components/LibraryView";
import { StudioPacks } from "../components/StudioPacks";
import { WorkflowBuilder } from "../components/WorkflowBuilder";

interface OsWorkspaceProps {
  chatPanel: ReactNode;
  onClose: () => void;
}

export function OsWorkspace({ chatPanel, onClose }: OsWorkspaceProps) {
  const [selectedApproval, setSelectedApproval] = useState<ApprovalLike | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshRuntimePanels = () => setRefreshKey((value) => value + 1);

  return (
    <>
      <WorkspaceLayout
        type="os"
        onClose={onClose}
        chatPanel={chatPanel}
        primaryPanel={
          <div key={refreshKey} className="h-full flex flex-col gap-4 overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex-1 overflow-hidden" style={{ minHeight: '360px' }}>
                <AgentCanvas />
              </div>
              <div className="flex-1 overflow-hidden" style={{ minHeight: '360px' }}>
                <RunTrace />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <GoalsView />
              <LibraryView />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StudioPacks />
              <WorkflowBuilder />
            </div>
            <div className="flex-1 overflow-hidden border-t border-white/10 pt-4" style={{ minHeight: '300px' }}>
              <AgentBuilder />
            </div>
            <div className="flex-1 overflow-hidden border-t border-white/10 pt-4" style={{ minHeight: '340px' }}>
              <MissionsBoard onSelectApproval={setSelectedApproval} />
            </div>
          </div>
        }
        secondaryPanel={<TelemetrySidebar key={refreshKey} />}
      />

      <ApprovalModal
        isOpen={Boolean(selectedApproval)}
        approval={selectedApproval}
        onClose={() => setSelectedApproval(null)}
        onResolved={refreshRuntimePanels}
      />
    </>
  );
}
