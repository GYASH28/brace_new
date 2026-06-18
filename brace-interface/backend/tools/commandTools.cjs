const { spawn } = require("node:child_process");
const { analyzeCommandRisk } = require("../security/commandRiskAnalyzer.cjs");

const MAX_OUTPUT_CHARS = 20000;
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_TIMEOUT_MS = 120000;

function boundedTimeout(value) {
  const parsed = Number(value);
  return Math.max(1000, Math.min(Number.isFinite(parsed) ? parsed : DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS));
}

function appendBounded(current, chunk) {
  const next = current + chunk.toString();
  return next.length > MAX_OUTPUT_CHARS ? next.slice(-MAX_OUTPUT_CHARS) : next;
}

function terminateProcessTree(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true });
    return;
  }
  child.kill("SIGTERM");
  setTimeout(() => {
    try {
      child.kill("SIGKILL");
    } catch {
      // Process already exited.
    }
  }, 1500);
}

function explainCommand(command, cwd) {
  const risk = analyzeCommandRisk(command);
  return {
    command,
    cwd,
    riskLevel: risk.riskLevel,
    explanation: risk.reason,
    mayChangeSystem: ["medium", "high", "blocked"].includes(risk.riskLevel),
  };
}

function runCommand({ command, cwd, timeoutMs = 30000 }) {
  const risk = analyzeCommandRisk(command);
  if (risk.riskLevel === "blocked") {
    const error = new Error(risk.reason);
    error.riskLevel = "blocked";
    throw error;
  }
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const safeTimeoutMs = boundedTimeout(timeoutMs);
    const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const bin = parts[0];
    const args = parts.slice(1).map((p) => p.replace(/^"|"$/g, ""));
    const child = spawn(bin || "", args, { cwd, shell: false, windowsHide: true });
    let stdout = "";
    let stderr = "";
    let finished = false;
    const finish = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      stderr = appendBounded(stderr, `\nCommand timed out after ${safeTimeoutMs}ms and was terminated.`);
      terminateProcessTree(child);
      finish({ ok: false, command, cwd, stdout, stderr, exitCode: null, runtimeMs: Date.now() - startedAt, riskLevel: risk.riskLevel, timedOut: true });
    }, safeTimeoutMs);
    child.stdout.on("data", (chunk) => { stdout = appendBounded(stdout, chunk); });
    child.stderr.on("data", (chunk) => { stderr = appendBounded(stderr, chunk); });
    child.on("error", (error) => {
      stderr = appendBounded(stderr, `\n${error.message}`);
      finish({ ok: false, command, cwd, stdout, stderr, exitCode: null, runtimeMs: Date.now() - startedAt, riskLevel: risk.riskLevel });
    });
    child.on("close", (exitCode) => {
      finish({ ok: exitCode === 0, command, cwd, stdout, stderr, exitCode, runtimeMs: Date.now() - startedAt, riskLevel: risk.riskLevel });
    });
  });
}

module.exports = { explainCommand, runCommand };
