const { redactSecrets } = require("../../security/secretScanner.cjs");

const declarationCache = new WeakMap();

function toGeminiName(name) {
  return String(name || "").replace(/[^A-Za-z0-9_]/g, "_").replace(/^([^A-Za-z_])/, "_$1").slice(0, 63);
}

function permissionFor(tool) {
  if (tool.riskLevel === "low") return "safe";
  if (tool.riskLevel === "blocked") return "dangerous_blocked";
  return "approval_required";
}

function buildGeminiToolDeclarations(registry = []) {
  const cached = declarationCache.get(registry);
  if (cached) return cached;
  const declarations = registry.map((tool) => ({
    name: toGeminiName(tool.name),
    description: `${tool.description || tool.name} Permission: ${permissionFor(tool)}.`,
    parameters: tool.inputSchema?.type ? tool.inputSchema : { type: "object", properties: tool.inputSchema?.properties || {} },
  }));
  declarationCache.set(registry, declarations);
  return declarations;
}

function createAssistantToolRunner({ registry = [], logger }) {
  const byGeminiName = new Map(registry.map((tool) => [toGeminiName(tool.name), tool]));

  async function run(name, input = {}, context = {}) {
    const tool = byGeminiName.get(name);
    if (!tool) return { ok: false, error: `Unknown tool: ${name}` };
    const permission = permissionFor(tool);
    if (permission === "dangerous_blocked") return { ok: false, denied: true, error: "This tool is blocked by B.R.A.C.E safety rules." };
    if (permission === "approval_required") {
      logger?.log?.("tool", `Tool requires approval: ${tool.name}`, { tool: tool.name, input: redactSecrets(input) }, tool.riskLevel || "medium", "approval_required");
      return { ok: false, needsApproval: true, tool: tool.name, message: "This action needs approval in the Agent page before B.R.A.C.E can run it." };
    }
    try {
      const result = await tool.execute(input, context);
      logger?.log?.("tool", `Tool executed: ${tool.name}`, { tool: tool.name }, "low");
      return { ok: true, tool: tool.name, result: redactSecrets(result) };
    } catch (error) {
      logger?.log?.("error", `Tool failed: ${tool.name}: ${error.message}`, { tool: tool.name }, tool.riskLevel || "medium", "error");
      return { ok: false, tool: tool.name, error: error.message };
    }
  }

  return { run, toGeminiName };
}

module.exports = { buildGeminiToolDeclarations, createAssistantToolRunner, permissionFor, toGeminiName };
