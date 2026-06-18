import { motion, useReducedMotion, MotionValue, useTransform } from "framer-motion";
import { memo } from "react";
import type { VoiceOrbState } from "../types";

type VoiceOrbProps = {
  state: VoiceOrbState;
  volumeLevel: MotionValue<number>;
  isConnected?: boolean;
  isVoiceEnabled?: boolean;
  onClick: () => void;
  size?: "md" | "lg";
};

// JARVIS High-Contrast Tactical HUD Colors
const stateTone: Record<VoiceOrbState, string> = {
  idle: "rgba(0, 216, 255, 0.7)",         // JARVIS Blue
  listening: "rgba(0, 255, 255, 1)",      // Active Cyan
  transcribing: "rgba(255, 170, 0, 0.9)", // Warning Amber
  thinking: "rgba(0, 255, 150, 0.9)",     // Processing Green
  speaking: "rgba(0, 216, 255, 1)",       // Output Blue
  error: "rgba(255, 0, 50, 0.9)",         // Critical Red
  muted: "rgba(80, 90, 100, 0.5)",
  offline: "rgba(30, 40, 50, 0.3)",
};

const stateLabel: Record<VoiceOrbState, string> = {
  idle: "SYS.STANDBY",
  listening: "AWAIT.INPUT",
  transcribing: "PROC.AUDIO",
  thinking: "CALCULATING",
  speaking: "SYS.OUTPUT",
  error: "ERR.CRITICAL",
  muted: "SYS.MUTE",
  offline: "SYS.OFFLINE",
};

export const VoiceOrb = memo(function VoiceOrb({ isConnected = true, isVoiceEnabled = true, onClick, size = "lg", state, volumeLevel }: VoiceOrbProps) {
  const reducedMotion = useReducedMotion();
  const dimension = size === "lg" ? "h-64 w-64 md:h-80 md:w-80 2xl:h-96 2xl:w-96" : "h-52 w-52 md:h-56 md:w-56";
  const baseTone = stateTone[!isConnected ? "offline" : !isVoiceEnabled ? "muted" : state];
  
  // Audio reactivity for the inner core
  const coreScale = useTransform(volumeLevel, (vol) => 1 + Math.min(0.3, vol * 0.4));
  const innerRingScale = useTransform(volumeLevel, (vol) => 1 + Math.min(0.15, vol * 0.2));
  
  return (
    <div className={`relative flex items-center justify-center ${dimension}`}>
      <motion.button
        aria-label="Toggle B.R.A.C.E voice"
        className="absolute inset-0 outline-none group flex items-center justify-center rounded-full"
        onClick={onClick}
        style={{ "--voice-tone": baseTone } as any}
        type="button"
        title={`JARVIS ${stateLabel[state]}`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          
          {/* Ambient Outer Glow */}
          <motion.div 
            className="absolute inset-2 rounded-full mix-blend-screen"
            animate={{
              boxShadow: state === "listening" || state === "speaking" 
                ? ["0 0 40px var(--voice-tone)", "0 0 80px var(--voice-tone)", "0 0 40px var(--voice-tone)"]
                : "0 0 30px var(--voice-tone)",
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ opacity: 0.3 }}
          />

          {/* Outer Mechanical Ring (Dashed) */}
          <motion.div
            animate={reducedMotion ? {} : { rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 rounded-full border-[2px] border-[color:var(--voice-tone)] opacity-40"
            style={{ borderStyle: "dashed" }}
          />

          {/* Middle Data Ring (Segmented) */}
          <motion.div
            animate={reducedMotion ? {} : { rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute inset-10 rounded-full border border-[color:var(--voice-tone)] opacity-60"
            style={{ scale: innerRingScale, borderStyle: "dashed" }}
          />

          {/* Inner Audio-Reactive Ring */}
          <motion.div
            style={{ scale: coreScale }}
            className="absolute inset-16 rounded-full border-[4px] border-[color:var(--voice-tone)] opacity-80 shadow-[0_0_15px_var(--voice-tone),inset_0_0_15px_var(--voice-tone)]"
          />

          {/* Rotating Target Reticle */}
          {(state === "listening" || state === "thinking") && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-12 flex items-center justify-center pointer-events-none"
            >
              <div className="absolute top-0 w-[2px] h-4 bg-[color:var(--voice-tone)] shadow-[0_0_8px_var(--voice-tone)]" />
              <div className="absolute bottom-0 w-[2px] h-4 bg-[color:var(--voice-tone)] shadow-[0_0_8px_var(--voice-tone)]" />
              <div className="absolute left-0 w-4 h-[2px] bg-[color:var(--voice-tone)] shadow-[0_0_8px_var(--voice-tone)]" />
              <div className="absolute right-0 w-4 h-[2px] bg-[color:var(--voice-tone)] shadow-[0_0_8px_var(--voice-tone)]" />
            </motion.div>
          )}

          {/* Central Reactor Core */}
          <motion.div 
            style={{ scale: coreScale }}
            className="absolute inset-[30%] rounded-full bg-[color:var(--voice-tone)] blur-md mix-blend-screen opacity-70"
          />
          <motion.div 
            style={{ scale: coreScale }}
            className="absolute inset-[35%] rounded-full bg-white shadow-[0_0_30px_white,inset_0_0_20px_white] mix-blend-overlay"
          />

          {/* JARVIS Status Overlay text */}
          <div className="absolute bottom-[-40px] text-center w-full">
            <span className="font-mono text-[11px] font-bold tracking-[0.3em] text-[color:var(--voice-tone)] opacity-80 uppercase drop-shadow-[0_0_8px_var(--voice-tone)]">
              [{stateLabel[state]}]
            </span>
          </div>

        </div>
      </motion.button>
    </div>
  );
});
