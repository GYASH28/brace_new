const { spawn } = require("node:child_process");
const path = require("node:path");
const viteBin = path.join(__dirname, "..", "node_modules", "vite", "bin", "vite.js");

const processes = [];

function run(name, command, args) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  processes.push({ name, child });
  child.stdout.on("data", (data) => process.stdout.write(`[${name}] ${data}`));
  child.stderr.on("data", (data) => process.stderr.write(`[${name}] ${data}`));
  child.on("error", (error) => {
    if (shuttingDown) return;
    console.error(`${name} failed to start: ${error.message}`);
    shutdown();
  });
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.log(`${name} exited with ${signal || code}. Shutting down localhost stack.`);
    shutdown();
  });
}

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { child } of processes) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(0), 1200).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

run("backend", "node", ["backend/server.cjs"]);
run("frontend", "node", [viteBin, "--host", "127.0.0.1", "--port", "5173", "--strictPort"]);

console.log("B.R.A.C.E localhost stack starting...");
console.log("Backend:  http://127.0.0.1:8787");
console.log("Frontend: http://127.0.0.1:5173");
