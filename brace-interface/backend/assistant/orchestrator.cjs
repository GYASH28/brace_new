const { buildAssistantConfig } = require("./config/assistantConfig.cjs");
const { buildAssistantContext } = require("./context/assistantContextBuilder.cjs");
const { createFirebaseMemoryAdapter } = require("./memory/firebaseMemory.cjs");
const { createObsidianMemoryAdapter } = require("./memory/obsidianMemory.cjs");
const { GeminiProvider } = require("./providers/geminiProvider.cjs");
const { NvidiaProvider } = require("./providers/nvidiaProvider.cjs");
const { errorResponse, assistantSystemPrompt } = require("./response/assistantResponseFormatter.cjs");
const { buildGeminiToolDeclarations, createAssistantToolRunner } = require("./tools/assistantToolRegistry.cjs");
const { createGoogleTtsProvider } = require("./voice/googleTtsProvider.cjs");

function id() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function detectMode(message, explicitMode) {
  if (explicitMode) return explicitMode;
  const text = String(message || "").toLowerCase();
  if (/^(remember|from now on|save this|note that)\b/.test(text)) return "memory";
  if (/\b(fix|code|bug|build|npm|typescript|react|backend|frontend)\b/.test(text)) return "coding";
  if (/\b(open|run|launch|organize|scan|tool|agent)\b/.test(text)) return "agent";
  if (/\b(speak|voice|listen|tts|mic)\b/.test(text)) return "voice";
  if (/\b(project|architecture|repo|brace)\b/.test(text)) return "project";
  return "normal";
}

function memoryFromMessage(message) {
  return String(message || "")
    .replace(/^(remember that|remember|from now on|save this|note that)\s*/i, "")
    .trim();
}

const STATUS_CACHE_TTL_MS = 1500;
const OPTIONAL_PERSISTENCE_TIMEOUT_MS = 6000;

async function optionalWithDeadline(label, promise, timeoutMs, logger, detail = {}) {
  let timer = null;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve({ ok: false, skipped: true, reason: `${label} timed out after ${timeoutMs}ms.` }), timeoutMs);
      }),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : `${label} failed.`;
    logger?.log?.("error", `${label} skipped: ${message}`, detail, "low", "error");
    return { ok: false, skipped: true, reason: message };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function createAssistantOrchestrator({ stateStore, memoryManager, logger, toolRouter, toolRegistry, userDataPath, repoRoot, voiceService } = {}) {
  let statusCache = { expiresAt: 0, value: null };
  let toolRuntimeCache = null;

  function makeConfig(state = stateStore.readState()) {
    return buildAssistantConfig({ settings: state.settings, paths: { userDataPath, repoRoot } });
  }

  function makeAdapters(config = makeConfig()) {
    return {
      obsidianMemory: createObsidianMemoryAdapter(config.obsidian),
      firebaseMemory: createFirebaseMemoryAdapter({ config: config.firebase, logger }),
      googleTts: createGoogleTtsProvider({ config: config.googleTts, cacheDir: config.paths.ttsCacheDir, logger }),
    };
  }

  function getToolRuntime() {
    if (toolRuntimeCache?.registry === toolRegistry) return toolRuntimeCache;
    toolRuntimeCache = {
      registry: toolRegistry,
      declarations: buildGeminiToolDeclarations(toolRegistry).slice(0, 32),
      runner: createAssistantToolRunner({ registry: toolRegistry, logger }),
    };
    return toolRuntimeCache;
  }

  function status({ force = false } = {}) {
    const now = Date.now();
    if (!force && statusCache.value && statusCache.expiresAt > now) return statusCache.value;
    const state = stateStore.readState();
    const config = makeConfig(state);
    const adapters = makeAdapters(config);
    const ttsStatus = voiceService?.status?.() || null;
    const value = {
      brain: {
        provider: config.provider,
        online: config.gemini.configured,
        configured: config.gemini.configured,
      },
      model: {
        primary: config.model,
        fallback: config.fallbackModel,
      },
      legacyEnabled: config.legacyEnabled,
      memory: {
        obsidian: adapters.obsidianMemory.status(),
        firebase: adapters.firebaseMemory.status(),
      },
      voice: {
        googleTts: adapters.googleTts.status(),
        tts: ttsStatus,
        fallback: ttsStatus,
      },
      tools: {
        safeMode: state.settings?.safeMode !== false,
        count: toolRegistry.length,
      },
    };
    statusCache = { expiresAt: now + STATUS_CACHE_TTL_MS, value };
    return value;
  }

  async function chat(payload = {}) {
    const message = String(payload.message || payload.prompt || "").trim();
    if (!message) return { ok: false, error: { code: "EMPTY_MESSAGE", message: "Type a message for B.R.A.C.E first." } };

    const requestId = id();
    const conversationId = payload.conversationId || requestId;
    const state = stateStore.readState();
    const config = makeConfig(state);
    const adapters = makeAdapters(config);
    const mode = detectMode(message, payload.mode);

    try {
      if (mode === "memory") {
        const content = memoryFromMessage(message);
        const memory = memoryManager.saveMemory({
          type: "preference",
          title: content.slice(0, 72) || "Saved B.R.A.C.E memory",
          content,
          tags: ["assistant", "user-approved"],
          approved: true,
        });
        let obsidianResult = null;
        try {
          obsidianResult = adapters.obsidianMemory.saveMemory({
            title: memory.title,
            content: memory.content,
            tags: memory.tags,
            importance: "medium",
          });
        } catch (error) {
          logger?.log?.("error", `Obsidian memory save skipped: ${error.message}`, {}, "low", "error");
        }
        const reply = `Memory saved: ${memory.title}`;
        await Promise.all([
          optionalWithDeadline("Firebase memory save", adapters.firebaseMemory.saveMemory({ ...memory, obsidianPath: obsidianResult?.path }), OPTIONAL_PERSISTENCE_TIMEOUT_MS, logger, { requestId }),
          optionalWithDeadline("Firebase conversation save", (async () => {
            await adapters.firebaseMemory.saveMessage(conversationId, { role: "user", content: message });
            await adapters.firebaseMemory.saveMessage(conversationId, { role: "assistant", content: reply, model: "memory" });
          })(), OPTIONAL_PERSISTENCE_TIMEOUT_MS, logger, { requestId }),
        ]);
        return { success: true, message: reply, conversationId, provider: "memory", model: "local-memory", memoryUsed: [], toolCalls: [], mode };
      }

      const context = await buildAssistantContext({
        state,
        memoryManager,
        obsidianMemory: adapters.obsidianMemory,
        firebaseMemory: adapters.firebaseMemory,
        message,
        selectedFile: payload.selectedFile,
        projectPath: payload.projectPath,
      });

      const providerName = config.provider || "nvidia";
      if (providerName !== "gemini" && providerName !== "nvidia") {
        throw Object.assign(new Error(`The ${providerName} provider is not currently supported by the local backend. Please select Gemini or Nvidia in settings.`), { code: "UNSUPPORTED_PROVIDER" });
      }

      const { createModelRouter } = require("./providers/modelRouter.cjs");
      const router = createModelRouter(config);

      const { declarations: toolDeclarations, runner: toolRunner } = getToolRuntime();
      const toolCalls = [];
      const toolLogWrites = [];
      let result = await router.generate({
        userMessage: message,
        systemPrompt: assistantSystemPrompt(),
        conversation: context.conversation,
        memorySummary: context.memorySummary,
        toolDeclarations,
      });

      for (const functionCall of result.functionCalls.slice(0, config.maxToolCalls)) {
        const toolResult = await toolRunner.run(functionCall.name, functionCall.args, {
          state,
          memoryManager,
          toolRouter,
          requestId,
        });

        if (toolResult.needsApproval) {
          const approvalId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          const currentState = stateStore.readState();
          currentState.approvals = currentState.approvals || [];
          currentState.approvals.push({
            id: approvalId,
            tool: toolResult.tool,
            input: functionCall.args,
            description: `Agent requested to run ${toolResult.tool}`,
            createdAt: new Date().toISOString(),
          });
          stateStore.writeState(currentState);
          toolResult.approvalId = approvalId;
        }

        toolCalls.push({ name: functionCall.name, input: functionCall.args, result: toolResult });
        toolLogWrites.push(
          optionalWithDeadline(
            "Firebase tool log",
            adapters.firebaseMemory.logToolRun({ requestId, toolName: functionCall.name, input: functionCall.args, outputSummary: toolResult, status: toolResult.ok ? "ok" : toolResult.needsApproval ? "pending_approval" : "failed" }),
            OPTIONAL_PERSISTENCE_TIMEOUT_MS,
            logger,
            { requestId },
          ),
        );
      }

      if (toolCalls.length && !result.text) {
        result = await router.generate({
          userMessage: message,
          systemPrompt: assistantSystemPrompt(),
          conversation: context.conversation,
          memorySummary: context.memorySummary,
          toolDeclarations,
          toolResults: toolCalls.map((call) => ({ name: call.name, result: call.result })),
        });
      }
      if (toolLogWrites.length) await Promise.all(toolLogWrites);

      const reply = result.text || "I processed the request, but Gemini did not return text.";
      if (payload.voice && state.settings?.voiceOutput !== false) {
        logger?.log?.("voice", "Assistant voice audio deferred to voiceService TTS endpoint.", { requestId, provider: voiceService?.status?.()?.ttsProvider || "unknown" }, "low");
      }

      await Promise.all([
        optionalWithDeadline("Firebase conversation save", adapters.firebaseMemory.saveConversation(conversationId, { mode, model: result.model, provider: result.provider, lastMessageAt: new Date().toISOString() }), OPTIONAL_PERSISTENCE_TIMEOUT_MS, logger, { requestId }),
        optionalWithDeadline("Firebase message save", (async () => {
          await adapters.firebaseMemory.saveMessage(conversationId, { role: "user", content: message });
          await adapters.firebaseMemory.saveMessage(conversationId, { role: "assistant", content: reply, model: result.model, toolCalls, memoryUsed: context.memories });
        })(), OPTIONAL_PERSISTENCE_TIMEOUT_MS, logger, { requestId }),
      ]);
      logger?.log?.("assistant", `Assistant response completed using ${result.model}`, { requestId, mode, memoryUsed: context.memories.length, toolCalls: toolCalls.length }, "low");

      return {
        success: true,
        message: reply,
        conversationId,
        provider: result.provider,
        model: result.model,
        memoryUsed: context.memories.map(({ title, source, path }) => ({ title, source, path })),
        toolCalls,
        mode,
      };
    } catch (error) {
      logger?.log?.("error", `Assistant request failed: ${error.message}`, { requestId, code: error.code }, "medium", "error");
      return { success: false, error: error.message };
    }
  }

  return { chat, status };
}

module.exports = { createAssistantOrchestrator, detectMode };
