const fs = require("node:fs");
const path = require("node:path");
const { createAssistantOrchestrator } = require("./assistant/orchestrator.cjs");
const { loadBraceEnv } = require("./config/envLoader.cjs");
const { DATA_DIR_NAME, VAULT_PATH, defaultState } = require("./config/defaultConfig.cjs");
const { createStateStore } = require("./config/stateStore.cjs");
const { createActivityLogger } = require("./logs/activityLogger.cjs");
const { createGreetingService } = require("./greeting/greetingService.cjs");
const { createMemoryManager } = require("./memory/memoryManager.cjs");
const { createNoteManager } = require("./notes/noteManager.cjs");
const { scanProject } = require("./projects/projectManager.cjs");
const { createPathGuard } = require("./security/pathGuard.cjs");
const { requirePermission, touchPermission } = require("./security/permissionManager.cjs");
const { createToolRegistry } = require("./tools/toolRegistry.cjs");
const { createToolRouter } = require("./tools/toolRouter.cjs");
const fileTools = require("./tools/fileTools.cjs");
const folderTools = require("./tools/folderTools.cjs");
const appTools = require("./tools/appTools.cjs");
const systemTools = require("./tools/systemTools.cjs");
const { createVoiceService } = require("./voice/voiceService.cjs");

function cryptoId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function publicState(state) {
  return {
    ...state,
    settings: {
      ...state.settings,
      apiKey: state.settings.apiKey ? "__saved__" : "",
      geminiKey: state.settings.geminiKey ? "__saved__" : "",
      openAiApiKey: state.settings.openAiApiKey ? "__saved__" : "",
    },
  };
}

function isPackagedResourcePath(value) {
  return String(value || "").toLowerCase().includes(`${path.sep}release${path.sep}win-unpacked${path.sep}resources`.toLowerCase());
}

function createBackend({ app, dialog, shell, mainWindow, sseEmitter }) {
  const userDataPath = app.getPath("userData");
  loadBraceEnv(userDataPath);
  const vaultDataDir = path.join(userDataPath, DATA_DIR_NAME);

  // Initialize SQLite Database
  const { initDb } = require("./db/db.cjs");
  const { runSchemaMigrations } = require("./db/schema.cjs");
  const { runMigrations } = require("./db/migrator.cjs");
  
  const db = initDb(userDataPath);
  runSchemaMigrations(db);
  runMigrations(db, userDataPath, path.join(vaultDataDir, "memory"));

  const stateStore = createStateStore({ userDataPath, db });
  const logger = createActivityLogger({ stateStore });
  const memoryManager = createMemoryManager({ memoryDir: path.join(vaultDataDir, "memory"), db });
  const noteManager = createNoteManager({ notesDir: path.join(vaultDataDir, "notes") });
  const repoRoot = path.resolve(__dirname, "..", "..");
  const voiceService = createVoiceService({ stateStore, logger, userDataPath, repoRoot });
  const greetingService = createGreetingService({ stateStore, memoryManager, logger });

  const configuredSafeRoots = stateStore.readState().settings.safeFolders || [VAULT_PATH];
  const safeRoots = Array.from(new Set([vaultDataDir, ...configuredSafeRoots].filter((root) => root && !isPackagedResourcePath(root))));
  const pathGuard = createPathGuard({ safeRoots });
  const toolRegistry = createToolRegistry({ shell, memoryManager });
  const toolRouter = createToolRouter(toolRegistry);
  const sendEvent = (channel, payload) => {
    mainWindow()?.webContents?.send(channel, payload);
    sseEmitter?.emit("event", { channel, payload });
  };
  const assistant = createAssistantOrchestrator({
    stateStore,
    memoryManager,
    logger,
    toolRouter,
    toolRegistry,
    userDataPath,
    repoRoot,
    voiceService,
  });

  function ensureState() {
    const state = stateStore.readState();
    if (!state.version) stateStore.writeState({ ...defaultState(), ...state, version: 2 });
    return stateStore.readState();
  }

  function updatePermission(name, enabled) {
    const state = stateStore.readState();
    if (!state.permissions[name]) throw new Error(`Unknown permission: ${name}`);
    state.permissions[name].enabled = Boolean(enabled);
    if (enabled) state.permissions[name].lastUsed = new Date().toISOString();
    stateStore.writeState(state);
    logger.log("permission", `${state.permissions[name].label} ${enabled ? "enabled" : "disabled"}`);
    return state.permissions;
  }

  async function selectFiles() {
    const state = stateStore.readState();
    requirePermission(state, "files");
    const result = await dialog.showOpenDialog({
      title: "Select files for B.R.A.C.E",
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Supported files", extensions: ["txt", "md", "pdf", "docx", "csv", "json", "js", "jsx", "ts", "tsx", "py", "html", "css", "png", "jpg", "jpeg", "svg"] },
        { name: "All files", extensions: ["*"] },
      ],
    });
    if (result.canceled) return { ok: true, files: [] };
    touchPermission(state, "files");
    stateStore.writeState(state);
    logger.log("file", `Selected ${result.filePaths.length} file(s)`);
    return { ok: true, files: result.filePaths.map(fileTools.metadata) };
  }

  async function selectFolder() {
    const state = stateStore.readState();
    requirePermission(state, "folders");
    const result = await dialog.showOpenDialog({ title: "Select a folder for B.R.A.C.E", properties: ["openDirectory"] });
    if (result.canceled) return { ok: true, folderPath: "" };
    touchPermission(state, "folders");
    stateStore.writeState(state);
    logger.log("folder", "Folder selected", { folderPath: result.filePaths[0] });
    return { ok: true, folderPath: result.filePaths[0] };
  }

  async function analyzeFile({ filePath, action, question }) {
    const state = stateStore.readState();
    requirePermission(state, "files");
    const resolved = path.resolve(filePath);
    const decision = pathGuard.isAllowed(resolved, { userSelected: true });
    if (!decision.allowed) throw new Error(decision.reason);
    if (!fs.existsSync(resolved)) throw new Error("Selected file does not exist.");
    const text = await fileTools.extractTextFromFile(resolved);
    let result = "";
    if (action === "summarize") result = fileTools.summarizeText(text);
    else if (action === "explain") result = `Simple explanation:\n${fileTools.summarizeText(text)}\n\nKey points:\n${fileTools.keyPoints(text)}`;
    else if (action === "key-points") result = fileTools.keyPoints(text);
    else if (action === "question") result = fileTools.answerQuestion(text, question);
    else throw new Error(`Unsupported file action: ${action}`);
    touchPermission(state, "files");
    stateStore.writeState(state);
    logger.log("file", `File action completed: ${action}`, { file: path.basename(resolved) });
    return { ok: true, result, metadata: fileTools.metadata(resolved) };
  }

  async function runLegacyTask(task) {
    const state = stateStore.readState();
    if (task.type === "open-vscode") {
      requirePermission(state, "appLaunch");
      return (await appTools.openVSCode({ folderPath: task.payload?.folderPath || VAULT_PATH, shell })).message;
    }
    if (task.type === "open-folder") {
      requirePermission(state, "appLaunch");
      return (await appTools.openProjectFolder({ folderPath: task.payload?.folderPath || VAULT_PATH, shell })).message;
    }
    if (task.type === "open-url") {
      requirePermission(state, "appLaunch");
      return (await appTools.openURL({ url: task.payload?.url, shell })).message;
    }
    if (task.type === "launch-app") {
      requirePermission(state, "appLaunch");
      return (await appTools.openSpecificApp({ appPath: task.payload?.appPath, shell })).message;
    }
    if (task.type === "focus-timer") return `Focus timer started for ${Number(task.payload?.minutes || 25)} minutes.`;
    if (task.type === "clean-folder") {
      requirePermission(state, "folders");
      const plan = folderTools.scanFolderForOrganization(task.payload?.folderPath);
      return `Preview ready: ${plan.count} file(s) can be organized. Use the folder organizer approval flow to move them.`;
    }
    throw new Error(`Unsupported task type: ${task.type}`);
  }

  return {
    stateStore,
    logger,
    memoryManager,
    noteManager,
    voiceService,

    toolRouter,
    ensureState,
    handlers: {
      state: () => publicState(ensureState()),
      updateSettings: (patch) => {
        stateStore.updateState((state) => {
          state.settings = { ...state.settings, ...patch };
          return state;
        });
        logger.log("settings", "Settings updated", { keys: Object.keys(patch || {}) });
        return { ok: true };
      },
      saveSecret: ({ key, value }) => {
        if (!["apiKey", "geminiKey", "openAiApiKey"].includes(key)) throw new Error("Unsupported secret key.");
        stateStore.updateState((state) => {
          state.settings[key] = String(value || "").trim();
          return state;
        });
        logger.log("settings", `${key} saved locally`);
        return { ok: true };
      },
      updatePermission,
      logsList: () => logger.list(),
      logsClear: () => logger.clear(),
      chatList: () => stateStore.readState().chatHistory || [],
      chatSave: (messages) => {
        stateStore.updateState((state) => {
          state.chatHistory = Array.isArray(messages) ? messages.slice(-250) : [];
          return state;
        });
        return { ok: true };
      },
      chatClear: () => {
        stateStore.updateState((state) => {
          state.chatHistory = [];
          return state;
        });
        logger.log("chat", "Chat history cleared");
        return { ok: true };
      },
      aiTest: async () => assistant.chat({ message: "Reply with exactly: B.R.A.C.E connection ok", mode: "normal" }),
      systemInfo: async () => {
        const state = stateStore.readState();
        requirePermission(state, "systemInfo");
        touchPermission(state, "systemInfo");
        stateStore.writeState(state);
        return { ok: true, info: await systemTools.getSystemInfo() };
      },
      selectFiles,
      selectFolder,
      analyzeFile,
      tasksList: () => stateStore.readState().tasks || [],
      tasksSave: (tasks) => {
        stateStore.updateState((state) => {
          state.tasks = Array.isArray(tasks) ? tasks : [];
          return state;
        });
        logger.log("task", "Tasks saved", { count: Array.isArray(tasks) ? tasks.length : 0 });
        return { ok: true };
      },
      tasksRun: async (task) => ({ ok: true, output: await runLegacyTask(task) }),
      appsList: () => stateStore.readState().apps || [],
      appsAdd: async (payload = {}) => {
        const state = stateStore.readState();
        requirePermission(state, "appLaunch");
        let appPath = String(payload.appPath || payload.path || "").trim();
        if (!appPath) {
          const result = await dialog.showOpenDialog({ title: "Select app executable", properties: ["openFile"], filters: [{ name: "Executables", extensions: ["exe", "bat", "cmd"] }] });
          if (result.canceled) return { ok: true, app: null };
          appPath = result.filePaths[0];
        }
        const resolvedAppPath = path.resolve(appPath);
        if (!fs.existsSync(resolvedAppPath)) throw new Error("App path does not exist. Paste the full executable path.");
        const appEntry = { id: cryptoId(), name: path.basename(resolvedAppPath), path: resolvedAppPath, trusted: false, addedAt: new Date().toISOString() };
        state.apps = [appEntry, ...(state.apps || [])];
        stateStore.writeState(state);
        logger.log("app", "App launcher entry added", { name: appEntry.name });
        return { ok: true, app: appEntry };
      },
      appsDelete: (id) => {
        stateStore.updateState((state) => {
          state.apps = (state.apps || []).filter((item) => item.id !== id);
          return state;
        });
        logger.log("app", "App launcher entry deleted");
        return { ok: true };
      },
      appsLaunch: async (appEntry) => {
        const state = stateStore.readState();
        requirePermission(state, "appLaunch");
        await appTools.openSpecificApp({ appPath: appEntry.path, shell });
        logger.log("app", "App launched", { name: appEntry.name });
        return { ok: true };
      },
      resolveApproval: async ({ id, decision }) => {
        const state = stateStore.readState();
        const approvals = state.approvals || [];
        const index = approvals.findIndex((a) => String(a.id) === String(id));
        if (index === -1) throw new Error("Approval not found");
        const approval = approvals[index];
        stateStore.updateState((s) => {
          s.approvals.splice(index, 1);
          return s;
        });
        logger.log("tool", `Approval ${decision}: ${approval.tool}`, { id, tool: approval.tool });
        
        if (decision === "approve") {
          const result = await toolRouter.execute(approval.tool, approval.input, { state, memoryManager, toolRouter, requestId: id, approved: true });
          return { ok: true, result };
        }
        return { ok: true, rejected: true };
      },
      clearAllData: () => {
        stateStore.writeState(defaultState());
        logger.log("privacy", "Local app data reset");
        return { ok: true };
      },
      assistantChat: (payload) => assistant.chat(payload),
      assistantStatus: () => assistant.status(),
      toolsList: () => toolRouter.listTools(),
      toolsDryRun: async ({ name, input }) => {
        const tool = toolRouter.getTool(name);
        if (!tool.supportsDryRun) return { ok: false, message: "This tool has no dry run mode." };
        if (name === "folder.organize.preview") return { ok: true, result: folderTools.scanFolderForOrganization(input.folderPath) };
        if (name === "command.explain") return { ok: true, result: await tool.execute(input, {}) };
        return { ok: true, tool: { ...tool, execute: undefined }, input };
      },
      memoryList: () => memoryManager.listMemories(),
      memorySearch: async ({ query }) => await memoryManager.searchMemories(query),
      memorySave: async (payload) => {
        const memory = await memoryManager.saveMemory({ ...payload, approved: true });
        logger.log("memory", `Saved memory: ${memory.title}`, { id: memory.id }, "medium");
        return memory;
      },
      memoryUpdate: async ({ id, patch }) => await memoryManager.updateMemory(id, patch),
      memoryDelete: async ({ id }) => await memoryManager.deleteMemory(id),
      notesList: () => noteManager.listNotes(),
      notesSearch: ({ query }) => noteManager.searchNotes(query),
      notesCreate: (payload) => noteManager.createNote(payload),
      notesRead: ({ id }) => noteManager.readNote(id),
      notesUpdate: ({ id, content }) => noteManager.updateNote(id, content),
      notesDelete: ({ id }) => noteManager.deleteNote(id, shell),
      projectsScan: ({ projectPath }) => scanProject(projectPath),
      projectsAdd: ({ projectPath }) => {
        const project = scanProject(projectPath);
        stateStore.updateState((state) => {
          state.projects = [project, ...(state.projects || []).filter((item) => item.path !== project.path)];
          return state;
        });
        return project;
      },
      projectsList: () => stateStore.readState().projects || [],
      voiceStatus: () => voiceService.status(),
      voiceConfigGet: () => voiceService.getConfig(),
      voiceConfigUpdate: (patch) => voiceService.updateConfig(patch),
      voiceTranscribe: (payload) => voiceService.transcribe(payload),
      voiceTranscribeCancel: (payload) => voiceService.cancelTranscribe(payload.reqId),
      voiceVoices: () => voiceService.listVoices(),
      voiceLog: ({ type, detail }) => voiceService.logEvent(type || "voice event", detail || {}),
      voiceSynthesize: (payload) => voiceService.synthesize(payload),
      startupGreeting: (payload) => greetingService.create(payload),
      startupGreetingPreview: () => greetingService.preview(),
    },
  };
}

module.exports = { createBackend };
