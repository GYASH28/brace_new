const fs = require('fs');
const path = require('path');

class WorkspaceOsManager {
  constructor() {
    // Determine workspace root dynamically; here assuming 2 levels up from backend
    this.workspaceRoot = path.join(__dirname, '..', '..');
    this.osDir = path.join(this.workspaceRoot, 'workspace', '.os');
    
    this.initializeOsDirectory();
  }

  initializeOsDirectory() {
    if (!fs.existsSync(this.osDir)) {
      fs.mkdirSync(this.osDir, { recursive: true });
    }

    this._ensureFile('SOUL.md', '# SOUL\n\nCore directives and mission of the Brace OS.\n');
    this._ensureFile('AGENTS.md', '# AGENTS\n\nAgent definitions and allowed tools.\n');
    this._ensureFile('USER.md', '# USER\n\nUser preferences and known context.\n');
  }

  _ensureFile(filename, defaultContent) {
    const filePath = path.join(this.osDir, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, defaultContent, 'utf-8');
    }
  }

  readFile(filename) {
    const filePath = path.join(this.osDir, filename);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    return null;
  }

  writeFile(filename, content) {
    const filePath = path.join(this.osDir, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

module.exports = new WorkspaceOsManager();
