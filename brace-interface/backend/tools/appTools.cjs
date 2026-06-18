const fs = require("node:fs");
const path = require("node:path");

async function openVSCode({ folderPath, shell }) {
  const target = path.resolve(folderPath || process.cwd()).replaceAll("\\", "/");
  await shell.openExternal(`vscode://file/${target}`);
  return { ok: true, message: `Requested VS Code open for ${target}` };
}

async function openProjectFolder({ folderPath, shell }) {
  const result = await shell.openPath(path.resolve(folderPath));
  if (result) throw new Error(result);
  return { ok: true, message: `Opened folder: ${folderPath}` };
}

async function openURL({ url, shell }) {
  if (!/^https?:\/\//i.test(url || "")) throw new Error("Only http/https URLs are allowed.");
  await shell.openExternal(url);
  return { ok: true, message: `Opened URL: ${url}` };
}

async function openSpecificApp({ appPath, shell }) {
  if (!appPath || !fs.existsSync(appPath)) throw new Error("App path does not exist.");
  const allowedExtensions = [".exe", ".cmd", ".bat", ".lnk", ".txt", ".png", ".jpg", ".md", ".json", ".csv", ".pdf"];
  if (path.extname(appPath) && !allowedExtensions.includes(path.extname(appPath).toLowerCase())) {
    throw new Error("Execution blocked: File extension not in whitelist.");
  }
  const result = await shell.openPath(appPath);
  if (result) throw new Error(result);
  return { ok: true, message: `Launched app: ${appPath}` };
}

module.exports = { openProjectFolder, openSpecificApp, openURL, openVSCode };
