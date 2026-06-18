const fs = require('fs');
const path = require('path');
const { loadSkills } = require('../assistant/skills/skillLoader.cjs');

function readSkill({ skillName }) {
  const skillsDir = path.resolve(__dirname, '../assistant/skills');
  const skills = loadSkills(skillsDir);
  const target = skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
  if (!target) {
    return { ok: false, error: `Skill '${skillName}' not found. Check the exact skill name.` };
  }
  try {
    const content = fs.readFileSync(target.path, 'utf8');
    return { ok: true, skillName, content };
  } catch (err) {
    return { ok: false, error: `Could not read skill file: ${err.message}` };
  }
}

module.exports = { readSkill };
