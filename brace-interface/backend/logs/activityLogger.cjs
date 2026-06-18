const { redactSecrets } = require("../security/secretScanner.cjs");

// Maximum log entries to keep — prevents unbounded memory growth
const MAX_LOG_ENTRIES = 200;

// Debounce timer for batch log writes to avoid thrashing the state store
const LOG_FLUSH_DELAY_MS = 250;

function createActivityLogger({ stateStore }) {
  let pendingEntries = [];
  let flushTimer = null;

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      if (pendingEntries.length === 0) return;
      const batch = pendingEntries;
      pendingEntries = [];
      stateStore.updateState((state) => {
        state.logs = [...batch, ...(state.logs ?? [])].slice(0, MAX_LOG_ENTRIES);
        return state;
      });
    }, LOG_FLUSH_DELAY_MS);
  }

  function log(type, message, detail = {}, riskLevel = "low", result = "ok") {
    const entry = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
      time: new Date().toISOString(),
      type,
      message: redactSecrets(message),
      detail: redactSecrets(detail),
      riskLevel,
      result,
    };
    pendingEntries.push(entry);
    scheduleFlush();
    return entry;
  }

  function list() {
    // Include any not-yet-flushed entries at the top
    const persisted = stateStore.readState().logs ?? [];
    if (pendingEntries.length === 0) return persisted;
    return [...pendingEntries, ...persisted].slice(0, MAX_LOG_ENTRIES);
  }

  function clear() {
    pendingEntries = [];
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    stateStore.updateState((state) => {
      state.logs = [];
      return state;
    });
    return { ok: true };
  }

  return { log, list, clear };
}

module.exports = { createActivityLogger, MAX_LOG_ENTRIES };
