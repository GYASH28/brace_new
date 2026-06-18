const { normalizeMemory } = require("./memorySchema.cjs");
const { redactSecrets } = require("../security/secretScanner.cjs");
const fs = require("node:fs");
const path = require("node:path");

const MAX_MEMORIES = 5000;
const MAX_CONTENT_LENGTH = 64 * 1024;

function createMemoryManager({ memoryDir, db }) {
  const filePath = memoryDir ? path.join(memoryDir, "memoryStore.json") : "";

  function readFileMemories() {
    if (!filePath || !fs.existsSync(filePath)) return [];
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeFileMemories(memories) {
    if (!filePath) return;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(memories, null, 2));
  }
  
  function validateContent(content) {
    if (typeof content !== "string") throw new Error("Memory content must be a string.");
    if (content.length > MAX_CONTENT_LENGTH) {
      throw new Error(`Memory content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters.`);
    }
    return content;
  }

  function listMemories() {
    if (!db) return readFileMemories().slice(0, MAX_MEMORIES);
    const rows = db.prepare("SELECT id, type, content, created_at, updated_at FROM memory_nodes ORDER BY created_at DESC LIMIT ?").all(MAX_MEMORIES);
    return rows.map(row => ({
      id: row.id,
      type: row.type,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

    function saveMemory(input) {
    if (!input.approved) throw new Error("Memory save requires user approval.");
    const content = redactSecrets(validateContent(input.content || ""));
    
    if (!db) {
      const memories = readFileMemories();
      const existing = memories.find((item) => item.content === content && item.type === input.type);
      if (existing) return existing;
      const memory = normalizeMemory({ ...input, content });
      memories.unshift(memory);
      writeFileMemories(memories.slice(0, MAX_MEMORIES));
      return memory;
    }

    // Check for exact duplicate content
    const existingRow = db.prepare("SELECT id FROM memory_nodes WHERE content = ? AND type = ?").get(content, input.type);
    if (existingRow) {
      // Just fetch full to return
      return listMemories().find(m => m.id === existingRow.id);
    }
    
    const memory = normalizeMemory({ ...input, content });
    
    db.prepare("INSERT INTO memory_nodes (id, type, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run(memory.id, memory.type, memory.content, memory.createdAt, memory.updatedAt);
      
    return memory;
  }

    function searchMemories(query) {
    const terms = String(query || "").toLowerCase().split(/\W+/).filter(Boolean);
    if (terms.length === 0) return listMemories();
    const memories = listMemories();
    return memories.filter((memory) => {
      const haystack = `${memory.content}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }

    function updateMemory(id, patch) {
    if (!db) {
      const memories = readFileMemories();
      const index = memories.findIndex((item) => item.id === id);
      if (index === -1) throw new Error("Memory not found.");
      const current = memories[index];
      const updated = {
        ...current,
        ...patch,
        content: redactSecrets(validateContent(patch.content ?? current.content)),
        updatedAt: new Date().toISOString(),
      };
      memories[index] = updated;
      writeFileMemories(memories);
      return updated;
    }
    const memory = db.prepare("SELECT * FROM memory_nodes WHERE id = ?").get(id);
    if (!memory) throw new Error("Memory not found.");
    
    const content = redactSecrets(validateContent(patch.content ?? memory.content));
    
    const memObj = {
      id: memory.id,
      type: patch.type ?? memory.type,
      content,
      createdAt: memory.created_at,
      updatedAt: new Date().toISOString()
    };
    
    db.prepare("UPDATE memory_nodes SET type = ?, content = ?, updated_at = ? WHERE id = ?")
      .run(memObj.type, memObj.content, memObj.updatedAt, memObj.id);
      
    return memObj;
  }

    function deleteMemory(id) {
    if (!db) {
      writeFileMemories(readFileMemories().filter((item) => item.id !== id));
      return { ok: true };
    }
    db.prepare("DELETE FROM memory_nodes WHERE id = ?").run(id);
    return { ok: true };
  }

  function clearMemories() {
    if (!db) {
      writeFileMemories([]);
      return { ok: true };
    }
    db.prepare("DELETE FROM memory_nodes").run();
    return { ok: true };
  }

  function flush() {
    return Promise.resolve(); // SQLite is synchronous, nothing to flush
  }

  return { filePath, listMemories, saveMemory, searchMemories, updateMemory, deleteMemory, clearMemories, flush };
}

module.exports = { createMemoryManager, MAX_MEMORIES, MAX_CONTENT_LENGTH };
