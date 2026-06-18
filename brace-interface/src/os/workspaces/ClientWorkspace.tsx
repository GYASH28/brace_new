import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WorkspaceLayout } from "../WorkspaceLayout";
import { Users, Building2, Globe, Plus, MoreHorizontal } from "lucide-react";

type TabId = "leads" | "clients" | "websites";

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "leads", label: "Leads Pipeline", icon: Users },
  { id: "clients", label: "Active Clients", icon: Building2 },
  { id: "websites", label: "Websites & Projects", icon: Globe },
];

const CACHED_CRM_STATE = {
  leads: [
    { id: 1, name: "Acme Corp", stage: "New", value: "$5,000" },
    { id: 2, name: "Global Tech", stage: "In Discussion", value: "$12,000" },
    { id: 3, name: "Stark Industries", stage: "Proposal Sent", value: "$45,000" },
  ],
  clients: [
    { id: 4, name: "Wayne Enterprises", stage: "Active", value: "$120,000/yr" },
    { id: 5, name: "Oscorp", stage: "Onboarding", value: "$15,000/mo" },
  ],
  websites: [
    { id: 6, name: "Acme Landing Page", stage: "Development", progress: 65 },
    { id: 7, name: "Stark E-Commerce", stage: "Planning", progress: 10 },
  ],
};

const STAGES = {
  leads: ["New", "In Discussion", "Proposal Sent", "Converted"],
  clients: ["Onboarding", "Active", "At Risk", "Churned"],
  websites: ["Planning", "Development", "Review", "Launched"],
};

export function ClientWorkspace({ chatPanel, onClose }: { chatPanel: React.ReactNode, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>("leads");

  const primaryPanel = (
    <div className="flex flex-col h-full space-y-6">
      {/* Header and Tabs */}
      <div className="flex items-end justify-between border-b border-white/10 pb-4">
        <div className="flex gap-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 pb-2 text-sm font-medium transition-colors ${
                  isActive ? "text-cyan-400" : "text-white/50 hover:text-white/80"
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="client-tab-indicator"
                    className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-cyan-400"
                  />
                )}
              </button>
            );
          })}
        </div>
        <button className="flex items-center gap-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs px-3 py-1.5 rounded-full transition-all border border-cyan-500/30">
          <Plus size={14} /> Add New
        </button>
      </div>

      {/* Kanban / Pipeline View */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max h-full">
          <AnimatePresence mode="popLayout">
            {STAGES[activeTab].map((stage, index) => {
              const items = CACHED_CRM_STATE[activeTab].filter((item) => item.stage === stage);
              
              return (
                <motion.div
                  key={stage}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="w-72 flex flex-col gap-3"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
                    <span>{stage}</span>
                    <span className="bg-white/10 px-2 py-0.5 rounded-full text-white/70">{items.length}</span>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 flex flex-col gap-3 bg-black/20 rounded-xl p-2 border border-white/5">
                    {items.length === 0 ? (
                      <div className="text-white/20 text-xs text-center italic py-4">Empty</div>
                    ) : (
                      items.map((item) => (
                        <motion.div
                          key={item.id}
                          layoutId={`card-${item.id}`}
                          whileHover={{ scale: 1.02, y: -2 }}
                          className="bg-white/5 border border-white/10 hover:border-cyan-500/30 rounded-lg p-3 cursor-pointer group transition-colors shadow-lg"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-sm font-medium text-white/90 group-hover:text-cyan-300 transition-colors">
                              {item.name}
                            </h3>
                            <button className="text-white/30 hover:text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal size={14} />
                            </button>
                          </div>
                          
                          {'value' in item && (
                            <div className="text-xs text-emerald-400/80 font-mono">
                              {item.value}
                            </div>
                          )}
                          
                          {'progress' in item && (
                            <div className="mt-3 space-y-1">
                              <div className="flex justify-between text-[10px] text-white/40">
                                <span>Progress</span>
                                <span>{item.progress}%</span>
                              </div>
                              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.progress}%` }}
                                  className="h-full bg-cyan-500"
                                />
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  return (
    <WorkspaceLayout 
      type="client" 
      onClose={onClose} 
      chatPanel={chatPanel} 
      primaryPanel={primaryPanel} 
    />
  );
}
