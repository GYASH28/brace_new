const fs = require('fs');
const path = require('path');

class SkillRegistry {
  constructor() {
    this.skillsDir = path.join(__dirname, '..', '..', 'workspace', '.os', 'skills');
    if (!fs.existsSync(this.skillsDir)) {
      fs.mkdirSync(this.skillsDir, { recursive: true });
    }
  }

  listSkills() {
    return fs.readdirSync(this.skillsDir).filter(file => file.endsWith('.md'));
  }

  getSkill(name) {
    const filePath = path.join(this.skillsDir, name);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    return null;
  }

  saveSkill(name, content) {
    const filePath = path.join(this.skillsDir, name.endsWith('.md') ? name : `${name}.md`);
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

module.exports = new SkillRegistry();
