const fs = require('fs');
const path = require('path');

function parseFrontmatter(content) {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = content.match(frontmatterRegex);
  if (!match) return null;

  const yaml = match[1];
  const nameMatch = yaml.match(/^name:\s*(.+)$/m);
  const descMatch = yaml.match(/^description:\s*(.+)$/m);

  return {
    name: nameMatch ? nameMatch[1].trim() : null,
    description: descMatch ? descMatch[1].trim() : null
  };
}

function loadSkills(skillsDir = __dirname) {
  const skills = [];
  try {
    const folders = fs.readdirSync(skillsDir, { withFileTypes: true });
    for (const folder of folders) {
      if (!folder.isDirectory()) continue;
      const skillFile = path.join(skillsDir, folder.name, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        const content = fs.readFileSync(skillFile, 'utf8');
        const metadata = parseFrontmatter(content);
        if (metadata && metadata.name) {
          skills.push({
            name: metadata.name,
            description: metadata.description || "No description available.",
            path: skillFile
          });
        }
      }
    }
  } catch (err) {
    console.error("[SkillLoader] Error loading skills:", err.message);
  }
  return skills;
}

function getAvailableSkillsSummary(skills) {
  if (!skills || skills.length === 0) return "";
  return skills.map(s => `- **${s.name}**: ${s.description}`).join('\n');
}

module.exports = { loadSkills, getAvailableSkillsSummary };
