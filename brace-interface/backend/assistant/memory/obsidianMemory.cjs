const fs = require("node:fs");
const path = require("node:path");
const { redactSecrets } = require("../../security/secretScanner.cjs");

const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "release", "_external_clone_BRACE", "external-tools", ".obsidian"]);
const INDEX_TTL_MS = 15000;
const MAX_INDEXED_FILES = 180;
const MAX_NOTE_BYTES = 65536;

function slugify(value) {
  return String(value || "memory").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "memory";
}

function frontmatter(input = {}) {
  return [
    "---",
    "type: memory",
    `importance: ${input.importance || "medium"}`,
    `project: ${input.project || "general"}`,
    `created: ${new Date().toISOString()}`,
    `updated: ${new Date().toISOString()}`,
    `source: ${input.source || "conversation"}`,
    `tags: [${(input.tags || []).map((tag) => `"${String(tag).replace(/"/g, "")}"`).join(", ")}]`,
    "---",
  ].join("\n");
}

function createObsidianMemoryAdapter({ vaultPath, enabled = true, autoCreate = true, searchFileLimit = MAX_INDEXED_FILES, maxContentBytes = MAX_NOTE_BYTES } = {}) {
  const root = vaultPath ? path.resolve(vaultPath) : "";
  const memoryDir = root ? path.join(root, "_BRACE_DATA", "memory", "assistant") : "";
  let markdownIndexCache = { expiresAt: 0, items: [], limit: 0 };
  const contentCache = new Map();

  function status() {
    return {
      ok: true,
      configured: Boolean(enabled && root),
      enabled: Boolean(enabled),
      path: root,
      exists: Boolean(root && fs.existsSync(root)),
    };
  }

  function ensure() {
    if (!enabled || !root) throw new Error("Obsidian memory is not configured.");
    if (!fs.existsSync(root)) {
      if (!autoCreate) throw new Error("Obsidian vault path does not exist.");
      fs.mkdirSync(root, { recursive: true });
    }
    fs.mkdirSync(memoryDir, { recursive: true });
  }

  function saveMemory(input = {}) {
    ensure();
    const title = input.title || "B.R.A.C.E Memory";
    const filePath = path.join(memoryDir, `${new Date().toISOString().slice(0, 10)}-${slugify(title)}.md`);
    const body = [
      frontmatter(input),
      "",
      `# ${title}`,
      "",
      "## Fact",
      redactSecrets(input.content || ""),
      "",
      "## Why it matters",
      redactSecrets(input.why || "This memory can help B.R.A.C.E answer future requests with better context."),
      "",
      "## Related",
      ...(input.related || ["[[B.R.A.C.E]]"]).map((item) => `- ${item}`),
      "",
    ].join("\n");
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, body, "utf8");
    fs.renameSync(tmp, filePath);
    markdownIndexCache = { expiresAt: 0, items: [], limit: 0 };
    contentCache.delete(filePath);
    return { ok: true, path: filePath, title };
  }

  function readMarkdownSnippet(filePath) {
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return null;
    }
    const cached = contentCache.get(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) return cached;

    let raw = "";
    try {
      if (stat.size > maxContentBytes) {
        const fd = fs.openSync(filePath, "r");
        try {
          const buffer = Buffer.allocUnsafe(maxContentBytes);
          const bytesRead = fs.readSync(fd, buffer, 0, maxContentBytes, 0);
          raw = buffer.toString("utf8", 0, bytesRead);
        } finally {
          fs.closeSync(fd);
        }
      } else {
        raw = fs.readFileSync(filePath, "utf8");
      }
    } catch {
      return null;
    }

    const content = redactSecrets(raw.replace(/^---[\s\S]*?---/, "").replace(/\s+/g, " ").trim().slice(0, 1200));
    const item = {
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      title: path.basename(filePath, ".md"),
      content,
      path: filePath,
      source: "obsidian",
      haystack: `${path.basename(filePath)} ${content}`.toLowerCase(),
    };
    contentCache.set(filePath, item);
    if (contentCache.size > searchFileLimit * 2) {
      const oldest = contentCache.keys().next().value;
      if (oldest) contentCache.delete(oldest);
    }
    return item;
  }

  function readMarkdownIndex(limit = searchFileLimit) {
    if (!enabled || !root || !fs.existsSync(root)) return [];
    const now = Date.now();
    const cappedLimit = Math.max(1, Math.min(Number(limit) || searchFileLimit, searchFileLimit));
    if (markdownIndexCache.expiresAt > now && markdownIndexCache.limit >= cappedLimit) return markdownIndexCache.items.slice(0, cappedLimit);

    const items = [];
    function walk(current) {
      if (items.length >= cappedLimit) return;
      let entries = [];
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.toLowerCase().endsWith(".md")) {
          const item = readMarkdownSnippet(full);
          if (item) items.push(item);
        }
        if (items.length >= cappedLimit) break;
      }
    }
    walk(root);
    markdownIndexCache = { expiresAt: now + INDEX_TTL_MS, items, limit: cappedLimit };
    return items;
  }

  function search(query, { limit = 5 } = {}) {
    const terms = String(query || "").toLowerCase().split(/\W+/).filter((term) => term.length > 2);
    if (!terms.length) return [];
    return readMarkdownIndex(Math.max(limit * 20, limit))
      .map((item) => {
        const haystack = item.haystack;
        const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
        return {
          title: item.title,
          content: item.content,
          path: item.path,
          source: item.source,
          score,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  return { saveMemory, search, status };
}

module.exports = { createObsidianMemoryAdapter };
