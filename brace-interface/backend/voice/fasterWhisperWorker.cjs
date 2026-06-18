const { spawn } = require("node:child_process");
const path = require("node:path");

let workerProcess = null;
let requestQueue = new Map();
let isReady = false;
let reqCounter = 0;

function startWorker() {
  if (workerProcess) return;

  const scriptPath = path.join(__dirname, "faster_whisper_worker.py");
  workerProcess = spawn("python", [scriptPath], {
    stdio: ["pipe", "pipe", "inherit"],
    windowsHide: true,
  });

  let buffer = "";

  workerProcess.stdout.on("data", (data) => {
    buffer += data.toString();
    let n = buffer.indexOf("\n");
    while (n !== -1) {
      const line = buffer.slice(0, n);
      buffer = buffer.slice(n + 1);
      n = buffer.indexOf("\n");

      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === "init") {
          if (parsed.status === "ready") isReady = true;
          // Handle init error if necessary
          continue;
        }

        const { id, text, language, error } = parsed;
        if (id && requestQueue.has(id)) {
          const { resolve, reject } = requestQueue.get(id);
          requestQueue.delete(id);
          if (error) reject(new Error(error));
          else resolve({ ok: true, provider: "faster-whisper", text, language });
        }
      } catch (err) {
        console.error("Worker parse error:", err);
      }
    }
  });

  workerProcess.on("exit", () => {
    workerProcess = null;
    isReady = false;
    for (const { reject } of requestQueue.values()) {
      reject(new Error("Worker process exited"));
    }
    requestQueue.clear();
  });
}

function stopWorker() {
  if (workerProcess) {
    workerProcess.kill();
    workerProcess = null;
    isReady = false;
  }
}

async function transcribeWithFasterWhisper(audioPath, language) {
  if (!workerProcess) startWorker();

  const reqId = `req_${++reqCounter}`;
  return new Promise((resolve, reject) => {
    requestQueue.set(reqId, { resolve, reject });
    workerProcess.stdin.write(JSON.stringify({ id: reqId, audio_path: audioPath, language }) + "\n");
  });
}

// Optionally handle cancellation by allowing the client to provide the request ID and throwing a specific error.
// We can just ignore the result on the worker side.
function cancelTranscription(reqId) {
    if (requestQueue.has(reqId)) {
        const { reject } = requestQueue.get(reqId);
        requestQueue.delete(reqId);
        const err = new Error("Canceled");
        err.code = "CANCELED_499";
        reject(err);
    }
}

module.exports = { transcribeWithFasterWhisper, startWorker, stopWorker, cancelTranscription };
