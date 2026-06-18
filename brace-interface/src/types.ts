import type { LucideIcon } from "lucide-react";

export type PageId =
  | "home"
  | "chat"
  | "voice"
  | "agent"
  | "tasks"
  | "files"
  | "memory"
  | "notes"
  | "tools"
  | "projects"
  | "system"
  | "apps"
  | "permissions"
  | "logs"
  | "settings";

export type NavItem = {
  id: PageId;
  label: string;
  icon: LucideIcon;
};

export type ChatMessage = {
  id: number;
  role: "user" | "assistant" | "system";
  text: string;
  source?: "brain" | "gemini" | "system" | "agent";
  confidence?: number;
  model?: string;
  memoryUsed?: AssistantMemoryUsed[];
  toolCalls?: AssistantToolCallSummary[];
};

export type BrainMatch = {
  title: string;
  source: string;
  answer: string;
  confidence: number;
};

export type PermissionState = {
  label: string;
  description: string;
  riskLevel?: "low" | "medium" | "high" | "blocked";
  enabled: boolean;
  lastUsed: string | null;
};

export type SettingsState = {
  aiProvider: "gemini" | "openai" | "custom" | "nvidia";
  model?: string;
  geminiModel?: string;
  geminiFallbackModel?: string;
  enableLegacyLocalAi?: boolean;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
  localMode?: boolean;
  geminiKey: string;
  openAiBaseUrl: string;
  openAiApiKey: string;
  openAiModel: string;
  ollamaEndpoint: string;
  ollamaModel: string;
  customEndpoint: string;
  offlineMode: boolean;
  safeMode: boolean;
  voiceRate: number;
  voicePitch: number;
  voiceOutput: boolean;
  wakeWord: boolean;
  themeAccent: string;
  hotkeys: Record<string, string>;
  startup: boolean;
  adminMode: boolean;
  firebaseEnabled?: boolean;
  obsidianEnabled?: boolean;
  obsidianAutoCreate?: boolean;
  ttsEnabled?: boolean;
  googleTtsFallbackEnabled?: boolean;
  googleTtsVoiceName?: string;
  startupVoiceGreeting?: boolean;
  defaultProjectsFolder?: string;
  defaultDownloadsFolder?: string;
  safeFolders?: string[];
  appPaths?: Record<string, string>;
  voice?: VoiceConfig;
};

export type AssistantMemoryUsed = {
  title: string;
  source: string;
  path?: string;
};

export type AssistantToolCallSummary = {
  name: string;
  input?: Record<string, unknown>;
  result?: unknown;
};

export type AssistantChatResponse = {
  success: boolean;
  message?: string;
  conversationId?: string;
  provider?: string;
  model?: string;
  memoryUsed?: AssistantMemoryUsed[];
  toolCalls?: AssistantToolCallSummary[];
  error?: { code?: string; message?: string } | string;
  mode?: string;
};

export type AssistantStatus = {
  brain: { provider: string; online: boolean; configured: boolean };
  model: { primary: string; fallback: string };
  legacyEnabled: boolean;
  memory: {
    obsidian: { ok: boolean; configured: boolean; enabled: boolean; path?: string; exists?: boolean };
    firebase: { ok: boolean; configured: boolean; enabled: boolean; projectId?: string; error?: string };
  };
  voice: {
    googleTts: { ok: boolean; configured: boolean; provider: string; fallback: boolean; voiceName?: string; languageCode?: string; error?: string };
    tts?: VoiceStatus | null;
    fallback: VoiceStatus | null;
  };
  tools: { safeMode: boolean; count: number };
};

export type VoiceMode = "best-local" | "fast-local" | "online-high-quality" | "browser-fallback";
export type VoiceOrbState = "idle" | "listening" | "transcribing" | "thinking" | "speaking" | "error" | "muted" | "offline";
export type VoiceTone = "friendly" | "excited" | "serious" | "calm" | "motivational" | "technical" | "warning" | "apology" | "success" | "thinking" | "greeting";
export type VoiceToneSetting = "auto" | VoiceTone;
export type VoiceExpressiveness = "low" | "medium" | "high";
export type VoicePauseStyle = "short" | "natural" | "slow";
export type TechnicalReadingMode = "auto" | "on" | "off";

export type VoiceConfig = {
  mode: VoiceMode;
  sttProvider: string;
  ttsProvider: string;
  vadProvider: string;
  selectedVoice: string;
  kokoroVoice?: string;
  language: string;
  speed: number;
  pitch: number;
  volume: number;
  stylePreset: string;
  vadSensitivity: number;
  silenceTimeoutMs: number;
  minSpeechMs: number;
  maxRecordingMs: number;
  interruptionEnabled: boolean;
  wakeWordEnabled: boolean;
  continuousListening: boolean;
  onlineVoiceEnabled: boolean;
  saveRawAudio: boolean;
  saveTranscripts: boolean;
  humanLikeDelivery: boolean;
  speakMarkdownSymbols: boolean;
  emotionalTone: VoiceToneSetting;
  voiceExpressiveness: VoiceExpressiveness;
  pauseStyle: VoicePauseStyle;
  technicalReadingMode: TechnicalReadingMode;
};

export type VoiceStatus = {
  ok: boolean;
  mode: string;
  sttProvider: string;
  ttsProvider: string;
  vadProvider: string;
  fallbackActive: boolean;
  dependencies: Record<string, boolean>;
  availableVoices: { id: string; label: string; description: string }[];
  selectedVoice: string;
  setup: string[];
  errors: string[];
};

export type StartupGreeting = {
  ok: boolean;
  provider: string;
  text: string;
  sessionId?: string;
  preview?: boolean;
  context?: Record<string, unknown>;
};

export type AssistantTask = {
  id: string;
  title: string;
  type: "open-vscode" | "open-folder" | "open-url" | "launch-app" | "focus-timer" | "clean-folder";
  enabled: boolean;
  trusted: boolean;
  detail: string;
  payload: Record<string, string | number | boolean>;
};

export type AppLauncherEntry = {
  id: string;
  name: string;
  path: string;
  trusted: boolean;
  addedAt: string;
};

export type LogEntry = {
  id: string;
  time: string;
  type: string;
  message: string;
  detail?: Record<string, unknown>;
  riskLevel?: string;
  result?: string;
};

export type FileEntry = {
  id: string;
  path: string;
  name: string;
  extension: string;
  size: number;
  modified: string;
};

export type SystemInfo = {
  cpu: number;
  ram: number;
  ramDetail: string;
  storage: number;
  storageDetail: string;
  gpu: number | null;
  gpuDetail: string;
  network: number;
  networkDetail: string;
  battery: number | null;
  batteryDetail: string;
  os: {
    platform: string;
    release: string;
    arch: string;
    hostname: string;
    uptimeSeconds: number;
  };
  updatedAt: string;
};

export type ToolDefinition = {
  name: string;
  description: string;
  riskLevel: string;
  requiredPermission: string;
  supportsDryRun: boolean;
};

export type MemoryRecord = {
  id: string;
  type: "preference" | "project" | "tool" | "routine" | "conversation";
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type NoteEntry = {
  id: string;
  name: string;
  path: string;
  size?: number;
  modified?: string;
  content?: string;
};

export type ProjectInfo = {
  path: string;
  name: string;
  type: string;
  scripts: Record<string, string>;
  git: { isRepo: boolean; status: string };
  entries: { name: string; type: string }[];
};

export type AgentStep = {
  id: string;
  title: string;
  tool: string;
  input: Record<string, unknown>;
  riskLevel: string;
  requiredPermission: string;
  status: string;
};

export type AgentTaskRecord = {
  id: string;
  command: string;
  intent: string;
  goal: string;
  riskLevel: string;
  status: string;
  steps: AgentStep[];
  approvalId?: string;
  outputs?: unknown[];
  error?: string;
  recovery?: string;
  createdAt: string;
  updatedAt: string;
};

export type ApprovalRequest = {
  id: string;
  taskId: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
  riskLevel: string;
  plan: AgentTaskRecord;
  createdAt: string;
};
