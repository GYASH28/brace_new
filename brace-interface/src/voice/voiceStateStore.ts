import type { VoiceConfig, VoiceOrbState } from "../types";

export const defaultVoiceConfig: VoiceConfig = {
  mode: "best-local",
  sttProvider: "browser",
  ttsProvider: "kokoro",
  vadProvider: "silero",
  selectedVoice: "brace-default",
  kokoroVoice: "af_heart",
  language: "en-IN",
  speed: 1,
  pitch: 1,
  volume: 0.9,
  stylePreset: "brace-default",
  vadSensitivity: 0.015,
  silenceTimeoutMs: 1500,
  minSpeechMs: 300,
  maxRecordingMs: 45000,
  interruptionEnabled: true,
  wakeWordEnabled: false,
  continuousListening: false,
  onlineVoiceEnabled: false,
  saveRawAudio: false,
  saveTranscripts: false,
  humanLikeDelivery: true,
  speakMarkdownSymbols: false,
  emotionalTone: "auto",
  voiceExpressiveness: "medium",
  pauseStyle: "natural",
  technicalReadingMode: "auto",
};

export const voiceStateLabel: Record<VoiceOrbState, string> = {
  idle: "Standby",
  listening: "Listening",
  transcribing: "Transcribing",
  thinking: "Thinking",
  speaking: "Speaking",
  error: "Fault",
  muted: "Muted",
  offline: "Offline",
};

export function mergeVoiceConfig(config?: Partial<VoiceConfig>): VoiceConfig {
  return { ...defaultVoiceConfig, ...(config ?? {}) };
}
