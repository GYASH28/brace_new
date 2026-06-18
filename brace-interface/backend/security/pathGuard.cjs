const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");

const DEFAULT_BLOCKED_ROOTS = [
  "C:\\",
  "C:\\Windows",
  "C:\\Program Files",
  "C:\\Program Files (x86)",
  path.join(os.homedir(), "AppData"),
];

// Dangerous file extensions that should never be written by the agent
const DANGEROUS_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".com", ".scr", ".pif", ".vbs", ".vbe",
  ".js", ".jse", ".wsf", ".wsh", ".ps1", ".psm1", ".msi", ".dll",
  ".sys", ".drv", ".reg",
]);

function normalizePath(value) {
  let resolved = path.resolve(String(value ?? ""));
  // Resolve symlinks to prevent symlink-based escapes from safe roots
  try {
    resolved = fs.realpathSync(resolved);
  } catch {
    // If path doesn't exist yet, realpathSync throws — resolve parent instead
    try {
      const parent = fs.realpathSync(path.dirname(resolved));
      resolved = path.join(parent, path.basename(resolved));
    } catch {
      // Parent doesn't exist either — keep the original resolved path
    }
  }
  return resolved;
}

function isInside(childPath, rootPath) {
  const child = normalizePath(childPath).toLowerCase();
  const root = normalizePath(rootPath).toLowerCase();
  return child === root || child.startsWith(`${root}${path.sep.toLowerCase()}`);
}

function createPathGuard({ safeRoots = [], blockedRoots = DEFAULT_BLOCKED_ROOTS } = {}) {
  const safe = safeRoots.filter(Boolean).map(normalizePath);
  const blocked = blockedRoots.filter(Boolean).map(normalizePath);

  function isBlocked(targetPath) {
    const resolved = normalizePath(targetPath);
    return blocked.some((root) => resolved.toLowerCase() === root.toLowerCase() || isInside(resolved, root));
  }

  function isDangerousExtension(targetPath) {
    const ext = path.extname(targetPath).toLowerCase();
    return DANGEROUS_EXTENSIONS.has(ext);
  }

  function isAllowed(targetPath, options = {}) {
    const resolved = normalizePath(targetPath);

    // Block path traversal attempts (encoded or literal)
    const raw = String(targetPath ?? "");
    if (raw.includes("..") || raw.includes("%2e%2e") || raw.includes("%2E%2E")) {
      return { allowed: false, path: resolved, reason: "Path traversal sequences detected." };
    }

    // Block null bytes (can truncate paths in some environments)
    if (raw.includes("\0") || raw.includes("%00")) {
      return { allowed: false, path: resolved, reason: "Null bytes detected in path." };
    }

    // Check if writing a dangerous executable
    if (options.write && isDangerousExtension(resolved)) {
      return { allowed: false, path: resolved, reason: "Writing executable or system file extensions is blocked." };
    }

    if (safe.some((root) => isInside(resolved, root))) {
      return { allowed: true, path: resolved, reason: "Path is inside an allowed root." };
    }
    if (isBlocked(resolved) && !options.allowSensitive) {
      return { allowed: false, path: resolved, reason: "Path is inside a blocked sensitive system location." };
    }
    if (safe.length === 0) {
      return { allowed: true, path: resolved, reason: "Path is inside an allowed root." };
    }
    if (options.userSelected) {
      return { allowed: true, path: resolved, reason: "Path was selected by the user for this action." };
    }
    return { allowed: false, path: resolved, reason: "Path is outside configured safe roots and was not selected by the user." };
  }

  return { isAllowed, isBlocked, isDangerousExtension, normalizePath, safeRoots: safe, blockedRoots: blocked };
}

module.exports = { DEFAULT_BLOCKED_ROOTS, DANGEROUS_EXTENSIONS, createPathGuard, normalizePath, isInside };
