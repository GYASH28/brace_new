const fs = require("node:fs");
const path = require("node:path");

function runMigrations(db, userDataPath, memoryDir) {
  const statePath = path.join(userDataPath, "brace-local-state.json");
  const memoryPath = path.join(memoryDir, "memoryStore.json");

  const migrateTransaction = db.transaction(() => {
    // 1. Migrate brace-local-state.json
    if (fs.existsSync(statePath)) {
      try {
        const rawState = fs.readFileSync(statePath, "utf8");
        const state = JSON.parse(rawState);

        // Migrate Settings
        if (state.settings) {
          const stmt = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
          for (const [key, value] of Object.entries(state.settings)) {
            let valStr = value;
            if (typeof value === "object") {
              valStr = JSON.stringify(value);
            } else if (typeof value !== "string") {
              valStr = String(value);
            }
            stmt.run(key, valStr);
          }
        }

        // Migrate Permissions
        if (state.permissions) {
          const stmt = db.prepare("INSERT OR IGNORE INTO permissions (name, enabled, last_used) VALUES (?, ?, ?)");
          for (const [name, perm] of Object.entries(state.permissions)) {
            stmt.run(name, perm.enabled ? 1 : 0, perm.lastUsed || null);
          }
        }

        // Migrate Chat History
        if (Array.isArray(state.chatHistory)) {
          const stmt = db.prepare("INSERT INTO chat_history (role, content) VALUES (?, ?)");
          for (const msg of state.chatHistory) {
            stmt.run(msg.role, msg.content);
          }
        }

        // Migrate Apps
        if (Array.isArray(state.apps)) {
          const stmt = db.prepare("INSERT OR IGNORE INTO apps (id, name, path, trusted, added_at) VALUES (?, ?, ?, ?, ?)");
          for (const app of state.apps) {
            stmt.run(app.id, app.name, app.path, app.trusted ? 1 : 0, app.addedAt || new Date().toISOString());
          }
        }

        // Migrate Tasks
        if (Array.isArray(state.tasks)) {
          const stmt = db.prepare("INSERT OR IGNORE INTO tasks (id, type, status, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
          for (const task of state.tasks) {
            const payloadStr = typeof task.payload === "object" ? JSON.stringify(task.payload) : String(task.payload || "");
            stmt.run(task.id, task.type, task.status, payloadStr, task.createdAt || new Date().toISOString(), task.updatedAt || new Date().toISOString());
          }
        }

        // Rename after successful migration within the JS try-block
        // We do this after the transaction commits to avoid partial failures
      } catch (err) {
        console.error("Failed to migrate brace-local-state.json", err);
      }
    }

    // 2. Migrate memoryStore.json
    if (fs.existsSync(memoryPath)) {
      try {
        const rawMemory = fs.readFileSync(memoryPath, "utf8");
        const memories = JSON.parse(rawMemory);
        if (Array.isArray(memories)) {
          const stmt = db.prepare("INSERT OR IGNORE INTO memories (id, type, title, content, tags, approved, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
          for (const mem of memories) {
            stmt.run(
              mem.id,
              mem.type,
              mem.title,
              mem.content,
              JSON.stringify(mem.tags || []),
              mem.approved ? 1 : 0,
              mem.createdAt || new Date().toISOString(),
              mem.updatedAt || new Date().toISOString()
            );
          }
        }
      } catch (err) {
        console.error("Failed to migrate memoryStore.json", err);
      }
    }
  });

  // Execute the migration transaction
  migrateTransaction();

  // Rename files to .bak so we don't migrate them again
  if (fs.existsSync(statePath)) {
    try { fs.renameSync(statePath, statePath + ".bak"); } catch (e) { console.error(e); }
  }
  if (fs.existsSync(memoryPath)) {
    try { fs.renameSync(memoryPath, memoryPath + ".bak"); } catch (e) { console.error(e); }
  }
}

module.exports = { runMigrations };
