"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { DEFAULT_VOICE_CONFIG, VOICE_PRESETS, mergeVoiceConfig, resolveKokoroVoice } = require("./voiceConfig.cjs");
const { getVoiceStatus } = require("./voiceStatus.cjs");
const { prepareSpeechText } = require("./speechTextProcessor.cjs");
const {
  ensureKokoroServer,
  kokoroSetup,
  synthesizeWithKokoro,
  stopKokoroServer,
  KOKORO_VOICES,
  PRESET_TO_KOKORO_VOICE,
} = require("./kokoroProvider.cjs");
const { buildAssistantConfig } = require("../assistant/config/assistantConfig.cjs");
const { createGoogleTtsProvider } = require("../assistant/voice/googleTtsProvider.cjs");
const { transcribeWithFasterWhisper, cancelTranscription } = require("./fasterWhisperWorker.cjs");
const { globalKeyManager } = require("../assistant/providers/keyManager.cjs");

const execFileAsync = promisify(execFile);
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const TRANSCRIBE_TIMEOUT_MS = 120000;
const MAX_TTS_CHARS = 3500;

function extensionForMime(mimeType = "") {
  if (/wav/i.test(mimeType)) return ".wav";
  if (/ogg|opus/i.test(mimeType)) return ".ogg";
  if (/mp4|m4a/i.test(mimeType)) return ".m4a";
  if (/mpeg|mp3/i.test(mimeType)) return ".mp3";
  return ".webm";
}

function parseAudioPayload(payload = {}) {
  const dataUrl = String(payload.audioDataUrl || "");
  const match = dataUrl.match(/^data:([^;,]+)?(?:;[^,]*)?;base64,(.+)$/);
  const mimeType = String(payload.mimeType || match?.[1] || "audio/webm");
  const rawBase64 = match?.[2] || String(payload.audioBase64 || "");
  if (!rawBase64) throw new Error("No voice audio was received.");
  const buffer = Buffer.from(rawBase64, "base64");
  if (!buffer.length) throw new Error("Voice audio was empty.");
  if (buffer.length > MAX_AUDIO_BYTES) throw new Error("Voice audio is too large to transcribe safely.");
  return { buffer, mimeType };
}

function normalizeLanguage(value = "") {
  const normalized = String(value || "").trim().split("-")[0].toLowerCase();
  return /^[a-z]{2,3}$/.test(normalized) ? normalized : "";
}

function dataUrlToAudio(dataUrl = "") {
  const match = String(dataUrl).match(/^data:([^;,]+)?(?:;[^,]*)?;base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1] || "audio/mpeg", audioBase64: match[2] };
}

function bool(value, fallback = false) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

// Faster whisper worker is imported above.

function createVoiceService({ stateStore, logger, userDataPath, repoRoot }) {
  function getConfig() {
    const state = stateStore.readState();
    return mergeVoiceConfig(DEFAULT_VOICE_CONFIG, state.settings?.voice || {});
  }

  function updateConfig(patch = {}) {
    const next = mergeVoiceConfig(getConfig(), patch);
    stateStore.updateState((state) => {
      state.settings = { ...state.settings, voice: next };
      return state;
    });
    logger.log("voice", "Voice config updated", { keys: Object.keys(patch) }, "low");
    return next;
  }

  function status() {
    return getVoiceStatus(getConfig());
  }

  function listVoices() {
    return {
      voices: VOICE_PRESETS,
      kokoroVoices: KOKORO_VOICES,
      selectedVoice: getConfig().selectedVoice,
      kokoroVoice: resolveKokoroVoice(getConfig()),
    };
  }

  function logEvent(type, detail = {}) {
    return logger.log("voice", type, detail, detail.riskLevel || "low", detail.result || "ok");
  }

  async function transcribe(payload = {}) {
    const config = getConfig();
    const statusSnapshot = status();
    if (!statusSnapshot.dependencies?.fasterWhisper) {
      const message = "Local speech recognition is not installed. Install faster-whisper with: python -m pip install faster-whisper";
      logger.log("voice", "Transcription unavailable", { provider: "faster-whisper" }, "low", "error");
      return { ok: false, error: message, provider: "faster-whisper", setup: statusSnapshot.setup };
    }

    const { buffer, mimeType } = parseAudioPayload(payload);
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "brace-voice-"));
    const filePath = path.join(tempDir, `utterance${extensionForMime(mimeType)}`);
    
    // Support passing reqId for cancellation
    const reqId = payload.reqId;
    
    try {
      await fs.promises.writeFile(filePath, buffer);
      let result;
      try {
        result = await transcribeWithFasterWhisper(filePath, payload.language || config.language);
      } catch (fasterError) {
        if (fasterError.code === "CANCELED_499") throw fasterError;
        logger.log("voice", `Faster-whisper failed, falling back to Gemini: ${fasterError.message}`, {}, "low", "warning");
        result = await transcribeWithGemini(buffer, mimeType, payload.language || config.language);
      }
      
      if (!result.text) throw new Error("No speech was detected in the recording.");
      logger.log("voice", "Voice transcript created", { provider: result.provider, length: result.text.length }, "low");
      return result;
    } catch (error) {
      if (error.code === "CANCELED_499") {
          return { ok: false, error: "Canceled", code: 499, provider: "faster-whisper" };
      }
      const message = error instanceof Error ? error.message : "Voice transcription failed.";
      logger.log("error", `Voice transcription failed: ${message}`, {}, "low", "error");
      return { ok: false, error: message, provider: "gemini-fallback" };
    } finally {
      if (!config.saveRawAudio) {
        await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  function cancelTranscribe(reqId) {
    cancelTranscription(reqId);
    return { ok: true };
  }

  async function transcribeWithGemini(buffer, mimeType, language) {
    const model = "gemini-2.5-flash";
    let attempts = 0;
    let lastError = null;

    while (attempts < 3) {
      const keyInfo = globalKeyManager.getAvailableKey("gemini");
      if (!keyInfo) throw new Error("No Gemini keys available for transcription fallback.");

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      const body = {
        contents: [
          {
            role: "user",
            parts: [
              { text: "Please transcribe the following audio accurately. Reply with ONLY the transcript, nothing else. If there is no speech, reply with [SILENCE]." },
              { inlineData: { mimeType: "audio/webm", data: buffer.toString("base64") } }
            ]
          }
        ]
      };

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": keyInfo.apiKey },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
           const isRateLimit = response.status === 429 || response.status === 503;
           if (isRateLimit) {
             globalKeyManager.markRateLimited(keyInfo.id, 60000 * 2);
             attempts++;
             lastError = new Error(`Rate limit hit on key ${keyInfo.id} (${response.status})`);
             continue;
           }
           throw new Error(`Gemini transcription failed: ${response.status}`);
        }
        
        const data = await response.json();
        const transcript = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        if (transcript === "[SILENCE]") return { provider: "gemini", text: "" };
        
        globalKeyManager.recordSuccess(keyInfo.id);
        return { provider: "gemini", text: transcript, language };
      } catch (error) {
        lastError = error;
        // Network errors or timeout
        if (error.message.includes("fetch") || error.message.includes("timeout")) {
           globalKeyManager.markRateLimited(keyInfo.id, 60000 * 2);
           attempts++;
           continue;
        }
        throw error;
      }
    }
    
    throw new Error(`Gemini transcription failed after 3 attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Synthesize text to audio using the best available TTS provider.
   *
   * @param {object} opts
   * @param {string} opts.text          - Text to speak
   * @param {string} [opts.voice]       - Override voice (preset ID or Kokoro voice ID)
   * @param {number} [opts.speed]       - Speed 0.5–2.0
   * @param {string} [opts.lang]        - Language hint
   * @returns {Promise<{ ok: boolean, provider?: string, audioBase64?: string, mimeType?: string, browserFallback?: boolean, text?: string, error?: string, setup?: unknown }>}
   */
  async function synthesize({ text, voice, speed, lang, allowBrowserFallback = false } = {}) {
    const originalText = String(text || "");
    const state = stateStore.readState();
    const config = getConfig();
    const prepared = prepareSpeechText(originalText, {
      humanLikeDelivery: config.humanLikeDelivery !== false,
      speakMarkdownSymbols: config.speakMarkdownSymbols === true,
      removeMarkdown: config.speakMarkdownSymbols !== true,
      removeHashtags: true,
      removeCodeBlocks: true,
      makeHumanReadable: config.humanLikeDelivery !== false,
      pauseStyle: config.pauseStyle || "natural",
      technicalReadingMode: config.technicalReadingMode || "auto",
      maxChars: MAX_TTS_CHARS,
    });
    const speechText = prepared.spokenText;
    if (!speechText) {
      return { ok: false, provider: "kokoro", error: "No text provided for synthesis.", setup: kokoroSetup() };
    }

    const voiceId = voice || resolveKokoroVoice(config);
    const speedVal = speed !== undefined ? speed : (config.speed || 1.0);
    const langVal = lang || config.language || "en-us";
    const statusSnapshot = status();
    const baseDetail = {
      inputTextLength: originalText.length,
      sanitizedTextLength: speechText.length,
      rawTextLength: originalText.length,
      cleanedSpeechLength: speechText.length,
      chunkCount: prepared.chunks.length,
      preview: speechText.slice(0, 180),
      voice: voiceId,
      speed: speedVal,
      lang: langVal,
      pauseStyle: config.pauseStyle || "natural",
      humanLikeDelivery: config.humanLikeDelivery !== false,
      speakMarkdownSymbols: config.speakMarkdownSymbols === true,
      wasTruncated: prepared.wasTruncated,
    };

    if (state.settings?.ttsEnabled === false) {
      return {
        ok: false,
        provider: "kokoro",
        error: "Local Kokoro TTS is disabled in settings.",
        setup: statusSnapshot.setup,
      };
    }

    let backendFailure = "";

    if (statusSnapshot.dependencies?.kokoro) {
      try {
        await ensureKokoroServer(logger);
        const result = await synthesizeWithKokoro({
          text: speechText,
          voice: voiceId,
          speed: speedVal,
          lang: langVal,
          logger,
        });
        if (result.ok) {
          logger.log("voice", "Kokoro TTS synthesis complete", { ...baseDetail, audioBytes: Math.round((result.audioBase64 || "").length * 0.75), provider: "kokoro" }, "low");
          return { ok: true, provider: "kokoro", audioBase64: result.audioBase64, mimeType: result.mimeType || "audio/wav", voice: result.voice };
        }
        backendFailure = result.error || "Kokoro TTS failed.";
        logger.log("voice", "Kokoro TTS failed before fallback selection.", { ...baseDetail, error: backendFailure, provider: "kokoro" }, "medium", "error");
      } catch (err) {
        backendFailure = err instanceof Error ? err.message : "Kokoro TTS failed.";
        logger.log("voice", "Kokoro TTS exception before fallback selection.", { ...baseDetail, error: backendFailure, provider: "kokoro" }, "medium", "error");
      }
    } else {
      backendFailure = "Kokoro is not installed or failed dependency probing.";
      logger.log("voice", "Kokoro TTS dependency unavailable.", { ...baseDetail, setup: statusSnapshot.setup, provider: "kokoro" }, "medium", "error");
    }

    if (config.onlineVoiceEnabled && statusSnapshot.dependencies?.edgeTts) {
      try {
        const edgeResult = await synthesizeWithEdgeTts({ text: speechText, lang: langVal });
        if (edgeResult.ok) {
          logger.log("voice", "Edge TTS fallback synthesis complete", { ...baseDetail, provider: "edge-tts" }, "low");
          return { ...edgeResult, provider: "edge-tts" };
        }
        backendFailure = edgeResult.error || backendFailure || "Edge TTS fallback failed.";
      } catch (err) {
        backendFailure = err instanceof Error ? err.message : backendFailure || "Edge TTS fallback failed.";
        logger.log("voice", "Edge TTS fallback exception.", { ...baseDetail, error: backendFailure, provider: "edge-tts" }, "low", "error");
      }
    }

    const googleFallbackEnabled = bool(process.env.GOOGLE_TTS_FALLBACK_ENABLED, false) || state.settings?.googleTtsFallbackEnabled === true;
    if (googleFallbackEnabled) {
      try {
        const assistantConfig = buildAssistantConfig({ settings: state.settings, paths: { userDataPath, repoRoot } });
        const googleTts = createGoogleTtsProvider({ config: assistantConfig.googleTts, cacheDir: assistantConfig.paths.ttsCacheDir, logger });
        const googleResult = await googleTts.synthesize(speechText);
        const audio = dataUrlToAudio(googleResult?.dataUrl);
        if (googleResult?.ok && audio) {
          logger.log("voice", "Google TTS explicit fallback synthesis complete", { ...baseDetail, provider: "google", voiceName: googleResult.voiceName }, "low");
          return { ok: true, provider: "google", audioBase64: audio.audioBase64, mimeType: audio.mimeType, voiceName: googleResult.voiceName };
        }
        backendFailure = googleResult?.reason || googleResult?.error || backendFailure || "Google TTS fallback is not configured.";
        logger.log("voice", "Google TTS explicit fallback failed.", { ...baseDetail, error: backendFailure, provider: "google" }, "low", "error");
      } catch (err) {
        backendFailure = err instanceof Error ? err.message : backendFailure || "Google TTS fallback failed.";
        logger.log("voice", "Google TTS explicit fallback exception.", { ...baseDetail, error: backendFailure, provider: "google" }, "low", "error");
      }
    }

    if (allowBrowserFallback) {
      logger.log("voice", "Browser speech fallback allowed after backend TTS failure.", { ...baseDetail, error: backendFailure }, "low", "error");
      return {
        ok: true,
        provider: "browser-fallback",
        browserFallback: true,
        text: speechText,
        error: backendFailure || "Backend TTS failed.",
        setup: statusSnapshot.setup,
        mimeType: null,
        audioBase64: null,
      };
    }

    return {
      ok: false,
      provider: "kokoro",
      error: backendFailure || "Kokoro is not installed or failed to start.",
      setup: statusSnapshot.setup,
    };
  }

  /**
   * Edge TTS fallback synthesis via Python.
   */
  async function synthesizeWithEdgeTts({ text, lang = "en-us" }) {
    const edgeVoiceMap = {
      "en-us": "en-US-JennyNeural",
      "en-in": "en-IN-NeerjaNeural",
      "en-gb": "en-GB-SoniaNeural",
      "en":    "en-US-JennyNeural",
    };
    const edgeVoice = edgeVoiceMap[lang.toLowerCase()] || "en-US-JennyNeural";
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "brace-tts-"));
    const outFile = path.join(tempDir, "speech.mp3");
    try {
      const script = `
import asyncio, sys, edge_tts
async def go():
    tts = edge_tts.Communicate(sys.argv[1], sys.argv[2])
    await tts.save(sys.argv[3])
asyncio.run(go())
`.trim();
      await execFileAsync("python", ["-c", script, text, edgeVoice, outFile], {
        encoding: "utf8",
        timeout: 30000,
        windowsHide: true,
      });
      const audioBuffer = await fs.promises.readFile(outFile);
      return { ok: true, audioBase64: audioBuffer.toString("base64"), mimeType: "audio/mpeg" };
    } catch (err) {
      return { ok: false, error: err.message };
    } finally {
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * Call on app shutdown to cleanly stop the Kokoro subprocess.
   */
  function shutdown() {
    stopKokoroServer();
    const { stopWorker } = require("./fasterWhisperWorker.cjs");
    stopWorker();
  }

  return { getConfig, listVoices, logEvent, shutdown, status, synthesize, transcribe, cancelTranscribe, updateConfig };
}

module.exports = { createVoiceService };
