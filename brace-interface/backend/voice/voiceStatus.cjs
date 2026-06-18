const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { VOICE_PRESETS } = require("./voiceConfig.cjs");

const PROBE_TIMEOUT_MS = Math.max(500, Math.min(Number(process.env.BRACE_VOICE_PROBE_TIMEOUT_MS || 1500), 5000));
const KOKORO_PROBE_TIMEOUT_MS = Math.max(PROBE_TIMEOUT_MS, Math.min(Number(process.env.BRACE_KOKORO_PROBE_TIMEOUT_MS || 5000), 10000));
const DEPENDENCY_CACHE_TTL_MS = Math.max(5000, Math.min(Number(process.env.BRACE_VOICE_STATUS_CACHE_TTL_MS || 30000), 300000));
let dependencyCache = { expiresAt: 0, value: null };

function commandExists(command, args = ["--version"], timeout = PROBE_TIMEOUT_MS) {
  try {
    execFileSync(command, args, { encoding: "utf8", stdio: "pipe", timeout });
    return true;
  } catch {
    return false;
  }
}

function pythonImport(moduleName, timeout = PROBE_TIMEOUT_MS) {
  const candidates = [
    ["python", ["-c", `import ${moduleName}; print("ok")`]],
    ["py", ["-3", "-c", `import ${moduleName}; print("ok")`]],
  ];
  for (const [command, args] of candidates) {
    try {
      execFileSync(command, args, { encoding: "utf8", stdio: "pipe", timeout });
      return true;
    } catch {
      // Try the next Windows Python launcher candidate.
    }
  }
  return false;
}

function modelPathExists(value) {
  return Boolean(value && fs.existsSync(value));
}

function getVoiceDependencyStatus(config = {}, { force = false } = {}) {
  const now = Date.now();
  if (!force && dependencyCache.value && dependencyCache.expiresAt > now) return dependencyCache.value;

  const python = commandExists("python", ["--version"]) || commandExists("py", ["-3", "--version"]);
  const fasterWhisper = python && pythonImport("faster_whisper");
  const edgeTts = python && pythonImport("edge_tts");
  const kokoro = python && pythonImport("kokoro", KOKORO_PROBE_TIMEOUT_MS);
  const piperCli = commandExists("piper", ["--help"]);
  const whisperCpp = commandExists("whisper-cli", ["--help"]) || commandExists("main", ["--help"]);

  const value = {
    python,
    fasterWhisper,
    whisperCpp,
    kokoro,
    piper: piperCli || modelPathExists(config.piperModelPath),
    edgeTts,
    sileroVad: python && (pythonImport("silero_vad") || pythonImport("onnxruntime")),
    browserFallback: true,
  };
  dependencyCache = { expiresAt: now + DEPENDENCY_CACHE_TTL_MS, value };
  return value;
}

function chooseActiveProviders(config = {}) {
  const deps = getVoiceDependencyStatus(config);
  const browserMode = config.mode === "browser-fallback";
  const sttProvider = !browserMode && deps.fasterWhisper ? "faster-whisper" : !browserMode && deps.whisperCpp ? "whisper.cpp" : "browser-fallback";
  const vadProvider = !browserMode && deps.sileroVad ? "silero" : "browser-silence";
  let ttsProvider = "browser-fallback";

  if (!browserMode && deps.kokoro) {
    ttsProvider = "kokoro";
  } else if (!browserMode && config.onlineVoiceEnabled && deps.edgeTts) {
    ttsProvider = "edge-tts";
  }

  return {
    sttProvider,
    ttsProvider,
    vadProvider,
    fallbackActive: ttsProvider === "browser-fallback",
  };
}

function getVoiceStatus(config = {}) {
  const dependencies = getVoiceDependencyStatus(config);
  const active = chooseActiveProviders(config);
  const setup = [];
  if (!dependencies.kokoro) setup.push("Install Kokoro: python -m pip install kokoro soundfile");
  if (!dependencies.fasterWhisper) setup.push("Install faster-whisper: python -m pip install faster-whisper");
  if (!dependencies.piper) setup.push("Piper is optional and is not used until standalone synthesis is implemented.");
  if (!dependencies.sileroVad) setup.push("Install Silero VAD support: python -m pip install silero-vad onnxruntime");
  return {
    ok: true,
    mode: config.mode,
    ...active,
    dependencies,
    availableVoices: VOICE_PRESETS,
    selectedVoice: config.selectedVoice || "brace-default",
    setup,
    errors: [],
  };
}

module.exports = { chooseActiveProviders, commandExists, getVoiceDependencyStatus, getVoiceStatus };
