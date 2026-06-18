import { useBraceStore } from "@/store/useBraceStore";
import type { PageId } from "@/types";
import {
  LayoutDashboard,
  Orbit,
  Columns3,
  Database,
  Wrench,
  Activity,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";

const NAV_ITEMS: { id: PageId; label: string; icon: React.ElementType; attention?: boolean }[] = [
  { id: "home", label: "Mission", icon: LayoutDashboard },
  { id: "swarm", label: "Swarm", icon: Orbit },
  { id: "missions", label: "Missions", icon: Columns3, attention: true },
  { id: "memory", label: "Memory", icon: Database },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function NavRail() {
  const { currentPage, setPage, tasks } = useBraceStore();
  const blockedCount = tasks.filter((t) => t.status === "blocked").length;

  return (
    <nav className="flex flex-col items-center py-3 gap-1 overflow-y-auto overflow-x-hidden"
      style={{ background: "var(--bg-panel)", borderRight: "1px solid var(--hairline)", width: 64 }}>
      {/* Logo */}
      <motion.div
        className="flex items-center justify-center font-bold text-sm mb-3"
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: "linear-gradient(135deg, var(--accent-cyan-dim), var(--accent-cyan))",
          color: "var(--bg-base)",
          boxShadow: "var(--shadow-glow-cyan)",
          letterSpacing: "-0.5px",
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="B.R.A.C.E Agent OS"
      >
        BR
      </motion.div>

      {/* Nav items */}
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        const showAttention = item.id === "missions" && blockedCount > 0;

        return (
          <motion.button
            key={item.id}
            className="relative flex flex-col items-center justify-center gap-0.5"
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              color: isActive ? "var(--accent-cyan)" : "var(--text-muted)",
              background: isActive ? "rgba(34,211,238,0.08)" : "transparent",
              transition: "all var(--dur-fast) var(--ease)",
            }}
            onClick={() => setPage(item.id)}
            whileHover={{ backgroundColor: "var(--bg-elev-1)" }}
            whileTap={{ scale: 0.95 }}
          >
            {isActive && (
              <motion.div
                className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                style={{ background: "var(--accent-cyan)" }}
                layoutId="rail-indicator"
                transition={{ duration: 0.2 }}
              />
            )}
            <Icon size={16} strokeWidth={1.8} />
            <span className="text-[8px] font-medium uppercase tracking-wider opacity-80">
              {item.label}
            </span>
            {showAttention && (
              <span
                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                style={{
                  background: "var(--accent-amber)",
                  boxShadow: "0 0 8px var(--accent-amber)",
                }}
              />
            )}
          </motion.button>
        );
      })}

      <div className="flex-1" />
    </nav>
  );
}
