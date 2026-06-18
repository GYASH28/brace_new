const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_FALLBACK_MODEL = "gemini-2.5-flash-lite";

function bool(value, fallback = false) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function number(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boundedNumber(value, fallback, min, max) {
  const parsed = number(value, fallback);
  return Math.max(min, Math.min(parsed, max));
}

function savedSecret(value) {
  if (!value || value === "__saved__") return "";
  return String(value).trim();
}

function first(...values) {
  return values.find((value) => value != null && String(value).trim() !== "") || "";
}

function defaultBrainPath(repoRoot, env = {}) {
  const explicit = first(env.OBSIDIAN_VAULT_PATH, env.BRACE_BRAIN_PATH, env.BRACE_MEMORY_PATH);
  if (explicit) return path.resolve(String(explicit));
  const siblingBrain = path.resolve(repoRoot || process.cwd(), "BRACE-Brain");
  if (fs.existsSync(siblingBrain)) return siblingBrain;
  return path.resolve(repoRoot || process.cwd());
}

function buildAssistantConfig({ env = process.env, settings = {}, paths = {} } = {}) {
  const repoRoot = paths.repoRoot || path.resolve(__dirname, "..", "..", "..", "..");
  const provider = settings.aiProvider || env.AI_PROVIDER || env.BRACE_AI_PROVIDER || "gemini";
  const storedGeminiKey = savedSecret(settings.geminiKey) || savedSecret(settings.apiKey);
  const geminiApiKey = first(env.GEMINI_API_KEY, env.BRACE_GEMINI_API_KEY, storedGeminiKey);
  
  const storedNvidiaKey = savedSecret(settings.apiKey) || "";
  const nvidiaApiKey = first(env.NVIDIA_API_KEY, storedNvidiaKey);

  const configuredModel = first(env.NVIDIA_MODEL, env.GEMINI_MODEL, settings.geminiModel, settings.model);
  const model = configuredModel || DEFAULT_MODEL;
  const fallbackModel = first(env.GEMINI_FALLBACK_MODEL, settings.geminiFallbackModel) || DEFAULT_FALLBACK_MODEL;
  const userDataPath = paths.userDataPath || path.join(repoRoot, "_BRACE_DATA");
  const obsidianVaultPath = defaultBrainPath(repoRoot, env);
  const googleCredentials = first(env.GOOGLE_APPLICATION_CREDENTIALS, settings.googleApplicationCredentials);
  const firebaseProjectId = first(env.FIREBASE_PROJECT_ID, settings.firebaseProjectId);
  const selectedTtsProvider = first(env.VOICE_TTS_PROVIDER, env.BRACE_TTS_PROVIDER, env.TTS_PROVIDER, settings.ttsProvider) || "kokoro";
  const googleTtsFallbackEnabled = bool(first(env.GOOGLE_TTS_FALLBACK_ENABLED, settings.googleTtsFallbackEnabled), false);

  const legacyEnabled = bool(first(env.ENABLE_LEGACY_LOCAL_AI, settings.enableLegacyLocalAi), false);

  return {
    provider,
    legacyEnabled,
    model,
    fallbackModel,
    temperature: number(first(env.GEMINI_TEMPERATURE, env.BRACE_TEMPERATURE, settings.temperature), 0.35),
    maxTokens: boundedNumber(first(env.GEMINI_MAX_TOKENS, env.BRACE_MAX_TOKENS, settings.maxTokens), 1200, 128, 4096),
    requestTimeoutMs: boundedNumber(first(env.REQUEST_TIMEOUT_MS, settings.requestTimeoutMs), 60000, 5000, 60000),
    maxRetries: boundedNumber(first(env.MAX_RETRIES, settings.maxRetries), 2, 0, 3),
    maxToolCalls: boundedNumber(first(env.MAX_TOOL_CALLS_PER_REQUEST, settings.maxToolCalls), 5, 0, 8),
    maxAgentSteps: boundedNumber(first(env.MAX_AGENT_STEPS, settings.maxAgentSteps), 8, 1, 12),
    paths: {
      repoRoot,
      userDataPath,
      obsidianVaultPath,
      ttsCacheDir: path.join(userDataPath, "tts-cache"),
    },
    baseUrl: settings.baseUrl || "https://integrate.api.nvidia.com/v1",
    nvidia: {
      apiKey: nvidiaApiKey,
      configured: Boolean(nvidiaApiKey),
      model: model || "meta/llama-3.1-70b-instruct",
      fallbackModel: fallbackModel || "meta/llama-3.1-8b-instruct",
    },
    gemini: {
      apiKey: geminiApiKey,
      configured: Boolean(geminiApiKey),
      model,
      fallbackModel,
    },
    obsidian: {
      enabled: bool(first(env.OBSIDIAN_ENABLED, settings.obsidianEnabled), true),
      vaultPath: obsidianVaultPath,
      autoCreate: bool(first(env.OBSIDIAN_AUTO_CREATE, settings.obsidianAutoCreate), true),
    },
    firebase: {
      enabled: bool(first(env.FIREBASE_ENABLED, settings.firebaseEnabled), Boolean(firebaseProjectId)),
      projectId: firebaseProjectId,
      clientEmail: first(env.FIREBASE_CLIENT_EMAIL, settings.firebaseClientEmail),
      privateKey: first(env.FIREBASE_PRIVATE_KEY, settings.firebasePrivateKey).replace(/\\n/g, "\n"),
      databaseUrl: first(env.FIREBASE_DATABASE_URL, settings.firebaseDatabaseUrl),
      storageBucket: first(env.FIREBASE_STORAGE_BUCKET, settings.firebaseStorageBucket),
    },
    googleTts: {
      enabled: googleTtsFallbackEnabled,
      provider: googleTtsFallbackEnabled ? "google" : selectedTtsProvider,
      credentials: googleCredentials,
      projectId: first(env.GOOGLE_CLOUD_PROJECT, settings.googleCloudProject),
      languageCode: first(env.GOOGLE_TTS_LANGUAGE_CODE, settings.googleTtsLanguageCode) || "en-US",
      voiceName: first(env.GOOGLE_TTS_VOICE_NAME, settings.googleTtsVoiceName) || "en-US-Chirp-HD-F",
      audioEncoding: first(env.GOOGLE_TTS_AUDIO_ENCODING, settings.googleTtsAudioEncoding) || "MP3",
      speakingRate: number(first(env.GOOGLE_TTS_SPEAKING_RATE, settings.googleTtsSpeakingRate), 1),
      pitch: number(first(env.GOOGLE_TTS_PITCH, settings.googleTtsPitch), 0),
      volumeGainDb: number(first(env.GOOGLE_TTS_VOLUME_GAIN_DB, settings.googleTtsVolumeGainDb), 0),
      maxChars: boundedNumber(first(env.GOOGLE_TTS_MAX_CHARS, env.TTS_MAX_CHARS, settings.googleTtsMaxChars, settings.ttsMaxChars), 3500, 1, 3500),
    },
  };
}

module.exports = { DEFAULT_FALLBACK_MODEL, DEFAULT_MODEL, buildAssistantConfig };
