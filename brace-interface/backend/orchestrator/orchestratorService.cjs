const crypto = require('crypto');
const db = require('../db/db.cjs');

class OrchestratorService {
  constructor() {}

  /**
   * Dispatch a task by classifying user intent and assigning to an agent.
   * Phase 1 Goal: Create tasks, assign to an agent (mocking the LLM routing).
   */
  async dispatchTask(instruction) {
    const taskId = crypto.randomUUID();
    
    // Simulate routing LLM classification (e.g. Gemini 1.5 Flash)
    // We categorize the task into one of the specialized roles.
    let role = 'Builder'; // default
    if (instruction.toLowerCase().includes('search') || instruction.toLowerCase().includes('research')) {
      role = 'Researcher';
    } else if (instruction.toLowerCase().includes('plan') || instruction.toLowerCase().includes('goal')) {
      role = 'Conductor';
    } else if (instruction.toLowerCase().includes('test') || instruction.toLowerCase().includes('verify')) {
      role = 'QA Sentinel';
    }

    // Check if an agent with this role exists
    const stmt = db.prepare(`SELECT * FROM agents WHERE role = ?`);
    let agent = stmt.get(role);

    // If no agent fits, dynamically insert a new one
    if (!agent) {
      const agentId = crypto.randomUUID();
      const insertAgent = db.prepare(`
        INSERT INTO agents (id, name, role, model_provider, system_prompt, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertAgent.run(
        agentId, 
        `${role} Agent`, 
        role, 
        'gemini-1.5-flash', 
        `You are a specialized ${role} agent. Execute your tasks safely and reliably.`, 
        'idle'
      );
      agent = { id: agentId, name: `${role} Agent`, role };
    }

    // Assign the task
    const insertTask = db.prepare(`
      INSERT INTO tasks (id, title, description, assigned_agent_id, status, payload)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    insertTask.run(
      taskId,
      `Auto-generated Task for ${role}`,
      instruction,
      agent.id,
      'pending',
      JSON.stringify({ original_instruction: instruction })
    );

    return {
      taskId,
      assignedAgent: agent.name,
      status: 'pending'
    };
  }
  /**
   * Evaluates intent and creates an execution path (DAG).
   * Maps to Phase 8 Multi-Agent Orchestration.
   */
  async createDagRun(goal) {
    console.log(`[Orchestrator] Generating DAG for goal: ${goal}`);
    return {
      runId: Date.now(),
      status: 'PLANNING',
      nodes: [
        { id: 'node_1', agent: 'Conductor', status: 'COMPLETED' },
        { id: 'node_2', agent: 'Researcher', status: 'QUEUED', dependsOn: ['node_1'] }
      ]
    };
  }

}

module.exports = new OrchestratorService();
