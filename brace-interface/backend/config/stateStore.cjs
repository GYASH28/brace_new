const { defaultState } = require("./defaultConfig.cjs");
const path = require("node:path");

function createStateStore({ userDataPath, db }) {
  // We keep statePath for backwards compatibility of the API, even if unused by DB
  const statePath = path.join(userDataPath, "brace-local-state.json");

  function readState() {
    const state = defaultState();
    
    // Read Settings
    const settingsRows = db.prepare("SELECT key, value FROM settings").all();
    for (const row of settingsRows) {
      if (!(row.key in state.settings)) continue; // STRICT CONFIG PARSING: Ignore unknown keys
      
      try {
        const parsed = JSON.parse(row.value);
        // Basic type validation against default
        if (typeof parsed === typeof state.settings[row.key] || state.settings[row.key] === undefined) {
           state.settings[row.key] = parsed;
        }
      } catch {
        if (typeof state.settings[row.key] === "string" || state.settings[row.key] === undefined) {
          state.settings[row.key] = row.value;
        }
      }
    }

    // Read Permissions
    const permRows = db.prepare("SELECT name, enabled, last_used FROM permissions").all();
    for (const row of permRows) {
      state.permissions[row.name] = {
        label: state.permissions[row.name]?.label || row.name,
        enabled: Boolean(row.enabled),
        lastUsed: row.last_used
      };
    }

    // Read Tasks
    const taskRows = db.prepare("SELECT id, type, status, payload, created_at, updated_at FROM tasks").all();
    state.tasks = taskRows.map(row => {
      let payload = row.payload;
      try { payload = JSON.parse(row.payload); } catch {}
      return { id: row.id, type: row.type, status: row.status, payload, createdAt: row.created_at, updatedAt: row.updated_at };
    });

    // Read Apps
    const appRows = db.prepare("SELECT id, name, path, trusted, added_at FROM apps").all();
    state.apps = appRows.map(row => ({
      id: row.id, name: row.name, path: row.path, trusted: Boolean(row.trusted), addedAt: row.added_at
    }));

    // Read Chat History
    const chatRows = db.prepare("SELECT role, content FROM chat_history ORDER BY id ASC").all();
    state.chatHistory = chatRows.map(row => ({ role: row.role, content: row.content }));

    // Read Logs
    const logRows = db.prepare("SELECT type, message, details, priority, level, timestamp FROM logs ORDER BY id DESC LIMIT 500").all();
    state.logs = logRows.map(row => {
      let details = row.details;
      try { details = JSON.parse(row.details); } catch {}
      return { type: row.type, message: row.message, details, priority: row.priority, level: row.level, timestamp: row.timestamp };
    });

    // Read Greetings
    const greetingRows = db.prepare("SELECT hash FROM greetings ORDER BY id ASC LIMIT 24").all();
    if (greetingRows.length > 0) {
      state.greetings.recentGreetingHashes = greetingRows.map(r => r.hash);
    }

    return state;
  }

  function writeState(state) {
    const transaction = db.transaction(() => {
      // Write Settings
      if (state.settings) {
        const stmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
        for (const [key, value] of Object.entries(state.settings)) {
          let valStr = value;
          if (typeof value === "object") valStr = JSON.stringify(value);
          else if (typeof value !== "string") valStr = String(value);
          stmt.run(key, valStr);
        }
      }

      // Write Permissions
      if (state.permissions) {
        const stmt = db.prepare("INSERT INTO permissions (name, enabled, last_used) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET enabled=excluded.enabled, last_used=excluded.last_used");
        for (const [name, perm] of Object.entries(state.permissions)) {
          stmt.run(name, perm.enabled ? 1 : 0, perm.lastUsed || null);
        }
      }

      // Write Chat History (Clear and re-insert for simplicity, or we can just append. But state is a full array here)
      if (state.chatHistory) {
        db.prepare("DELETE FROM chat_history").run();
        const stmt = db.prepare("INSERT INTO chat_history (role, content) VALUES (?, ?)");
        for (const msg of state.chatHistory) {
          stmt.run(msg.role, msg.content);
        }
      }

      // Write Tasks
      if (state.tasks) {
        // Simple sync: clear and re-insert or upsert. Let's upsert to preserve created_at
        const stmt = db.prepare("INSERT INTO tasks (id, type, status, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET type=excluded.type, status=excluded.status, payload=excluded.payload, updated_at=excluded.updated_at");
        const existingIds = new Set(state.tasks.map(t => t.id));
        const allRows = db.prepare("SELECT id FROM tasks").all();
        for (const row of allRows) {
          if (!existingIds.has(row.id)) {
            db.prepare("DELETE FROM tasks WHERE id = ?").run(row.id);
          }
        }
        for (const task of state.tasks) {
          const payloadStr = typeof task.payload === "object" ? JSON.stringify(task.payload) : String(task.payload || "");
          stmt.run(task.id, task.type, task.status, payloadStr, task.createdAt || new Date().toISOString(), task.updatedAt || new Date().toISOString());
        }
      }

      // Write Apps
      if (state.apps) {
        const stmt = db.prepare("INSERT INTO apps (id, name, path, trusted, added_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, path=excluded.path, trusted=excluded.trusted");
        const existingIds = new Set(state.apps.map(a => a.id));
        const allRows = db.prepare("SELECT id FROM apps").all();
        for (const row of allRows) {
          if (!existingIds.has(row.id)) {
            db.prepare("DELETE FROM apps WHERE id = ?").run(row.id);
          }
        }
        for (const app of state.apps) {
          stmt.run(app.id, app.name, app.path, app.trusted ? 1 : 0, app.addedAt || new Date().toISOString());
        }
      }

      // Write Greetings
      if (state.greetings?.recentGreetingHashes) {
        const stmt = db.prepare("INSERT OR IGNORE INTO greetings (hash) VALUES (?)");
        for (const hash of state.greetings.recentGreetingHashes) {
          stmt.run(hash);
        }
      }
    });

    transaction();
  }

  function updateState(updater) {
    const state = readState();
    const next = updater(state) || state;
    writeState(next);
    return next;
  }

  return { statePath, readState, writeState, updateState };
}

module.exports = { createStateStore };
