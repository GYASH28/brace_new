import { WorkspaceLayout } from "../WorkspaceLayout";
import { GitBranch, Code2, Globe2, Workflow, Link } from "lucide-react";
import { motion } from "framer-motion";

const INTEGRATIONS = [
  { id: "git", name: "Git Workflow", icon: GitBranch, status: "Connected", color: "text-orange-400" },
  { id: "vscode", name: "VS Code Server", icon: Code2, status: "Active", color: "text-blue-400" },
  { id: "browser", name: "Browser Automation", icon: Globe2, status: "Standby", color: "text-purple-400" },
  { id: "n8n", name: "n8n Webhooks", icon: Workflow, status: "Disconnected", color: "text-rose-400" },
];

export function IntegrationWorkspace({ chatPanel, onClose }: { chatPanel: React.ReactNode, onClose: () => void }) {
  const primaryPanel = (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-cyan-400 font-semibold mb-1">System Integrations</h2>
        <p className="text-xs text-white/50">Manage external tool connections and automation workflows.</p>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-2 gap-4 flex-1">
        {INTEGRATIONS.map((int, i) => {
          const Icon = int.icon;
          const isConnected = int.status !== "Disconnected";
          return (
            <motion.div
              key={int.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-black/20 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-colors group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2 bg-white/5 rounded-lg ${int.color}`}>
                  <Icon size={20} />
                </div>
                <div className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full ${
                  isConnected ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/40"
                }`}>
                  {int.status}
                </div>
              </div>
              <h3 className="font-medium text-sm text-white/90 group-hover:text-white transition-colors">{int.name}</h3>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-white/40 group-hover:text-cyan-400 transition-colors">
                <Link size={12} />
                <span>Configure connection</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  return (
    <WorkspaceLayout 
      type="integration" 
      onClose={onClose} 
      chatPanel={chatPanel} 
      primaryPanel={primaryPanel} 
    />
  );
}
