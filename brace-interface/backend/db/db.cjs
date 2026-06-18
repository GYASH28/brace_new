const Database = require("better-sqlite3");
const path = require("node:path");

function getDbPath(userDataPath) {
  // Store the database inside the BRACE AppData directory
  return path.join(userDataPath, "brace-data.sqlite");
}

let dbInstance = null;

function initDb(userDataPath) {
  if (dbInstance) return dbInstance;
  const dbPath = getDbPath(userDataPath);
  dbInstance = new Database(dbPath, {
    // verbose: console.log
  });
  dbInstance.pragma("journal_mode = WAL"); // Better concurrency and performance
  dbInstance.pragma("synchronous = NORMAL");

  return dbInstance;
}

function getDb() {
  if (!dbInstance) {
    throw new Error("Database not initialized. Call initDb(userDataPath) first.");
  }
  return dbInstance;
}

module.exports = { initDb, getDb, getDbPath };
