const orchestratorService = require('./orchestratorService.cjs');

class ChannelAdapter {
  constructor() {}

  /**
   * Normalizes incoming messages from Telegram, WhatsApp, or other headless interfaces
   * and pipes them into the Orchestrator.
   */
  async handleIncomingMessage(channel, messagePayload) {
    console.log(`[ChannelAdapter] Received message from ${channel}:`, messagePayload);
    
    // Normalize into standard instruction format
    const instruction = typeof messagePayload === 'string' ? messagePayload : messagePayload.text;

    // Dispatch via Orchestrator
    const result = await orchestratorService.dispatchTask(instruction);
    
    return {
      success: true,
      acknowledgment: `Task dispatched to ${result.assignedAgent}. Task ID: ${result.taskId}`
    };
  }
}

module.exports = new ChannelAdapter();
