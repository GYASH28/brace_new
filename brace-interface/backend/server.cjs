const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const { AsyncLocalStorage } = require("node:async_hooks");
const { EventEmitter } = require("node:events");
const { createBackend } = require("./index.cjs");

const requestContext = new AsyncLocalStorage();
const sseEmitter = new EventEmitter();

const HOST = process.env.BRACE_HOST || "127.0.0.1";
const PORT = Number(process.env.BRACE_BACKEND_PORT || 8787);
const BODY_LIMIT_BYTES = Math.max(1024, Math.min(Number(process.env.BRACE_HTTP_BODY_LIMIT_BYTES || 2 * 1024 * 1024), 2 * 1024 * 1024));
const REQUEST_TIMEOUT_MS = Math.max(1000, Math.min(Number(process.env.BRACE_HTTP_TIMEOUT_MS || 90000), 300000));
const MAX_URL_LENGTH = 2048;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 200;
const RATE_LIMIT_AI_MAX = 30;
const allowedOrigins = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  ...(process.env.BRACE_ALLOWED_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean),
]);

// Sliding window rate limiter per IP
const rateBuckets = new Map();
setInterval(() => rateBuckets.clear(), RATE_LIMIT_WINDOW_MS).unref();

function checkRateLimit(ip, limit = RATE_LIMIT_MAX) {
  const now = Date.now();
  if (!rateBuckets.has(ip)) rateBuckets.set(ip, []);
  const timestamps = rateBuckets.get(ip).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  rateBuckets.set(ip, timestamps);
  return timestamps.length <= limit;
}

function userDataPath() {
  if (process.env.BRACE_USER_DATA_DIR) return path.resolve(process.env.BRACE_USER_DATA_DIR);
  return path.join(os.homedir(), "AppData", "Roaming", "B.R.A.C.E");
}

function openWithWindowsShell(target) {
  return new Promise((resolve, reject) => {
    const targetStr = String(target || "").trim();
    if (!targetStr) return reject(new Error("No target provided."));
    const child = spawn("explorer.exe", [targetStr], { detached: true, stdio: "ignore" });
    child.on("error", reject);
    child.unref();
    resolve("");
  });
}

const backend = createBackend({
  app: {
    isPackaged: false,
    getPath(name) {
      if (name === "userData") return userDataPath();
      if (name === "documents") return path.join(os.homedir(), "Documents");
      if (name === "downloads") return path.join(os.homedir(), "Downloads");
      return process.cwd();
    },
  },
  dialog: {
    async showOpenDialog() {
      throw new Error("Native file picker is unavailable in localhost browser mode. Use drag-and-drop or paste an absolute path.");
    },
  },
  shell: {
    async openExternal(url) {
      if (process.platform === "win32") return openWithWindowsShell(url);
      return new Promise((resolve, reject) => {
        const opener = process.platform === "darwin" ? "open" : "xdg-open";
        const child = spawn(opener, [url], { detached: true, stdio: "ignore" });
        child.on("error", reject);
        child.unref();
        resolve("");
      });
    },
    async openPath(targetPath) {
      const resolved = path.resolve(targetPath);
      try {
        await this.openExternal(resolved);
        return "";
      } catch (error) {
        return error instanceof Error ? error.message : "Could not open path.";
      }
    },
  },
  mainWindow: () => null,
  sseEmitter,
});

backend.ensureState();

function withCors(req, res) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "false");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  res.setHeader("Cache-Control", "no-store");
}

function isOriginAllowed(req) {
  const origin = req.headers.origin;
  return !origin || allowedOrigins.has(origin);
}

function send(res, statusCode, payload) {
  if (res.writableEnded) return;
  res.writeHead(statusCode);
  res.end(JSON.stringify(payload));
}

function ok(res, data = {}) {
  send(res, 200, { ok: true, data });
}

function errorPayload(code, message, recoverable = true) {
  return { ok: false, error: { code, message, recoverable } };
}

function fail(res, statusCode, code, message, recoverable = true) {
  send(res, statusCode, errorPayload(code, message, recoverable));
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let received = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      received += chunk.length;
      if (received > BODY_LIMIT_BYTES) {
        reject(Object.assign(new Error("Request body too large."), { statusCode: 413, code: "BODY_TOO_LARGE" }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error("Invalid JSON body."), { statusCode: 400, code: "INVALID_JSON" }));
      }
    });
    req.on("error", reject);
  });
}

function pathId(pathname, prefix) {
  return decodeURIComponent(pathname.slice(prefix.length)).replace(/^\/+/, "");
}

async function callHandler(label, fn) {
  const result = await fn();
  backend.logger.log("api", `${label} completed`, {}, "low");
  return result;
}

async function route(req, res) {
  withCors(req, res);
  if (!isOriginAllowed(req)) {
    return fail(res, 403, "CORS_ORIGIN_BLOCKED", "Only localhost frontend origins are allowed.", false);
  }
  if (req.method === "OPTIONS") return send(res, 204, {});

  // Rate limiting
  const clientIp = req.socket.remoteAddress || "unknown";
  const isAiRoute = (req.url || "").includes("/api/assistant/chat") || (req.url || "").includes("/api/ai/");
  if (!checkRateLimit(clientIp, isAiRoute ? RATE_LIMIT_AI_MAX : RATE_LIMIT_MAX)) {
    return fail(res, 429, "RATE_LIMITED", "Too many requests. Please wait before trying again.", true);
  }

  // URL length protection
  if ((req.url || "").length > MAX_URL_LENGTH) {
    return fail(res, 414, "URI_TOO_LONG", "Request URL exceeds maximum length.", true);
  }

  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  const body = ["POST", "PUT", "DELETE"].includes(req.method || "") ? await readBody(req) : {};
  const handlers = backend.handlers;

  if (req.method === "GET" && url.pathname === "/health") {
    const assistantStatus = handlers.assistantStatus();
    const voiceStatus = handlers.voiceStatus();
    const state = handlers.state();
    return ok(res, {
      status: "ok",
      version: state.version || 2,
      runtime: "localhost",
      host: HOST,
      port: PORT,
      uptimeSeconds: Math.round(process.uptime()),
      assistant: assistantStatus,
      voice: voiceStatus,
      environment: { ready: true }
    });
  }
  if (req.method === "GET" && url.pathname === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });
    res.write("data: connected\n\n");
    
    const listener = (eventData) => {
      res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    };
    sseEmitter.on("event", listener);
    
    req.on("close", () => {
      sseEmitter.off("event", listener);
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/status") {
    return ok(res, { runtime: "localhost", state: handlers.state(), assistant: handlers.assistantStatus(), voice: handlers.voiceStatus() });
  }
  if (req.method === "GET" && url.pathname === "/api/state") return ok(res, handlers.state());
  if (req.method === "GET" && url.pathname === "/api/settings") return ok(res, handlers.state().settings);
  if (req.method === "POST" && url.pathname === "/api/settings") return ok(res, await callHandler("settings:update", () => handlers.updateSettings(body)));
  if (req.method === "POST" && url.pathname === "/api/settings/secret") return ok(res, await callHandler("settings:save-secret", () => handlers.saveSecret(body)));
  if (req.method === "POST" && url.pathname === "/api/permissions") return ok(res, handlers.updatePermission(body.name, body.enabled));

  if (req.method === "GET" && url.pathname === "/api/logs") return ok(res, handlers.logsList());
  if (req.method === "DELETE" && url.pathname === "/api/logs") return ok(res, handlers.logsClear());
  if (req.method === "GET" && url.pathname === "/api/chat") return ok(res, handlers.chatList());
  if (req.method === "POST" && url.pathname === "/api/chat") return ok(res, handlers.chatSave(body.messages || body));
  if (req.method === "DELETE" && url.pathname === "/api/chat") return ok(res, handlers.chatClear());

  if (req.method === "POST" && url.pathname === "/api/ai/test") return ok(res, await handlers.aiTest());
  if (req.method === "POST" && url.pathname === "/api/assistant/chat") return ok(res, await handlers.assistantChat(body));
  if (req.method === "GET" && url.pathname === "/api/assistant/status") return ok(res, handlers.assistantStatus());

  if (req.method === "GET" && url.pathname === "/api/greeting/startup") return send(res, 200, handlers.startupGreetingPreview());
  if (req.method === "POST" && url.pathname === "/api/greeting/startup") return send(res, 200, await callHandler("greeting:startup", () => handlers.startupGreeting(body)));

  if (req.method === "GET" && url.pathname === "/api/voice/status") return ok(res, handlers.voiceStatus());
  if (req.method === "GET" && url.pathname === "/api/voice/config") return ok(res, handlers.voiceConfigGet());
  if (req.method === "POST" && url.pathname === "/api/voice/config") return ok(res, handlers.voiceConfigUpdate(body));
  if (req.method === "GET" && url.pathname === "/api/voice/voices") return ok(res, handlers.voiceVoices());
  if (req.method === "POST" && url.pathname === "/api/voice/transcribe") return ok(res, await handlers.voiceTranscribe(body));
  if (req.method === "POST" && url.pathname === "/api/voice/transcribe/cancel") return ok(res, handlers.voiceTranscribeCancel(body));
  if (req.method === "POST" && url.pathname === "/api/voice/log") return ok(res, handlers.voiceLog(body));
  if (req.method === "POST" && url.pathname === "/api/voice/tts") {
    if (!body.text || !String(body.text).trim()) {
      return fail(res, 400, "VOICE_TTS_MISSING_TEXT", "text is required for TTS synthesis.", true);
    }
    return send(res, 200, await callHandler("voice:tts", () => handlers.voiceSynthesize(body)));
  }

  if (req.method === "GET" && url.pathname === "/api/system") return ok(res, await handlers.systemInfo());
  if (req.method === "POST" && url.pathname === "/api/files/analyze") return ok(res, await handlers.analyzeFile(body));
  if (req.method === "POST" && url.pathname === "/api/files/select") return ok(res, await handlers.selectFiles());

  if (req.method === "GET" && url.pathname === "/api/tasks") return ok(res, handlers.tasksList());
  if (req.method === "POST" && url.pathname === "/api/tasks") return ok(res, handlers.tasksSave(body.tasks || body));
  if (req.method === "POST" && url.pathname === "/api/tasks/run") return ok(res, await handlers.tasksRun(body));

  if (req.method === "GET" && url.pathname === "/api/apps") return ok(res, handlers.appsList());
  if (req.method === "POST" && url.pathname === "/api/apps/add") return ok(res, await handlers.appsAdd(body));
  if (req.method === "POST" && url.pathname === "/api/apps/launch") return ok(res, await handlers.appsLaunch(body));
  if (req.method === "DELETE" && url.pathname.startsWith("/api/apps/")) return ok(res, handlers.appsDelete(pathId(url.pathname, "/api/apps/")));


  if (req.method === "GET" && url.pathname === "/api/tools") return ok(res, handlers.toolsList());
  if (req.method === "POST" && url.pathname === "/api/tools/dry-run") return ok(res, await handlers.toolsDryRun(body));
  if (req.method === "POST" && url.pathname === "/api/tools/run") {
    return fail(res, 403, "DIRECT_TOOL_RUN_BLOCKED", "Direct tool execution is blocked in localhost mode. Use the agent approval workflow or dry-run endpoint.", true);
  }
  
  if (req.method === "POST" && url.pathname.startsWith("/api/approvals/")) {
    const id = url.pathname.split("/")[3];
    const action = url.pathname.split("/")[4];
    if (action === "resolve") return ok(res, await handlers.resolveApproval({ id, decision: body.decision }));
  }

  if (req.method === "GET" && url.pathname === "/api/memory") return ok(res, handlers.memoryList());
  if (req.method === "GET" && url.pathname === "/api/memory/status") {
    const assistantStatus = handlers.assistantStatus();
    return ok(res, {
      local: { ok: true, configured: true, count: handlers.memoryList().length },
      obsidian: assistantStatus.memory?.obsidian,
      firebase: assistantStatus.memory?.firebase,
    });
  }
  if (req.method === "POST" && url.pathname === "/api/memory/search") return ok(res, await handlers.memorySearch(body));
  if (req.method === "POST" && url.pathname === "/api/memory") return ok(res, await handlers.memorySave(body));
  if (req.method === "PUT" && url.pathname.startsWith("/api/memory/")) return ok(res, await handlers.memoryUpdate({ id: pathId(url.pathname, "/api/memory/"), patch: body }));
  if (req.method === "DELETE" && url.pathname.startsWith("/api/memory/")) return ok(res, await handlers.memoryDelete({ id: pathId(url.pathname, "/api/memory/") }));

  if (req.method === "GET" && url.pathname === "/api/notes") return ok(res, handlers.notesList());
  if (req.method === "POST" && url.pathname === "/api/notes/search") return ok(res, handlers.notesSearch(body));
  if (req.method === "POST" && url.pathname === "/api/notes") return ok(res, await handlers.notesCreate(body));
  if (req.method === "GET" && url.pathname.startsWith("/api/notes/")) return ok(res, handlers.notesRead({ id: pathId(url.pathname, "/api/notes/") }));
  if (req.method === "PUT" && url.pathname.startsWith("/api/notes/")) return ok(res, await handlers.notesUpdate({ id: pathId(url.pathname, "/api/notes/"), content: body.content }));
  if (req.method === "DELETE" && url.pathname.startsWith("/api/notes/")) return ok(res, await handlers.notesDelete({ id: pathId(url.pathname, "/api/notes/") }));

  if (req.method === "GET" && url.pathname === "/api/projects") return ok(res, handlers.projectsList());
  if (req.method === "POST" && url.pathname === "/api/projects") return ok(res, handlers.projectsAdd(body));
  if (req.method === "POST" && url.pathname === "/api/projects/scan") return ok(res, handlers.projectsScan(body));

  if (url.pathname.startsWith("/api/")) {
    return fail(res, 404, "NOT_FOUND", `No API route for ${req.method} ${url.pathname}.`, true);
  }

  // Serve static files from dist
  if (req.method === "GET") {
    const distPath = path.resolve(__dirname, "..", "dist");
    let targetPath = path.join(distPath, url.pathname === "/" ? "index.html" : url.pathname);
    if (!targetPath.startsWith(distPath)) {
      return fail(res, 403, "FORBIDDEN", "Path traversal detected.", false);
    }
    try {
      let stat = await fs.promises.stat(targetPath);
      if (stat.isDirectory()) {
        targetPath = path.join(targetPath, "index.html");
        stat = await fs.promises.stat(targetPath);
      }
      const ext = path.extname(targetPath);
      const mimeTypes = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
        ".woff": "font/woff",
        ".woff2": "font/woff2"
      };
      res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
      res.writeHead(200);
      fs.createReadStream(targetPath).pipe(res);
      return;
    } catch (e) {
      // SPA Fallback
      if (req.headers.accept && req.headers.accept.includes("text/html")) {
        const indexHtml = path.join(distPath, "index.html");
        try {
          await fs.promises.stat(indexHtml);
          res.setHeader("Content-Type", "text/html");
          res.writeHead(200);
          fs.createReadStream(indexHtml).pipe(res);
          return;
        } catch (err) {}
      }
    }
  }

  return fail(res, 404, "NOT_FOUND", `No route for ${req.method} ${url.pathname}.`, true);
}

const server = http.createServer((req, res) => {
  const abortController = new AbortController();
  req.abortSignal = abortController.signal;

  const timer = setTimeout(() => {
    abortController.abort();
    if (!res.writableEnded) fail(res, 503, "REQUEST_TIMEOUT", `Request timed out after ${REQUEST_TIMEOUT_MS}ms.`, true);
  }, REQUEST_TIMEOUT_MS);

  requestContext.run(new Map([['reqId', Math.random().toString(36).slice(2)]]), () => {
    route(req, res).catch((error) => {
      const statusCode = error.statusCode || 500;
      const code = error.code || "BACKEND_ERROR";
      const message = error instanceof Error ? error.message : "Backend request failed.";
      backend.logger.log("error", `HTTP ${req.method} ${req.url} failed: ${message}`, { code }, "medium", "error");
      if (!res.writableEnded) fail(res, statusCode, code, message, statusCode < 500);
    }).finally(() => clearTimeout(timer));
  });
});

server.on("clientError", (_error, socket) => {
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

function shutdown(signal) {
  backend.logger.log("server", `Localhost server shutting down: ${signal}`, {}, "low");
  backend.voiceService?.shutdown?.();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
  const reqId = requestContext.getStore()?.get('reqId');
  backend.logger.log("error", `Unhandled rejection [req:${reqId || 'sys'}]: ${reason instanceof Error ? reason.message : String(reason)}`, {}, "high", "error");
  shutdown("unhandledRejection");
});
process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:", error);
  const reqId = requestContext.getStore()?.get('reqId');
  backend.logger.log("error", `Uncaught exception [req:${reqId || 'sys'}]: ${error.message}`, {}, "high", "error");
  shutdown("uncaughtException");
});

server.listen(PORT, HOST, () => {
  backend.logger.log("server", `B.R.A.C.E localhost backend listening on http://${HOST}:${PORT}`, {}, "low");
  openWithWindowsShell(`http://${HOST}:${PORT}`).catch(e => backend.logger.log("error", `Failed to auto-open browser: ${e.message}`, {}, "low"));
});

server.on("error", (e) => {
  if (e.code === 'EADDRINUSE') {
    backend.logger.log("error", `Port ${PORT} is in use. Localhost server shutting down.`, {}, "high", "error");
    process.exit(1);
  } else {
    backend.logger.log("error", `Server error: ${e.message}`, {}, "high", "error");
  }
});
