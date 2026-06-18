const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { buildAssistantConfig } = require("../assistant/config/assistantConfig.cjs");
const { buildAssistantContext } = require("../assistant/context/assistantContextBuilder.cjs");
const { createFirebaseMemoryAdapter } = require("../assistant/memory/firebaseMemory.cjs");
const { createObsidianMemoryAdapter } = require("../assistant/memory/obsidianMemory.cjs");
const { createGoogleTtsProvider } = require("../assistant/voice/googleTtsProvider.cjs");
const { createAssistantOrchestrator } = require("../assistant/orchestrator.cjs");
const { GeminiProvider } = require("../assistant/providers/geminiProvider.cjs");
const { buildGeminiToolDeclarations, createAssistantToolRunner } = require("../assistant/tools/assistantToolRegistry.cjs");
const { createMemoryManager } = require("../memory/memoryManager.cjs");
const fileTools = require("../tools/fileTools.cjs");

test("assistant config defaults Gemini and hides legacy providers", () => {
  const config = buildAssistantConfig({
    env: {},
    settings: {},
    paths: { userDataPath: os.tmpdir(), repoRoot: process.cwd() },
  });

  assert.equal(config.provider, "gemini");
  assert.equal(config.model, "gemini-2.5-flash");
  assert.equal(config.fallbackModel, "gemini-2.5-flash-lite");
  assert.equal(config.legacyEnabled, false);
  assert.equal(config.gemini.configured, false);
});

test("Gemini provider retries primary model and uses fallback model", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    if (calls.length === 1) {
      return { ok: false, status: 429, json: async () => ({ error: { message: "rate limited" } }) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "Fallback answer" }] } }],
      }),
    };
  };
  const provider = new GeminiProvider({
    apiKey: "test-key-no-prefix",
    model: "gemini-2.5-flash",
    fallbackModel: "gemini-2.5-flash-lite",
    maxRetries: 0,
    timeoutMs: 1000,
    fetchImpl,
  });

  const result = await provider.generate({ userMessage: "hello", systemPrompt: "You are B.R.A.C.E." });

  assert.equal(result.text, "Fallback answer");
  assert.equal(result.model, "gemini-2.5-flash-lite");
  assert.match(calls[0], /gemini-2\.5-flash:generateContent/);
  assert.match(calls[1], /gemini-2\.5-flash-lite:generateContent/);
});

test("tool declarations hide approval-only execution behind safe metadata", async () => {
  const registry = [
    { name: "system.info", description: "Read system info", riskLevel: "low", inputSchema: {}, execute: async () => ({ ok: true }) },
    { name: "command.run", description: "Run command", riskLevel: "high", inputSchema: {}, execute: async () => ({ ok: true }) },
  ];
  const declarations = buildGeminiToolDeclarations(registry);
  const runner = createAssistantToolRunner({ registry, logger: { log: () => undefined } });

  assert.deepEqual(declarations.map((tool) => tool.name), ["system_info", "command_run"]);
  assert.equal(declarations[0].parameters.type, "object");

  const safe = await runner.run("system_info", {}, {});
  const blocked = await runner.run("command_run", { command: "npm install" }, {});

  assert.equal(safe.ok, true);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.needsApproval, true);
});

test("assistant context limits memories and redacts secrets", () => {
  const memoryManager = {
    searchMemories: () => Array.from({ length: 12 }, (_, index) => ({
      title: `Memory ${index}`,
      content: `content ${index} api_key=secretvalue12345`,
      tags: ["test"],
      updatedAt: new Date(Date.now() - index).toISOString(),
    })),
  };
  const context = buildAssistantContext({
    state: { chatHistory: Array.from({ length: 20 }, (_, index) => ({ role: "user", text: `message ${index}` })) },
    memoryManager,
    obsidianMemory: { search: () => [] },
    firebaseMemory: { searchMemories: async () => [] },
    message: "test",
    maxMemories: 5,
  });

  assert.equal(context.conversation.length, 12);
  assert.equal(context.memories.length, 5);
  assert.doesNotMatch(context.memorySummary, /secretvalue/);
  assert.match(context.memorySummary, /redacted/);
});

test("Obsidian memory adapter writes markdown and searches safely", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "brace-obsidian-"));
  const adapter = createObsidianMemoryAdapter({ vaultPath: dir, enabled: true });
  const saved = adapter.saveMemory({
    title: "Gemini core decision",
    content: "Use Gemini as the primary brain.",
    project: "BRACE",
    tags: ["gemini"],
    importance: "high",
  });
  const results = adapter.search("primary brain");

  assert.equal(saved.ok, true);
  assert.equal(results.length, 1);
  assert.match(fs.readFileSync(saved.path, "utf8"), /type: memory/);
});

test("Firebase and Google TTS adapters are disabled cleanly without credentials", () => {
  const firebase = createFirebaseMemoryAdapter({ env: {}, logger: { log: () => undefined } });
  const tts = createGoogleTtsProvider({ env: {}, cacheDir: os.tmpdir(), logger: { log: () => undefined } });

  assert.equal(firebase.status().configured, false);
  assert.equal(firebase.status().ok, true);
  assert.equal(tts.status().configured, false);
  assert.equal(tts.status().ok, true);
});

test("assistant orchestrator saves explicit memories without Gemini", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "brace-orchestrator-"));
  const state = { settings: { safeMode: true, voiceOutput: false }, chatHistory: [], permissions: {} };
  const orchestrator = createAssistantOrchestrator({
    stateStore: { readState: () => state },
    memoryManager: createMemoryManager({ memoryDir: path.join(dir, "memory") }),
    logger: { log: () => undefined },
    toolRegistry: [],
    toolRouter: { listTools: () => [] },
    userDataPath: dir,
    repoRoot: dir,
  });

  const response = await orchestrator.chat({ message: "Remember that Gemini is the primary B.R.A.C.E brain." });

  assert.equal(response.success, true);
  assert.equal(response.provider, "memory");
  assert.match(response.message, /Memory saved/);
});

test("assistant orchestrator returns friendly missing Gemini key error", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "brace-orchestrator-"));
  const state = { settings: { aiProvider: "gemini", safeMode: true, voiceOutput: false }, chatHistory: [], permissions: {} };
  const orchestrator = createAssistantOrchestrator({
    stateStore: { readState: () => state },
    memoryManager: createMemoryManager({ memoryDir: path.join(dir, "memory") }),
    logger: { log: () => undefined },
    toolRegistry: [],
    toolRouter: { listTools: () => [] },
    userDataPath: dir,
    repoRoot: dir,
  });

  const response = await orchestrator.chat({ message: "Explain Firebase." });

  assert.equal(response.success, false);
  assert.match(response.error, /Gemini API key is missing/);
});

test("PDF extraction supports installed pdf-parse API", async () => {
  const pdfPath = path.join(__dirname, "..", "..", "node_modules", "pdf-parse", "test", "data", "01-valid.pdf");
  if (!fs.existsSync(pdfPath)) return;

  const text = await fileTools.extractTextFromFile(pdfPath);

  assert.equal(typeof text, "string");
  assert.ok(text.length > 0);
});
