import type { TechnicalReadingMode, VoiceConfig, VoiceExpressiveness, VoicePauseStyle, VoiceTone, VoiceToneSetting } from "../types";

export type VoiceDeliveryProfile = {
  tone: VoiceTone;
  speedMultiplier: number;
  pitchMultiplier: number;
  pauseStyle: VoicePauseStyle;
  technicalReadingMode: TechnicalReadingMode;
};

const toneSpeed: Record<VoiceTone, number> = {
  friendly: 1,
  excited: 1.06,
  serious: 0.92,
  calm: 0.94,
  motivational: 1.02,
  technical: 0.96,
  warning: 0.88,
  apology: 0.92,
  success: 1.03,
  thinking: 0.95,
  greeting: 0.96,
};

const tonePitch: Record<VoiceTone, number> = {
  friendly: 1,
  excited: 1.04,
  serious: 0.95,
  calm: 0.98,
  motivational: 1.02,
  technical: 0.98,
  warning: 0.94,
  apology: 0.96,
  success: 1.02,
  thinking: 0.98,
  greeting: 1,
};

function expressivenessSpeed(expressiveness: VoiceExpressiveness) {
  if (expressiveness === "high") return 1.02;
  if (expressiveness === "low") return 0.96;
  return 1;
}

function expressivenessPitch(expressiveness: VoiceExpressiveness) {
  if (expressiveness === "high") return 1.04;
  if (expressiveness === "low") return 0.98;
  return 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function detectVoiceTone(text: string, reason = ""): VoiceTone {
  const source = `${reason} ${text}`.toLowerCase();
  if (/\b(startup|greeting|hello|hi there|good morning|good afternoon|good evening|welcome)\b/.test(source)) return "greeting";
  if (/\b(error|failed|danger|warning|caution|blocked|security|unsafe|risk|permission denied)\b/.test(source)) return "warning";
  if (/\b(sorry|apologize|apology|my mistake)\b/.test(source)) return "apology";
  if (/\b(done|complete|completed|success|ready|fixed|passed|working|shipped|implemented)\b/.test(source)) return "success";
  if (/\b(npm|build|test|api|endpoint|typescript|react|python|powershell|localhost|route|function|component|provider|stack trace|file path)\b/.test(source)) return "technical";
  if (/\b(thinking|checking|analyzing|reviewing|investigating|looking into)\b/.test(source)) return "thinking";
  if (/\b(you can do this|keep going|next step|momentum|focus|motivation)\b/.test(source)) return "motivational";
  if (/\b(serious|privacy|policy|credential|secret|production|compliance)\b/.test(source)) return "serious";
  if (/[!]{1,2}/.test(text) || /\b(great|awesome|excellent|nice|brilliant)\b/.test(source)) return "excited";
  if (/\b(calm|slow|steady|breathe)\b/.test(source)) return "calm";
  return "friendly";
}

export function resolveVoiceTone(setting: VoiceToneSetting | undefined, text: string, reason = ""): VoiceTone {
  if (setting && setting !== "auto") return setting;
  return detectVoiceTone(text, reason);
}

export function getVoiceDeliveryProfile(config: VoiceConfig, text: string, reason = ""): VoiceDeliveryProfile {
  const tone = resolveVoiceTone(config.emotionalTone, text, reason);
  const expressiveness = config.voiceExpressiveness || "medium";
  const pauseStyle = config.pauseStyle || (tone === "technical" || tone === "warning" ? "slow" : "natural");
  const technicalReadingMode = config.technicalReadingMode || (tone === "technical" ? "on" : "auto");

  return {
    tone,
    speedMultiplier: clamp(toneSpeed[tone] * expressivenessSpeed(expressiveness), 0.75, 1.18),
    pitchMultiplier: clamp(tonePitch[tone] * expressivenessPitch(expressiveness), 0.85, 1.12),
    pauseStyle,
    technicalReadingMode,
  };
}
