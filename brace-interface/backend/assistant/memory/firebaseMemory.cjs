const { redactSecrets } = require("../../security/secretScanner.cjs");

function hasFirebaseConfig(config = {}) {
  return config.enabled !== false && Boolean(config.projectId && config.clientEmail && config.privateKey);
}

function createFirebaseMemoryAdapter({ config = {}, env = process.env, logger } = {}) {
  const firebaseConfig = Object.keys(config).length
    ? config
    : {
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        databaseUrl: env.FIREBASE_DATABASE_URL,
        storageBucket: env.FIREBASE_STORAGE_BUCKET,
      };
  let db = null;
  let initError = "";

  function init() {
    if (db || initError || !hasFirebaseConfig(firebaseConfig)) return db;
    try {
      const admin = require("firebase-admin");
      const app = admin.apps.length
        ? admin.apps[0]
        : admin.initializeApp({
            credential: admin.credential.cert({
              projectId: firebaseConfig.projectId,
              clientEmail: firebaseConfig.clientEmail,
              privateKey: firebaseConfig.privateKey,
            }),
            databaseURL: firebaseConfig.databaseUrl || undefined,
            storageBucket: firebaseConfig.storageBucket || undefined,
          });
      db = app.firestore();
    } catch (error) {
      initError = error.message;
      logger?.log?.("error", `Firebase adapter disabled: ${error.message}`, {}, "low", "error");
    }
    return db;
  }

  function status() {
    return {
      ok: true,
      configured: hasFirebaseConfig(firebaseConfig) && !initError,
      enabled: hasFirebaseConfig(firebaseConfig),
      projectId: firebaseConfig.projectId || "",
      error: initError,
    };
  }

  async function saveMessage(conversationId, message) {
    const firestore = init();
    if (!firestore) return { ok: false, skipped: true, reason: "Firebase is not configured." };
    await firestore.collection("conversations").doc(conversationId).collection("messages").add(redactSecrets({
      ...message,
      createdAt: new Date().toISOString(),
    }));
    return { ok: true };
  }

  async function saveConversation(conversationId, patch = {}) {
    const firestore = init();
    if (!firestore) return { ok: false, skipped: true, reason: "Firebase is not configured." };
    await firestore.collection("conversations").doc(conversationId).set(redactSecrets({
      ...patch,
      updatedAt: new Date().toISOString(),
    }), { merge: true });
    return { ok: true };
  }

  async function saveMemory(memory) {
    const firestore = init();
    if (!firestore) return { ok: false, skipped: true, reason: "Firebase is not configured." };
    const doc = await firestore.collection("memories").add(redactSecrets({
      ...memory,
      updatedAt: new Date().toISOString(),
      createdAt: memory.createdAt || new Date().toISOString(),
    }));
    return { ok: true, id: doc.id };
  }

  async function logToolRun(run) {
    const firestore = init();
    if (!firestore) return { ok: false, skipped: true, reason: "Firebase is not configured." };
    await firestore.collection("tool_runs").add(redactSecrets({ ...run, createdAt: new Date().toISOString() }));
    return { ok: true };
  }

  async function searchMemories(query, { limit = 5 } = {}) {
    const firestore = init();
    if (!firestore || !query) return [];
    try {
      const snapshot = await firestore.collection("memories").limit(limit).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch {
      return [];
    }
  }

  return { logToolRun, saveConversation, saveMemory, saveMessage, searchMemories, status };
}

module.exports = { createFirebaseMemoryAdapter };
