function ensureColumn(db, table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
  if (!columns.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function runSchemaMigrations(db) {
  // Use a transaction for schema setup
  const transaction = db.transaction(() => {
    // 1. Settings (Key-Value)
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // 2. Agents (Layer 1 & 3 Core)
    db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        model_provider TEXT NOT NULL,
        system_prompt TEXT NOT NULL,
        status TEXT DEFAULT 'idle',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Tasks (Kanban Board / Operations)
    // Additive schema: preserve legacy stateStore fields (`type`) while supporting STUC task fields.
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        type TEXT,
        title TEXT,
        description TEXT,
        assigned_agent_id TEXT,
        status TEXT DEFAULT 'pending',
        payload TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(assigned_agent_id) REFERENCES agents(id)
      )
    `);
    ensureColumn(db, "tasks", "type", "TEXT");
    ensureColumn(db, "tasks", "title", "TEXT");
    ensureColumn(db, "tasks", "description", "TEXT");
    ensureColumn(db, "tasks", "assigned_agent_id", "TEXT");
    ensureColumn(db, "tasks", "payload", "TEXT DEFAULT '{}'");
    ensureColumn(db, "tasks", "updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP");

    // 4. Messages (Conversations & Tool execution history) plus legacy chat_history.
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        sender TEXT NOT NULL,
        content TEXT NOT NULL,
        tool_calls TEXT,
        tokens_used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(task_id) REFERENCES tasks(id)
      )
    `);

    // 5. Memory Nodes (Layer 2)
    db.exec(`
      CREATE TABLE IF NOT EXISTS memory_nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        tags TEXT DEFAULT '[]',
        approved BOOLEAN DEFAULT 1,
        vector_embedding BLOB,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    ensureColumn(db, "memory_nodes", "title", "TEXT");
    ensureColumn(db, "memory_nodes", "tags", "TEXT DEFAULT '[]'");
    ensureColumn(db, "memory_nodes", "approved", "BOOLEAN DEFAULT 1");

    // 6. Telemetry (Cost & Performance tracking)
    db.exec(`
      CREATE TABLE IF NOT EXISTS telemetry (
        id TEXT PRIMARY KEY,
        agent_id TEXT,
        task_id TEXT,
        tokens_processed INTEGER DEFAULT 0,
        cost_usd REAL DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(agent_id) REFERENCES agents(id),
        FOREIGN KEY(task_id) REFERENCES tasks(id)
      )
    `);

    // 7. Apps (Preserving existing UI features)
    db.exec(`
      CREATE TABLE IF NOT EXISTS apps (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        trusted BOOLEAN DEFAULT 0,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Logs (System activity)
    db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        details TEXT,
        priority TEXT DEFAULT 'low',
        level TEXT DEFAULT 'info',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Permissions (Safety oversight)
    db.exec(`
      CREATE TABLE IF NOT EXISTS permissions (
        name TEXT PRIMARY KEY,
        enabled BOOLEAN DEFAULT 0,
        last_used DATETIME
      )
    `);

    // 10. Projects (Workspace pointers)
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        path TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        last_scanned DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 11. Notes
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 12. Greetings
    db.exec(`
      CREATE TABLE IF NOT EXISTS greetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL UNIQUE,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  transaction();
}

module.exports = { runSchemaMigrations };
