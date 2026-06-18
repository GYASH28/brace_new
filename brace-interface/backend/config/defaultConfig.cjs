const os = require("node:os");
const path = require("node:path");
const { loadBraceEnv } = require("./envLoader.cjs");
const { defaultPermissions } = require("../security/permissionManager.cjs");

loadBraceEnv();

const VAULT_PATH = "C:/Users/Admin/Desktop/projects/B.R.A.C.E-MAIN/BRACE-Brain";
const DATA_DIR_NAME = "_BRACE_DATA";

function defaultSettings() {
  return {
    aiProvider: process.env.AI_PROVIDER || process.env.BRACE_AI_PROVIDER || "gemini",
    model: process.env.GEMINI_MODEL || process.env.BRACE_MODEL || "gemini-2.5-flash",
    geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    geminiFallbackModel: process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash-lite",
    enableLegacyLocalAi: String(process.env.ENABLE_LEGACY_LOCAL_AI || "false").toLowerCase() === "true",
    apiKey: "",
    baseUrl: process.env.BRACE_BASE_URL || "https://integrate.api.nvidia.com/v1",
    temperature: Number(process.env.BRACE_TEMPERATURE || 0.35),
    maxTokens: Number(process.env.BRACE_MAX_TOKENS || 1200),
    streaming: false,
    localMode: false,
    geminiKey: "",
    openAiBaseUrl: process.env.BRACE_OPENAI_BASE_URL || "",
    openAiApiKey: "",
    openAiModel: process.env.BRACE_OPENAI_MODEL || "local-model",
    ollamaEndpoint: process.env.BRACE_OLLAMA_ENDPOINT || "",
    ollamaModel: process.env.BRACE_OLLAMA_MODEL || "",
    customEndpoint: process.env.BRACE_CUSTOM_ENDPOINT || "",
    offlineMode: false,
    safeMode: true,
    voiceRate: 1,
    voicePitch: 1,
    voiceOutput: true,
    wakeWord: false,
    themeAccent: "cyan",
    defaultProjectsFolder: path.join(os.homedir(), "Documents"),
    defaultDownloadsFolder: path.join(os.homedir(), "Downloads"),
    safeFolders: [VAULT_PATH, path.join(os.homedir(), "Documents"), path.join(os.homedir(), "Downloads")],
    appPaths: {
      vscode: "code",
      chrome: "chrome",
    },
    hotkeys: {
      openAssistant: "Ctrl+Alt+B",
      startVoice: "Ctrl+Alt+Space",
      mute: "Ctrl+Alt+M",
      commandPalette: "Ctrl+K",
    },
    startup: false,
    adminMode: false,
    firebaseEnabled: String(process.env.FIREBASE_ENABLED || "false").toLowerCase() === "true",
    obsidianEnabled: true,
    obsidianAutoCreate: true,
    ttsEnabled: true,
    googleTtsFallbackEnabled: false,
    googleTtsVoiceName: process.env.GOOGLE_TTS_VOICE_NAME || "en-US-Chirp-HD-F",
    startupVoiceGreeting: true,
  };
}

function defaultState() {
  return {
    version: 2,
    settings: defaultSettings(),
    permissions: defaultPermissions(),
    tasks: [],
    apps: [],
    chatHistory: [],
    logs: [],
    agentTasks: [],
    approvals: [],
    recentCommands: [],
    recentToolCalls: [],
    greetings: {
      lastStartupGreetingAt: null,
      lastStartupGreetingSessionId: null,
      recentGreetingHashes: [],
    },
  };
}

module.exports = { DATA_DIR_NAME, VAULT_PATH, defaultSettings, defaultState };
