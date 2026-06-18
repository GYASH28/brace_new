/**
 * Brace agent playbook: a focused multi-agent runtime for Brace (CEO) and
 * Friday (Vice-CEO). Both roles are implemented inside a single orchestrator so
 * the Electron desktop app and the localhost dev server can run them without
 * pulling in any external services.
 *
 * Each role has a tight persona, scope, and tool allowlist. The orchestrator
 * decides who is best suited for a request, then delegates.
 */

const ROLES = Object.freeze({
  brace: {
    id: "brace",
    name: "B.R.A.C.E",
    title: "Chief Executive Officer",
    summary:
      "B.R.A.C.E is the CEO of the local Jarvis-style OS. Owns vision, planning, prioritization, and the user relationship.",
    capabilities: [
      "Decide what to do next and why.",
      "Hold long-term memory and context from the Obsidian brain.",
      "Approve risky actions and route approvals to the user.",
      "Delegate execution work to the Vice-CEO.",
    ],
  },
  friday: {
    id: "friday",
    name: "Friday",
    title: "Vice-CEO / Chief of Staff",
    summary:
      "Friday is the right hand. Owns execution, file/folder/command tooling, project scaffolding, and reporting progress back to B.R.A.C.E.",
    capabilities: [
      "Run tools (read/write files, run safe commands, scan projects).",
      "Draft plans, diffs, and PR-style summaries for approval.",
      "Persist transcripts, tasks, and notes into the local brain.",
      "Wake B.R.A.C.E only when a decision, approval, or memory write is required.",
  },
  designer: {
    id: "designer",
    name: "Designer",
    title: "Web Designer / UI Engineer",
    summary: "Responsible for crafting stunning, modern, and user-friendly web designs.",
    capabilities: ["Design UI/UX layouts", "Write CSS/Tailwind", "Create visually appealing components"]
  },
  frontend: {
    id: "frontend",
    name: "Frontend",
    title: "Frontend Developer",
    summary: "Implements web interfaces using React, Vite, and modern JS/TS frameworks.",
    capabilities: ["Build React components", "Manage frontend state", "Integrate APIs into UI"]
  },
  backend: {
    id: "backend",
    name: "Backend",
    title: "Backend Engineer",
    summary: "Architects and builds robust APIs, databases, and server-side logic.",
    capabilities: ["Write Node.js/Python server code", "Manage databases", "Design secure APIs"]
  },
  ai_architect: {
    id: "ai_architect",
    name: "Architect",
    title: "AI Workflow Architect",
    summary: "Designs complex AI pipelines and orchestrates external model integrations.",
    capabilities: ["Design AI workflows", "Integrate LLM APIs", "Optimize RAG systems"]
  },
  prompt_engineer: {
    id: "prompt_engineer",
    name: "Prompter",
    title: "Prompt Engineer & Data Scientist",
    summary: "Specializes in crafting effective prompts and fine-tuning models.",
    capabilities: ["Optimize prompts", "Evaluate model outputs", "Manage fine-tuning data"]
  },
  devops: {
    id: "devops",
    name: "DevOps",
    title: "DevOps Engineer",
    summary: "Handles deployment, CI/CD, and local environment configurations.",
    capabilities: ["Configure Docker", "Set up localhost environments", "Deploy to cloud"]
  },
  qa_tester: {
    id: "qa_tester",
    name: "QA",
    title: "QA Tester",
    summary: "Ensures software quality by testing and verifying behavior.",
    capabilities: ["Write automated tests", "Perform manual verification", "Identify edge cases"]
  },
  sales: {
    id: "sales",
    name: "Sales",
    title: "Sales & Lead Gen",
    summary: "Executes outreach strategies from the company playbook to generate leads.",
    capabilities: ["Draft outreach emails", "Analyze leads", "Pitch AI and Web services"]
  },
  pm: {
    id: "pm",
    name: "PM",
    title: "Project Manager",
    summary: "Tracks tasks, organizes priorities, and ensures deadlines are met.",
    capabilities: ["Manage task boards", "Coordinate agents", "Provide status reports"]
  },
  copywriter: {
    id: "copywriter",
    name: "Copywriter",
    title: "Content Creator",
    summary: "Generates engaging copy for websites, marketing, and user communications.",
    capabilities: ["Write website copy", "Draft blog posts", "Refine user-facing text"]
  }
});

const STATUS_LABELS = Object.freeze({
  idle: "Idle",
  thinking: "Thinking",
  delegating: "Delegating to Friday",
  executing: "Executing tools",
  awaiting_approval: "Awaiting user approval",
  done: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
});

function listRoles() {
  return Object.values(ROLES).map((role) => ({ ...role }));
}

function getRole(id) {
  return ROLES[id] || null;
}

function nextStatus(current, event) {
  // Tiny FSM so the UI can render real status transitions, not just text.
  const transitions = {
    idle: { think: "thinking", delegate: "delegating", execute: "executing", done: "done", fail: "failed" },
    thinking: { delegate: "delegating", execute: "executing", done: "done", fail: "failed" },
    delegating: { execute: "executing", done: "done", fail: "failed" },
    executing: { approve: "awaiting_approval", done: "done", fail: "failed" },
    awaiting_approval: { execute: "executing", done: "done", fail: "failed", cancel: "cancelled" },
    done: { think: "thinking" },
    failed: { think: "thinking" },
    cancelled: { think: "thinking" },
  };
  return transitions[current]?.[event] || current;
}

module.exports = { ROLES, STATUS_LABELS, getRole, listRoles, nextStatus };
