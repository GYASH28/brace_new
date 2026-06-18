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

    // 2. Chat History
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Tasks
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Apps
    db.exec(`
      CREATE TABLE IF NOT EXISTS apps (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        trusted BOOLEAN DEFAULT 0,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Memories
    db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT NOT NULL,
        approved BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Logs
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

    // 7. Permissions
    db.exec(`
      CREATE TABLE IF NOT EXISTS permissions (
        name TEXT PRIMARY KEY,
        enabled BOOLEAN DEFAULT 0,
        last_used DATETIME
      )
    `);

    // 8. Projects
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        path TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        last_scanned DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Notes
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 10. Greetings
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
