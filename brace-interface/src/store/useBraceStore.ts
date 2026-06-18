import { create } from "zustand";
import type {
  Agent,
  Task,
  MemoryNode,
  Tool,
  AuditEvent,
  TelemetryEntry,
  Message,
  PageId,
  Toast,
  AgentRole,
  TaskStatus,
  TaskPriority,
} from "@/types";

const AGENT_COLORS: Record<AgentRole, string> = {
  conductor: "#22d3ee",
  researcher: "#a78bfa",
  builder: "#10b981",
  reviewer: "#f59e0b",
  memory_curator: "#ec4899",
  automation_operator: "#6b7180",
  creative_studio: "#f97316",
  qa_sentinel: "#f43f5e",
};

const AGENT_ICONS: Record<AgentRole, string> = {
  conductor: "⚡",
  researcher: "🔍",
  builder: "🔨",
  reviewer: "🛡",
  memory_curator: "📚",
  automation_operator: "⚙",
  creative_studio: "🎨",
  qa_sentinel: "🎯",
};

const initialAgents: Agent[] = [
  {
    id: "a1",
    name: "Conductor",
    role: "conductor",
    modelProvider: "gemini-2.5-flash",
    status: "active",
    x: 480,
    y: 300,
    systemPrompt:
      "Primary orchestrator — routes intents, forms plans, monitors progress, synthesizes results.",
    tools: ["dispatch_task"],
    permissionScope: "safe_write",
    memoryScope: "workspace",
    maxSteps: 30,
    concurrency: 3,
    tokenBudget: 80000,
    costBudgetUsd: 5.0,
    temperature: 0.4,
  },
  {
    id: "a2",
    name: "Researcher",
    role: "researcher",
    modelProvider: "gemini-2.5-flash",
    status: "active",
    x: 240,
    y: 170,
    systemPrompt:
      "Gathers sources, compares evidence, extracts facts, records citations, identifies uncertainty.",
    tools: ["web_search", "url_fetch"],
    permissionScope: "read_only",
    memoryScope: "workspace",
    maxSteps: 25,
    concurrency: 2,
    tokenBudget: 50000,
    costBudgetUsd: 3.0,
    temperature: 0.5,
  },
  {
    id: "a3",
    name: "Builder",
    role: "builder",
    modelProvider: "claude-3.5-sonnet",
    status: "active",
    x: 720,
    y: 170,
    systemPrompt:
      "Implements code or structured deliverables, follows repo conventions, runs tests, generates artifacts.",
    tools: ["fs_read", "fs_write", "terminal_execute"],
    permissionScope: "safe_write",
    memoryScope: "project",
    maxSteps: 40,
    concurrency: 1,
    tokenBudget: 120000,
    costBudgetUsd: 10.0,
    temperature: 0.2,
  },
  {
    id: "a4",
    name: "Reviewer",
    role: "reviewer",
    modelProvider: "claude-3.5-sonnet",
    status: "idle",
    x: 820,
    y: 340,
    systemPrompt:
      "Inspects plans and outputs, checks requirements, identifies regressions, rejects incomplete work.",
    tools: ["fs_read"],
    permissionScope: "read_only",
    memoryScope: "workspace",
    maxSteps: 20,
    concurrency: 1,
    tokenBudget: 40000,
    costBudgetUsd: 2.0,
    temperature: 0.3,
  },
  {
    id: "a5",
    name: "Memory Curator",
    role: "memory_curator",
    modelProvider: "gemini-2.5-flash",
    status: "idle",
    x: 480,
    y: 480,
    systemPrompt:
      "Identifies durable knowledge, deduplicates memory, preserves provenance, suggests memory updates.",
    tools: ["memory_append", "memory_search"],
    permissionScope: "read_only",
    memoryScope: "workspace",
    maxSteps: 15,
    concurrency: 1,
    tokenBudget: 25000,
    costBudgetUsd: 1.5,
    temperature: 0.6,
  },
  {
    id: "a6",
    name: "Automation Op",
    role: "automation_operator",
    modelProvider: "gemini-2.5-flash",
    status: "idle",
    x: 140,
    y: 340,
    systemPrompt:
      "Constructs workflows, integrates tools, schedules tasks, monitors runs, diagnoses failures.",
    tools: ["cron_create", "webhook_send"],
    permissionScope: "safe_write",
    memoryScope: "workspace",
    maxSteps: 20,
    concurrency: 2,
    tokenBudget: 30000,
    costBudgetUsd: 1.5,
    temperature: 0.4,
  },
  {
    id: "a7",
    name: "Creative Studio",
    role: "creative_studio",
    modelProvider: "gemini-2.5-pro",
    status: "idle",
    x: 720,
    y: 480,
    systemPrompt:
      "Produces scripts, designs, media plans, content variants, creative assets using approved generation tools.",
    tools: ["image_generate", "copy_generate"],
    permissionScope: "read_only",
    memoryScope: "project",
    maxSteps: 25,
    concurrency: 1,
    tokenBudget: 60000,
    costBudgetUsd: 4.0,
    temperature: 0.8,
  },
  {
    id: "a8",
    name: "QA Sentinel",
    role: "qa_sentinel",
    modelProvider: "claude-3.5-sonnet",
    status: "idle",
    x: 240,
    y: 480,
    systemPrompt:
      "Runs test plans, verifies UI behavior, inspects logs, checks permissions, produces evidence before a task is marked complete.",
    tools: ["test_run", "screenshot_compare"],
    permissionScope: "read_only",
    memoryScope: "workspace",
    maxSteps: 25,
    concurrency: 1,
    tokenBudget: 35000,
    costBudgetUsd: 2.0,
    temperature: 0.3,
  },
];

const initialTasks: Task[] = [
  {
    id: "t1",
    title: "Audit codebase for memory leaks",
    description: "Run static analysis on all agent runtime modules to identify potential memory leaks in long-running sessions.",
    status: "running",
    priority: "high",
    assignedAgentId: "a8",
    projectId: "p1",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "t2",
    title: "Research MCP server integrations",
    description: "Evaluate available MCP servers for filesystem, database, and web search tool providers.",
    status: "running",
    priority: "medium",
    assignedAgentId: "a2",
    projectId: "p1",
    createdAt: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    id: "t3",
    title: "Implement approval gate UI",
    description: "Build modal component for operator approval of high-risk tool executions with payload inspection.",
    status: "blocked",
    priority: "high",
    assignedAgentId: "a3",
    projectId: "p1",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    approvalPayload: {
      tool: "fs_write",
      risk: "high",
      reversible: false,
      affectedAccounts: ["local filesystem"],
      args: { path: "/etc/brace/config.json", content: "{...}" },
    },
  },
  {
    id: "t4",
    title: "Design system iconography set",
    description: "Create consistent icon set for all 12 navigation modules and agent avatars.",
    status: "review",
    priority: "low",
    assignedAgentId: "a7",
    projectId: "p1",
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: "t5",
    title: "Curate memory from last session",
    description: "Review and deduplicate memory nodes extracted from yesterday's research session.",
    status: "pending",
    priority: "medium",
    assignedAgentId: "a5",
    projectId: "p1",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "t6",
    title: "Set up cron heartbeat job",
    description: "Configure 5-minute HEARTBEAT.md reader for proactive agent routines.",
    status: "pending",
    priority: "low",
    assignedAgentId: "a6",
    projectId: "p1",
    createdAt: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: "t7",
    title: "Review PR: STUC interface components",
    description: "Code review for the spatial telemetry UI components including swarm canvas and telemetry sidebar.",
    status: "done",
    priority: "high",
    assignedAgentId: "a4",
    projectId: "p1",
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: "t8",
    title: "Route multi-step research workflow",
    description: "Conductor orchestrated research on OpenClaw Gateway architecture, delegating to Researcher.",
    status: "done",
    priority: "medium",
    assignedAgentId: "a1",
    projectId: "p1",
    createdAt: new Date(Date.now() - 18000000).toISOString(),
  },
];

const initialMemoryNodes: MemoryNode[] = [
  { id: "m1", content: "OpenClaw Gateway uses WebSocket for real-time agent communication", type: "fact", confidence: 0.92 },
  { id: "m2", content: "All file writes outside /workspace require operator approval", type: "rule", confidence: 1.0 },
  { id: "m3", content: "Research workflow: search → fetch → extract → cross-reference → brief", type: "skill", confidence: 0.88 },
  { id: "m4", content: "Operator prefers concise responses without preamble", type: "preference", confidence: 0.95 },
  { id: "m5", content: "Builder agent successfully migrated auth to OAuth2 on 2026-06-15", type: "episodic", confidence: 0.85 },
  { id: "m6", content: "SQLite WAL mode is required for zero-latency IPC", type: "fact", confidence: 0.97 },
  { id: "m7", content: "Gemini 2.5 Flash has 1M token context window", type: "fact", confidence: 0.9 },
  { id: "m8", content: "Approval gates must show exact payload with cryptographic sign-off", type: "rule", confidence: 1.0 },
];

const initialTools: Tool[] = [
  { id: "fs_read", name: "fs_read", description: "Read file contents from workspace. Returns file metadata and content.", schema: "{ path: string }", riskLevel: "low", enabled: true },
  { id: "fs_write", name: "fs_write", description: "Write content to a file path in the workspace. Creates directories if needed.", schema: "{ path: string, content: string }", riskLevel: "medium", enabled: true },
  { id: "memory_append", name: "memory_append", description: "Append a fact or preference to USER.md or AGENTS.md in the vault.", schema: "{ target: 'USER' | 'AGENTS', content: string }", riskLevel: "low", enabled: true },
  { id: "terminal_execute", name: "terminal_execute", description: "Execute a shell command in a sandboxed workspace directory.", schema: "{ command: string, cwd?: string, env?: object }", riskLevel: "high", enabled: true },
];

const initialAuditEvents: AuditEvent[] = [
  { id: "ev1", type: "agent.run.created", actor: "Conductor", payload: { taskId: "t1", intent: "qa" }, timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: "ev2", type: "agent.run.started", actor: "QA Sentinel", payload: { taskId: "t1" }, timestamp: new Date(Date.now() - 7190000).toISOString() },
  { id: "ev3", type: "tool.requested", actor: "Builder", payload: { taskId: "t3", tool: "fs_write" }, timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: "ev4", type: "tool.approval.required", actor: "system", payload: { taskId: "t3", tool: "fs_write", risk: "high" }, timestamp: new Date(Date.now() - 3590000).toISOString() },
  { id: "ev5", type: "agent.run.completed", actor: "Researcher", payload: { taskId: "t8" }, timestamp: new Date(Date.now() - 16200000).toISOString() },
  { id: "ev6", type: "skill.extracted", actor: "Curator", payload: { skillId: "research-workflow-v1" }, timestamp: new Date(Date.now() - 14400000).toISOString() },
];

const initialTelemetry: TelemetryEntry[] = [
  { id: "te1", agentId: "a1", tokensProcessed: 12847, costUsd: 0.084 },
  { id: "te2", agentId: "a2", tokensProcessed: 34291, costUsd: 0.231 },
  { id: "te3", agentId: "a3", tokensProcessed: 56204, costUsd: 1.847 },
  { id: "te4", agentId: "a4", tokensProcessed: 8921, costUsd: 0.058 },
  { id: "te5", agentId: "a8", tokensProcessed: 15632, costUsd: 0.102 },
];

const initialMessages: Message[] = [
  { id: "msg1", taskId: "t1", agentId: "a8", sender: "agent", content: "Starting codebase audit — scanning 2,847 files for memory leak patterns", tokensUsed: 245, createdAt: new Date(Date.now() - 7190000).toISOString() },
  { id: "msg2", taskId: "t2", agentId: "a2", sender: "agent", content: "Found 12 MCP server candidates — filtering by community health score", tokensUsed: 189, createdAt: new Date(Date.now() - 5390000).toISOString() },
  { id: "msg3", taskId: "t3", agentId: "a3", sender: "agent", content: "Requesting approval for fs_write to /etc/brace/config.json — this is a system-level configuration change", tokensUsed: 312, createdAt: new Date(Date.now() - 3590000).toISOString() },
];

const initialMemoryFiles: Record<string, string> = {
  "SOUL.md": `# SOUL.md — Agent Identity & Ethical Boundaries

## Core Identity
You are B.R.A.C.E Agent OS — a local-first AI Agent Operating System. Your purpose is to serve as the cognitive orchestration layer between human operators and specialized AI agents.

## Immutable Principles
1. **Local-first, cloud optional** — Core functionality works offline
2. **Human-controlled autonomy** — No action without explicit permission
3. **Shared memory with provenance** — Every memory has source and timestamp
4. **Observability-first** — The operator is a fleet commander, not a chat partner
5. **Progressive disclosure** — Load context only when needed

## Behavioral Traits
- Concise, precise communication
- Proactive error detection and reporting
- Respectful of operator time and attention
- Transparent about limitations and uncertainties`,

  "AGENTS.md": `# AGENTS.md — Operational Standards

## Coding Standards
- TypeScript strict mode for all new code
- Prefer functional programming patterns
- All async operations must have timeouts and cancellation
- Error boundaries around every major module

## Multi-Agent Coordination
- Conductor always routes — never self-delegate
- Memory Curator reviews before persistence
- QA Sentinel blocks merges without evidence
- Builder runs tests before marking done

## Workflow Preferences
- Research before implementation
- Test before review
- Document before archive`,

  "USER.md": `# USER.md — Operator Preferences

## Communication Style
- Prefers concise responses without preamble
- Technical details in collapsible sections
- Code examples over descriptions when possible

## Working Hours
- Primary: 09:00 - 18:00 IST
- Emergency: Available via approval gate notifications

## Important Contacts
- DevOps: @ops-team (Slack)
- Security: security@brace.local`,
};

interface BraceStore {
  // Navigation
  currentPage: PageId;
  setPage: (page: PageId) => void;

  // Selection
  selectedAgentId: string;
  setSelectedAgentId: (id: string) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  selectedMemoryFile: string;
  setSelectedMemoryFile: (file: string) => void;
  selectedTool: string;
  setSelectedTool: (tool: string) => void;

  // Approval modal
  pendingApprovalTaskId: string | null;
  setPendingApprovalTaskId: (id: string | null) => void;

  // Data
  agents: Agent[];
  tasks: Task[];
  memoryNodes: MemoryNode[];
  tools: Tool[];
  auditEvents: AuditEvent[];
  telemetry: TelemetryEntry[];
  messages: Message[];
  memoryFiles: Record<string, string>;

  // Actions
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  resolveApproval: (taskId: string, decision: "approve" | "deny", feedback?: string) => void;
  dispatchTask: (instruction: string) => { task: Task; agent: Agent; intent: { domain: string; priority: TaskPriority; suggestedAgent: AgentRole } };

  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;

  // Run strip
  isRunning: boolean;
}

export const useBraceStore = create<BraceStore>((set, get) => ({
  currentPage: "home",
  setPage: (page) => set({ currentPage: page }),

  selectedAgentId: "a1",
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
  selectedTaskId: null,
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  selectedMemoryFile: "SOUL.md",
  setSelectedMemoryFile: (file) => set({ selectedMemoryFile: file }),
  selectedTool: "fs_read",
  setSelectedTool: (tool) => set({ selectedTool: tool }),

  pendingApprovalTaskId: null,
  setPendingApprovalTaskId: (id) => set({ pendingApprovalTaskId: id }),

  agents: initialAgents,
  tasks: initialTasks,
  memoryNodes: initialMemoryNodes,
  tools: initialTools,
  auditEvents: initialAuditEvents,
  telemetry: initialTelemetry,
  messages: initialMessages,
  memoryFiles: initialMemoryFiles,

  updateTaskStatus: (taskId, status) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
    })),

  resolveApproval: (taskId, decision, feedback) => {
    const state = get();
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newStatus = decision === "approve" ? "running" : "pending";
    const newTasks = state.tasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus as TaskStatus, approvalPayload: undefined } : t
    );

    const newEvent: AuditEvent = {
      id: `ev${state.auditEvents.length + 1}`,
      type: decision === "approve" ? "tool.approved" : "tool.denied",
      actor: "operator",
      payload: { taskId, tool: task.approvalPayload?.tool, feedback: feedback || "(no feedback)" },
      timestamp: new Date().toISOString(),
    };

    set({
      tasks: newTasks,
      auditEvents: [newEvent, ...state.auditEvents],
      pendingApprovalTaskId: null,
    });
  },

  dispatchTask: (instruction) => {
    const state = get();
    const intent = classifyIntent(instruction);
    const agent = state.agents.find((a) => a.role === intent.suggestedAgent) || state.agents[0];
    const task: Task = {
      id: `t${state.tasks.length + 1}`,
      title: instruction.length > 60 ? instruction.slice(0, 57) + "..." : instruction,
      description: instruction,
      status: "pending",
      priority: intent.priority,
      assignedAgentId: agent.id,
      projectId: "p1",
      createdAt: new Date().toISOString(),
    };

    const newEvent: AuditEvent = {
      id: `ev${state.auditEvents.length + 1}`,
      type: "agent.run.created",
      actor: "Conductor",
      payload: { taskId: task.id, intent: intent.domain },
      timestamp: new Date().toISOString(),
    };

    set({
      tasks: [task, ...state.tasks],
      auditEvents: [newEvent, ...state.auditEvents],
    });

    return { task, agent, intent };
  },

  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  isRunning: initialTasks.some((t) => t.status === "running"),
}));

function classifyIntent(text: string): { domain: string; priority: TaskPriority; suggestedAgent: AgentRole } {
  const t = text.toLowerCase();
  if (/\b(code|build|implement|refactor|fix|bug|deploy|migrate)\b/.test(t))
    return { domain: "coding", priority: "high", suggestedAgent: "builder" };
  if (/\b(research|compare|investigate|analyze|study)\b/.test(t))
    return { domain: "research", priority: "medium", suggestedAgent: "researcher" };
  if (/\b(write|design|generate|create content|blog|copy|headline)\b/.test(t))
    return { domain: "creative", priority: "low", suggestedAgent: "creative_studio" };
  if (/\b(test|verify|qa|smoke|regression|playwright)\b/.test(t))
    return { domain: "qa", priority: "high", suggestedAgent: "qa_sentinel" };
  if (/\b(schedule|cron|automate|workflow|recurring)\b/.test(t))
    return { domain: "automation", priority: "medium", suggestedAgent: "automation_operator" };
  if (/\b(remember|note|preference|from now on)\b/.test(t))
    return { domain: "memory", priority: "low", suggestedAgent: "memory_curator" };
  if (/\b(review|inspect|audit|approve)\b/.test(t))
    return { domain: "review", priority: "high", suggestedAgent: "reviewer" };
  return { domain: "general", priority: "medium", suggestedAgent: "conductor" };
}

export { AGENT_COLORS, AGENT_ICONS };
