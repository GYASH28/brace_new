import type { ReactNode } from "react";
import { WorkspaceLayout } from "./WorkspaceLayout";
import { AgentCanvas } from "../components/AgentCanvas";
import { MissionsBoard } from "../components/MissionsBoard";
import { TelemetrySidebar } from "../components/TelemetrySidebar";
import { ApprovalModal } from "../components/ApprovalModal";
import { useState } from "react";

interface OsWorkspaceProps {
  chatPanel: ReactNode;
  onClose: () => void;
}

export function OsWorkspace({ chatPanel, onClose }: OsWorkspaceProps) {
  const [showApproval, setShowApproval] = useState(false);

  return (
    <>
      <WorkspaceLayout
        type="os"
        onClose={onClose}
        chatPanel={chatPanel}
        primaryPanel={
          <div className="h-full flex flex-col gap-4">
            <div className="flex-1 overflow-hidden" style={{ minHeight: '300px' }}>
              <AgentCanvas />
            </div>
            <div className="flex-1 overflow-hidden border-t border-white/10 pt-4" style={{ minHeight: '300px' }}>
              <MissionsBoard />
            </div>
          </div>
        }
        secondaryPanel={
          <TelemetrySidebar />
        }
      />

      <ApprovalModal
        isOpen={showApproval}
        agentName="Builder"
        actionCommand="npm install reactflow"
        riskLevel="MEDIUM"
        onApprove={() => setShowApproval(false)}
        onDeny={() => setShowApproval(false)}
      />
      {/* For demonstration purposes, a button to trigger approval */}
      <button 
        onClick={() => setShowApproval(true)}
        className="fixed bottom-4 left-4 z-50 bg-yellow-500 text-black px-4 py-2 rounded font-bold"
      >
        Simulate Security Alert
      </button>
    </>
  );
}
