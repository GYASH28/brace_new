import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMotionValue } from "framer-motion";
import type { ChatMessage, VoiceConfig, VoiceOrbState, VoiceStatus } from "../types";
import { braceClient } from "../lib/braceClient";
import { mergeVoiceConfig } from "./voiceStateStore";
import { useAudioPlayer } from "./useAudioPlayer";
import { useAudioRecorder } from "./useAudioRecorder";
import { prepareSpeechText } from "./speechTextProcessor";
import { getVoiceDeliveryProfile } from "./voiceEmotionEngine";

type UseVoiceAgentArgs = {
  sendCommand: (command: string) => Promise<string | { text: string; audioDataUrl?: string }>;
  addMessage: (message: ChatMessage) => void;
  voiceOutputEnabled?: boolean;
};

type TtsResult = {
  ok?: boolean;
  provider?: string;
  audioBase64?: string;
  mimeType?: string;
  browserFallback?: boolean;
  text?: string;
  error?: string;
  setup?: unknown;
};

function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

function base64ToBlobUrl(audioBase64: string, mimeType: string) {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

function kokoroErrorMessage(error?: string) {
  return `Kokoro TTS failed. Install dependencies or check server logs.${error ? ` ${error}` : ""}`;
}

export function useVoiceAgent({ addMessage, sendCommand, voiceOutputEnabled = true }: UseVoiceAgentArgs) {
  const [config, setConfig] = useState<VoiceConfig>(mergeVoiceConfig());
  const [status, setStatus] = useState<VoiceStatus | null>(null);
  const [orbState, setOrbState] = useState<VoiceOrbState>("idle");
  const [transcript, setTranscript] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeLevel = useMotionValue(0);

  const { speak, speaking, stop: stopSpeaking, voices } = useAudioPlayer(config);

  const refreshVoiceStatus = useCallback(async () => {
    try {
      const [nextConfig, nextStatus] = await Promise.all([
        braceClient.getVoiceConfig() as Promise<VoiceConfig | undefined>,
        braceClient.voiceStatus() as Promise<VoiceStatus | undefined>,
      ]);
      if (nextConfig) {
        setConfig((prev) => {
          const next = mergeVoiceConfig({ ...prev, ...nextConfig });
          localStorage.setItem("brace-voice-config-v2", JSON.stringify(next));
          return next;
        });
      }
      if (nextStatus) setStatus(nextStatus);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Voice status is unavailable.");
    }
  }, []);

  useEffect(() => {
    void refreshVoiceStatus();
  }, [refreshVoiceStatus]);

  const updateConfig = useCallback(async (patch: Partial<VoiceConfig>) => {
    setConfig((prev) => {
      const next = mergeVoiceConfig({ ...prev, ...patch });
      try {
        localStorage.setItem("brace-voice-config-v2", JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to save voice config:", e);
      }
      return next;
    });
    await braceClient.updateVoiceConfig(patch);
    await braceClient.logVoiceEvent({ type: "voice mode changed", detail: patch });
    await refreshVoiceStatus();
  }, [refreshVoiceStatus]);

  const stopAllAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    stopSpeaking();
    setOrbState(config.volume <= 0 ? "muted" : "idle");
    void braceClient.logVoiceEvent({ type: "TTS stopped", detail: { reason: "manual_or_interruption" } });
  }, [config.volume, stopSpeaking]);

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stopSpeaking();
  }, [stopSpeaking]);

  const playBackendAudio = useCallback(async (audioBase64: string, mimeType: string, provider: string) => {
    return new Promise<boolean>((resolve) => {
      const url = base64ToBlobUrl(audioBase64, mimeType);
      const audio = new Audio(url);
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
        setOrbState(ok ? "idle" : "error");
        resolve(ok);
      };

      audio.volume = Math.max(0, Math.min(1, config.volume));
      audioRef.current = audio;
      audio.onplay = () => setOrbState("speaking");
      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);

      void braceClient.logVoiceEvent({ type: "TTS playback started", detail: { provider, mimeType } });
      audio.play().catch(() => finish(false));
    });
  }, [config.volume]);

  const speakText = useCallback(async (text: string, reason = "assistant-response") => {
    const response = String(text || "").trim();
    if (!response) return;

    if (!voiceOutputEnabled || config.volume <= 0) {
      setOrbState(config.volume <= 0 ? "muted" : "idle");
      await braceClient.logVoiceEvent({ type: "TTS skipped", detail: { reason: voiceOutputEnabled ? "muted" : "disabled" } });
      return;
    }

    const delivery = getVoiceDeliveryProfile(config, response, reason);
    const prepared = prepareSpeechText(response, {
      humanLikeDelivery: config.humanLikeDelivery !== false,
      speakMarkdownSymbols: config.speakMarkdownSymbols === true,
      removeMarkdown: config.speakMarkdownSymbols !== true,
      removeHashtags: true,
      removeCodeBlocks: true,
      makeHumanReadable: config.humanLikeDelivery !== false,
      pauseStyle: delivery.pauseStyle,
      technicalReadingMode: delivery.technicalReadingMode,
      maxChars: 3500,
    });
    const speechText = prepared.spokenText;
    if (wordCount(speechText) <= 1 && wordCount(response) > 5) {
      console.warn("TTS text was unexpectedly shortened", { response, speechText });
      await braceClient.logVoiceEvent({ type: "TTS truncation guard", detail: { responseLength: response.length, speechText }, result: "error" });
    }
    if (!speechText) {
      setError("There was no speakable text in that response.");
      setOrbState("idle");
      await braceClient.logVoiceEvent({ type: "TTS skipped", detail: { reason, responseLength: response.length, message: "No speakable text." }, result: "error" });
      return;
    }

    if (config.interruptionEnabled) stopAllAudio();
    setError("");
    setOrbState("speaking");

    let fallbackText = speechText || response;
    let fallbackReason = "";
    const selectedSpeed = Math.max(0.6, Math.min(1.6, (config.speed ?? 1) * delivery.speedMultiplier));

    await braceClient.logVoiceEvent({
      type: "speech text prepared",
      detail: {
        reason,
        rawResponseLength: response.length,
        cleanedSpeechLength: speechText.length,
        chunkCount: prepared.chunks.length,
        detectedTone: delivery.tone,
        selectedVoice: config.kokoroVoice ?? "af_heart",
        selectedSpeed,
        pauseStyle: delivery.pauseStyle,
        technicalReadingMode: delivery.technicalReadingMode,
        humanLikeDelivery: config.humanLikeDelivery !== false,
        speakMarkdownSymbols: config.speakMarkdownSymbols === true,
        wasTruncated: prepared.wasTruncated,
      },
    });

    try {
      const ttsResult = (await braceClient.synthesizeVoice({
        text: speechText,
        voice: config.kokoroVoice ?? "af_heart",
        speed: selectedSpeed,
        lang: config.language ?? "en-IN",
        allowBrowserFallback: true,
        reason,
      })) as TtsResult | null | undefined;

      fallbackText = ttsResult?.text || fallbackText;
      fallbackReason = ttsResult?.error || "";
      await braceClient.logVoiceEvent({
        type: "TTS result received",
        detail: {
          reason,
          provider: ttsResult?.provider || "unknown",
          ok: Boolean(ttsResult?.ok),
          browserFallback: Boolean(ttsResult?.browserFallback),
          responseLength: response.length,
          speechLength: fallbackText.length,
          detectedTone: delivery.tone,
          selectedSpeed,
        },
        result: ttsResult?.ok ? "ok" : "error",
      });

      if (ttsResult?.ok && ttsResult.audioBase64 && ttsResult.mimeType && !ttsResult.browserFallback) {
        const played = await playBackendAudio(ttsResult.audioBase64, ttsResult.mimeType, ttsResult.provider || "kokoro");
        if (played) return;
        fallbackReason = "Backend audio playback failed.";
      } else if (ttsResult?.provider === "browser-fallback") {
        setError(kokoroErrorMessage(ttsResult.error));
      } else if (ttsResult && ttsResult.ok === false) {
        setError(kokoroErrorMessage(ttsResult.error));
      }
    } catch (ttsError) {
      fallbackReason = ttsError instanceof Error ? ttsError.message : "Voice synthesis request failed.";
      setError(kokoroErrorMessage(fallbackReason));
      await braceClient.logVoiceEvent({ type: "TTS request failed", detail: { reason, message: fallbackReason }, result: "error" });
    }

    await braceClient.logVoiceEvent({ type: "TTS browser fallback started", detail: { reason, error: fallbackReason, speechLength: fallbackText.length } });
    await speak(fallbackText, {
      onStart: () => setOrbState("speaking"),
      onEnd: () => setOrbState("idle"),
      onError: (message) => {
        setError(message);
        setOrbState("error");
      },
    });
  }, [config, playBackendAudio, speak, stopAllAudio, voiceOutputEnabled]);

  const handleTranscript = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean || clean === transcript.trim()) return;
    setTranscript(clean);
    setPartialTranscript("");
    setOrbState("thinking");
    await braceClient.logVoiceEvent({ type: "transcript created", detail: { length: clean.length, preview: clean.slice(0, 120) } });
    addMessage({ id: Date.now(), role: "user", text: clean, source: "agent" });

    try {
      const responseResult = await sendCommand(clean);
      const response = typeof responseResult === "string" ? responseResult : responseResult.text;
      setLastResponse(response);
      await braceClient.logVoiceEvent({ type: "assistant response ready for TTS", detail: { length: response.length, preview: response.slice(0, 160) } });
      await speakText(response, "assistant-response");
    } catch (commandError) {
      const message = commandError instanceof Error ? commandError.message : "Voice command failed.";
      setError(message);
      setLastResponse(message);
      setOrbState("error");
      addMessage({ id: Date.now() + 1, role: "assistant", source: "system", text: `Voice command failed: ${message}` });
      await braceClient.logVoiceEvent({ type: "voice command failed", detail: { message }, result: "error" });
      await speakText(message, "voice-command-error");
    }
  }, [addMessage, sendCommand, speakText, transcript]);

  const handleRecorderError = useCallback((message: string) => {
    setError(message);
    setOrbState("error");
    void braceClient.logVoiceEvent({ type: "error occurred", detail: { message }, result: "error" });
  }, []);

  const handleVoiceStart = useCallback(() => {
    if ((speaking || audioRef.current) && config.interruptionEnabled) {
      stopAllAudio();
      void braceClient.logVoiceEvent({ type: "user interrupted", detail: {} });
    }
    setOrbState("listening");
  }, [config.interruptionEnabled, speaking, stopAllAudio]);

  const handleVoiceEnd = useCallback(() => {
    setOrbState("thinking");
  }, []);

  const recorder = useAudioRecorder({
    config,
    onError: handleRecorderError,
    onFinalTranscript: handleTranscript,
    onPartialTranscript: (text) => {
      setPartialTranscript(text);
      if (text === "Transcribing voice...") setOrbState("transcribing");
    },
    onVoiceStart: handleVoiceStart,
    onVoiceEnd: handleVoiceEnd,
    onVolumeChange: (vol) => volumeLevel.set(vol),
  });

  const startListening = useCallback(async () => {
    setError("");
    if ((speaking || audioRef.current) && config.interruptionEnabled) stopAllAudio();
    setOrbState("listening");
    await braceClient.logVoiceEvent({ type: "mic started", detail: { mode: config.mode } });
    try {
      await recorder.start();
    } catch (startError) {
      handleRecorderError(startError instanceof Error ? startError.message : "Voice recorder failed to start.");
    }
  }, [config.interruptionEnabled, config.mode, handleRecorderError, recorder, speaking, stopAllAudio]);

  const stopListening = useCallback(() => {
    recorder.stop();
    setOrbState("idle");
    void braceClient.logVoiceEvent({ type: "mic stopped", detail: {} });
  }, [recorder]);

  const previewVoice = useCallback(async () => {
    await speakText("B.R.A.C.E voice online. Kokoro neural TTS is active. I am ready to listen, think, and respond.", "preview");
  }, [speakText]);

  const replayLast = useCallback(async () => {
    if (!lastResponse) return;
    await speakText(lastResponse, "replay");
  }, [lastResponse, speakText]);

  const browserVoiceOptions = useMemo(
    () => voices.map((voice) => ({ id: voice.name, label: voice.name, description: `${voice.lang}${voice.localService ? " local" : ""}` })),
    [voices],
  );

  return {
    ...recorder,
    browserVoiceOptions,
    config,
    error,
    lastResponse,
    orbState: recorder.listening ? "listening" as VoiceOrbState : speaking ? "speaking" as VoiceOrbState : orbState,
    partialTranscript,
    previewVoice,
    refreshVoiceStatus,
    replayLast,
    setError,
    speakText,
    startListening,
    status,
    stopAllAudio,
    stopListening,
    transcript,
    updateConfig,
    volumeLevel,
  };
}
