"use strict";

const DEFAULT_VOICE_CONFIG = {
  mode: "best-local",
  sttProvider: "faster-whisper",
  ttsProvider: "kokoro",
  vadProvider: "silero",
  selectedVoice: "brace-default",
  kokoroVoice: "af_heart",
  language: "en-IN",
  speed: 1,
  pitch: 1,
  volume: 0.9,
  stylePreset: "brace-default",
  vadSensitivity: 0.045,
  silenceTimeoutMs: 900,
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

const VOICE_PRESETS = [
  {
    id: "brace-default",
    label: "B.R.A.C.E Default",
    description: "Balanced, calm, futuristic assistant tone.",
    kokoroVoice: "af_heart",
  },
  {
    id: "calm-assistant",
    label: "Calm Assistant",
    description: "Slower and softer for planning and focus.",
    kokoroVoice: "af_sarah",
  },
  {
    id: "deep-futuristic",
    label: "Deep Futuristic",
    description: "Lower pitch for a more cinematic assistant tone.",
    kokoroVoice: "am_michael",
  },
  {
    id: "fast-coding",
    label: "Fast Coding Helper",
    description: "Faster delivery for coding feedback.",
    kokoroVoice: "af_sky",
  },
  {
    id: "study-mode",
    label: "Study Mode",
    description: "Clear, steady explanations for learning.",
    kokoroVoice: "bf_emma",
  },
  {
    id: "indian-english",
    label: "Hindi/Indian English Friendly",
    description: "Optimized language defaults for Indian English commands.",
    kokoroVoice: "af_heart",
  },
];

function mergeVoiceConfig(current = {}, patch = {}) {
  return { ...DEFAULT_VOICE_CONFIG, ...current, ...patch };
}

/**
 * Resolve the Kokoro voice ID for a given B.R.A.C.E voice config.
 * Returns the explicit kokoroVoice override, or the preset default.
 */
function resolveKokoroVoice(config = {}) {
  if (config.kokoroVoice) return config.kokoroVoice;
  const preset = VOICE_PRESETS.find((p) => p.id === config.selectedVoice);
  return preset?.kokoroVoice || DEFAULT_VOICE_CONFIG.kokoroVoice;
}

module.exports = { DEFAULT_VOICE_CONFIG, VOICE_PRESETS, mergeVoiceConfig, resolveKokoroVoice };
