const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { redactSecrets } = require("../../security/secretScanner.cjs");

const fsp = fs.promises;

function sanitizeForSpeech(text, maxChars = 3500) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, "I have included code in the text response.")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/https?:\/\/\S+/g, "link")
    .replace(/[#*_>\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

function createGoogleTtsProvider({ config = {}, env = process.env, cacheDir, logger } = {}) {
  const ttsConfig = Object.keys(config).length
    ? config
    : {
        provider: env.TTS_PROVIDER || "google",
        credentials: env.GOOGLE_APPLICATION_CREDENTIALS,
        languageCode: env.GOOGLE_TTS_LANGUAGE_CODE || "en-US",
        voiceName: env.GOOGLE_TTS_VOICE_NAME || "en-US-Chirp-HD-F",
        audioEncoding: env.GOOGLE_TTS_AUDIO_ENCODING || "MP3",
        speakingRate: Number(env.GOOGLE_TTS_SPEAKING_RATE || 1),
        pitch: Number(env.GOOGLE_TTS_PITCH || 0),
        volumeGainDb: Number(env.GOOGLE_TTS_VOLUME_GAIN_DB || 0),
        maxChars: Number(env.GOOGLE_TTS_MAX_CHARS || env.TTS_MAX_CHARS || 3500),
      };
  let client = null;
  let initError = "";
  const inFlight = new Map();
  const configured = Boolean(ttsConfig.enabled !== false && ttsConfig.provider === "google" && ttsConfig.credentials);

  function init() {
    if (client || initError || !configured) return client;
    try {
      const textToSpeech = require("@google-cloud/text-to-speech");
      client = new textToSpeech.TextToSpeechClient({ keyFilename: ttsConfig.credentials });
    } catch (error) {
      initError = error.message;
      logger?.log?.("error", `Google TTS adapter disabled: ${error.message}`, {}, "low", "error");
    }
    return client;
  }

  function status() {
    return {
      ok: true,
      configured: configured && !initError,
      provider: "google",
      fallback: !configured || Boolean(initError),
      voiceName: ttsConfig.voiceName,
      languageCode: ttsConfig.languageCode,
      error: initError,
    };
  }

  async function synthesize(text) {
    const maxChars = Math.max(1, Math.min(Number(ttsConfig.maxChars || 3500), 3500));
    const clean = sanitizeForSpeech(text, maxChars);
    if (!clean) return { ok: false, skipped: true, reason: "Nothing to speak." };
    const ttsClient = init();
    if (!ttsClient) return { ok: false, skipped: true, reason: "Google TTS is not configured." };

    await fsp.mkdir(cacheDir, { recursive: true });
    const hash = crypto.createHash("sha256").update(`${ttsConfig.voiceName}:${clean}`).digest("hex").slice(0, 32);
    const filePath = path.join(cacheDir, `${hash}.mp3`);

    async function synthesizeOrRead() {
      let audioBuffer = null;
      try {
        audioBuffer = await fsp.readFile(filePath);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }

      if (!audioBuffer) {
        logger?.log?.("voice", "Google TTS cache miss; synthesizing speech.", { voiceName: ttsConfig.voiceName }, "low");
        const [response] = await ttsClient.synthesizeSpeech({
          input: { text: redactSecrets(clean) },
          voice: { languageCode: ttsConfig.languageCode, name: ttsConfig.voiceName },
          audioConfig: {
            audioEncoding: ttsConfig.audioEncoding,
            speakingRate: ttsConfig.speakingRate,
            pitch: ttsConfig.pitch,
            volumeGainDb: ttsConfig.volumeGainDb,
          },
        });
        audioBuffer = Buffer.from(response.audioContent || "");
        await fsp.writeFile(filePath, audioBuffer);
      }

      return {
        ok: true,
        provider: "google",
        path: filePath,
        dataUrl: `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`,
        voiceName: ttsConfig.voiceName,
      };
    }

    const existing = inFlight.get(hash);
    if (existing) return existing;
    const promise = synthesizeOrRead().finally(() => inFlight.delete(hash));
    inFlight.set(hash, promise);
    return promise;
  }

  return { sanitizeForSpeech, status, synthesize };
}

module.exports = { createGoogleTtsProvider, sanitizeForSpeech };
