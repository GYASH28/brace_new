import { motion } from "framer-motion";

export type OrbState =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "delegating"
  | "executing"
  | "awaiting-approval"
  | "speaking"
  | "error";

interface BraceOrbProps {
  state: OrbState;
  onClick?: () => void;
  progress?: number; // 0 to 100 for executing state
}

export function BraceOrb({ state, onClick, progress = 0 }: BraceOrbProps) {
  // Configs for different visual styles depending on state
  const getGlowColor = () => {
    switch (state) {
      case "listening":
        return "shadow-[0_0_50px_20px_rgba(34,211,238,0.4)] bg-cyan-400";
      case "thinking":
      case "transcribing":
        return "shadow-[0_0_50px_20px_rgba(168,85,247,0.4)] bg-purple-500";
      case "delegating":
        return "shadow-[0_0_50px_20px_rgba(59,130,246,0.4)] bg-blue-500";
      case "executing":
        return "shadow-[0_0_50px_20px_rgba(16,185,129,0.4)] bg-emerald-500";
      case "awaiting-approval":
        return "shadow-[0_0_50px_20px_rgba(245,158,11,0.4)] bg-amber-500";
      case "speaking":
        return "shadow-[0_0_60px_25px_rgba(6,182,212,0.5)] bg-cyan-300";
      case "error":
        return "shadow-[0_0_50px_20px_rgba(239,68,68,0.4)] bg-red-500";
      case "idle":
      default:
        return "shadow-[0_0_40px_15px_rgba(103,232,249,0.2)] bg-cyan-500/80";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative w-48 h-48 flex items-center justify-center cursor-pointer" onClick={onClick}>
        
        {/* Outer Ring for Executing Progress or Awaiting Approval */}
        {state === "executing" && (
          <svg className="absolute w-52 h-52 -rotate-90">
            <circle
              cx="104"
              cy="104"
              r="96"
              className="stroke-white/5 fill-none"
              strokeWidth="4"
            />
            <motion.circle
              cx="104"
              cy="104"
              r="96"
              className="stroke-emerald-400 fill-none"
              strokeWidth="4"
              strokeDasharray={2 * Math.PI * 96}
              initial={{ strokeDashoffset: 2 * Math.PI * 96 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 96 * (1 - progress / 100) }}
              transition={{ duration: 0.3 }}
            />
          </svg>
        )}

        {state === "awaiting-approval" && (
          <motion.div
            className="absolute w-52 h-52 rounded-full border border-amber-500/50"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />
        )}

        {/* Orbiting Dots for Delegating State */}
        {state === "delegating" && (
          <div className="absolute w-52 h-52 animate-spin duration-3000">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.8)]" />
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
          </div>
        )}

        {/* Central Orb Core */}
        <motion.div
          animate={
            state === "idle"
              ? { scale: [1, 1.06, 1], opacity: [0.8, 1, 0.8] }
              : state === "listening"
              ? { scale: [1, 1.15, 0.95, 1.1, 1], rotate: [0, 10, -10, 0] }
              : state === "thinking"
              ? { rotate: 360 }
              : state === "speaking"
              ? { scale: [1, 1.18, 0.98, 1.12, 1] }
              : {}
          }
          transition={
            state === "idle"
              ? { repeat: Infinity, duration: 4, ease: "easeInOut" }
              : state === "thinking"
              ? { repeat: Infinity, duration: 3, ease: "linear" }
              : state === "listening" || state === "speaking"
              ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
              : {}
          }
          className={`w-36 h-36 rounded-full transition-all duration-500 flex items-center justify-center ${getGlowColor()}`}
        >
          {/* Internal rotating mesh effect for thinking */}
          {(state === "thinking" || state === "transcribing") && (
            <div className="w-28 h-28 rounded-full border border-white/20 border-dashed animate-spin duration-5000" />
          )}
        </motion.div>
      </div>

      {/* State Text Label */}
      <span className="text-xs uppercase tracking-[0.25em] text-white/50 select-none animate-pulse">
        {state === "awaiting-approval" ? "Action Required" : state}
      </span>
    </div>
  );
}
