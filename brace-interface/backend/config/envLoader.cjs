const fs = require("node:fs");
const path = require("node:path");

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const index = trimmed.indexOf("=");
  if (index < 0) return null;
  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return key ? [key, value.replace(/\\n/g, "\n")] : null;
}

function loadEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return { loaded: false, path: filePath };
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const entry = parseEnvLine(line);
    if (!entry) continue;
    const [key, value] = entry;
    if (process.env[key] == null || process.env[key] === "") process.env[key] = value;
  }
  return { loaded: true, path: filePath };
}

function loadBraceEnv(startDir = path.resolve(__dirname, "..", "..")) {
  const candidates = [
    process.env.BRACE_ENV_FILE,
    path.join(startDir, ".env"),
    path.join(path.resolve(startDir, ".."), ".env"),
    path.join(process.cwd(), ".env"),
  ];
  for (const candidate of candidates) {
    const result = loadEnvFile(candidate);
    if (result.loaded) return result;
  }
  return { loaded: false, path: candidates[0] };
}

module.exports = { loadBraceEnv, loadEnvFile, parseEnvLine };
