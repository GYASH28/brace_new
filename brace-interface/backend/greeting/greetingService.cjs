"use strict";

const crypto = require("node:crypto");
const path = require("node:path");
const { redactSecrets } = require("../security/secretScanner.cjs");

const MAX_GREETING_CHARS = 260;
const RECENT_HASH_LIMIT = 24;

function hashGreeting(text) {
  return crypto.createHash("sha256").update(String(text || "")).digest("hex").slice(0, 24);
}

function sanitizeForGreeting(value) {
  return String(redactSecrets(value || ""))
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/[A-Za-z]:\\[^\s,;]+/g, "a local project")
    .replace(/\b\/(?:Users|home|mnt|var|etc|tmp)\/[^\s,;]+/gi, "a local project")
    .replace(/https?:\/\/\S+/gi, "a link")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phrase(value, max = 70) {
  const clean = sanitizeForGreeting(value).replace(/[<>[\]{}]/g, "").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}.` : clean;
}

function timeOfDay(now = new Date()) {
  const hour = now.getHours();
  if (hour < 5) return "late night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

function preferredNameFromText(text) {
  const clean = sanitizeForGreeting(text);
  const match = clean.match(/\b(?:my name is|call me|i am|i'm)\s+([A-Z][A-Za-z]{1,24})\b/);
  if (!match) return "";
  const value = match[1];
  if (/^(working|ready|using|building|fixing|going|trying)$/i.test(value)) return "";
  return value;
}

function extractPreferredName(state, memories) {
  const sources = [
    ...(Array.isArray(memories) ? memories : []).flatMap((memory) => [memory.title, memory.content]),
    ...(Array.isArray(state.chatHistory) ? state.chatHistory : []).slice(-30).map((message) => message.text),
  ];
  for (const source of sources) {
    const name = preferredNameFromText(source);
    if (name) return name;
  }
  return "";
}

function projectNames(state) {
  return (Array.isArray(state.projects) ? state.projects : [])
    .map((project) => phrase(project.name || path.basename(project.path || ""), 36))
    .filter(Boolean)
    .slice(0, 3);
}

function focusTermsFromText(text) {
  const clean = sanitizeForGreeting(text).toLowerCase();
  const topicMap = [
    ["kokoro", "Kokoro voice"],
    ["voice", "voice reliability"],
    ["tts", "text-to-speech"],
    ["greeting", "startup greeting"],
    ["button", "button reliability"],
    ["localhost", "localhost runtime"],
    ["electron", "Electron bridge"],
    ["memory", "memory"],
    ["obsidian", "Obsidian memory"],
    ["firebase", "Firebase sync"],
    ["gemini", "Gemini brain"],
    ["project", "project tools"],
    ["performance", "performance"],
    ["ui", "interface polish"],
    ["test", "testing"],
  ];
  return topicMap.filter(([needle]) => clean.includes(needle)).map(([, label]) => label);
}

function recentFocus(state, memories) {
  const fromChat = (Array.isArray(state.chatHistory) ? state.chatHistory : [])
    .slice(-16)
    .flatMap((message) => focusTermsFromText(message.text));
  const fromMemory = (Array.isArray(memories) ? memories : [])
    .slice(0, 8)
    .flatMap((memory) => focusTermsFromText(`${memory.title} ${memory.content}`));
  const explicitMemoryTitles = (Array.isArray(memories) ? memories : [])
    .slice(0, 4)
    .map((memory) => phrase(memory.title, 44))
    .filter(Boolean);
  return Array.from(new Set([...fromChat, ...fromMemory, ...explicitMemoryTitles])).slice(0, 4);
}

function joinList(items) {
  const values = items.filter(Boolean);
  if (values.length <= 1) return values[0] || "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function trimGreeting(text) {
  const clean = sanitizeForGreeting(text);
  if (clean.length <= MAX_GREETING_CHARS) return clean;
  return `${clean.slice(0, MAX_GREETING_CHARS - 1).trim()}.`;
}

function chooseVariant(variants, recentHashes) {
  const shuffled = [...variants].sort(() => crypto.randomInt(0, 3) - 1);
  for (const variant of shuffled) {
    const hash = hashGreeting(variant);
    if (!recentHashes.includes(hash)) return trimGreeting(variant);
  }
  const suffixes = [
    "I have a fresh pass ready.",
    "I am ready for the next step.",
    "Where should we begin?",
    "I can continue from there.",
  ];
  return trimGreeting(`${shuffled[0]} ${suffixes[crypto.randomInt(0, suffixes.length)]}`);
}

function buildGreeting({ state, memories, now = new Date() }) {
  const tod = timeOfDay(now);
  const name = extractPreferredName(state, memories);
  const nameLine = name ? `, ${name}` : "";
  const focus = recentFocus(state, memories);
  const focusLine = focus.length ? joinList(focus) : "your recent B.R.A.C.E work";
  const projects = projectNames(state);
  const projectLine = projects.length ? ` Active project context: ${joinList(projects)}.` : "";
  const memoryCount = Array.isArray(memories) ? memories.length : 0;
  const memoryLine = memoryCount ? " I checked local memory for continuity." : " Local memory is ready when you want to add context.";

  const variants = [
    `Good ${tod}${nameLine}. B.R.A.C.E online. Recent focus: ${focusLine}.${projectLine} I am ready to continue.`,
    `Welcome back${nameLine}. I remember the current thread around ${focusLine}.${projectLine}${memoryLine}`,
    `B.R.A.C.E online for this ${tod}. I checked recent chat, memory, and projects. The strongest thread is ${focusLine}.`,
    `Good ${tod}${nameLine}. Kokoro voice is the primary voice path now. I can pick up from ${focusLine}.`,
    `Ready when you are${nameLine}. Recent context points to ${focusLine}.${projectLine} I will keep it concise and useful.`,
  ];

  const recentHashes = Array.isArray(state.greetings?.recentGreetingHashes) ? state.greetings.recentGreetingHashes : [];
  const text = chooseVariant(variants, recentHashes);
  return {
    text,
    hash: hashGreeting(text),
    context: {
      focus,
      memoryCount,
      projectCount: projects.length,
      timeOfDay: tod,
      usedPreferredName: Boolean(name),
    },
  };
}

function createGreetingService({ stateStore, memoryManager, logger }) {
  function readInputs() {
    const state = stateStore.readState();
    let memories = [];
    try {
      memories = memoryManager?.listMemories?.() || [];
    } catch (error) {
      logger?.log?.("error", `Startup greeting memory read skipped: ${error.message}`, {}, "low", "error");
    }
    return { state, memories };
  }

  function preview() {
    const { state, memories } = readInputs();
    const greeting = buildGreeting({ state, memories });
    return { ok: true, provider: "kokoro", text: greeting.text, context: greeting.context, preview: true };
  }

  function create(payload = {}) {
    const sessionId = String(payload.sessionId || crypto.randomUUID?.() || Date.now());
    const { state, memories } = readInputs();
    const greeting = buildGreeting({ state, memories });
    stateStore.updateState((current) => {
      const recentGreetingHashes = [greeting.hash, ...(current.greetings?.recentGreetingHashes || []).filter((hash) => hash !== greeting.hash)].slice(0, RECENT_HASH_LIMIT);
      current.greetings = {
        ...(current.greetings || {}),
        lastStartupGreetingAt: new Date().toISOString(),
        lastStartupGreetingSessionId: sessionId,
        recentGreetingHashes,
      };
      return current;
    });
    logger?.log?.("voice", "Startup greeting created", { provider: "kokoro", sessionId, ...greeting.context }, "low");
    return { ok: true, provider: "kokoro", text: greeting.text, context: greeting.context, sessionId };
  }

  return { create, preview };
}

module.exports = { buildGreeting, createGreetingService, sanitizeForGreeting };
