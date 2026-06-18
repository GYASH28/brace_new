import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BatteryCharging,
  BrainCircuit,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Copy,
  Database,
  LockKeyhole,
  Mic,
  Paperclip,
  Save,
  Send,
  ShieldCheck,
  
  Trash2,
  Volume2,
  Wifi,
} from "lucide-react";
import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { memo, useEffect, useMemo, useState } from "react";
import type { AssistantStatus, ChatMessage, NavItem, PageId, SystemInfo } from "../types";

type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
};

type StatusBadgeProps = {
  label: string;
  tone?: "cyan" | "teal" | "purple" | "muted" | "green" | "warn";
  icon?: ReactNode;
};

type SidebarProps = {
  items: NavItem[];
  activePage: PageId;
  collapsed: boolean;
  onNavigate: (page: PageId) => void;
  onToggle: () => void;
  assistantStatus?: AssistantStatus | null;
  safeMode?: boolean;
};

type TopBarProps = {
  micActive: boolean;
  hasGeminiKey: boolean;
  assistantStatus?: AssistantStatus | null;
  runtimeLabel?: string;
  systemInfo?: SystemInfo | null;
};

type CommandButtonProps = {
  label: string;
  detail?: string;
  icon: ElementType;
  onClick: () => void;
};

type SystemMetricCardProps = {
  label: string;
  value: number;
  detail: string;
  icon: ElementType;
  tone: string;
  graph: number[];
};

type SettingsToggleProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
};

const toneMap: Record<string, string> = {
  cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
  teal: "border-teal-300/25 bg-teal-300/10 text-teal-100",
  purple: "border-violet-300/25 bg-violet-300/10 text-violet-100",
  green: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  warn: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  muted: "border-white/10 bg-white/5 text-slate-300",
};

const sidebarGroups: { label: string; ids: PageId[] }[] = [
  { label: "Core", ids: ["home", "chat", "voice"] },
  { label: "Agent", ids: ["agent", "tasks", "tools", "projects"] },
  { label: "Knowledge", ids: ["files", "memory", "notes"] },
  { label: "System", ids: ["system", "apps", "permissions", "logs", "settings"] },
];

const timeFormatter = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const formatTime = () => timeFormatter.format(new Date());
const commandButtonHover = { y: -5 };
const commandButtonTap = { scale: 0.98 };
const chatBubbleInitial = { opacity: 0, y: 12 };
const chatBubbleAnimate = { opacity: 1, y: 0 };
const pageInitial = { opacity: 0, y: 12 };
const pageAnimate = { opacity: 1, y: 0 };
const pageExit = { opacity: 0, y: 8 };
const pageTransition = { duration: 0.24, ease: "easeOut" as const };
const waveformBars = Array.from({ length: 28 }, (_, index) => ({
  activePeak: 0.7 + (index % 5) * 0.075,
  delay: index * 0.025,
  id: index,
}));

export function GlassCard({ children, className = "", interactive = false, ...props }: GlassCardProps) {
  return (
    <div
      className={[
        "glass-panel rounded-2xl",
        interactive ? "transition duration-300 hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-cyan-300/[0.07]" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatusBadge({ label, tone = "muted", icon }: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em]",
        toneMap[tone],
      ].join(" ")}
    >
      {icon}
      {label}
    </span>
  );
}

export const Sidebar = memo(function Sidebar({ items, activePage, collapsed, onNavigate, onToggle, assistantStatus, safeMode = true }: SidebarProps) {
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  
  const coreLinked = Boolean(assistantStatus?.brain.configured);
  const memorySynced = Boolean(assistantStatus?.memory.obsidian.configured || assistantStatus?.memory.firebase.configured);
  
  return (
    <aside
      className={[
        "relative z-20 hidden shrink-0 border-r border-cyan-300/10 bg-[#020713]/82 px-3 py-4 shadow-[18px_0_70px_rgba(0,0,0,0.24)] backdrop-blur-2xl transition-all duration-300 md:flex md:flex-col",
        collapsed ? "w-[82px]" : "w-[232px]",
      ].join(" ")}
    >
      <div className="mb-8 flex items-center justify-between gap-3 px-2">
        <button
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-cyan-300/18 bg-cyan-300/[0.055] p-2 text-left shadow-[0_0_30px_rgba(34,211,238,0.08)]"
          type="button"
          onClick={() => onNavigate("home")}
          title="B.R.A.C.E home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.18)]">
            <CircleDot size={18} />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block font-display text-[15px] font-semibold tracking-[0.18em] text-white">
                B.R.A.C.E
              </span>
              <span className="block text-[10px] uppercase tracking-[0.12em] text-slate-500">
                Gemini command core
              </span>
            </span>
          )}
        </button>
        <button
          aria-label="Toggle sidebar"
          className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:border-cyan-300/30 hover:text-cyan-100"
          type="button"
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 min-h-0 space-y-5 overflow-y-auto pr-1">
        {sidebarGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && <div className="mb-2 px-3 text-[10px] uppercase tracking-[0.22em] text-slate-600">{group.label}</div>}
            <div className="space-y-1.5">
              {group.ids.map((id) => {
                const item = itemMap.get(id);
                if (!item) return null;
                const Icon = item.icon;
                const active = item.id === activePage;

                return (
                  <button
                    key={item.id}
                    className={[
                      "group relative flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition duration-200",
                      collapsed ? "justify-center" : "",
                      active
                        ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-50 shadow-[0_0_34px_rgba(34,211,238,0.12)]"
                        : "border-transparent text-slate-500 hover:border-white/10 hover:bg-white/[0.045] hover:text-slate-100",
                    ].join(" ")}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    title={item.label}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-5 w-px -translate-y-1/2 bg-cyan-200 shadow-[0_0_16px_rgba(103,232,249,0.7)]" />}
                    <Icon size={18} />
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={["mt-auto shrink-0 rounded-2xl border p-3 pb-3", coreLinked ? "border-cyan-300/12 bg-cyan-300/[0.035]" : "border-warn-300/12 bg-warn-300/[0.035]"].join(" ")}>
        <div className={["mb-2 flex items-center gap-2", coreLinked ? "text-cyan-100" : "text-amber-100"].join(" ")}>
          <ShieldCheck size={15} />
          {!collapsed && <span className="text-xs font-medium">{coreLinked ? "Core linked" : "Core unlinked"}</span>}
        </div>
        {!collapsed && (
          <div className="space-y-1.5 text-[11px] text-slate-500">
            <p>{coreLinked ? "Gemini primary" : "No AI Provider"}</p>
            <p className={memorySynced ? "text-purple-300/70" : ""}>{memorySynced ? "Memory synced" : "Local memory"}</p>
            <p className={safeMode ? "text-emerald-300/70" : "text-amber-300/70"}>{safeMode ? "Safe mode active" : "Safe mode off"}</p>
          </div>
        )}
      </div>
    </aside>
  );
});

const StatusTile = memo(function StatusTile({ icon, label, value, tone = "muted" }: { icon: ReactNode; label: string; value: string; tone?: StatusBadgeProps["tone"] }) {
  return (
    <div className={["status-tile", `status-tile-${tone}`].join(" ")}>
      <span className="status-tile-icon">{icon}</span>
      <span className="min-w-0">
        <span className="status-tile-label">{label}</span>
        <span className="status-tile-value">{value}</span>
      </span>
    </div>
  );
});

const ClockBadge = memo(function ClockBadge() {
  const [time, setTime] = useState(formatTime);

  useEffect(() => {
    const timer = window.setInterval(() => setTime(formatTime()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className="rounded-full border border-cyan-300/14 bg-cyan-300/[0.04] px-3 py-1 font-mono text-sm text-slate-200">
      {time}
    </span>
  );
});

export const TopBar = memo(function TopBar({ micActive, hasGeminiKey, assistantStatus, runtimeLabel, systemInfo }: TopBarProps) {
  const brainReady = assistantStatus?.brain.configured ?? hasGeminiKey;
  const memoryReady = Boolean(assistantStatus?.memory.obsidian.configured);
  const firebaseReady = Boolean(assistantStatus?.memory.firebase.configured);
  const ttsProvider = assistantStatus?.voice.tts?.ttsProvider ?? assistantStatus?.voice.fallback?.ttsProvider;
  const voiceLabel = ttsProvider === "kokoro" ? "Kokoro" : ttsProvider === "edge-tts" ? "Edge fallback" : ttsProvider === "browser-fallback" ? "Browser" : "Checking";
  const voiceReady = Boolean(ttsProvider && ttsProvider !== "browser-fallback");
  const safeMode = assistantStatus?.tools.safeMode ?? true;

  return (
    <header className="relative z-10 flex min-h-16 items-center justify-between gap-4 glass-panel border-b-0 px-4 py-3 lg:px-6">
      <div className="top-status-scroll min-w-0">
        <StatusTile icon={<BrainCircuit size={14} />} label="Brain" value={brainReady ? "Gemini online" : "Key needed"} tone={brainReady ? "green" : "warn"} />
        <StatusTile icon={<Activity size={14} />} label="Agent" value="B.R.A.C.E / Idle" tone="cyan" />
        <StatusTile icon={<Volume2 size={14} />} label="Voice" value={voiceLabel} tone={voiceReady ? "cyan" : "warn"} />
        <StatusTile icon={<Database size={14} />} label="Memory" value={`${memoryReady ? "Obsidian" : "Local"}${firebaseReady ? " + Firebase" : ""}`} tone={memoryReady ? "purple" : "muted"} />
        <StatusTile icon={<ShieldCheck size={14} />} label="Tools" value={safeMode ? "Safe mode" : "Open"} tone={safeMode ? "green" : "warn"} />
      </div>

      <div className="hidden items-center gap-2 2xl:flex">
        <StatusBadge label={systemInfo ? `CPU ${systemInfo.cpu}%` : "CPU locked"} tone="muted" icon={<Activity size={13} />} />
        <StatusBadge label={systemInfo ? `RAM ${systemInfo.ram}%` : "RAM locked"} tone="muted" />
        <StatusBadge label={systemInfo ? systemInfo.networkDetail : "Network locked"} tone="muted" icon={<Wifi size={13} />} />
        <StatusBadge label={systemInfo?.battery != null ? `${systemInfo.battery}%` : "Power"} tone="muted" icon={<BatteryCharging size={13} />} />
      </div>

      <div className="flex items-center gap-3">
        {runtimeLabel && <StatusBadge label={runtimeLabel} tone="muted" />}
        <StatusBadge label={micActive ? "Mic live" : "Mic idle"} tone={micActive ? "cyan" : "muted"} icon={<Mic size={13} />} />
        <ClockBadge />
      </div>
    </header>
  );
});

export function CommandButton({ label, detail, icon, onClick }: CommandButtonProps) {
  const Icon = icon;

  return (
    <motion.button
      whileHover={commandButtonHover}
      whileTap={commandButtonTap}
      className="group rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-left transition hover:border-cyan-300/35 hover:bg-cyan-300/[0.065]"
      type="button"
      onClick={onClick}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.12)]">
        <Icon size={20} />
      </div>
      <div className="font-medium text-white">{label}</div>
      {detail && <div className="mt-1 text-sm text-slate-500">{detail}</div>}
    </motion.button>
  );
}

function MarkdownText({ content }: { content: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!content) return null;

  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="markdown-body space-y-2">
      {parts.map((part, index) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const lines = part.slice(3, -3).trim().split("\n");
          const lang = lines[0].trim();
          const code = lines.length > 1 ? lines.slice(1).join("\n") : "";
          const blockId = `code-${index}`;
          return (
            <div key={index} className="group relative my-3 overflow-hidden rounded-xl border border-white/10 bg-black/40">
              <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-3 py-1.5 font-mono text-[11px] text-slate-400">
                <span>{lang || "text"}</span>
                <button
                  className="rounded p-1 transition hover:bg-white/10"
                  onClick={() => handleCopy(code, blockId)}
                  title="Copy code"
                  type="button"
                >
                  {copied === blockId ? <Check className="text-emerald-400" size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <pre className="overflow-x-auto p-3 font-mono text-[13px] leading-relaxed text-slate-200">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        const lines = part.split("\n");
        return lines.map((line, i) => {
          if (!line.trim()) return <div key={`br-${index}-${i}`} className="h-2" />;
          
          let html = line
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.*?)\*/g, "<em>$1</em>")
            .replace(/`(.*?)`/g, '<code class="rounded bg-black/30 px-1 py-0.5 font-mono text-[12px] text-cyan-200">$1</code>');
            
          return <p key={`p-${index}-${i}`} className="min-h-[1.5em]" dangerouslySetInnerHTML={{ __html: html }} />;
        });
      })}
    </div>
  );
}

export const ChatBubble = memo(function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      animate={chatBubbleAnimate}
      className={["group flex", isUser ? "justify-end" : "justify-start"].join(" ")}
      initial={chatBubbleInitial}
    >
      <div
        className={[
          "relative max-w-[82%] overflow-hidden break-words rounded-none border-l-[3px] px-5 py-4 text-[15px] leading-relaxed shadow-xl",
          isUser
            ? "border-l-cyan-400 border-y border-r border-cyan-400/20 bg-cyan-400/5 text-cyan-50 font-mono"
            : "border-l-fuchsia-500 border-y border-r border-fuchsia-500/20 bg-fuchsia-500/5 text-slate-100 font-mono",
        ].join(" ")}
      >
        {!isUser && (
          <div className="mb-2 flex min-w-0 items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            {message.source === "brain" ? "Local brain response" : message.source === "agent" ? "Agent runtime" : message.source === "gemini" ? "AI provider" : "System gate"}
            {message.model && <span className="text-slate-500">/ {message.model}</span>}
            {typeof message.confidence === "number" && message.confidence > 0 && (
              <span className="ml-auto text-slate-500">{message.confidence}%</span>
            )}
            <button
              className="ml-2 opacity-0 transition-opacity group-hover:opacity-100 hover:text-cyan-100"
              onClick={handleCopyMessage}
              title="Copy message"
              type="button"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
        )}
        {message.text.startsWith("Thinking through Gemini") ? (
          <div className="flex items-center gap-1.5 py-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400/60" style={{ animationDelay: "0ms" }} />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400/60" style={{ animationDelay: "150ms" }} />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400/60" style={{ animationDelay: "300ms" }} />
          </div>
        ) : (
          <MarkdownText content={message.text} />
        )}
        {!isUser && Boolean(message.memoryUsed?.length) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.memoryUsed?.slice(0, 3).map((memory) => (
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-cyan-100" key={`${memory.source}-${memory.title}`}>
                {memory.source}: {memory.title}
              </span>
            ))}
          </div>
        )}
        {!isUser && Boolean(message.toolCalls?.length) && (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-400">
            Tool calls: {message.toolCalls?.map((call) => call.name).join(", ")}
          </div>
        )}
      </div>
    </motion.div>
  );
});

export function ChatInput({
  value,
  isProcessing,
  onChange,
  onAttach,
  onSend,
  onVoice,
}: {
  value: string;
  isProcessing?: boolean;
  onChange: (value: string) => void;
  onAttach?: () => void;
  onSend: () => void;
  onVoice: () => void;
}) {
  return (
    <div className="sticky bottom-0 z-20 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 p-2 backdrop-blur-xl">
      <button className="icon-button" type="button" onClick={onAttach} title="Attach file">
        <Paperclip size={18} />
      </button>
      <textarea
        className="max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-white outline-none placeholder:text-slate-600"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (value.trim()) onSend();
          }
        }}
        placeholder="Ask B.R.A.C.E. Gemini answers with backend memory and safe tools."
        rows={1}
        value={value}
      />
      <button className="icon-button" type="button" onClick={onVoice} title="Voice command">
        <Mic size={18} />
      </button>
      <button 
        className={["send-button transition-opacity", !value.trim() || isProcessing ? "opacity-50 cursor-not-allowed" : "hover:bg-cyan-400"].join(" ")} 
        disabled={!value.trim() || isProcessing}
        type="button" 
        onClick={onSend} 
        title="Send"
      >
        <Send size={17} />
      </button>
    </div>
  );
}

export function SystemMetricCard({ label, value, detail, icon, tone, graph }: SystemMetricCardProps) {
  const Icon = icon;
  const color = tone === "purple" ? "#a78bfa" : tone === "teal" ? "#5eead4" : "#67e8f9";
  const normalizedValue = Math.max(0, Math.min(100, value));

  return (
    <GlassCard className="p-5" interactive>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-semibold text-white">{value}%</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3" style={{ color }}>
          <Icon size={20} />
        </div>
      </div>
      <div className="mb-4 h-2 rounded-full bg-white/[0.06]">
        <div className="h-full origin-left rounded-full" style={{ transform: `scaleX(${normalizedValue / 100})`, background: color }} />
      </div>
      <MiniGraph values={graph} color={color} />
      <p className="mt-4 text-sm text-slate-500">{detail}</p>
    </GlassCard>
  );
}

function MiniGraph({ values, color }: { values: number[]; color: string }) {
  return (
    <div className="flex h-12 items-end gap-1.5">
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className="h-full flex-1 origin-bottom rounded-t-full bg-white/10"
          style={{
            transform: `scaleY(${Math.max(16, value) / 100})`,
            background: `linear-gradient(180deg, ${color}, rgba(255,255,255,0.06))`,
          }}
        />
      ))}
    </div>
  );
}

export function SettingsToggle({ label, description, checked, onChange }: SettingsToggleProps) {
  return (
    <button
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left transition hover:border-cyan-300/25"
      type="button"
      onClick={onChange}
    >
      <span>
        <span className="block text-sm font-medium text-white">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
      <span
        className={[
          "relative h-6 w-11 rounded-full border transition",
          checked ? "border-cyan-300/40 bg-cyan-300/30" : "border-white/15 bg-white/5",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 h-4 w-4 rounded-full bg-white transition",
            checked ? "left-6 shadow-[0_0_18px_rgba(103,232,249,0.45)]" : "left-1",
          ].join(" ")}
        />
      </span>
    </button>
  );
}

export function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex h-16 items-center justify-center gap-1.5">
      {waveformBars.map((bar) => (
        <motion.span
          animate={{ scaleY: active ? [0.25, bar.activePeak, 0.35] : [0.3, 0.45, 0.3] }}
          className="h-10 w-1 origin-bottom rounded-full bg-cyan-200/70"
          key={bar.id}
          transition={{ duration: 1.1, delay: bar.delay, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

export function ApiKeyField({
  apiKey,
  isSaved,
  onChange,
  onClear,
  onSave,
  saveStatus,
}: {
  apiKey: string;
  isSaved: boolean;
  onChange: (value: string) => void;
  onClear: () => void;
  onSave: () => void;
  saveStatus: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-white" htmlFor="gemini-key">
          <LockKeyhole size={16} />
          Gemini API key
        </label>
        <StatusBadge label={isSaved ? "Saved" : "Not saved"} tone={isSaved ? "green" : "warn"} />
      </div>
      <input
        className="w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40"
        id="gemini-key"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste your Google AI Studio Gemini API key"
        type="password"
        value={apiKey}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="primary-button" onClick={onSave} type="button">
          <Save size={16} />
          Save key
        </button>
        <button className="secondary-button" onClick={onClear} type="button">
          <Trash2 size={16} />
          Clear
        </button>
      </div>
      <p className={["mt-3 text-xs leading-5", isSaved ? "text-emerald-200" : "text-slate-500"].join(" ")}>
        {saveStatus}
      </p>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Saved locally on this PC. B.R.A.C.E uses Gemini through the backend and keeps secrets out of the renderer.
      </p>
    </div>
  );
}

export function PageShell({ children, pageKey }: { children: ReactNode; pageKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.main
        animate={pageAnimate}
        className="app-main min-h-0 flex-1 overflow-y-auto p-4 pb-24 md:pb-4 lg:p-6"
        exit={pageExit}
        initial={pageInitial}
        key={pageKey}
        transition={pageTransition}
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}
