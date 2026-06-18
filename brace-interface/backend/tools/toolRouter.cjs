function createToolRouter(registry = []) {
  const byName = new Map(registry.map((tool) => [tool.name, tool]));
  const publicTools = Object.freeze(registry.map(({ execute: _execute, ...tool }) => Object.freeze(tool)));

  function getTool(name) {
    const tool = byName.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    return tool;
  }

  async function execute(name, input, context) {
    const tool = getTool(name);
    return tool.execute(input, context);
  }

  return { execute, getTool, listTools: () => publicTools };
}

module.exports = { createToolRouter };
