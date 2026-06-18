const cron = require('node-cron');
const db = require('../db/db.cjs');
const workspaceOsManager = require('../memory/workspaceOsManager.cjs');

class CuratorService {
  constructor() {
    this.initCronJobs();
  }

  initCronJobs() {
    // Run every hour to analyze completed tasks and extract novel workflows
    cron.schedule('0 * * * *', () => {
      this.evaluateCompletedTasks();
    });
  }

  evaluateCompletedTasks() {
    console.log('[CuratorService] Evaluating completed tasks for novel skills...');
    const completedTasks = db.prepare(`SELECT * FROM tasks WHERE status = 'done'`).all();
    
    // Simplistic extraction: If we notice a task that's done, we could simulate extracting a skill
    // For this mockup, we just append to a SKILLS_LOG in the workspace OS dir
    if (completedTasks.length > 0) {
      let currentLog = workspaceOsManager.readFile('SKILLS_LOG.md') || '# Extracted Skills\n\n';
      completedTasks.forEach(task => {
        if (!currentLog.includes(task.id)) {
          currentLog += `- Extracted potential skill from task: ${task.title} (ID: ${task.id})\n`;
        }
      });
      workspaceOsManager.writeFile('SKILLS_LOG.md', currentLog);
    }
  }
}

module.exports = new CuratorService();
