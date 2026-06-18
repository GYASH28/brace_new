const fs = require("node:fs");
const { redactSecrets } = require("../../security/secretScanner.cjs");

const localMemoryCache = new WeakMap();

function tokenize(value) {
  return String(value || "").toLowerCase().split(/\W+/).filter((word) => word.length > 2).slice(0, 24);
}

function scoreMemory(memory, termsOrMessage) {
  const haystack = `${memory.title || ""} ${memory.content || ""} ${(memory.tags || []).join(" ")}`.toLowerCase();
  const words = Array.isArray(termsOrMessage) ? termsOrMessage : tokenize(termsOrMessage);
  const exact = words.reduce((score, word) => score + (haystack.includes(word) ? 1 : 0), 0);
  const importance = memory.importance === "high" ? 2 : memory.importance === "medium" ? 1 : 0;
  return exact + importance;
}

function normalizeMemory(memory, source) {
  return {
    title: memory.title || memory.name || "Memory",
    content: redactSecrets(String(memory.content || memory.summary || "").slice(0, 1200)),
    tags: memory.tags || [],
    source: memory.source || source,
    path: memory.path || memory.obsidianPath,
    updatedAt: memory.updatedAt || memory.modified || "",
    importance: memory.importance,
  };
}

async function readLocalMemorySnapshot(memoryManager) {
  if (!memoryManager?.listMemories) return null;
  const cacheKey = memoryManager;
  const filePath = memoryManager.filePath;
  if (!filePath) {
    const memories = await memoryManager.listMemories();
    return Array.isArray(memories) ? memories : [];
  }
  let signature = "";
  try {
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    signature = stat ? `${stat.mtimeMs}:${stat.size}` : "missing";
  } catch {
    signature = `unknown:${Date.now()}`;
  }
  const cached = localMemoryCache.get(cacheKey);
  if (cached && cached.signature === signature) return cached.memories;
  const memories = await memoryManager.listMemories();
  const safeMemories = Array.isArray(memories) ? memories : [];
  localMemoryCache.set(cacheKey, { signature, memories: safeMemories });
  return safeMemories;
}

async function searchLocalMemories(memoryManager, message, limit) {
  if (!memoryManager) return [];
  const terms = tokenize(message);
  const snapshot = await readLocalMemorySnapshot(memoryManager);
  if (snapshot) {
    const candidates = terms.length
      ? snapshot.filter((memory) => {
          const haystack = `${memory.title || ""} ${memory.content || ""} ${(memory.tags || []).join(" ")}`.toLowerCase();
          return terms.every((term) => haystack.includes(term));
        })
      : snapshot;
    return candidates
      .map((memory) => ({ ...memory, score: scoreMemory(memory, terms) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  const results = await memoryManager.searchMemories?.(message || "") || [];
  return Array.isArray(results) ? results.slice(0, limit) : [];
}

async function buildAssistantContext({
  state = {},
  memoryManager,
  obsidianMemory,
  firebaseMemory,
  message,
  selectedFile,
  projectPath,
  maxMemories = 5,
} = {}) {
  const terms = tokenize(message);
  const perSourceLimit = Math.max(maxMemories, Math.min(maxMemories * 3, 30));
  const local = await searchLocalMemories(memoryManager, message, perSourceLimit);
  const obsidian = await (obsidianMemory?.search?.(message || "", { limit: perSourceLimit }) || []);
  const firebase = await (firebaseMemory?.searchMemories?.(message || "", { limit: perSourceLimit }) || []);
  const seen = new Set();
  const normalized = [];

  for (const item of [
    ...local.map((memory) => normalizeMemory(memory, "local")),
    ...obsidian.map((memory) => normalizeMemory(memory, "obsidian")),
    ...firebase.map((memory) => normalizeMemory(memory, "firebase")),
  ]) {
    const key = `${item.source}:${item.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(item);
  }

  const memories = normalized
    .map((item) => ({ ...item, score: scoreMemory(item, terms) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxMemories);

  return {
    conversation: (state.chatHistory || []).slice(-12).map((item) => ({ ...item, text: redactSecrets(item.text || "") })),
    memories,
    memorySummary: memories.map((memory) => `- [${memory.source}] ${memory.title}: ${memory.content}`).join("\n"),
    selectedFile,
    projectPath,
    safeMode: state.settings?.safeMode !== false,
    permissions: state.permissions || {},
    settings: {
      offlineMode: Boolean(state.settings?.offlineMode),
      voiceOutput: state.settings?.voiceOutput !== false,
    },
  };
}

module.exports = { buildAssistantContext };
