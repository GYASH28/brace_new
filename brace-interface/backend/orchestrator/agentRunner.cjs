const db = require('../db/db.cjs');
const workspaceOsManager = require('../memory/workspaceOsManager.cjs');

class AgentRunner {
  constructor() {}

  /**
   * Execute an agent step for a given task.
   * Progressively discloses history to stay within context windows.
   */
  async runStep(taskId) {
    const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(taskId);
    if (!task) throw new Error("Task not found");

    const agent = db.prepare(`SELECT * FROM agents WHERE id = ?`).get(task.assigned_agent_id);
    if (!agent) throw new Error("Agent not found");

    // Progressive Disclosure: Fetch last N messages
    const recentMessages = db.prepare(`
      SELECT * FROM messages WHERE task_id = ? ORDER BY created_at DESC LIMIT 10
    `).all().reverse();

    // Fetch OS context
    const soulContext = workspaceOsManager.readFile('SOUL.md');
    const userContext = workspaceOsManager.readFile('USER.md');

    // Here we would typically call the LLM provider (e.g. Gemini/Claude)
    // using agent.model_provider and the constructed prompt:
    const promptContext = `
      ${soulContext}
      ${userContext}
      System Prompt: ${agent.system_prompt}
      Task: ${task.title}
      Description: ${task.description}
      Recent History: ${JSON.stringify(recentMessages)}
    `;

    // Simulate tool execution / LLM response
    const mockResponse = `Mock response for ${task.title} by ${agent.name}`;

    // Log the message
    const messageId = require('crypto').randomUUID();
    db.prepare(`
      INSERT INTO messages (id, task_id, sender, content)
      VALUES (?, ?, ?, ?)
    `).run(messageId, task.id, 'agent', mockResponse);

    // Update telemetry
    const telemetryId = require('crypto').randomUUID();
    db.prepare(`
      INSERT INTO telemetry (id, agent_id, task_id, tokens_processed)
      VALUES (?, ?, ?, ?)
    `).run(telemetryId, agent.id, task.id, mockResponse.length * 2);

    return {
      messageId,
      content: mockResponse
    };
  }
}

module.exports = new AgentRunner();
