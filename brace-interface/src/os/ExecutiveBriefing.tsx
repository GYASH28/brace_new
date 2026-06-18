import { useState, useEffect } from "react";
import { ListChecks, ShieldAlert, WifiOff } from "lucide-react";
import { braceClient } from "../lib/braceClient";

interface BriefingItem {
  id: string | number;
  text: string;
  type: "task" | "approval" | "system";
}

export function ExecutiveBriefing() {
  const [briefs, setBriefs] = useState<BriefingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBriefing() {
      try {
        const stateRes: any = await braceClient.state();
        const items: BriefingItem[] = [];

        if (stateRes) {
          const { tasks = [], approvals = [], settings } = stateRes;
          
          // 1. Approvals
          approvals.forEach((app: any) => {
            items.push({
              id: app.id,
              text: `Approval required: ${app.description || app.command || "Run Action"}`,
              type: "approval",
            });
          });

          // 2. Tasks
          tasks.slice(0, 3).forEach((task: any) => {
            if (task.status === "pending") {
              items.push({
                id: task.id,
                text: `Pending Task: ${task.title}`,
                type: "task",
              });
            }
          });

          // 3. System voice status check
          if (settings && !settings.voiceOutput) {
            items.push({
              id: "voice-status",
              text: "Voice provider output is muted. Enable in settings.",
              type: "system",
            });
          }
        }


        setBriefs(items);
      } catch (err) {
        setBriefs([
          { id: "err", text: "Failed to connect to local Express agent server.", type: "system" },
        ]);
      } finally {
        setLoading(false);
      }
    }

    loadBriefing();
  }, []);

  const [resolving, setResolving] = useState<string | number | null>(null);

  const handleResolveApproval = async (id: string, decision: "approve" | "reject") => {
    setResolving(id);
    try {
      await braceClient.resolveApproval({ id, decision });
      setBriefs((prev) => prev.filter((b) => b.id !== id));
    } catch (error) {
      console.error(`Failed to ${decision} approval:`, error);
    } finally {
      setResolving(null);
    }
  };

  if (loading) {
    return <div className="text-white/40 text-xs animate-pulse">Scanning system state...</div>;
  }

  return (
    <div className="bg-black/30 border border-white/10 rounded-xl p-4 max-w-md w-full">
      <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3 font-semibold">
        Executive Briefing
      </h3>
      
      <div className="space-y-3">
        {briefs.map((brief) => (
          <div key={brief.id} className="flex items-start gap-3 text-sm">
            <span className="mt-0.5 shrink-0">
              {brief.type === "approval" ? (
                <ShieldAlert size={15} className="text-amber-400" />
              ) : brief.type === "system" ? (
                <WifiOff size={15} className="text-red-400" />
              ) : (
                <ListChecks size={15} className="text-cyan-400" />
              )}
            </span>
            <div className="flex-1">
              <div className="text-white/80 leading-normal text-xs">{brief.text}</div>
              {brief.type === "approval" && (
                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={() => handleResolveApproval(String(brief.id), "approve")}
                    disabled={resolving === brief.id}
                    className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-amber-500/20 text-amber-300 rounded hover:bg-amber-500/30 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleResolveApproval(String(brief.id), "reject")}
                    disabled={resolving === brief.id}
                    className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
