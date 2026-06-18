function errorResponse(error) {
  const code = error.code || "ASSISTANT_ERROR";
  const friendly = {
    MISSING_GEMINI_API_KEY: "Gemini key is missing. Save a Gemini API key in Settings, or set GEMINI_API_KEY and restart B.R.A.C.E.",
    GEMINI_RATE_LIMIT: "Gemini is rate limited right now. Try again in a moment.",
    GEMINI_TIMEOUT: "Gemini took too long to respond. Try again with a shorter prompt.",
  };
  return {
    ok: false,
    error: {
      code,
      message: friendly[code] || error.message || "B.R.A.C.E assistant failed.",
    },
  };
}

const path = require('path');
const { loadSkills, getAvailableSkillsSummary } = require('../skills/skillLoader.cjs');

let cachedSkillsSummary = null;

function getSkillsText() {
  if (cachedSkillsSummary === null) {
    const skillsDir = path.resolve(__dirname, '../skills');
    const skills = loadSkills(skillsDir);
    cachedSkillsSummary = getAvailableSkillsSummary(skills);
  }
  if (!cachedSkillsSummary) return "";
  return `\n\n## Agent Skills Available\nYou have access to specialized workflow skills. If a skill matches your task, you MUST use the \`agent.read_skill\` tool to read its instructions before writing code.\n${cachedSkillsSummary}`;
}

function assistantSystemPrompt() {
  const basePrompt = [
    "You are B.R.A.C.E - Brain-like Responsive Assistant for Creation and Execution.",
    "You are Yash's practical Jarvis-like AI assistant: calm, sharp, technical, helpful, and action-oriented.",
    "Help with coding, AI projects, websites, automation, study, client work, planning, debugging, and personal project management.",
    "Use Indian English or Hinglish-friendly phrasing when it makes the answer clearer.",
    "Use tools only when needed. Never claim a tool action succeeded if it failed.",
    "Ask for confirmation before risky actions. Protect secrets and private files.",
    "Keep simple answers direct; give practical steps for complex project work.",
  ].join("\n");

  return basePrompt + getSkillsText();
}

module.exports = { assistantSystemPrompt, errorResponse };
