"use strict";

const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");

const KOKORO_PORT = Number(process.env.BRACE_KOKORO_PORT || 9787);
const KOKORO_HOST = process.env.BRACE_KOKORO_HOST || "127.0.0.1";
const KOKORO_DEVICE = process.env.BRACE_KOKORO_DEVICE || "cpu";
const KOKORO_STARTUP_TIMEOUT_MS = Number(process.env.BRACE_KOKORO_STARTUP_TIMEOUT_MS || 60000);
const KOKORO_REQUEST_TIMEOUT_MS = Number(process.env.BRACE_KOKORO_REQUEST_TIMEOUT_MS || 30000);
const MAX_RESTART_ATTEMPTS = 5;
const RESTART_BACKOFF_BASE_MS = 1000;

const SERVER_SCRIPT = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "BRACE-Brain",
  "external-tools",
  "kokoro_tts_server.py",
);

const KOKORO_VOICES = [
  { id: "af_heart", label: "Heart (American Female)", lang: "a", gender: "female" },
  { id: "af_bella", label: "Bella (American Female)", lang: "a", gender: "female" },
  { id: "af_jessica", label: "Jessica (American Female)", lang: "a", gender: "female" },
  { id: "af_nicole", label: "Nicole (American Female)", lang: "a", gender: "female" },
  { id: "af_sarah", label: "Sarah (American Female)", lang: "a", gender: "female" },
  { id: "af_sky", label: "Sky (American Female)", lang: "a", gender: "female" },
  { id: "am_adam", label: "Adam (American Male)", lang: "a", gender: "male" },
  { id: "am_michael", label: "Michael (American Male)", lang: "a", gender: "male" },
  { id: "bf_emma", label: "Emma (British Female)", lang: "b", gender: "female" },
  { id: "bf_isabella", label: "Isabella (British Female)", lang: "b", gender: "female" },
  { id: "bm_george", label: "George (British Male)", lang: "b", gender: "male" },
  { id: "bm_lewis", label: "Lewis (British Male)", lang: "b", gender: "male" },
];

const PRESET_TO_KOKORO_VOICE = {
  "brace-default": "af_heart",
  "calm-assistant": "af_sarah",
  "deep-futuristic": "am_michael",
  "fast-coding": "af_sky",
  "study-mode": "bf_emma",
  "indian-english": "af_heart",
};

let kokoroProcess = null;
let ready = false;
let restartCount = 0;
let startPromise = null;
let loggerRef = null;
let activePython = null;
let manualStop = false;

function setupError(message) {
  return {
    ok: false,
    provider: "kokoro",
    error: message,
    setup: kokoroSetup(),
  };
}

function log(level, message, detail = {}) {
  const risk = level === "error" ? "medium" : "low";
  const result = level === "error" || level === "warn" ? "error" : "ok";
  if (loggerRef?.log) {
    loggerRef.log("voice", `[kokoro] ${message}`, { provider: "kokoro", ...detail }, risk, result);
    return;
  }
  const output = `[kokoro] ${message}`;
  if (level === "error") console.error(output, detail);
  else if (level === "warn") console.warn(output, detail);
  else console.log(output, detail);
}

function pythonCandidates() {
  return [
    { label: "python", command: "python", args: [] },
    { label: "py -3", command: "py", args: ["-3"] },
  ];
}

function httpPost(pathname, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = http.request(
      {
        hostname: KOKORO_HOST,
        port: KOKORO_PORT,
        path: pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      },
    );
    req.setTimeout(KOKORO_REQUEST_TIMEOUT_MS, () => req.destroy(new Error("Kokoro TTS request timed out.")));
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

function httpGet(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: KOKORO_HOST, port: KOKORO_PORT, path: pathname, method: "GET" }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch {
          resolve({});
        }
      });
    });
    req.setTimeout(5000, () => req.destroy(new Error("Kokoro health check timed out.")));
    req.on("error", reject);
    req.end();
  });
}

async function waitForReady(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const data = await httpGet("/health");
      if (data?.ok) return true;
    } catch {
      // The process may still be importing Kokoro or downloading model assets.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function attachProcessListeners(child, candidate) {
  child.stdout.on("data", (data) => {
    const line = data.toString().trim();
    if (line) log("info", line, { python: candidate.label });
  });
  child.stderr.on("data", (data) => {
    const line = data.toString().trim();
    if (line) log("warn", `stderr: ${line}`, { python: candidate.label });
  });
  child.on("exit", (code, signal) => {
    const wasCurrent = kokoroProcess === child;
    if (wasCurrent) {
      ready = false;
      startPromise = null;
      kokoroProcess = null;
    }
    log("warn", `Kokoro server exited (code=${code}, signal=${signal})`, { python: candidate.label });
    if (manualStop || child.__braceSuppressRestart || !wasCurrent) return;
    if (restartCount < MAX_RESTART_ATTEMPTS) {
      const delay = RESTART_BACKOFF_BASE_MS * Math.pow(2, restartCount);
      restartCount += 1;
      log("info", `Scheduling restart attempt ${restartCount}/${MAX_RESTART_ATTEMPTS} in ${delay}ms.`, { python: candidate.label });
      setTimeout(() => {
        startServer().catch((error) => log("error", `Restart failed: ${error.message}`, { python: candidate.label }));
      }, delay);
      return;
    }
    log("error", `Kokoro server failed to restart after ${MAX_RESTART_ATTEMPTS} attempts.`, { python: candidate.label });
  });
}

async function startWithCandidate(candidate) {
  const args = [
    ...candidate.args,
    SERVER_SCRIPT,
    "--port",
    String(KOKORO_PORT),
    "--host",
    KOKORO_HOST,
    "--device",
    KOKORO_DEVICE,
  ];

  log("info", "Spawning Kokoro TTS server.", {
    python: candidate.label,
    script: SERVER_SCRIPT,
    host: KOKORO_HOST,
    port: KOKORO_PORT,
    device: KOKORO_DEVICE,
  });

  const child = spawn(candidate.command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    detached: false,
  });

  kokoroProcess = child;
  activePython = candidate.label;
  attachProcessListeners(child, candidate);

  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 300);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

  const isUp = await waitForReady(KOKORO_STARTUP_TIMEOUT_MS);
  if (!isUp) {
    const message = `Kokoro TTS server did not become ready within ${KOKORO_STARTUP_TIMEOUT_MS}ms.`;
    log("error", message, { python: candidate.label });
    child.__braceSuppressRestart = true;
    child.kill();
    ready = false;
    throw new Error(message);
  }

  ready = true;
  restartCount = 0;
  log("info", "Kokoro TTS server is ready.", { python: candidate.label, host: KOKORO_HOST, port: KOKORO_PORT });
}

async function startServer() {
  if (ready) return;
  if (startPromise) return startPromise;

  manualStop = false;
  startPromise = (async () => {
    const errors = [];
    for (const candidate of pythonCandidates()) {
      try {
        await startWithCandidate(candidate);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${candidate.label}: ${message}`);
        log("warn", `Kokoro launch failed with ${candidate.label}.`, { error: message });
        if (kokoroProcess && !kokoroProcess.killed) {
          kokoroProcess.__braceSuppressRestart = true;
          kokoroProcess.kill();
        }
        kokoroProcess = null;
        ready = false;
      }
    }
    throw new Error(`Could not start Kokoro with python or py -3. ${errors.join(" | ")}`);
  })().finally(() => {
    startPromise = null;
  });

  return startPromise;
}

function stopKokoroServer() {
  manualStop = true;
  if (kokoroProcess && !kokoroProcess.killed) {
    log("info", "Stopping Kokoro TTS server.", { python: activePython });
    httpPost("/shutdown", {}).catch(() => {});
    setTimeout(() => {
      if (kokoroProcess && !kokoroProcess.killed) kokoroProcess.kill("SIGTERM");
    }, 2000);
  }
  ready = false;
  startPromise = null;
  kokoroProcess = null;
}

async function ensureKokoroServer(logger) {
  if (logger) loggerRef = logger;
  if (ready) return;
  await startServer();
}

function speechPreview(text) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 180);
}

async function synthesizeWithKokoro({ text, voice = "af_heart", speed = 1.0, lang = "en-us", logger } = {}) {
  if (logger) loggerRef = logger;

  const startedAt = Date.now();
  const resolvedVoice = PRESET_TO_KOKORO_VOICE[voice] || voice || "af_heart";
  const speechText = String(text || "").trim();
  if (!speechText) return setupError("No text provided for Kokoro TTS.");

  try {
    await ensureKokoroServer(logger);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kokoro TTS server failed to start.";
    log("error", "Kokoro setup error.", { error: message, voice: resolvedVoice, textLength: speechText.length });
    return setupError(message);
  }

  if (!ready) return setupError("Kokoro TTS server is not available. Model may still be loading.");

  log("info", "Kokoro synthesis request.", {
    voice: resolvedVoice,
    speed,
    lang,
    inputTextLength: String(text || "").length,
    sanitizedTextLength: speechText.length,
    preview: speechPreview(speechText),
  });

  try {
    const response = await httpPost("/synthesize", { text: speechText, voice: resolvedVoice, speed, lang });
    if (response.status !== 200) {
      let errorMessage = "Kokoro synthesis failed.";
      try {
        errorMessage = JSON.parse(response.body.toString("utf8")).error || errorMessage;
      } catch {
        // Keep the generic synthesis failure message.
      }
      log("error", "Kokoro synthesis failed.", { status: response.status, error: errorMessage, voice: resolvedVoice });
      return setupError(errorMessage);
    }

    const durationMs = Date.now() - startedAt;
    const audioBase64 = response.body.toString("base64");
    log("info", "Kokoro synthesis complete.", {
      voice: resolvedVoice,
      audioBytes: response.body.length,
      durationMs,
      textLength: speechText.length,
      preview: speechPreview(speechText),
    });

    return { ok: true, provider: "kokoro", audioBase64, mimeType: "audio/wav", voice: resolvedVoice };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Kokoro synthesis error.";
    log("error", "Kokoro synthesis exception.", { error: message, voice: resolvedVoice, textLength: speechText.length });
    return setupError(message);
  }
}

async function isKokoroReady() {
  try {
    const data = await httpGet("/health");
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

function kokoroSetup() {
  return {
    provider: "kokoro",
    version: "0.9.4",
    model: "hexgrad/Kokoro-82M",
    script: SERVER_SCRIPT,
    pythonCandidates: pythonCandidates().map((candidate) => candidate.label),
    activePython,
    installCommand: "python -m pip install kokoro soundfile",
    note: "Kokoro 82M is the preferred local TTS provider. Model weights can download on first run.",
    voices: KOKORO_VOICES,
    presetMapping: PRESET_TO_KOKORO_VOICE,
  };
}

module.exports = {
  kokoroSetup,
  ensureKokoroServer,
  synthesizeWithKokoro,
  stopKokoroServer,
  isKokoroReady,
  KOKORO_VOICES,
  PRESET_TO_KOKORO_VOICE,
};
