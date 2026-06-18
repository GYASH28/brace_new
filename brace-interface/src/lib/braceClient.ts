type BridgePayload = Record<string, unknown>;
type Cleanup = () => void;

export type BraceRuntime = "electron" | "localhost";

export type BraceClient = {
  runtime: BraceRuntime;
  runtimeLabel: string;
  platform: string;
  appMode: "desktop" | "localhost";
  brainPathHint: string;
  state(): Promise<unknown>;
  updateSettings(patch: BridgePayload): Promise<unknown>;
  saveSecret(payload: { key: string; value: string }): Promise<unknown>;
  updatePermission(payload: { name: string; enabled: boolean }): Promise<unknown>;
  listLogs(): Promise<unknown>;
  clearLogs(): Promise<unknown>;
  listChat(): Promise<unknown>;
  saveChat(messages: unknown[]): Promise<unknown>;
  clearChat(): Promise<unknown>;
  askAi(payload: { prompt: string }): Promise<unknown>;
  assistantChat(payload: BridgePayload): Promise<unknown>;
  runAgent(payload: BridgePayload): Promise<unknown>;
  assistantStatus(): Promise<unknown>;
  testAi(): Promise<unknown>;
  systemInfo(): Promise<unknown>;
  selectFiles(): Promise<unknown>;
  selectFolder(): Promise<unknown>;
  analyzeFile(payload: BridgePayload): Promise<unknown>;
  listTasks(): Promise<unknown>;
  saveTasks(tasks: unknown[]): Promise<unknown>;
  runTask(task: BridgePayload): Promise<unknown>;
  listApps(): Promise<unknown>;
  addApp(payload?: BridgePayload): Promise<unknown>;
  deleteApp(id: string): Promise<unknown>;
  launchApp(app: BridgePayload): Promise<unknown>;

  listTools(): Promise<unknown>;
  dryRunTool(payload: BridgePayload): Promise<unknown>;
  stopAgent(taskId: string): Promise<unknown>;
  listMemories(): Promise<unknown>;
  searchMemories(payload: BridgePayload): Promise<unknown>;
  saveMemory(payload: BridgePayload): Promise<unknown>;
  updateMemory(payload: { id: string; patch: BridgePayload }): Promise<unknown>;
  deleteMemory(payload: { id: string }): Promise<unknown>;
  listNotes(): Promise<unknown>;
  searchNotes(payload: BridgePayload): Promise<unknown>;
  resolveApproval(payload: { id: string; decision: "approve" | "reject" }): Promise<unknown>;
  createNote(payload: BridgePayload): Promise<unknown>;
  readNote(payload: BridgePayload): Promise<unknown>;
  updateNote(payload: BridgePayload): Promise<unknown>;
  deleteNote(payload: BridgePayload): Promise<unknown>;
  listProjects(): Promise<unknown>;
  addProject(payload: BridgePayload): Promise<unknown>;
  scanProject(payload: BridgePayload): Promise<unknown>;
  voiceStatus(): Promise<unknown>;
  getVoiceConfig(): Promise<unknown>;
  updateVoiceConfig(payload: BridgePayload): Promise<unknown>;
  transcribeVoice(payload: BridgePayload): Promise<unknown>;
  cancelTranscription(payload: { reqId: string }): Promise<unknown>;
  listVoiceOptions(): Promise<unknown>;
  logVoiceEvent(payload: BridgePayload): Promise<unknown>;
  synthesizeVoice(payload: BridgePayload): Promise<unknown>;
  getStartupGreeting(): Promise<unknown>;
  createStartupGreeting(payload?: BridgePayload): Promise<unknown>;
  clearAllData(): Promise<unknown>;
  onHotkey(callback: (name: string) => void): Cleanup;
  onEvent(callback: (event: unknown) => void): Cleanup;
};

function desktopBridge(): (Window["braceDesktop"] & Partial<BraceClient>) | undefined {
  return window.braceDesktop as (Window["braceDesktop"] & Partial<BraceClient>) | undefined;
}

function normalizeError(value: unknown) {
  if (value instanceof Error) return value;
  if (typeof value === "string") return new Error(value);
  return new Error("B.R.A.C.E request failed.");
}

function createDesktopBridgeClient(): BraceClient {
  const bridge = desktopBridge();
  if (!bridge) throw new Error("Desktop bridge is unavailable.");
  return {
    ...(bridge as unknown as BraceClient),
    runtime: "electron",
    runtimeLabel: "Electron Mode",
    appMode: "desktop",
    platform: bridge.platform,
    brainPathHint: bridge.brainPathHint,
    transcribeVoice: bridge.transcribeVoice ?? (() => Promise.reject(new Error("Voice transcription bridge is unavailable."))),
    synthesizeVoice: (bridge as unknown as BraceClient).synthesizeVoice ?? (() => Promise.reject(new Error("Voice synthesis bridge is unavailable."))),
    getStartupGreeting: (bridge as unknown as BraceClient).getStartupGreeting ?? (() => Promise.reject(new Error("Startup greeting bridge is unavailable."))),
    createStartupGreeting: (bridge as unknown as BraceClient).createStartupGreeting ?? (() => Promise.reject(new Error("Startup greeting bridge is unavailable."))),
    runAgent: (bridge as unknown as BraceClient).runAgent ?? ((_payload) => Promise.reject(new Error("Agent bridge is unavailable."))),
    onHotkey: bridge.onHotkey ?? (() => () => {}),
    onEvent: (bridge as unknown as BraceClient).onEvent ?? (() => () => {}),
  };
}

function endpointBase() {
  const envBase = import.meta.env.VITE_BRACE_API_BASE_URL as string | undefined;
  return (envBase || "http://127.0.0.1:8787").replace(/\/$/, "");
}

function createHttpBraceClient(baseUrl = endpointBase()): BraceClient {
  async function request(path: string, options: { method?: string; body?: unknown } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method || "GET",
      headers: options.body == null ? undefined : { "Content-Type": "application/json" },
      body: options.body == null ? undefined : JSON.stringify(options.body),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.ok === false) {
      const message = payload?.error?.message || `HTTP ${response.status}`;
      throw Object.assign(new Error(message), { code: payload?.error?.code, recoverable: payload?.error?.recoverable });
    }
    return payload?.data ?? payload;
  }

  function unsupported(message: string) {
    return () => Promise.reject(new Error(message));
  }

  return {
    runtime: "localhost",
    runtimeLabel: "Localhost Browser Mode",
    platform: navigator.platform || "browser",
    appMode: "localhost",
    brainPathHint: "C:/Users/Admin/Documents/B.R.A.C.E-MAIN/BRACE-Brain",
    state: () => request("/api/state"),
    updateSettings: (patch) => request("/api/settings", { method: "POST", body: patch }),
    saveSecret: (payload) => request("/api/settings/secret", { method: "POST", body: payload }),
    updatePermission: (payload) => request("/api/permissions", { method: "POST", body: payload }),
    listLogs: () => request("/api/logs"),
    clearLogs: () => request("/api/logs", { method: "DELETE" }),
    listChat: () => request("/api/chat"),
    saveChat: (messages) => request("/api/chat", { method: "POST", body: { messages } }),
    clearChat: () => request("/api/chat", { method: "DELETE" }),
    askAi: (payload) => request("/api/assistant/chat", { method: "POST", body: { message: payload.prompt } }),
    assistantChat: (payload) => request("/api/assistant/chat", { method: "POST", body: payload }),
    runAgent: (payload) => request("/api/assistant/chat", { method: "POST", body: payload }),
    assistantStatus: () => request("/api/assistant/status"),
    testAi: () => request("/api/ai/test", { method: "POST", body: {} }),
    systemInfo: () => request("/api/system"),
    selectFiles: unsupported("Native file picker is unavailable in localhost browser mode. Use drag-and-drop or paste an absolute path."),
    selectFolder: unsupported("Native folder picker is unavailable in localhost browser mode. Paste an absolute folder path instead."),
    analyzeFile: (payload) => request("/api/files/analyze", { method: "POST", body: payload }),
    listTasks: () => request("/api/tasks"),
    saveTasks: (tasks) => request("/api/tasks", { method: "POST", body: { tasks } }),
    runTask: (task) => request("/api/tasks/run", { method: "POST", body: task }),
    listApps: () => request("/api/apps"),
    addApp: (payload) => payload?.appPath || payload?.path
      ? request("/api/apps/add", { method: "POST", body: payload })
      : Promise.reject(new Error("Native app picker is unavailable in localhost browser mode. Paste an app path instead.")),
    deleteApp: (id) => request(`/api/apps/${encodeURIComponent(id)}`, { method: "DELETE" }),
    launchApp: (app) => request("/api/apps/launch", { method: "POST", body: app }),

    listTools: () => request("/api/tools"),
    dryRunTool: (payload) => request("/api/tools/dry-run", { method: "POST", body: payload }),
    listMemories: () => request("/api/memory"),
    searchMemories: (payload) => request("/api/memory/search", { method: "POST", body: payload }),
    saveMemory: (payload) => request("/api/memory", { method: "POST", body: payload }),
    updateMemory: ({ id, patch }) => request(`/api/memory/${encodeURIComponent(id)}`, { method: "PUT", body: patch }),
    deleteMemory: ({ id }) => request(`/api/memory/${encodeURIComponent(id)}`, { method: "DELETE" }),
    listNotes: () => request("/api/notes"),
    resolveApproval: ({ id, decision }: { id: string; decision: "approve" | "reject" }) => request(`/api/approvals/${encodeURIComponent(id)}/resolve`, { method: "POST", body: { decision } }),
    searchNotes: (payload) => request("/api/notes/search", { method: "POST", body: payload }),
    stopAgent: async (taskId: string) => request("/api/tools", { method: "POST", body: { action: "stop", taskId } }),
    createNote: (payload) => request("/api/notes", { method: "POST", body: payload }),
    readNote: ({ id }) => request(`/api/notes/${encodeURIComponent(String(id))}`),
    updateNote: ({ id, content }) => request(`/api/notes/${encodeURIComponent(String(id))}`, { method: "PUT", body: { content } }),
    deleteNote: ({ id }) => request(`/api/notes/${encodeURIComponent(String(id))}`, { method: "DELETE" }),
    listProjects: () => request("/api/projects"),
    addProject: (payload) => request("/api/projects", { method: "POST", body: payload }),
    scanProject: (payload) => request("/api/projects/scan", { method: "POST", body: payload }),
    voiceStatus: () => request("/api/voice/status"),
    getVoiceConfig: () => request("/api/voice/config"),
    updateVoiceConfig: (payload) => request("/api/voice/config", { method: "POST", body: payload }),
    transcribeVoice: (payload) => request("/api/voice/transcribe", { method: "POST", body: payload }),
    cancelTranscription: (payload) => request("/api/voice/transcribe/cancel", { method: "POST", body: payload }),
    listVoiceOptions: () => request("/api/voice/voices"),
    logVoiceEvent: (payload) => request("/api/voice/log", { method: "POST", body: payload }),
    synthesizeVoice: (payload) => request("/api/voice/tts", { method: "POST", body: payload }),
    getStartupGreeting: () => request("/api/greeting/startup"),
    createStartupGreeting: (payload) => request("/api/greeting/startup", { method: "POST", body: payload ?? {} }),
    clearAllData: () => Promise.reject(new Error("Clear all local data is only available in Electron mode for safety.")),
    onHotkey: () => () => {},
    onEvent: (callback) => {
      const source = new EventSource(`${baseUrl}/api/events`);
      source.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data !== "connected") callback(data);
        } catch {}
      };
      return () => source.close();
    },
  };
}

let client: BraceClient;
try {
  client = desktopBridge() ? createDesktopBridgeClient() : createHttpBraceClient();
} catch (error) {
  console.error(normalizeError(error).message);
  client = createHttpBraceClient();
}

export const braceClient = client;
