import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceConfig } from "../types";
import { braceClient } from "../lib/braceClient";

type RecorderOptions = {
  config: VoiceConfig;
  onFinalTranscript: (text: string) => void;
  onPartialTranscript?: (text: string) => void;
  onError?: (message: string) => void;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  onVolumeChange?: (volume: number) => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognition;
type VoiceTranscriptionResult = { ok?: boolean; text?: string; error?: string; provider?: string; setup?: string[] };

const recorderMimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];

function speechRecognitionCtor() {
  const speechWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function preferredRecorderMimeType() {
  if (!("MediaRecorder" in window)) return "";
  return recorderMimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read recorded audio."));
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}

export function useAudioRecorder({ config, onError, onFinalTranscript, onPartialTranscript, onVoiceEnd, onVoiceStart, onVolumeChange }: RecorderOptions) {
  const [listening, setListening] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationRef = useRef(0);
  const silenceTimerRef = useRef<number | null>(null);
  const maxTimerRef = useRef<number | null>(null);
  const speechStartedAtRef = useRef(0);
  const lastTranscriptRef = useRef("");
  const lastPartialTranscriptRef = useRef("");
  const lastVolumeRef = useRef(0);
  const lastVolumeUpdateRef = useRef(0);
  const transcriptionReqIdRef = useRef<string | null>(null);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const all = await navigator.mediaDevices.enumerateDevices();
    setDevices(all.filter((device) => device.kind === "audioinput"));
  }, []);

  const cleanup = useCallback((options: { transcribe?: boolean } = {}) => {
    if (transcriptionReqIdRef.current) {
      braceClient?.cancelTranscription?.({ reqId: transcriptionReqIdRef.current }).catch(() => {});
      transcriptionReqIdRef.current = null;
    }
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = 0;
    if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
    if (maxTimerRef.current) window.clearTimeout(maxTimerRef.current);
    maxTimerRef.current = null;

    const shouldTranscribe = options.transcribe !== false;
    const mediaRecorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (mediaRecorder) {
      if (!shouldTranscribe) mediaRecorder.onstop = null;
      if (mediaRecorder.state !== "inactive") {
        try {
          mediaRecorder.stop();
        } catch {
          audioChunksRef.current = [];
        }
      } else if (!shouldTranscribe) {
        audioChunksRef.current = [];
      }
    }

    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      try {
        recognition.stop();
      } catch {
        // Already stopped.
      }
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    speechStartedAtRef.current = 0;
    lastVolumeRef.current = 0;
    lastVolumeUpdateRef.current = 0;
    setListening(false);
    onVolumeChange?.(0);
  }, []);

  useEffect(() => () => cleanup({ transcribe: false }), [cleanup]);

  const monitorVolume = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const value of data) {
        const centered = (value - 128) / 128;
        sum += centered * centered;
      }
      const rms = Math.sqrt(sum / data.length);
      // Apply a slight noise gate to suppress static hum before scaling
      const noiseGatedRms = Math.max(0, rms - 0.002);
      const nextVolume = Math.min(1, noiseGatedRms * 10);
      const now = performance.now();
      if (now - lastVolumeUpdateRef.current > 140 || Math.abs(nextVolume - lastVolumeRef.current) > 0.08) {
        lastVolumeRef.current = nextVolume;
        lastVolumeUpdateRef.current = now;
        onVolumeChange?.(nextVolume);
      }
      // Enforce a minimum practical threshold so old localStorage values don't cause infinite listening
      const effectiveSensitivity = Math.max(config.vadSensitivity || 0.015, 0.06);
      if (nextVolume > effectiveSensitivity) {
        if (!speechStartedAtRef.current) {
          speechStartedAtRef.current = performance.now();
          onVoiceStart?.();
        }
        if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      } else if (speechStartedAtRef.current && !silenceTimerRef.current) {
        silenceTimerRef.current = window.setTimeout(() => {
          const duration = performance.now() - speechStartedAtRef.current;
          speechStartedAtRef.current = 0;
          onVoiceEnd?.();
          if (duration >= config.minSpeechMs && !config.continuousListening) {
            if (recognitionRef.current) {
              try {
                recognitionRef.current.stop();
              } catch {
                cleanup({ transcribe: false });
              }
            } else {
              cleanup({ transcribe: true });
            }
          }
        }, config.silenceTimeoutMs);
      }
      animationRef.current = window.setTimeout(tick, 50);
    };
    tick();
  }, [cleanup, config.continuousListening, config.minSpeechMs, config.silenceTimeoutMs, config.vadSensitivity, onVoiceEnd, onVoiceStart, onVolumeChange]);

  const start = useCallback(async () => {
    cleanup({ transcribe: false });
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        onError?.("Microphone access is unavailable in this environment.");
        return;
      }

      const Recognition = speechRecognitionCtor();
      const canRecordForBackend = Boolean(braceClient?.transcribeVoice) && "MediaRecorder" in window;
      if (!Recognition && !canRecordForBackend) {
        onError?.("Speech recognition is unavailable. Install faster-whisper for local transcription or use a Chromium build with Web Speech support.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      await refreshDevices();

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      setListening(true);
      monitorVolume();

      lastTranscriptRef.current = "";
      lastPartialTranscriptRef.current = "";

      if (Recognition && (config.sttProvider === "browser" || config.mode === "browser-fallback" || !canRecordForBackend)) {
        const recognition = new Recognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = config.language || "en-IN";
        recognition.onresult = (event) => {
          const text = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" ").trim();
          if (!text) return;
          lastPartialTranscriptRef.current = text;
          onPartialTranscript?.(text);
          const last = event.results[event.results.length - 1];
          if (last?.isFinal && text !== lastTranscriptRef.current) {
            lastTranscriptRef.current = text;
            onFinalTranscript(text);
            if (!config.continuousListening) {
              try {
                recognition.stop();
              } catch {
                cleanup({ transcribe: false });
              }
            }
          }
        };
        recognition.onerror = () => {
          onError?.("Speech recognition failed. Try again, check microphone permission, or switch fallback mode.");
          cleanup({ transcribe: false });
        };
        recognition.onend = () => {
          const partial = lastPartialTranscriptRef.current.trim();
          if (!config.continuousListening && partial && partial !== lastTranscriptRef.current) {
            lastTranscriptRef.current = partial;
            onFinalTranscript(partial);
          }
          if (streamRef.current && config.continuousListening) {
            try {
              recognition.start();
            } catch {
              cleanup({ transcribe: false });
            }
            return;
          }
          cleanup({ transcribe: false });
        };
        recognitionRef.current = recognition;
        recognition.start();
      } else {
        const mimeType = preferredRecorderMimeType();
        const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        mediaRecorder.onerror = () => {
          onError?.("Audio recording failed before transcription could start.");
          cleanup({ transcribe: false });
        };
        mediaRecorder.onstop = async () => {
          const chunks = audioChunksRef.current;
          audioChunksRef.current = [];
          if (!chunks.length) return;
          onPartialTranscript?.("Transcribing voice...");
          try {
            const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
            const audioDataUrl = await blobToDataUrl(blob);
            const reqId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            transcriptionReqIdRef.current = reqId;
            const result = (await braceClient?.transcribeVoice?.({
              reqId,
              audioDataUrl,
              language: config.language,
              mimeType: blob.type,
            })) as VoiceTranscriptionResult | undefined;
            if (result?.ok && result.text?.trim()) {
              onFinalTranscript(result.text.trim());
            } else if (result?.error !== "Cancelled") {
              onError?.(result?.error || "Voice transcription did not detect speech.");
            }
          } catch (error) {
            onError?.(error instanceof Error ? `Voice transcription failed: ${error.message}` : "Voice transcription failed.");
          } finally {
            onPartialTranscript?.("");
            cleanup({ transcribe: false });
          }
        };
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(250);
      }

      maxTimerRef.current = window.setTimeout(() => {
        if (streamRef.current) {
          onError?.("Max recording time reached. Stopping microphone.");
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch {
              cleanup({ transcribe: false });
            }
          } else {
            cleanup({ transcribe: true });
          }
        }
      }, config.maxRecordingMs);
    } catch (error) {
      cleanup({ transcribe: false });
      onError?.(error instanceof Error ? `Microphone failed: ${error.message}` : "Microphone failed.");
    }
  }, [cleanup, config.continuousListening, config.language, config.maxRecordingMs, monitorVolume, onError, onFinalTranscript, onPartialTranscript, refreshDevices, selectedDeviceId]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        cleanup({ transcribe: false });
      }
      return;
    }
    cleanup({ transcribe: true });
  }, [cleanup]);

  return { devices, listening, refreshDevices, selectedDeviceId, setSelectedDeviceId, start, stop };
}
