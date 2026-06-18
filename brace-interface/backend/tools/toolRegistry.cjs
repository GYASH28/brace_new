const fileTools = require("./fileTools.cjs");
const folderTools = require("./folderTools.cjs");
const commandTools = require("./commandTools.cjs");
const appTools = require("./appTools.cjs");
const systemTools = require("./systemTools.cjs");
const codingTools = require("./codingTools.cjs");
const browserTools = require("./browserTools.cjs");
const mcpTools = require("./mcpTools.cjs");
const skillTools = require("./skillTools.cjs");
const webTools = require("./webTools.cjs");
const memoryTools = require("./memoryTools.cjs");

function tool({ name, description, riskLevel, requiredPermission, supportsDryRun = false, inputSchema = {}, outputSchema = {}, execute }) {
  return { name, description, riskLevel, requiredPermission, supportsDryRun, inputSchema, outputSchema, execute };
}

function createToolRegistry(deps) {
  return [
    tool({ name: "file.readFile", description: "Read a selected or allowed text file.", riskLevel: "medium", requiredPermission: "files", execute: ({ filePath }) => fileTools.readFile(filePath) }),
    tool({ name: "file.writeFile", description: "Write a file after backup.", riskLevel: "high", requiredPermission: "fileWrite", supportsDryRun: true, execute: ({ filePath, content }) => fileTools.writeFile(filePath, content) }),
    tool({ name: "file.createFolder", description: "Create a folder.", riskLevel: "medium", requiredPermission: "fileWrite", execute: ({ folderPath }) => fileTools.createFolder(folderPath) }),
    tool({ name: "file.searchFiles", description: "Search filenames under an allowed folder.", riskLevel: "medium", requiredPermission: "files", supportsDryRun: true, execute: (input) => fileTools.searchFiles(input) }),
    tool({ name: "file.extractText", description: "Extract readable text from selected files.", riskLevel: "medium", requiredPermission: "files", execute: ({ filePath }) => fileTools.extractTextFromFile(filePath) }),
    tool({ name: "file.deleteToRecycleBin", description: "Move a file to the recycle bin.", riskLevel: "high", requiredPermission: "fileWrite", execute: ({ filePath }) => fileTools.deleteFileToRecycleBin(filePath, deps.shell) }),
    tool({ name: "folder.organize.preview", description: "Preview folder organization moves.", riskLevel: "medium", requiredPermission: "folders", supportsDryRun: true, execute: ({ folderPath }) => folderTools.scanFolderForOrganization(folderPath) }),
    tool({ name: "folder.organize.execute", description: "Move files into category folders.", riskLevel: "high", requiredPermission: "folders", execute: ({ plan }) => folderTools.executeOrganization(plan) }),
    tool({ name: "command.explain", description: "Explain command risk.", riskLevel: "low", requiredPermission: "shell", supportsDryRun: true, execute: ({ command, cwd }) => commandTools.explainCommand(command, cwd) }),
    tool({ name: "command.run", description: "Run a controlled local command.", riskLevel: "high", requiredPermission: "shell", execute: (input) => commandTools.runCommand(input) }),
    tool({ name: "app.openVSCode", description: "Open a folder in VS Code.", riskLevel: "medium", requiredPermission: "appLaunch", execute: (input) => appTools.openVSCode({ ...input, shell: deps.shell }) }),
    tool({ name: "app.openFolder", description: "Open a folder in File Explorer.", riskLevel: "medium", requiredPermission: "appLaunch", execute: (input) => appTools.openProjectFolder({ ...input, shell: deps.shell }) }),
    tool({ name: "app.openURL", description: "Open a safe URL in the default browser.", riskLevel: "medium", requiredPermission: "appLaunch", execute: (input) => appTools.openURL({ ...input, shell: deps.shell }) }),
    tool({ name: "system.info", description: "Read system status.", riskLevel: "low", requiredPermission: "systemInfo", execute: () => systemTools.getSystemInfo() }),
    tool({ name: "coding.scanProject", description: "Detect framework, scripts, files, and git status.", riskLevel: "medium", requiredPermission: "coding", execute: ({ projectPath }) => codingTools.scanProject(projectPath) }),
    tool({ name: "coding.proposeEdit", description: "Prepare a file diff preview.", riskLevel: "medium", requiredPermission: "coding", execute: codingTools.proposeTextEdit }),
    tool({ name: "coding.applyEdit", description: "Apply an approved file edit with backup.", riskLevel: "high", requiredPermission: "coding", execute: codingTools.applyTextEdit }),
    tool({ name: "browser.status", description: "Show browser automation availability.", riskLevel: "low", requiredPermission: "browser", execute: () => browserTools.browserStatus() }),
    tool({ name: "mcp.status", description: "Show MCP configuration status.", riskLevel: "low", requiredPermission: "mcp", execute: ({ config }) => mcpTools.mcpStatus(config) }),
    tool({ name: "agent.read_skill", description: "Read the detailed instructions of a specific Agent Skill. Use this to learn how to do tasks perfectly.", riskLevel: "low", requiredPermission: "files", inputSchema: { type: "object", properties: { skillName: { type: "string", description: "The exact name of the skill to read (e.g. test-driven-development)" } }, required: ["skillName"] }, execute: ({ skillName }) => skillTools.readSkill({ skillName }) }),
    tool({ name: "web.fetchText", description: "Fetch readable text content from a URL.", riskLevel: "medium", requiredPermission: "browser", execute: ({ url }) => webTools.fetchText(url) }),
    tool({ name: "memory.remember", description: "Save a new long-term memory fact.", riskLevel: "low", requiredPermission: "files", execute: (input) => memoryTools.remember(deps.memoryManager, input) }),
    tool({ name: "memory.search", description: "Search long-term memory.", riskLevel: "low", requiredPermission: "files", execute: ({ query }) => memoryTools.searchMemory(deps.memoryManager, query) }),
  ];
}

module.exports = { createToolRegistry };
