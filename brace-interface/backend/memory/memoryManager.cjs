const { normalizeMemory } = require("./memorySchema.cjs");
const { redactSecrets } = require("../security/secretScanner.cjs");

const MAX_MEMORIES = 5000;
const MAX_CONTENT_LENGTH = 64 * 1024;

function createMemoryManager({ memoryDir, db }) {
  // ensure the memory DB table exists
  
  function validateContent(content) {
    if (typeof content !== "string") throw new Error("Memory content must be a string.");
    if (content.length > MAX_CONTENT_LENGTH) {
      throw new Error(`Memory content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters.`);
    }
    return content;
  }

  function listMemories() {
    const rows = db.prepare("SELECT id, type, title, content, tags, approved, created_at, updated_at FROM memories ORDER BY created_at DESC LIMIT ?").all(MAX_MEMORIES);
    return rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      content: row.content,
      tags: JSON.parse(row.tags),
      approved: Boolean(row.approved),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async function saveMemory(input) {
    if (!input.approved) throw new Error("Memory save requires user approval.");
    const content = redactSecrets(validateContent(input.content || ""));
    
    // Check for exact duplicate content
    const existingRow = db.prepare("SELECT id FROM memories WHERE content = ? AND type = ?").get(content, input.type);
    if (existingRow) {
      // Just fetch full to return
      return listMemories().find(m => m.id === existingRow.id);
    }
    
    const memory = normalizeMemory({ ...input, content });
    
    db.prepare("INSERT INTO memories (id, type, title, content, tags, approved, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(memory.id, memory.type, memory.title, memory.content, JSON.stringify(memory.tags), memory.approved ? 1 : 0, memory.createdAt, memory.updatedAt);
      
    return memory;
  }

  async function searchMemories(query) {
    const terms = String(query || "").toLowerCase().split(/\W+/).filter(Boolean);
    if (terms.length === 0) return listMemories();
    const memories = listMemories();
    return memories.filter((memory) => {
      const haystack = `${memory.title} ${memory.content} ${(memory.tags || []).join(" ")}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }

  async function updateMemory(id, patch) {
    const memory = db.prepare("SELECT * FROM memories WHERE id = ?").get(id);
    if (!memory) throw new Error("Memory not found.");
    
    const content = redactSecrets(validateContent(patch.content ?? memory.content));
    
    const memObj = {
      id: memory.id,
      type: patch.type ?? memory.type,
      title: patch.title ?? memory.title,
      content,
      tags: patch.tags ?? JSON.parse(memory.tags),
      approved: true,
      createdAt: memory.created_at,
      updatedAt: new Date().toISOString()
    };
    
    db.prepare("UPDATE memories SET type = ?, title = ?, content = ?, tags = ?, approved = ?, updated_at = ? WHERE id = ?")
      .run(memObj.type, memObj.title, memObj.content, JSON.stringify(memObj.tags), memObj.approved ? 1 : 0, memObj.updatedAt, memObj.id);
      
    return memObj;
  }

  async function deleteMemory(id) {
    db.prepare("DELETE FROM memories WHERE id = ?").run(id);
    return { ok: true };
  }

  function clearMemories() {
    db.prepare("DELETE FROM memories").run();
    return { ok: true };
  }

  function flush() {
    return Promise.resolve(); // SQLite is synchronous, nothing to flush
  }

  return { listMemories, saveMemory, searchMemories, updateMemory, deleteMemory, clearMemories, flush };
}

module.exports = { createMemoryManager, MAX_MEMORIES, MAX_CONTENT_LENGTH };
